import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';

// Create a credential object using ClientSecretCredential
// This credential is used to authenticate requests to the Microsoft Graph API
const credential = new ClientSecretCredential(
  process.env.GRAPH_TENANT_ID, // Tenant ID of the Azure AD
  process.env.GRAPH_CLIENT_ID, // Client ID of the registered application
  process.env.GRAPH_CLIENT_SECRET // Client secret of the registered application
);

// Initialize the Microsoft Graph client with middleware
const graphClient = Client.initWithMiddleware({
  // Define the authentication provider
  authProvider: {
    // Function to fetch an access token for the Microsoft Graph API
    getAccessToken: async () => {
      // Request an access token for the Microsoft Graph API scope
      const token = await credential.getToken("https://graph.microsoft.com/.default");
      return token.token; // Return the token string
    },
  },
});

// Export the initialized Graph client for use in other modules
export default graphClient;