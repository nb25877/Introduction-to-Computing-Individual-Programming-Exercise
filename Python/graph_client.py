import os
from dotenv import load_dotenv
from azure.identity.aio import ClientSecretCredential
from msgraph import GraphServiceClient

# Load environment variables
load_dotenv()

def get_graph_client():
    """
    Initializes and returns a Microsoft Graph client using msgraph-sdk.
    """
    GRAPH_CLIENT_ID = os.getenv("GRAPH_CLIENT_ID")
    GRAPH_CLIENT_SECRET = os.getenv("GRAPH_CLIENT_SECRET")
    GRAPH_TENANT_ID = os.getenv("GRAPH_TENANT_ID")

    if not GRAPH_CLIENT_ID or not GRAPH_CLIENT_SECRET or not GRAPH_TENANT_ID:
        raise ValueError("Microsoft Graph credentials are missing in the environment variables.")

    # Authenticate using Azure Identity's ClientSecretCredential
    credential = ClientSecretCredential(
        tenant_id=GRAPH_TENANT_ID,
        client_id=GRAPH_CLIENT_ID,
        client_secret=GRAPH_CLIENT_SECRET
    )

    # Define the required scopes
    scopes = ['https://graph.microsoft.com/.default']

    # Initialize the Graph client
    graph_client = GraphServiceClient(credentials=credential, scopes=scopes)

    return graph_client