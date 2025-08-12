import graphClient from './graphClient.js';

async function fetchSignInLogs(db) {
  try {
    // Ensure a unique index on logId to prevent duplicate entries in the database
    await db.collection('signin_logs').createIndex({ logId: 1 }, { unique: true });

    // Initialize counters and metadata variables
    let insertedCount = 0;
    let duplicateCount = 0;
    let logCount = 0;
    let firstLogTimestamp = null;
    let firstLogId = null;

    // Fetch the last fetch metadata from the database to determine the starting point for fetching logs
    const metadata = await db.collection('fetch_metadata').findOne({ type: 'sign_in_logs' });
    let lastFetchTimestamp = metadata?.lastFetchTimestamp || null;

    // Convert the last fetch timestamp to ISO 8601 format if it exists
    if (lastFetchTimestamp) {
      const date = new Date(lastFetchTimestamp);
      lastFetchTimestamp = date.toISOString();
    }

    // Build the initial query URL for fetching sign-in logs
    let nextPage = '/auditLogs/signIns';
    if (lastFetchTimestamp) {
      nextPage += `?$filter=createdDateTime ge ${lastFetchTimestamp}`;
    }

    // Loop to fetch sign-in logs page by page until there are no more pages
    while (nextPage) {
      console.log(`Fetching logs from: ${nextPage}`);
      const response = await graphClient.api(nextPage).get();

      // Check if the response contains logs
      const logs = response.value || [];
      if (logs.length > 0) {
        // Iterate over each log in the current page
        for (const log of logs) {
          const createdDateTime = log.createdDateTime;

          // Set the timestamp and ID of the first log fetched (used for metadata updates later)
          if (!firstLogTimestamp && !firstLogId) {
            firstLogTimestamp = createdDateTime;
            firstLogId = log.id;
          }

          // Prepare the structured log data for insertion into the database
          const logData = {
            logId: log.id,
            createdDateTime,
            userDisplayName: log.userDisplayName,
            userPrincipalName: log.userPrincipalName,
            userId: log.userId,
            appId: log.appId,
            appDisplayName: log.appDisplayName,
            ipAddress: log.ipAddress,
            clientAppUsed: log.clientAppUsed,
            correlationId: log.correlationId,
            conditionalAccessStatus: String(log.conditionalAccessStatus),
            isInteractive: log.isInteractive,
            riskDetail: String(log.riskDetail),
            riskLevelAggregated: String(log.riskLevelAggregated),
            riskLevelDuringSignIn: String(log.riskLevelDuringSignIn),
            riskState: String(log.riskState),
            resourceDisplayName: log.resourceDisplayName,
            resourceId: log.resourceId,
            status: {
              errorCode: log.status?.errorCode || null,
              failureReason: log.status?.failureReason || null,
              additionalDetails: log.status?.additionalDetails || null,
            },
          };

          // Try to insert or update the log in the database
          try {
            const result = await db.collection('signin_logs').updateOne(
              { logId: log.id },
              { $set: logData },
              { upsert: true }
            );

            // Increment counters based on whether the log was inserted or updated
            if (result.upsertedId) {
              insertedCount++;
            } else {
              duplicateCount++;
            }

            logCount++;
          } catch (error) {
            console.error(`Error processing log ID: ${log.id} - ${error}`);
          }
        }
      } else {
        // If no logs are found in the response, exit the loop
        console.log("No sign-in logs found or unexpected response format.");
        break;
      }

      // Update the nextPage variable with the URL for the next page of logs, if available
      nextPage = response['@odata.nextLink'] || null;
    }

    // Print a summary of the query results
    console.log(`Query Summary:`);
    console.log(`Total logs fetched from Graph API: ${logCount}`);
    console.log(`Duplicates found: ${duplicateCount}`);
    console.log(`Documents inserted into DB: ${insertedCount}`);

    // Update the metadata with the timestamp and ID of the first log fetched
    if (firstLogTimestamp && firstLogId) {
      await db.collection('fetch_metadata').updateOne(
        { type: 'sign_in_logs' },
        { $set: { lastFetchTimestamp: firstLogTimestamp, lastLogId: firstLogId } },
        { upsert: true }
      );
      console.log(`Updated last fetch metadata: timestamp=${firstLogTimestamp}, logId=${firstLogId}`);
    }

    console.log(`Finished processing ${logCount} sign-in logs.`);
  } catch (error) {
    // Log any errors that occur during the process
    console.error(`An error occurred while fetching sign-in logs: ${error}`);
  }
}

export default fetchSignInLogs;