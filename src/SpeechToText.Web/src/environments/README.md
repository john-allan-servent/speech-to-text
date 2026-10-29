# Environment Configuration

This folder contains environment configuration files for the Speech-to-Text application.

## Files

- **environment.ts** - Development environment (used locally, imports environment.local.ts values)
- **environment.local.ts** - Local development with your actual credentials (gitignored)
- **environment.prod.ts** - Production environment (uses Azure environment variables at build time)

## Local Development Setup

1. **Add your Azure Speech Service credentials to `environment.local.ts`:**

   ```typescript
   export const environment = {
     production: false,
     azure: {
       speechKey: "your-actual-subscription-key-here",
       speechRegion: "your-region-here", // e.g., 'eastus', 'westus2'
     },
   };
   ```

2. **Get your Azure credentials:**
   - Go to [Azure Portal](https://portal.azure.com)
   - Navigate to your Speech Service resource
   - Under "Keys and Endpoint", copy:
     - **Key 1** or **Key 2** → use as `speechKey`
     - **Location/Region** → use as `speechRegion`

## Azure Static Web Apps Deployment

For production deployment to Azure Static Web Apps, environment variables are injected at build time.

### Configure GitHub Secrets

Add these secrets to your GitHub repository (Settings > Secrets and variables > Actions):

1. **AZURE_SPEECH_KEY** - Your Azure Speech Service subscription key
2. **AZURE_SPEECH_REGION** - Your Azure region (e.g., 'eastus')
3. **AZURE_STATIC_WEB_APPS_API_TOKEN** - Generated when you create the Static Web App

### How It Works

1. During build, Angular replaces `environment.ts` with `environment.prod.ts` (via fileReplacements)
2. Webpack injects environment variables from `process.env.AZURE_SPEECH_KEY` and `process.env.AZURE_SPEECH_REGION`
3. These values are compiled into the production build
4. The GitHub Actions workflow passes secrets as environment variables during the build step

### Build Command

The GitHub Actions workflow runs:

```bash
npm run build -- --configuration production
```

With environment variables:

```bash
AZURE_SPEECH_KEY=${{ secrets.AZURE_SPEECH_KEY }}
AZURE_SPEECH_REGION=${{ secrets.AZURE_SPEECH_REGION }}
```

## Important Notes

- ⚠️ **Never commit `environment.local.ts` to version control** - it contains sensitive credentials
- ✅ The `.gitignore` file is configured to exclude `environment.local.ts`
- 🔒 Production secrets are stored in GitHub Secrets, not in code
- 📝 The `speech.store.ts` file imports from `environment.ts` which uses the appropriate file per environment

## Available Regions

Common Azure Speech Service regions:

- `eastus` - East US
- `westus2` - West US 2
- `centralus` - Central US
- `westeurope` - West Europe
- `northeurope` - North Europe
- `southeastasia` - Southeast Asia

[See full list of regions](https://learn.microsoft.com/azure/cognitive-services/speech-service/regions)
