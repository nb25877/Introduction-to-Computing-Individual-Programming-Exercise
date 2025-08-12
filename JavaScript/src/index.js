import connectToDb from './mongoClient.js';
import fetchUsers from './fetchUsers.js';
import fetchSignInLogs from './fetchSignInLogs.js';
import fetchAuditLogs from './fetchAuditLogs.js';

// Main function to run all tasks sequentially
async function runAllTasks() {
  // Connect to the MongoDB database
  const db = await connectToDb();

  // Fetch user data from Microsoft Graph API and update the database
  console.log("Fetching Users...");
  await fetchUsers(db);

  // Fetch sign-in logs from Microsoft Graph API and update the database
  console.log("Fetching Sign-in Logs...");
  await fetchSignInLogs(db);

  // Fetch audit logs from Microsoft Graph API and update the database
  console.log("Fetching Audit Logs...");
  await fetchAuditLogs(db);

  // Log completion message and exit the process
  console.log("All tasks completed.");
  process.exit(0); // Exit the process successfully
}

// Run all tasks and handle any errors that occur
runAllTasks().catch((error) => {
  // Log the error and exit the process with a failure code
  console.error('Error running tasks:', error);
  process.exit(1); // Exit the process with an error code
});