// Production environment configuration
// These placeholder values will be replaced during the build process
// The GitHub Actions workflow will use environment variables to replace these

export const environment = {
  production: true,
  azure: {
    speechKey: "__AZURE_SPEECH_KEY__",
    speechRegion: "__AZURE_SPEECH_REGION__",
  },
};
