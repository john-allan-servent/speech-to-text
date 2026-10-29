// Development environment configuration
// For local development, use environment.local.ts (gitignored)
// For Azure Static Web Apps, environment variables are injected at build time

export const environment = {
  production: false,
  azure: {
    speechKey: "",
    speechRegion: "",
  },
};
