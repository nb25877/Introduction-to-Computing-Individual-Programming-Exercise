import os
from dotenv import load_dotenv
from pymongo import MongoClient

# Load environment variables
load_dotenv()

def get_mongo_client():
    """
    Initializes and returns a MongoDB client.
    """
    MONGO_URI = os.getenv("MONGO_URI")

    if not MONGO_URI:
        raise ValueError("MongoDB URI is missing in the environment variables.")

    return MongoClient(MONGO_URI)