# Speech to Text

Single solution combining the former console app and Angular web app.

```
speech-to-text.slnx
src/
  SpeechToText.Core/   Recognition + diarization logic (ported from the console app)
  SpeechToText.Api/    ASP.NET Core minimal API (Dockerfile included)
  SpeechToText.Web/    Angular app (hosted on Azure Static Web Apps)
infra/                 Bicep templates (see infra/README.md)
.legacy-git/           Original .git folders of the two repos (not tracked; see below)
```

## API

| Endpoint | Purpose |
|---|---|
| `POST /api/speech/token` | Exchanges the Speech key for a short-lived token (browser should not hold the key) |
| `POST /api/speech/recognize?mode=once\|continuous` | Multipart `file` (.wav) → text + phrases |
| `POST /api/speech/diarize` | Multipart `file` (.wav) → phrases with speaker IDs |
| `GET /healthz` | Health probe |

Auth: requests must carry the Static Web Apps `x-ms-client-principal` header with the `authenticated` role
(set `Auth:RequireSwaPrincipal=false` for local development).

Configuration (`Speech:Key`, `Speech:Region`, `Speech:Endpoint`, `Speech:Language`) via environment variables
(`Speech__Key`, …), user-secrets or Key Vault references. Never commit keys.

### Run locally

```bash
dotnet user-secrets --project src/SpeechToText.Api set Speech:Key "<key>"
dotnet user-secrets --project src/SpeechToText.Api set Speech:Region "eastus"
Auth__RequireSwaPrincipal=false dotnet run --project src/SpeechToText.Api
```

Container: `docker build -f src/SpeechToText.Api/Dockerfile -t speech-api .`

## Hosting recommendation

- **API → Azure Container Apps** (scale-to-zero, no HTTP timeout ceiling for long diarization, easy Speech SDK native deps,
  managed identity + Key Vault). Azure Functions Flex is a lighter alternative; App Service works but is always-on.
- **Web → Azure Static Web Apps (Standard)** with Entra ID auth, linking the Container App as a "bring your own API"
  (`az staticwebapp backends link`).
- Supporting: Azure AI Speech, Key Vault, Container Registry, Log Analytics + Application Insights.

The microphone mode of the old console app is intentionally not server-side; the browser handles microphone capture.

## Not done yet (follow-ups)

- Angular: switch from the embedded key to `/api/speech/token` (`SpeechConfig.fromAuthorizationToken`), add file upload/diarization UI,
  update `staticwebapp.config.json` (auth routes, CSP) and the existing GitHub workflow paths (app moved to `src/SpeechToText.Web`).
- API CI/CD workflow (infrastructure is in `infra/`).
- Both original repos' git history lives in `.legacy-git/web-git` and `.legacy-git/console-git`; combine with
  `git subtree`/`git filter-repo` when creating the single repository.
