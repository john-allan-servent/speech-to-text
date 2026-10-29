import { signalStore, withState, withMethods, patchState } from "@ngrx/signals";
import { environment } from "../../environments/environment";

// Access the global Speech SDK loaded via script tag in index.html
declare const SpeechSDK: any;

interface SpeechState {
  isRecording: boolean;
  transcript: string;
  speechResult: string;
  error: string | null;
}

const initialState: SpeechState = {
  isRecording: false,
  transcript: "",
  speechResult: "",
  error: null,
};

export const SpeechStore = signalStore(
  { providedIn: "root" },
  withState(initialState),
  withMethods((store) => {
    let recognizer: any = null;

    return {
      startRecording() {
        try {
          const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
            environment.azure.speechKey,
            environment.azure.speechRegion
          );
          speechConfig.speechRecognitionLanguage = "en-US";

          const audioConfig =
            SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
          recognizer = new SpeechSDK.SpeechRecognizer(
            speechConfig,
            audioConfig
          );

          recognizer.recognizing = (_s: any, e: any) => {
            patchState(store, { transcript: e.result.text });
          };

          recognizer.recognized = (_s: any, e: any) => {
            if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
              patchState(store, { transcript: e.result.text });
            }
          };

          recognizer.canceled = (_s: any, e: any) => {
            patchState(store, {
              error: `Speech recognition canceled: ${e.errorDetails}`,
              isRecording: false,
            });
            recognizer?.stopContinuousRecognitionAsync();
          };

          recognizer.startContinuousRecognitionAsync(
            () => {
              patchState(store, { isRecording: true, error: null });
            },
            (err: any) => {
              patchState(store, {
                error: `Error starting recognition: ${err}`,
              });
            }
          );
        } catch (err) {
          patchState(store, { error: `Error: ${err}` });
        }
      },

      stopRecording() {
        if (recognizer) {
          recognizer.stopContinuousRecognitionAsync(
            () => {
              patchState(store, { isRecording: false });
              recognizer?.close();
              recognizer = null;
            },
            (err: any) => {
              patchState(store, {
                error: `Error stopping recognition: ${err}`,
              });
            }
          );
        }
      },

      clearTranscript() {
        patchState(store, { transcript: "", error: null });
      },

      recognizeFromFile(audioFile: File) {
        patchState(store, { error: null, speechResult: "" });

        try {
          const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
            environment.azure.speechKey,
            environment.azure.speechRegion
          );
          speechConfig.speechRecognitionLanguage = "en-US";

          // Use FileReader to read the file as ArrayBuffer for browser compatibility
          const reader = new FileReader();

          reader.onload = (event) => {
            const arrayBuffer = event.target?.result as ArrayBuffer;

            // Create push stream for browser compatibility
            const pushStream = SpeechSDK.AudioInputStream.createPushStream();
            pushStream.write(arrayBuffer);
            pushStream.close();

            const audioConfig =
              SpeechSDK.AudioConfig.fromStreamInput(pushStream);
            const speechRecognizer = new SpeechSDK.SpeechRecognizer(
              speechConfig,
              audioConfig
            );

            speechRecognizer.recognizeOnceAsync(
              (result: any) => {
                switch (result.reason) {
                  case SpeechSDK.ResultReason.RecognizedSpeech:
                    patchState(store, {
                      speechResult: result.text,
                      error: null,
                    });
                    break;
                  case SpeechSDK.ResultReason.NoMatch:
                    patchState(store, {
                      speechResult: "",
                      error: "Speech could not be recognized.",
                    });
                    break;
                  case SpeechSDK.ResultReason.Canceled:
                    const cancellation =
                      SpeechSDK.CancellationDetails.fromResult(result);
                    let errorMessage = `Recognition canceled: ${cancellation.reason}`;

                    if (
                      cancellation.reason === SpeechSDK.CancellationReason.Error
                    ) {
                      errorMessage += `\nError Code: ${cancellation.ErrorCode}\nError Details: ${cancellation.errorDetails}`;
                    }

                    patchState(store, {
                      speechResult: "",
                      error: errorMessage,
                    });
                    break;
                }
                speechRecognizer.close();
              },
              (err: string) => {
                patchState(store, {
                  speechResult: "",
                  error: `Error during recognition: ${err}`,
                });
                speechRecognizer.close();
              }
            );
          };

          reader.onerror = () => {
            patchState(store, {
              speechResult: "",
              error: "Failed to read the audio file.",
            });
          };

          reader.readAsArrayBuffer(audioFile);
        } catch (err) {
          patchState(store, {
            speechResult: "",
            error: `Error processing file: ${err}`,
          });
        }
      },

      clearSpeechResult() {
        patchState(store, { speechResult: "", error: null });
      },
    };
  })
);
