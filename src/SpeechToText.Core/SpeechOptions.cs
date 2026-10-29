namespace SpeechToText.Core;

public sealed class SpeechOptions
{
    public const string SectionName = "Speech";

    /// <summary>Speech to Text (Standard) endpoint, e.g. https://eastus.api.cognitive.microsoft.com/</summary>
    public string Endpoint { get; set; } = "";

    public string Key { get; set; } = "";

    public string Region { get; set; } = "";

    public string Language { get; set; } = "en-US";
}
