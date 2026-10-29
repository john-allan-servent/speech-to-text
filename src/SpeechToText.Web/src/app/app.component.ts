import { Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="min-h-screen">
      <main id="main">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [],
})
export class AppComponent {
  title = "speech-to-text-web";
}
