import { Component, computed, inject, signal } from "@angular/core";
import { SpeechStore } from "../store/speech.store";

const clock = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60).toString().padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

@Component({
  selector: "app-home",
  standalone: true,
  template: `
    <div class="shell">
      <section class="deck" aria-label="Recorder">
        <div class="deck-top">
          <h1 class="nameplate">Speech to Text</h1>
          <p class="status" role="status">
            <span class="lamp" [class.lamp-on]="store.isRecording()"></span>
            {{ statusLabel() }}
          </p>
        </div>

        <div class="deck-body">
          <div class="meter" aria-hidden="true">
            <svg viewBox="0 0 200 110" class="meter-svg">
              <path d="M20 100 A80 80 0 0 1 180 100" class="meter-arc" />
              <path d="M140 38 A80 80 0 0 1 180 100" class="meter-hot" />
              @for (t of ticks; track t) {
              <line
                x1="100"
                y1="100"
                x2="100"
                y2="22"
                class="meter-tick"
                [attr.transform]="'rotate(' + t + ' 100 100)'"
              />
              }
              <line
                x1="100"
                y1="100"
                x2="100"
                y2="28"
                class="needle"
                [style.transform]="needleTransform()"
              />
              <circle cx="100" cy="100" r="5" class="hub" />
            </svg>
            <span class="meter-label">Input level</span>
          </div>

          <div class="transport">
            <p class="timer" [attr.aria-label]="'Elapsed ' + elapsed()">
              {{ elapsed() }}
            </p>
            @if (store.isRecording()) {
            <button type="button" class="rec rec-stop" (click)="store.stopRecording()">
              <span class="rec-glyph rec-glyph-stop"></span> Stop
            </button>
            } @else {
            <button
              type="button"
              class="rec"
              [disabled]="store.isProcessing()"
              (click)="store.startRecording()"
            >
              <span class="rec-glyph"></span> Record
            </button>
            }
          </div>

          <div class="slot">
            <label
              class="drop"
              [class.drop-over]="dragging()"
              [class.drop-busy]="store.isProcessing()"
              (dragover)="onDragOver($event)"
              (dragleave)="dragging.set(false)"
              (drop)="onDrop($event)"
            >
              <input
                type="file"
                accept=".wav,audio/wav"
                class="sr-only"
                [disabled]="store.isRecording() || store.isProcessing()"
                (change)="onFileSelected($event)"
              />
              @if (store.isProcessing()) {
              <span class="spinner" aria-hidden="true"></span>
              <span class="drop-title">Transcribing {{ store.fileName() }}…</span>
              <span class="drop-hint">Lines appear below as they are heard.</span>
              } @else {
              <span class="drop-title">Load a recording</span>
              <span class="drop-hint">Drop a .wav file here, or choose one</span>
              }
            </label>
          </div>
        </div>
      </section>

      @if (store.error()) {
      <div class="alert" role="alert">
        <p>{{ store.error() }}</p>
        <button type="button" class="ghost" (click)="store.dismissError()">Dismiss</button>
      </div>
      }

      <section class="log" aria-labelledby="log-title">
        <div class="log-bar">
          <h2 id="log-title">Transcript</h2>
          <div class="log-actions">
            <button type="button" class="ghost" [disabled]="!hasText()" (click)="copy()">
              {{ copied() ? "Copied" : "Copy" }}
            </button>
            <button type="button" class="ghost" [disabled]="!hasText()" (click)="download()">
              Download .txt
            </button>
            <button
              type="button"
              class="ghost"
              [disabled]="!hasText() || store.isRecording() || store.isProcessing()"
              (click)="store.clearTranscript()"
            >
              Clear
            </button>
          </div>
        </div>

        <div class="paper" aria-live="polite" aria-relevant="additions text">
          @for (s of store.segments(); track s.id) {
          <p class="line">
            <span class="stamp">{{ clock(s.offsetMs) }}</span>
            <span class="words">
              @if (s.speaker) {<span class="speaker" [attr.data-ch]="channel(s.speaker)">{{ s.speaker }}</span>}
              {{ s.text }}
            </span>
          </p>
          } @if (store.interim()) {
          <p class="line line-interim">
            <span class="stamp">··:··</span>
            <span class="words">{{ store.interim() }}</span>
          </p>
          } @if (!hasText() && !store.interim()) {
          <p class="empty">
            @if (store.isRecording()) { Listening… start speaking and your words will be logged here. } @else {
            Press Record and speak, or load a .wav file. Everything transcribed is logged here, line by line, with the time it was heard. }
          </p>
          }
        </div>
      </section>
    </div>
  `,
  styles: [
    `
      :host {
        --ground: #bfc2c0;
        --deck: #d9d8d2;
        --deck-edge: #f2f1ec;
        --deck-shade: #a9a8a1;
        --ink: #1c2023;
        --ink-soft: #4a5156;
        --paper: #f7f8f6;
        --rule: #d3d6d3;
        --rec: #c92c14;
        --focus: #1d4fd8;
        display: block;
        min-height: 100vh;
        background: var(--ground);
        color: var(--ink);
        font-family: "Segoe UI", system-ui, -apple-system, Roboto, sans-serif;
      }
      .shell {
        max-width: 72rem;
        margin: 0 auto;
        padding: 1.25rem 1rem 3rem;
      }
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0 0 0 0);
        white-space: nowrap;
      }

      .deck {
        background: var(--deck);
        border-radius: 0.5rem;
        border: 1px solid var(--deck-shade);
        box-shadow: inset 0 1px 0 var(--deck-edge), 0 2px 0 #8f8e88,
          0 12px 24px -8px rgb(28 32 35 / 0.35);
        padding: 1rem 1.25rem 1.25rem;
      }
      .deck-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding-bottom: 0.75rem;
        margin-bottom: 1rem;
        border-bottom: 1px solid var(--deck-shade);
        box-shadow: 0 1px 0 var(--deck-edge);
      }
      .nameplate {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 700;
        letter-spacing: 0.01em;
      }
      .status {
        margin: 0;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.9375rem;
        color: var(--ink-soft);
      }
      .lamp {
        width: 0.875rem;
        height: 0.875rem;
        border-radius: 50%;
        background: #8d8c86;
        border: 1px solid #6f6e69;
        box-shadow: inset 0 1px 2px rgb(0 0 0 / 0.35);
      }
      .lamp-on {
        background: var(--rec);
        border-color: #8c1d0c;
        box-shadow: inset 0 1px 1px rgb(255 255 255 / 0.4), 0 0 0 3px rgb(201 44 20 / 0.25);
        animation: lamp 1.6s ease-in-out infinite;
      }
      @keyframes lamp {
        50% {
          background: #e24a32;
        }
      }

      .deck-body {
        display: grid;
        gap: 1.25rem;
        grid-template-columns: 1fr;
        align-items: stretch;
      }
      @media (min-width: 52rem) {
        .deck-body {
          grid-template-columns: 15rem 1fr 1.2fr;
        }
      }

      .meter {
        max-width: 18rem;
        width: 100%;
        justify-self: center;
        background: var(--paper);
        border: 1px solid var(--deck-shade);
        border-radius: 0.375rem;
        box-shadow: inset 0 2px 4px rgb(0 0 0 / 0.18);
        padding: 0.5rem 0.75rem 0.375rem;
        text-align: center;
      }
      .meter-svg {
        width: 100%;
        display: block;
      }
      .meter-arc {
        fill: none;
        stroke: var(--ink);
        stroke-width: 2;
      }
      .meter-hot {
        fill: none;
        stroke: var(--rec);
        stroke-width: 5;
      }
      .meter-tick {
        stroke: var(--ink);
        stroke-width: 1;
        stroke-dasharray: 0 70 8 100;
      }
      .needle {
        stroke: var(--ink);
        stroke-width: 2;
        stroke-linecap: round;
        transform-origin: 100px 100px;
        transition: transform 90ms linear;
      }
      .hub {
        fill: var(--ink);
      }
      .meter-label {
        font-size: 0.8125rem;
        color: var(--ink-soft);
      }

      .transport {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
      }
      .timer {
        margin: 0;
        padding: 0.25rem 1.25rem;
        background: var(--ink);
        color: #f4f1e6;
        border-radius: 0.25rem;
        font-family: ui-monospace, "Cascadia Mono", Consolas, monospace;
        font-size: 2.5rem;
        line-height: 1.2;
        font-variant-numeric: tabular-nums;
        letter-spacing: 0.04em;
      }
      .rec {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.625rem;
        min-width: 11rem;
        min-height: 3.25rem;
        padding: 0 1.5rem;
        border-radius: 0.375rem;
        border: 1px solid #8c1d0c;
        background: var(--rec);
        color: #fff;
        font: inherit;
        font-size: 1.125rem;
        font-weight: 700;
        cursor: pointer;
        box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.3), 0 3px 0 #8c1d0c;
        transition: transform 90ms ease-out, box-shadow 90ms ease-out;
      }
      .rec:active:not(:disabled) {
        transform: translateY(2px);
        box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.3), 0 1px 0 #8c1d0c;
      }
      .rec:disabled {
        background: #c4c3bd;
        color: #55595c;
        border-color: #a09f98;
        box-shadow: none;
        cursor: not-allowed;
      }
      .rec-stop {
        background: var(--ink);
        border-color: #000;
        box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.18), 0 3px 0 #000;
      }
      .rec-glyph {
        width: 0.875rem;
        height: 0.875rem;
        border-radius: 50%;
        background: #fff;
      }
      .rec-glyph-stop {
        border-radius: 2px;
      }

      .slot {
        display: flex;
      }
      .drop {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.25rem;
        min-height: 7rem;
        padding: 1rem;
        text-align: center;
        border: 2px dashed var(--deck-shade);
        border-radius: 0.375rem;
        cursor: pointer;
        background: rgb(255 255 255 / 0.25);
      }
      .drop:hover,
      .drop-over {
        background: rgb(255 255 255 / 0.6);
        border-color: var(--ink);
      }
      .drop:has(input:disabled) {
        cursor: default;
      }
      .drop:has(input:focus-visible) {
        outline: 3px solid var(--focus);
        outline-offset: 2px;
      }
      .drop-title {
        font-weight: 700;
        font-size: 1.0625rem;
      }
      .drop-hint {
        font-size: 0.875rem;
        color: var(--ink-soft);
      }
      .spinner {
        width: 1.5rem;
        height: 1.5rem;
        border-radius: 50%;
        border: 3px solid var(--deck-shade);
        border-top-color: var(--ink);
        animation: spin 0.8s linear infinite;
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      .alert {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        margin-top: 1rem;
        padding: 0.75rem 1rem;
        background: #fbe9e5;
        color: #6e1608;
        border: 1px solid var(--rec);
        border-radius: 0.375rem;
      }
      .alert p {
        margin: 0;
      }

      .log {
        margin-top: 1.25rem;
      }
      .log-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
      }
      .log-bar h2 {
        margin: 0;
        font-size: 1.0625rem;
        font-weight: 700;
      }
      .log-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      .ghost {
        min-height: 2.5rem;
        padding: 0 0.875rem;
        font: inherit;
        font-size: 0.9375rem;
        font-weight: 600;
        color: var(--ink);
        background: var(--deck);
        border: 1px solid var(--deck-shade);
        border-radius: 0.375rem;
        box-shadow: inset 0 1px 0 var(--deck-edge);
        cursor: pointer;
      }
      .ghost:hover:not(:disabled) {
        background: var(--deck-edge);
      }
      .ghost:disabled {
        color: #5c6165;
        opacity: 0.65;
        cursor: not-allowed;
      }

      .paper {
        min-height: 22rem;
        padding: 1.25rem 1.5rem;
        background: var(--paper);
        border: 1px solid var(--deck-shade);
        border-radius: 0.375rem;
        box-shadow: inset 0 2px 6px rgb(0 0 0 / 0.12);
      }
      .line {
        display: grid;
        grid-template-columns: 4.25rem 1fr;
        gap: 0.5rem;
        margin: 0;
        padding: 0.5rem 0;
        border-bottom: 1px solid var(--rule);
        font-size: 1.25rem;
        line-height: 1.55;
      }
      .line:last-child {
        border-bottom: 0;
      }
      .stamp {
        padding-top: 0.3rem;
        font-family: ui-monospace, "Cascadia Mono", Consolas, monospace;
        font-size: 0.875rem;
        color: var(--ink-soft);
        font-variant-numeric: tabular-nums;
      }
      .words {
        max-width: 68ch;
      }
      .line-interim .words {
        color: var(--ink-soft);
        font-style: italic;
      }
      .speaker {
        display: inline-block;
        margin-right: 0.5rem;
        padding: 0 0.5rem;
        border-radius: 0.25rem;
        font-size: 0.875rem;
        font-weight: 700;
        color: #fff;
        background: #0f6f6c;
      }
      .speaker[data-ch="1"] {
        background: #2a47b5;
      }
      .speaker[data-ch="2"] {
        background: #6b3d9e;
      }
      .speaker[data-ch="3"] {
        background: #8a5200;
      }
      .empty {
        margin: 0;
        max-width: 52ch;
        font-size: 1.125rem;
        color: var(--ink-soft);
      }

      button:focus-visible {
        outline: 3px solid var(--focus);
        outline-offset: 2px;
      }

      @media (prefers-reduced-motion: reduce) {
        .lamp-on,
        .spinner {
          animation: none;
        }
        .needle,
        .rec {
          transition: none;
        }
      }
    `,
  ],
})
export class HomeComponent {
  protected readonly store = inject(SpeechStore);
  protected readonly dragging = signal(false);
  protected readonly copied = signal(false);
  protected readonly clock = clock;
  protected readonly ticks = [-50, -33, -17, 0, 17, 33, 50];

  protected readonly elapsed = computed(() => clock(this.store.elapsedMs()));
  protected readonly hasText = computed(() => this.store.segments().length > 0);
  protected readonly needleTransform = computed(
    () => `rotate(${-50 + this.store.level() * 100}deg)`
  );
  protected readonly statusLabel = computed(() => {
    if (this.store.isRecording()) return "Recording – mic is live";
    if (this.store.isProcessing()) return "Transcribing file";
    return "Ready";
  });

  protected channel(speaker: string) {
    const n = Number(speaker.replace(/\D/g, ""));
    return Number.isFinite(n) ? n % 4 : 0;
  }

  protected onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.store.recognizeFromFile(file);
    input.value = "";
  }

  protected onDragOver(event: DragEvent) {
    event.preventDefault();
    this.dragging.set(true);
  }

  protected onDrop(event: DragEvent) {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) this.store.recognizeFromFile(file);
  }

  private asText() {
    return this.store
      .segments()
      .map((s) => `[${clock(s.offsetMs)}] ${s.speaker ? s.speaker + ": " : ""}${s.text}`)
      .join("\n");
  }

  protected async copy() {
    await navigator.clipboard.writeText(this.asText());
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1800);
  }

  protected download() {
    const url = URL.createObjectURL(
      new Blob([this.asText()], { type: "text/plain;charset=utf-8" })
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "transcript.txt";
    a.click();
    URL.revokeObjectURL(url);
  }
}
