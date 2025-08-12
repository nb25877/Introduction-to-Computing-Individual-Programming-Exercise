import asyncio
from graph_client import get_graph_client
from mongo_client import get_mongo_client
from get_users import get_users
from get_sign_in_logs import get_sign_in_logs
from get_audit_logs import get_audit_logs

async def run_all_tasks(graph_client, db):

    # This function runs all asynchronous tasks sequentially within a single event loop.
    
    print("Fetching all Users...")
    # Fetch all users from Microsoft Graph and update MongoDB.
    await get_users(graph_client, db)

    print("Fetching all Sign-in Logs...")
    # Fetch all sign-in logs from Microsoft Graph and update MongoDB.
    await get_sign_in_logs(graph_client, db)
    
    print("Fetching all Audit Logs...")
    # Fetch all audit logs from Microsoft Graph and update MongoDB.
    await get_audit_logs(graph_client, db)

def main():
    # Main function to initialize clients and run tasks.

    # Initialize Microsoft Graph client
    graph_client = get_graph_client()

    # Initialize MongoDB client
    mongo_client = get_mongo_client()
    db = mongo_client.get_database()

    # Use a single event loop to run all tasks
    asyncio.run(run_all_tasks(graph_client, db))

if __name__ == "__main__":
    # If this script is executed directly, start the main function.
    main()