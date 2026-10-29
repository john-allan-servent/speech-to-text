using Microsoft.CognitiveServices.Speech;
using Microsoft.CognitiveServices.Speech.Audio;
using Microsoft.CognitiveServices.Speech.Transcription;
using Microsoft.Extensions.Options;

namespace SpeechToText.Core;

public sealed class SpeechRecognitionService(IOptions<SpeechOptions> options) : ISpeechRecognitionService
{
    private readonly SpeechOptions _options = options.Value;

    public async Task<RecognitionResult> RecognizeOnceAsync(Stream wav, CancellationToken ct = default)
    {
        using var audio = CreateAudioInput(wav);
        using var recognizer = new SpeechRecognizer(CreateConfig(), audio.Config);
        var pump = audio.PumpAsync(wav, ct);

        var result = await recognizer.RecognizeOnceAsync().WaitAsync(ct);
        await pump;

        return result.Reason switch
        {
            ResultReason.RecognizedSpeech => new RecognitionResult(true,
                [new RecognizedPhrase(result.Text, null, TimeSpan.FromTicks(result.OffsetInTicks), result.Duration)]),
            ResultReason.NoMatch => new RecognitionResult(true, [], "Speech could not be recognized."),
            _ => new RecognitionResult(false, [], DescribeCancellation(CancellationDetails.FromResult(result)))
        };
    }

    public async Task<RecognitionResult> RecognizeContinuousAsync(Stream wav, CancellationToken ct = default)
    {
        using var audio = CreateAudioInput(wav);
        using var recognizer = new SpeechRecognizer(CreateConfig(), audio.Config);
        var phrases = new List<RecognizedPhrase>();
        var done = new TaskCompletionSource<string?>(TaskCreationOptions.RunContinuationsAsynchronously);

        recognizer.Recognized += (_, e) =>
        {
            if (e.Result.Reason == ResultReason.RecognizedSpeech)
            {
                lock (phrases)
                    phrases.Add(new RecognizedPhrase(e.Result.Text, null, TimeSpan.FromTicks(e.Result.OffsetInTicks), e.Result.Duration));
            }
        };
        recognizer.Canceled += (_, e) =>
            done.TrySetResult(e.Reason == CancellationReason.Error ? $"{e.ErrorCode}: {e.ErrorDetails}" : null);
        recognizer.SessionStopped += (_, _) => done.TrySetResult(null);

        var pump = audio.PumpAsync(wav, ct);
        await recognizer.StartContinuousRecognitionAsync();
        string? error;
        try { error = await done.Task.WaitAsync(ct); }
        finally { await recognizer.StopContinuousRecognitionAsync(); }
        await pump;

        return new RecognitionResult(error is null, phrases, error);
    }

    public async Task<RecognitionResult> DiarizeAsync(Stream wav, CancellationToken ct = default)
    {
        var config = CreateConfig();
        config.SetProperty(PropertyId.SpeechServiceResponse_DiarizeIntermediateResults, "true");

        using var audio = CreateAudioInput(wav);
        using var transcriber = new ConversationTranscriber(config, audio.Config);
        var phrases = new List<RecognizedPhrase>();
        var done = new TaskCompletionSource<string?>(TaskCreationOptions.RunContinuationsAsynchronously);

        transcriber.Transcribed += (_, e) =>
        {
            if (e.Result.Reason == ResultReason.RecognizedSpeech)
            {
                lock (phrases)
                    phrases.Add(new RecognizedPhrase(e.Result.Text, e.Result.SpeakerId, TimeSpan.FromTicks(e.Result.OffsetInTicks), e.Result.Duration));
            }
        };
        transcriber.Canceled += (_, e) =>
            done.TrySetResult(e.Reason == CancellationReason.Error ? $"{e.ErrorCode}: {e.ErrorDetails}" : null);
        transcriber.SessionStopped += (_, _) => done.TrySetResult(null);

        var pump = audio.PumpAsync(wav, ct);
        await transcriber.StartTranscribingAsync();
        string? error;
        try { error = await done.Task.WaitAsync(ct); }
        finally { await transcriber.StopTranscribingAsync(); }
        await pump;

        return new RecognitionResult(error is null, phrases, error);
    }

    private SpeechConfig CreateConfig()
    {
        if (string.IsNullOrWhiteSpace(_options.Key))
            throw new InvalidOperationException("Speech:Key is not configured.");

        var config = !string.IsNullOrWhiteSpace(_options.Endpoint)
            ? SpeechConfig.FromEndpoint(new Uri(_options.Endpoint), _options.Key)
            : SpeechConfig.FromSubscription(_options.Key, _options.Region);
        config.SpeechRecognitionLanguage = _options.Language;
        return config;
    }

    private static PushInput CreateAudioInput(Stream _) => new();

    private sealed class PushInput : IDisposable
    {
        private readonly PushAudioInputStream _stream = AudioInputStream.CreatePushStream();
        public AudioConfig Config { get; }

        public PushInput() => Config = AudioConfig.FromStreamInput(_stream);

        // The WAV header is parsed by the SDK, so the raw stream is pushed as-is.
        public async Task PumpAsync(Stream wav, CancellationToken ct)
        {
            var buffer = new byte[32 * 1024];
            try
            {
                int read;
                while ((read = await wav.ReadAsync(buffer, ct)) > 0)
                    _stream.Write(buffer, read);
            }
            finally { _stream.Close(); }
        }

        public void Dispose()
        {
            Config.Dispose();
            _stream.Dispose();
        }
    }

    private static string DescribeCancellation(CancellationDetails c) =>
        c.Reason == CancellationReason.Error ? $"{c.ErrorCode}: {c.ErrorDetails}" : c.Reason.ToString();
}
