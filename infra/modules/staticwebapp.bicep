param location string
param backendRegion string
param tags object
param name string
param backendResourceId string

// Standard SKU is required for linked ("bring your own") backends and custom authentication.
resource staticWebApp 'Microsoft.Web/staticSites@2023-12-01' = {
  name: name
  location: location
  tags: tags
  sku: {
    name: 'Standard'
    tier: 'Standard'
  }
  properties: {}
}

resource linkedBackend 'Microsoft.Web/staticSites/linkedBackends@2023-12-01' = {
  parent: staticWebApp
  name: 'api'
  properties: {
    backendResourceId: backendResourceId
    region: backendRegion
  }
}

output name string = staticWebApp.name
output defaultHostname string = staticWebApp.properties.defaultHostname
