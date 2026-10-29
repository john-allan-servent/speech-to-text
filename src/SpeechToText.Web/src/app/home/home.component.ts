import { Component, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { SpeechStore } from "../store/speech.store";

@Component({
  selector: "app-home",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <!-- Live Recording Section -->
      <div class="mb-6 rounded-lg bg-white p-6 shadow">
        <h2 class="mb-4 text-2xl font-semibold text-gray-900">
          Live Speech Recognition
        </h2>

        <div class="space-y-4">
          <button
            (click)="startRecording()"
            [disabled]="store.isRecording()"
            class="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400"
          >
            {{ store.isRecording() ? "Recording..." : "Start Recording" }}
          </button>

          <button
            (click)="stopRecording()"
            [disabled]="!store.isRecording()"
            class="ml-2 rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:bg-gray-400"
          >
            Stop Recording
          </button>

          @if (store.transcript()) {
          <div class="mt-4 rounded-md bg-gray-50 p-4">
            <h3 class="mb-2 font-semibold text-gray-700">Live Transcript:</h3>
            <p class="text-gray-900">{{ store.transcript() }}</p>
          </div>
          }
        </div>
      </div>

      <!-- File Upload Section -->
      <div class="rounded-lg bg-white p-6 shadow">
        <h2 class="mb-4 text-2xl font-semibold text-gray-900">
          Upload Audio File
        </h2>

        <form (ngSubmit)="onSubmit()" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">
              Select WAV audio file
            </label>
            <input
              type="file"
              accept=".wav"
              (change)="onFileSelected($event)"
              class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            @if (selectedFile()) {
            <p class="mt-2 text-sm text-gray-600">
              Selected: {{ selectedFile()?.name }}
            </p>
            }
          </div>

          <button
            type="submit"
            [disabled]="!selectedFile()"
            class="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:bg-gray-400"
          >
            Recognize Speech from File
          </button>
        </form>

        @if (store.speechResult()) {
        <div class="mt-4 rounded-md bg-green-50 p-4">
          <h3 class="mb-2 font-semibold text-gray-700">Recognition Result:</h3>
          <p class="text-gray-900">{{ store.speechResult() }}</p>
        </div>
        } @if (store.error()) {
        <div class="mt-4 rounded-md bg-red-50 p-4">
          <p class="text-red-800">{{ store.error() }}</p>
        </div>
        }
      </div>
    </div>
  `,
  styles: [],
})
export class HomeComponent {
  protected readonly store = inject(SpeechStore);
  protected readonly selectedFile = signal<File | null>(null);

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile.set(input.files[0]);
    }
  }

  onSubmit() {
    const file = this.selectedFile();
    if (file) {
      this.store.recognizeFromFile(file);
    }
  }

  startRecording() {
    this.store.startRecording();
  }

  stopRecording() {
    this.store.stopRecording();
  }
}
