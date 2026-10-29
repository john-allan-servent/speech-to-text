targetScope = 'resourceGroup'

@description('Short name used as a prefix for all resources.')
@minLength(3)
@maxLength(12)
param workloadName string = 'stt'

@description('Environment name (dev, test, prod).')
param environmentName string = 'dev'

@description('Primary region for all resources except the Static Web App (which has its own supported region list).')
param location string = resourceGroup().location

@description('Region for the Static Web App.')
@allowed(['westus2', 'centralus', 'eastus2', 'westeurope', 'eastasia'])
param staticWebAppLocation string = 'westeurope'

@description('Container image for the API. The default is a placeholder; CI/CD replaces it after the first push to ACR.')
param apiImage string = 'mcr.microsoft.com/k8se/quickstart:latest'

@description('Port the API container listens on. Use 8080 for the real API image, 80 for the placeholder.')
param apiTargetPort int = 80

@description('Speech SDK language.')
param speechLanguage string = 'en-US'

@description('Tags applied to all resources.')
param tags object = {
  workload: 'speech-to-text'
  environment: environmentName
}

var suffix = uniqueString(resourceGroup().id, workloadName, environmentName)
var baseName = '${workloadName}-${environmentName}'

module monitoring 'modules/monitoring.bicep' = {
  name: 'monitoring'
  params: {
    location: location
    tags: tags
    logAnalyticsName: 'log-${baseName}-${suffix}'
    appInsightsName: 'appi-${baseName}-${suffix}'
  }
}

module speech 'modules/speech.bicep' = {
  name: 'speech'
  params: {
    location: location
    tags: tags
    name: 'spch-${baseName}-${suffix}'
    customSubDomainName: 'spch-${baseName}-${suffix}'
  }
}

module security 'modules/security.bicep' = {
  name: 'security'
  params: {
    location: location
    tags: tags
    identityName: 'id-${baseName}-api'
    registryName: 'acr${workloadName}${environmentName}${suffix}'
    keyVaultName: take('kv-${baseName}-${suffix}', 24)
    speechAccountName: speech.outputs.name
  }
}

module containerApp 'modules/containerapp.bicep' = {
  name: 'containerApp'
  params: {
    location: location
    tags: tags
    environmentName: 'cae-${baseName}'
    appName: 'ca-${baseName}-api'
    logAnalyticsName: monitoring.outputs.logAnalyticsName
    appInsightsConnectionString: monitoring.outputs.appInsightsConnectionString
    identityId: security.outputs.identityId
    registryLoginServer: security.outputs.registryLoginServer
    speechKeySecretUri: security.outputs.speechKeySecretUri
    speechRegion: location
    speechEndpoint: speech.outputs.endpoint
    speechLanguage: speechLanguage
    image: apiImage
    targetPort: apiTargetPort
  }
}

module staticWebApp 'modules/staticwebapp.bicep' = {
  name: 'staticWebApp'
  params: {
    location: staticWebAppLocation
    backendRegion: location
    tags: tags
    name: 'stapp-${baseName}-${suffix}'
    backendResourceId: containerApp.outputs.appId
  }
}

output apiUrl string = containerApp.outputs.fqdn
output containerAppName string = containerApp.outputs.appName
output registryLoginServer string = security.outputs.registryLoginServer
output registryName string = security.outputs.registryName
output staticWebAppName string = staticWebApp.outputs.name
output staticWebAppHostname string = staticWebApp.outputs.defaultHostname
output keyVaultName string = security.outputs.keyVaultName
output speechAccountName string = speech.outputs.name
