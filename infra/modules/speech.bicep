param location string
param tags object
param name string
param customSubDomainName string

resource speech 'Microsoft.CognitiveServices/accounts@2024-10-01' = {
  name: name
  location: location
  tags: tags
  kind: 'SpeechServices'
  sku: { name: 'S0' }
  properties: {
    customSubDomainName: customSubDomainName
    publicNetworkAccess: 'Enabled'
  }
}

output name string = speech.name
output endpoint string = speech.properties.endpoint
