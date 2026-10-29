using 'main.bicep'

param workloadName = 'stt'
param environmentName = 'dev'
param location = 'westeurope'
param staticWebAppLocation = 'westeurope'
// After the first image push, redeploy with: apiImage = '<acr>.azurecr.io/speech-api:<tag>' and apiTargetPort = 8080
param apiImage = 'mcr.microsoft.com/k8se/quickstart:latest'
param apiTargetPort = 80
