namespace SpeechToText.Core;

public sealed record RecognizedPhrase(string Text, string? SpeakerId, TimeSpan Offset, TimeSpan Duration);

public sealed record RecognitionResult(
    bool Success,
    IReadOnlyList<RecognizedPhrase> Phrases,
    string? Error = null)
{
    public string FullText => string.Join(" ", Phrases.Select(p => p.Text));
}
