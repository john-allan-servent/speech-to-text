# Azure Static Web Apps Deployment Guide

## Overview

This application is configured to deploy to Azure Static Web Apps with environment variables securely injected at build time.

## How It Works

### Local Development

- Uses `environment.local.ts` (gitignored) with your actual Azure credentials
- `speech.store.ts` imports from `environment.ts`
- Safe for local development without exposing secrets

### Production Build

1. Angular's file replacement swaps `environment.ts` with `environment.prod.ts`
2. `environment.prod.ts` contains placeholder values: `__AZURE_SPEECH_KEY__` and `__AZURE_SPEECH_REGION__`
3. Application builds with placeholders embedded in JavaScript
4. GitHub Actions workflow replaces placeholders with actual secrets after build
5. Final build is deployed to Azure Static Web Apps

## Setup Instructions

### 1. Create Azure Resources

#### Speech Service

1. Go to [Azure Portal](https://portal.azure.com)
2. Create a new "Speech Service" resource
3. Note the **Key** and **Region** from "Keys and Endpoint"

#### Static Web App

1. Create a new "Static Web App" in Azure Portal
2. Connect to your GitHub repository
3. Configure build:
   - **App location**: `/`
   - **Output location**: `dist/speech-to-text-web/browser`
4. Copy the **deployment token** generated

### 2. Configure GitHub Secrets

In your GitHub repository, go to **Settings > Secrets and variables > Actions** and add:

| Secret Name                       | Value                                | Example           |
| --------------------------------- | ------------------------------------ | ----------------- |
| `AZURE_SPEECH_KEY`                | Your Speech Service Key 1 or Key 2   | `a1b2c3d4e5f6...` |
| `AZURE_SPEECH_REGION`             | Your Speech Service region           | `eastus`          |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | Deployment token from Static Web App | `token-value...`  |

### 3. Deploy

Simply push to the `main` branch:

```bash
git add .
git commit -m "Deploy to Azure"
git push origin main
```

GitHub Actions will automatically:

1. Build the Angular application
2. Replace environment variable placeholders
3. Deploy to Azure Static Web Apps

## Files Involved

### Environment Configuration

- `src/environments/environment.ts` - Development (imports local values)
- `src/environments/environment.local.ts` - Local credentials (gitignored)
- `src/environments/environment.prod.ts` - Production placeholders

### Build Configuration

- `angular.json` - File replacement configuration for production
- `.github/workflows/azure-static-web-apps.yml` - CI/CD pipeline
- `staticwebapp.config.json` - Azure Static Web App routing and CSP

### Application

- `src/app/store/speech.store.ts` - Uses environment configuration

## Security Features

✅ Local credentials never committed (gitignored)
✅ Production secrets stored in GitHub Secrets
✅ Placeholders replaced at build time (not compile time)
✅ CSP headers configured in `staticwebapp.config.json`
✅ No secrets in source code

## Troubleshooting

### Build fails with "Cannot find secrets"

- Verify GitHub Secrets are set correctly
- Check secret names match exactly (case-sensitive)

### Speech recognition doesn't work in production

- Check browser console for errors
- Verify Azure Speech Service allows requests from your domain
- Check CSP headers in `staticwebapp.config.json`

### Local development not working

- Verify `environment.local.ts` has your actual credentials
- Make sure you ran `npm install`
- Check that Azure Speech Service resource is active

## Cost Considerations

- **Azure Speech Service**: Pay-per-use (free tier available)
- **Azure Static Web Apps**: Free tier available for personal projects
- **GitHub Actions**: 2000 minutes/month free for public repos

## Related Documentation

- [Azure Speech Service](https://learn.microsoft.com/azure/cognitive-services/speech-service/)
- [Azure Static Web Apps](https://learn.microsoft.com/azure/static-web-apps/)
- [GitHub Actions](https://docs.github.com/en/actions)
