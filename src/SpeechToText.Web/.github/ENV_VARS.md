# Environment Variables Quick Reference

## Local Development

Edit `src/environments/environment.local.ts`:

```typescript
export const environment = {
  production: false,
  azure: {
    speechKey: "YOUR_KEY_HERE", // ← Add your Azure Speech Service key
    speechRegion: "YOUR_REGION_HERE", // ← Add your region (e.g., 'eastus')
  },
};
```

**Get your credentials:**

1. Azure Portal → Speech Service resource
2. "Keys and Endpoint" section
3. Copy Key 1 and Location/Region

---

## Azure Production Deployment

### GitHub Secrets Required

Go to: **GitHub Repository → Settings → Secrets and variables → Actions**

Add these secrets:

```
AZURE_SPEECH_KEY=<your-speech-service-key>
AZURE_SPEECH_REGION=<your-region>
AZURE_STATIC_WEB_APPS_API_TOKEN=<deployment-token>
```

### Files That Use Environment Variables

| File                   | Purpose               | Uses                           |
| ---------------------- | --------------------- | ------------------------------ |
| `environment.local.ts` | Local dev credentials | Your real keys (gitignored)    |
| `environment.ts`       | Dev template          | Empty placeholders             |
| `environment.prod.ts`  | Production            | Placeholders replaced at build |
| `speech.store.ts`      | Application code      | Imports environment            |

### Deployment Flow

```
1. Push to main branch
   ↓
2. GitHub Actions triggers
   ↓
3. Build Angular app (with environment.prod.ts)
   ↓
4. Replace __AZURE_SPEECH_KEY__ with secret value
   ↓
5. Replace __AZURE_SPEECH_REGION__ with secret value
   ↓
6. Deploy to Azure Static Web Apps
```

---

## Security Checklist

- [ ] `environment.local.ts` is in `.gitignore`
- [ ] No hardcoded keys in `speech.store.ts`
- [ ] GitHub Secrets configured
- [ ] Azure Speech Service keys rotated if ever exposed
- [ ] CSP headers configured in `staticwebapp.config.json`

---

## Common Regions

| Region Code     | Location       |
| --------------- | -------------- |
| `eastus`        | East US        |
| `westus2`       | West US 2      |
| `centralus`     | Central US     |
| `westeurope`    | West Europe    |
| `northeurope`   | North Europe   |
| `southeastasia` | Southeast Asia |
| `japaneast`     | Japan East     |
| `australiaeast` | Australia East |

[Full list](https://learn.microsoft.com/azure/cognitive-services/speech-service/regions)
