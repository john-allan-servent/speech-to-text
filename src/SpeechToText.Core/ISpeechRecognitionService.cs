namespace SpeechToText.Core;

public interface ISpeechRecognitionService
{
    /// <summary>Recognizes the first utterance in a WAV stream.</summary>
    Task<RecognitionResult> RecognizeOnceAsync(Stream wav, CancellationToken ct = default);

    /// <summary>Recognizes all speech in a WAV stream.</summary>
    Task<RecognitionResult> RecognizeContinuousAsync(Stream wav, CancellationToken ct = default);

    /// <summary>Transcribes a WAV stream and labels each phrase with a speaker ID.</summary>
    Task<RecognitionResult> DiarizeAsync(Stream wav, CancellationToken ct = default);
}
