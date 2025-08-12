import graphClient from './graphClient.js';

async function fetchAuditLogs(db) {
  try {
    console.log("Starting to fetch audit logs from Microsoft Graph API...");

    // Ensure a unique index on logId to prevent duplicate entries
    await db.collection('audit_logs').createIndex({ logId: 1 }, { unique: true });

    let insertedCount = 0;
    let duplicateCount = 0;
    let logCount = 0;
    let firstLogTimestamp = null;
    let firstLogId = null;

    // Fetch the last fetch metadata from the database to determine the starting point for fetching logs
    const metadata = await db.collection('fetch_metadata').findOne({ type: 'audit_logs' });
    let lastFetchTimestamp = metadata?.lastFetchTimestamp || null;

    // Convert the last fetch timestamp to ISO 8601 format if it exists
    if (lastFetchTimestamp) {
      const date = new Date(lastFetchTimestamp);
      lastFetchTimestamp = date.toISOString();
    }

    // Build the initial query URL for fetching audit logs
    let nextPage = '/auditLogs/directoryAudits';
    if (lastFetchTimestamp) {
      nextPage += `?$filter=activityDateTime ge ${lastFetchTimestamp}`;
    }

    // Loop to fetch audit logs page by page until there are no more pages
    while (nextPage) {
      console.log(`Fetching audit logs from: ${nextPage}`);
      const response = await graphClient.api(nextPage).get();

      // Check if the response contains logs
      const logs = response.value || [];
      if (logs.length > 0) {
        // Iterate over each log in the current page
        for (const log of logs) {
          const activityDateTime = log.activityDateTime;

          // Set the timestamp and ID of the first log fetched (used for metadata updates later)
          if (!firstLogTimestamp && !firstLogId) {
            firstLogTimestamp = activityDateTime;
            firstLogId = log.id;
          }

          // Extract and structure the "initiatedBy" field from the log
          const initiatedByApp = {
            appId: log.initiatedBy?.app?.appId || null,
            displayName: log.initiatedBy?.app?.displayName || null,
            servicePrincipalId: log.initiatedBy?.app?.servicePrincipalId || null,
            servicePrincipalName: log.initiatedBy?.app?.servicePrincipalName || null,
          };

          // Map the "targetResources" field to extract relevant details
          const targetResources = log.targetResources?.map(resource => ({
            id: resource.id,
            displayName: resource.displayName,
            type: resource.type,
            modifiedProperties: resource.modifiedProperties?.map(prop => ({
              displayName: prop.displayName,
              oldValue: prop.oldValue,
              newValue: prop.newValue,
            })) || [],
          })) || [];

          // Map the "additionalDetails" field to extract key-value pairs
          const additionalDetails = log.additionalDetails?.map(detail => ({
            key: detail.key,
            value: detail.value,
          })) || [];

          // Prepare the structured log data for insertion into the database
          const logData = {
            logId: log.id,
            category: log.category,
            activityDateTime,
            activityDisplayName: log.activityDisplayName,
            operationType: log.operationType,
            initiatedBy: {
              app: initiatedByApp,
            },
            targetResources,
            additionalDetails,
          };

          // Try to insert or update the log in the database
          try {
            const result = await db.collection('audit_logs').updateOne(
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
        console.warn("No audit logs found or unexpected response format.");
        break;
      }

      // Update the nextPage variable with the URL for the next page of logs, if available
      nextPage = response['@odata.nextLink'] || null;
    }

    // Print a summary of the query results
    console.log(`Query Summary:`);
    console.log(`Total audit logs fetched from Graph API: ${logCount}`);
    console.log(`Duplicates found: ${duplicateCount}`);
    console.log(`Documents inserted into DB: ${insertedCount}`);

    // Update the metadata with the timestamp and ID of the first log fetched
    if (firstLogTimestamp && firstLogId) {
      await db.collection('fetch_metadata').updateOne(
        { type: 'audit_logs' },
        { $set: { lastFetchTimestamp: firstLogTimestamp, lastLogId: firstLogId } },
        { upsert: true }
      );
      console.log(`Updated last fetch metadata: timestamp=${firstLogTimestamp}, logId=${firstLogId}`);
    }

    console.log(`Finished processing ${logCount} audit logs.`);
  } catch (error) {
    // Log any errors that occur during the process
    console.error(`An error occurred while fetching audit logs: ${error}`);
  }
}

export default fetchAuditLogs;