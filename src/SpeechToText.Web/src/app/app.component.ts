import { Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="min-h-screen bg-gray-50">
      <header class="bg-white shadow">
        <div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 class="text-3xl font-bold tracking-tight text-gray-900">
            Speech to Text
          </h1>
        </div>
      </header>
      <main>
        <router-outlet />
      </main>
    </div>
  `,
  styles: [],
})
export class AppComponent {
  title = "speech-to-text-web";
}
