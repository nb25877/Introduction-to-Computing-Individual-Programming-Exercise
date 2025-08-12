import dotenv from 'dotenv';

// Load environment variables from the .env file
dotenv.config();

import { MongoClient } from 'mongodb';

// Create a MongoDB client instance using the connection string from environment variables
const client = new MongoClient(process.env.MONGO_URI);

/**
 * Connect to the MongoDB database.
 * This function establishes a connection to the database and returns the database instance.
 */
async function connectToDb() {
  // Connect to the MongoDB server
  await client.connect();

  // Return the database instance specified by the environment variable MONGO_DB_NAME
  return client.db(process.env.MONGO_DB_NAME);
}

// Export the connectToDb function for use in other modules
export default connectToDb;