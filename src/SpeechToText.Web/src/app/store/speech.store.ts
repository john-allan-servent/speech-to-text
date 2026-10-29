import { signalStore, withState, withMethods, patchState } from "@ngrx/signals";
import { environment } from "../../environments/environment";

// Access the global Speech SDK loaded via script tag in index.html
declare const SpeechSDK: any;

export interface Segment {
  id: number;
  text: string;
  offsetMs: number;
  source: "mic" | "file";
  speaker?: string;
}

interface SpeechState {
  isRecording: boolean;
  isProcessing: boolean;
  segments: Segment[];
  interim: string;
  elapsedMs: number;
  level: number;
  fileName: string | null;
  error: string | null;
}

const initialState: SpeechState = {
  isRecording: false,
  isProcessing: false,
  segments: [],
  interim: "",
  elapsedMs: 0,
  level: 0,
  fileName: null,
  error: null,
};

const friendlyError = (raw: unknown): string => {
  const text = String(raw ?? "");
  if (/permission|denied|NotAllowed/i.test(text)) {
    return "Microphone access is blocked. Allow it in the address bar, then press Record again.";
  }
  if (/NotFound|no.*(device|microphone)/i.test(text)) {
    return "No microphone was found. Connect one and press Record again.";
  }
  if (/401|403|auth|subscription|key/i.test(text)) {
    return "The speech service rejected our credentials. Contact the team that manages this app.";
  }
  if (/network|websocket|connection|timeout/i.test(text)) {
    return "Lost connection to the speech service. Check your network and try again.";
  }
  return "Something went wrong while transcribing. Try again, and tell the app team if it keeps happening.";
};

export const SpeechStore = signalStore(
  { providedIn: "root" },
  withState(initialState),
  withMethods((store) => {
    let recognizer: any = null;
    let nextId = 1;
    let startedAt = 0;
    let timer: ReturnType<typeof setInterval> | null = null;
    let meterStream: MediaStream | null = null;
    let meterContext: AudioContext | null = null;
    let meterFrame = 0;

    const addSegment = (
      text: string,
      source: Segment["source"],
      offsetMs: number,
      speaker?: string
    ) => {
      if (!text.trim()) return;
      patchState(store, {
        segments: [
          ...store.segments(),
          { id: nextId++, text: text.trim(), offsetMs, source, speaker },
        ],
        interim: "",
      });
    };

    const stopMeter = () => {
      cancelAnimationFrame(meterFrame);
      meterStream?.getTracks().forEach((t) => t.stop());
      meterContext?.close();
      meterStream = null;
      meterContext = null;
      patchState(store, { level: 0 });
    };

    const startMeter = async () => {
      try {
        meterStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        meterContext = new AudioContext();
        const analyser = meterContext.createAnalyser();
        analyser.fftSize = 512;
        meterContext.createMediaStreamSource(meterStream).connect(analyser);
        const data = new Uint8Array(analyser.fftSize);
        const tick = () => {
          analyser.getByteTimeDomainData(data);
          let peak = 0;
          for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
          patchState(store, { level: Math.min(1, peak / 90) });
          meterFrame = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        // The meter is a convenience; recognition errors are reported separately.
      }
    };

    const teardownRecognizer = () => {
      if (timer) clearInterval(timer);
      timer = null;
      stopMeter();
      recognizer?.close();
      recognizer = null;
      patchState(store, { isRecording: false, interim: "" });
    };

    return {
      startRecording() {
        if (store.isRecording() || store.isProcessing()) return;
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
            patchState(store, { interim: e.result.text });
          };

          recognizer.recognized = (_s: any, e: any) => {
            if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
              addSegment(e.result.text, "mic", Date.now() - startedAt);
            }
          };

          recognizer.canceled = (_s: any, e: any) => {
            patchState(store, { error: friendlyError(e.errorDetails) });
            teardownRecognizer();
          };

          patchState(store, { error: null, fileName: null, elapsedMs: 0 });
          recognizer.startContinuousRecognitionAsync(
            () => {
              startedAt = Date.now();
              patchState(store, { isRecording: true });
              timer = setInterval(
                () => patchState(store, { elapsedMs: Date.now() - startedAt }),
                200
              );
              void startMeter();
            },
            (err: any) => {
              patchState(store, { error: friendlyError(err) });
              teardownRecognizer();
            }
          );
        } catch (err) {
          patchState(store, { error: friendlyError(err) });
        }
      },

      stopRecording() {
        if (!recognizer) return;
        recognizer.stopContinuousRecognitionAsync(
          () => teardownRecognizer(),
          (err: any) => {
            patchState(store, { error: friendlyError(err) });
            teardownRecognizer();
          }
        );
      },

      clearTranscript() {
        patchState(store, {
          segments: [],
          interim: "",
          error: null,
          fileName: null,
          elapsedMs: 0,
        });
      },

      dismissError() {
        patchState(store, { error: null });
      },

      recognizeFromFile(audioFile: File) {
        if (store.isRecording() || store.isProcessing()) return;
        patchState(store, {
          error: null,
          isProcessing: true,
          fileName: audioFile.name,
          interim: "",
        });

        const finish = (error?: string) => {
          patchState(store, {
            isProcessing: false,
            interim: "",
            ...(error ? { error } : {}),
          });
        };

        try {
          const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
            environment.azure.speechKey,
            environment.azure.speechRegion
          );
          speechConfig.speechRecognitionLanguage = "en-US";

          const reader = new FileReader();

          reader.onload = (event) => {
            const arrayBuffer = event.target?.result as ArrayBuffer;
            const pushStream = SpeechSDK.AudioInputStream.createPushStream();
            pushStream.write(arrayBuffer);
            pushStream.close();

            const audioConfig =
              SpeechSDK.AudioConfig.fromStreamInput(pushStream);
            const fileRecognizer = new SpeechSDK.SpeechRecognizer(
              speechConfig,
              audioConfig
            );
            let heardAnything = false;
            let finished = false;

            const done = (error?: string) => {
              if (finished) return;
              finished = true;
              fileRecognizer.stopContinuousRecognitionAsync(
                () => fileRecognizer.close(),
                () => fileRecognizer.close()
              );
              finish(
                error ??
                  (heardAnything
                    ? undefined
                    : "No speech was found in this file. Check that it contains audible speech.")
              );
            };

            fileRecognizer.recognizing = (_s: any, e: any) => {
              patchState(store, { interim: e.result.text });
            };
            fileRecognizer.recognized = (_s: any, e: any) => {
              if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
                heardAnything = true;
                addSegment(
                  e.result.text,
                  "file",
                  Math.round(e.result.offset / 10000)
                );
              }
            };
            fileRecognizer.canceled = (_s: any, e: any) => {
              const failed = e.reason === SpeechSDK.CancellationReason.Error;
              done(failed ? friendlyError(e.errorDetails) : undefined);
            };
            fileRecognizer.sessionStopped = () => done();

            fileRecognizer.startContinuousRecognitionAsync(
              () => undefined,
              (err: any) => done(friendlyError(err))
            );
          };

          reader.onerror = () =>
            finish("That file could not be read. Try exporting it as WAV again.");

          reader.readAsArrayBuffer(audioFile);
        } catch (err) {
          finish(friendlyError(err));
        }
      },
    };
  })
);
