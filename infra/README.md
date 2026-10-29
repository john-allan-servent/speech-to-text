# Infrastructure (Bicep)

Resource-group-scoped deployment of everything the solution needs.

| Module | Resources |
|---|---|
| `modules/monitoring.bicep` | Log Analytics workspace, Application Insights |
| `modules/speech.bicep` | Azure AI Speech (`SpeechServices`, S0) |
| `modules/security.bicep` | User-assigned managed identity, Container Registry (Basic, no admin user), Key Vault (RBAC) holding the Speech key, `AcrPull` + `Key Vault Secrets User` role assignments |
| `modules/containerapp.bicep` | Container Apps environment + API Container App (external ingress, scale 0–3, `/healthz` probe, Speech key via Key Vault reference) |
| `modules/staticwebapp.bicep` | Static Web App (Standard) with the Container App as linked backend |

## Deploy

```bash
az group create -n rg-stt-dev -l westeurope
az deployment group create -g rg-stt-dev -f infra/main.bicep -p infra/main.dev.bicepparam
```

The first deployment uses a placeholder image so the Container App can be created before any image exists.
Then build and push the API image and redeploy with the real image:

```bash
az acr build -r <registryName> -t speech-api:v1 -f src/SpeechToText.Api/Dockerfile .
az deployment group create -g rg-stt-dev -f infra/main.bicep -p infra/main.dev.bicepparam \
  -p apiImage=<registryLoginServer>/speech-api:v1 apiTargetPort=8080
```

Outputs include the registry, Container App, Static Web App name/hostname and Key Vault name.

## Notes

- Static Web Apps **Standard** is required for linked backends and Entra ID auth. The linked backend means the SWA forwards
  `/api/*` to the Container App with the `x-ms-client-principal` header the API expects.
- If the first deploy fails with a Key Vault / ACR permission error, role assignments haven't propagated yet; re-run the deployment.
- Entra ID provider setup for the SWA (app registration, `auth` block in `staticwebapp.config.json`) is not part of these templates.
- To reuse an existing Speech resource, remove `modules/speech.bicep` from `main.bicep` and pass its name to `security.bicep`
  and its endpoint to `containerapp.bicep`.
