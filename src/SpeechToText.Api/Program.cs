using System.Security.Claims;
using System.Text.Json;
using Microsoft.Extensions.Options;
using SpeechToText.Core;

const long MaxUploadBytes = 50 * 1024 * 1024;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<SpeechOptions>(builder.Configuration.GetSection(SpeechOptions.SectionName));
builder.Services.AddSingleton<ISpeechRecognitionService, SpeechRecognitionService>();
builder.Services.AddHttpClient("speech-sts");
builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(o => o.MultipartBodyLengthLimit = MaxUploadBytes);
builder.WebHost.ConfigureKestrel(k => k.Limits.MaxRequestBodySize = MaxUploadBytes);

var requireAuth = builder.Configuration.GetValue("Auth:RequireSwaPrincipal", true);

var app = builder.Build();

app.MapGet("/healthz", () => Results.Ok("healthy"));

var api = app.MapGroup("/api/speech");
if (requireAuth)
    api.AddEndpointFilter(SwaPrincipal.RequireAuthenticated);

api.MapPost("/token", async (IOptions<SpeechOptions> opts, IHttpClientFactory http, CancellationToken ct) =>
{
    var o = opts.Value;
    if (string.IsNullOrWhiteSpace(o.Key) || string.IsNullOrWhiteSpace(o.Region))
        return Results.Problem("Speech:Key and Speech:Region must be configured.");

    using var client = http.CreateClient("speech-sts");
    using var req = new HttpRequestMessage(HttpMethod.Post,
        $"https://{o.Region}.api.cognitive.microsoft.com/sts/v1.0/issueToken");
    req.Headers.Add("Ocp-Apim-Subscription-Key", o.Key);
    using var resp = await client.SendAsync(req, ct);
    if (!resp.IsSuccessStatusCode)
        return Results.Problem("Failed to obtain speech token.", statusCode: StatusCodes.Status502BadGateway);

    return Results.Ok(new { token = await resp.Content.ReadAsStringAsync(ct), region = o.Region, expiresInSeconds = 540 });
});

api.MapPost("/recognize", async (HttpRequest request, string? mode, ISpeechRecognitionService svc, CancellationToken ct) =>
{
    var (stream, error) = await ReadWav(request);
    if (stream is null) return error!;
    await using var _ = stream;

    var result = string.Equals(mode, "once", StringComparison.OrdinalIgnoreCase)
        ? await svc.RecognizeOnceAsync(stream, ct)
        : await svc.RecognizeContinuousAsync(stream, ct);
    return ToResponse(result);
}).DisableAntiforgery();

api.MapPost("/diarize", async (HttpRequest request, ISpeechRecognitionService svc, CancellationToken ct) =>
{
    var (stream, error) = await ReadWav(request);
    if (stream is null) return error!;
    await using var _ = stream;

    return ToResponse(await svc.DiarizeAsync(stream, ct));
}).DisableAntiforgery();

app.Run();

static async Task<(Stream?, IResult?)> ReadWav(HttpRequest request)
{
    if (!request.HasFormContentType)
        return (null, Results.BadRequest("Send the WAV as multipart/form-data in a 'file' field."));

    var form = await request.ReadFormAsync();
    var file = form.Files.GetFile("file");
    if (file is null || file.Length == 0)
        return (null, Results.BadRequest("Missing 'file' field."));
    if (!file.FileName.EndsWith(".wav", StringComparison.OrdinalIgnoreCase))
        return (null, Results.BadRequest("Only .wav files are supported."));

    var buffer = new MemoryStream();
    await file.CopyToAsync(buffer);
    buffer.Position = 0;
    return (buffer, null);
}

static IResult ToResponse(RecognitionResult r) =>
    r.Success
        ? Results.Ok(new { text = r.FullText, phrases = r.Phrases, message = r.Error })
        : Results.Problem(r.Error, statusCode: StatusCodes.Status502BadGateway);

static class SwaPrincipal
{
    // Azure Static Web Apps linked backends forward the signed-in user in x-ms-client-principal.
    public static ValueTask<object?> RequireAuthenticated(EndpointFilterInvocationContext ctx, EndpointFilterDelegate next)
    {
        var header = ctx.HttpContext.Request.Headers["x-ms-client-principal"].ToString();
        if (string.IsNullOrEmpty(header))
            return ValueTask.FromResult<object?>(Results.Unauthorized());

        try
        {
            var json = JsonDocument.Parse(Convert.FromBase64String(header));
            var roles = json.RootElement.TryGetProperty("userRoles", out var r)
                ? r.EnumerateArray().Select(x => x.GetString()).ToList()
                : [];
            if (!roles.Contains("authenticated"))
                return ValueTask.FromResult<object?>(Results.Unauthorized());

            var identity = new ClaimsIdentity(roles.Select(x => new Claim(ClaimTypes.Role, x!)), "swa");
            ctx.HttpContext.User = new ClaimsPrincipal(identity);
        }
        catch (Exception e) when (e is FormatException or JsonException)
        {
            return ValueTask.FromResult<object?>(Results.Unauthorized());
        }
        return next(ctx);
    }
}
