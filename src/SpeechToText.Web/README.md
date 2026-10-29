# Speech-to-Text Web Application

An Angular 20 application with Microsoft Cognitive Services Speech SDK integration for real-time speech-to-text transcription.

## Features

- Angular 20 with standalone components
- Tailwind CSS for styling
- Microsoft Cognitive Services Speech SDK
- NgRx SignalStore for state management
- Real-time speech recognition

## Prerequisites

- Node.js (v18 or higher)
- npm or pnpm
- Azure Speech Service subscription (for speech recognition)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure Azure Speech Service credentials:

   **For Local Development:**

   - Open `src/environments/environment.local.ts`
   - Add your Azure Speech Service subscription key and region:

   ```typescript
   export const environment = {
     production: false,
     azure: {
       speechKey: "your-actual-key-here",
       speechRegion: "eastus", // your Azure region
     },
   };
   ```

   **For Azure Static Web Apps Deployment:**

   - See the [Deployment](#deployment) section below

## Development

Run the development server:

```bash
npm start
```

Navigate to `http://localhost:4200/`

## Build

Build the project:

```bash
npm run build
```

The build artifacts will be stored in the `dist/` directory.

## Project Structure

```
src/
├── app/
│   ├── home/              # Home component with speech recognition UI
│   ├── store/             # SignalStore for state management
│   ├── app.component.ts   # Root component
│   ├── app.config.ts      # Application configuration
│   └── app.routes.ts      # Routing configuration
├── styles.css             # Global styles with Tailwind
└── index.html             # Main HTML file
```

## Technologies

- **Angular 20**: Modern web framework
- **Tailwind CSS**: Utility-first CSS framework
- **@ngrx/signals**: State management
- **Microsoft Cognitive Services Speech SDK**: Speech recognition
- **TypeScript**: Type-safe development

## Deployment

### Azure Static Web Apps

This application is configured for deployment to Azure Static Web Apps.

#### Prerequisites

1. Azure account with an active subscription
2. Azure Speech Service resource created
3. GitHub repository with this code

#### Setup Steps

1. **Create Azure Static Web App:**

   - Go to [Azure Portal](https://portal.azure.com)
   - Create a new Static Web App
   - Connect to your GitHub repository
   - Set build details:
     - App location: `/`
     - Output location: `dist/speech-to-text-web/browser`

2. **Configure GitHub Secrets:**

   In your GitHub repository, go to Settings > Secrets and variables > Actions, and add:

   - `AZURE_SPEECH_KEY` - Your Azure Speech Service subscription key
   - `AZURE_SPEECH_REGION` - Your Azure region (e.g., 'eastus')
   - `AZURE_STATIC_WEB_APPS_API_TOKEN` - Auto-generated during Static Web App creation

3. **Deploy:**
   - Push to the `main` branch
   - GitHub Actions will automatically build and deploy
   - Environment variables are injected at build time

#### Build Configuration

The production build uses:

- File replacement: `environment.ts` → `environment.prod.ts`
- Webpack DefinePlugin to inject `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION`
- GitHub Actions workflow in `.github/workflows/azure-static-web-apps.yml`

See `src/environments/README.md` for detailed environment configuration.

## Notes

- Make sure to configure your Azure Speech Service credentials before running the application
- The application requires microphone permissions to work properly
- Errors during TypeScript compilation are expected until dependencies are installed
