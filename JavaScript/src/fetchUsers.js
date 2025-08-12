import graphClient from './graphClient.js';

async function fetchUsers(db) {
  try {
    // Define the user attributes to fetch
    const selectFields = [
      "businessPhones", "displayName", "givenName", "jobTitle", "mail",
      "mobilePhone", "officeLocation", "preferredLanguage", "surname",
      "userPrincipalName", "id", "accountEnabled", "userType"
    ].join(',');

    // Prepare the initial request
    let nextPage = graphClient.api('/users').select(selectFields);

    // Initialize counters
    let pageCount = 0;
    let userCount = 0;
    let newUsersCount = 0;
    let modifiedUsersCount = 0;

    // Get the total number of users in the database
    const totalUsersInDb = await db.collection('users').countDocuments({});
    console.log(`Total users in DB: ${totalUsersInDb}`);

    while (nextPage) {
      const response = await nextPage.get();
      const users = response.value || [];

      if (users.length > 0) {
        userCount += users.length;

        for (const user of users) {
          const userId = user.id;
          const userData = {
            userId: user.id,
            displayName: user.displayName,
            email: user.mail,
            jobTitle: user.jobTitle,
            userPrincipalName: user.userPrincipalName,
            mobilePhone: user.mobilePhone,
            businessPhones: user.businessPhones || [], // Ensure it's always an array
            givenName: user.givenName,
            officeLocation: user.officeLocation,
            preferredLanguage: user.preferredLanguage,
            surname: user.surname,
            accountEnabled: user.accountEnabled,
            userType: user.userType
          };

          // Check if the user exists in the database
          const existingUser = await db.collection('users').findOne({ userId });

          if (existingUser) {
            // Check for modified properties
            const updates = {};
            for (const [key, value] of Object.entries(userData)) {
              if (Array.isArray(value)) {
                // Compare arrays for equality
                if (!arraysEqual(existingUser[key], value)) {
                  updates[key] = value;
                }
              } else if (existingUser[key] !== value) {
                updates[key] = value;
              }
            }

            if (Object.keys(updates).length > 0) {
              // Update modified properties in the database
              await db.collection('users').updateOne({ userId }, { $set: updates });
              modifiedUsersCount++;
              console.log(`Modified user ${userId}:`, updates);
            }
          } else {
            // Add new user to the database
            await db.collection('users').insertOne(userData);
            newUsersCount++;
            // console.log(`Added new user ${userId}:`);
          }
        }
      } else {
        console.log("No users found or unexpected response format.");
        break;
      }

      // Handle pagination
      nextPage = response['@odata.nextLink'] ? graphClient.api(response['@odata.nextLink']) : null;
      pageCount++;

      // Small delay between requests to avoid throttling
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Final summary
    console.log(`Total users fetched from Azure AD: ${userCount}`);
    console.log(`Total new users added: ${newUsersCount}`);
    console.log(`Total users modified: ${modifiedUsersCount}`);
    console.log(`Finished processing ${pageCount} pages.`);
  } catch (error) {
    console.error(`An error occurred while fetching users: ${error}`);
  }
}

// Helper function to compare arrays for equality
function arraysEqual(arr1, arr2) {
  if (!Array.isArray(arr1) || !Array.isArray(arr2)) return false;
  if (arr1.length !== arr2.length) return false;
  return arr1.every((value, index) => value === arr2[index]);
}

export default fetchUsers;