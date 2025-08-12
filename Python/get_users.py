import asyncio
import time
from datetime import datetime

async def get_users(graph_client, db):
    """
    Fetch all users from Microsoft Graph API with specific properties, handle pagination, throttling, and update MongoDB database.
    """
    try:
        # Define the user attributes to fetch
        select_fields = ",".join([
            "businessPhones", "displayName", "givenName", "jobTitle", "mail",
            "mobilePhone", "officeLocation", "preferredLanguage", "surname",
            "userPrincipalName", "id", "accountEnabled", "userType"
        ])

        # Prepare the initial request endpoint with the full URL
        base_url = "https://graph.microsoft.com/v1.0"
        endpoint = f'{base_url}/users?$select={select_fields}'
        next_page = endpoint

        # Initialize counters
        page_count = 0  # Track the number of pages processed
        user_count = 0  # Track the total number of users fetched
        new_users_count = 0  # Track the number of new users added
        modified_users_count = 0  # Track the number of users modified

        # Get the total number of users in the database
        total_users_in_db = db.users.count_documents({})
        print(f"Total users in DB: {total_users_in_db}")

        while next_page:
            response = await graph_client.users.with_url(next_page).get()

            users = response.value if hasattr(response, 'value') else []

            if users:  # Check if users exist in the response
                user_count += len(users)  # Increment the total user count
                for user in users:
                    user_id = user.id
                    user_data = {
                        "userId": user.id,
                        "displayName": user.display_name,
                        "email": user.mail,
                        "jobTitle": user.job_title,
                        "userPrincipalName": user.user_principal_name,
                        "mobilePhone": user.mobile_phone,
                        "businessPhones": user.business_phones,
                        "givenName": user.given_name,
                        "officeLocation": user.office_location,
                        "preferredLanguage": user.preferred_language,
                        "surname": user.surname,
                        "accountEnabled": user.account_enabled,
                        "userType": user.user_type
                    }

                    # Check if the user exists in the database
                    existing_user = db.users.find_one({"userId": user_id})

                    if existing_user:
                        # Check for modified properties
                        updates = {}
                        for key, value in user_data.items():
                            if existing_user.get(key) != value:
                                updates[key] = value

                        if updates:
                            # Update modified properties in the database
                            db.users.update_one({"userId": user_id}, {"$set": updates})
                            modified_users_count += 1
                            print(f"Modified user {user_id}: {updates}")
                    else:
                        # Add new user to the database
                        db.users.insert_one(user_data)
                        new_users_count += 1
                        # print(f"Added new user {user_id}: {user_data}")

            else:
                print("No users found or unexpected response format.")
                break

            # Handle pagination
            next_page = response.odata_next_link if hasattr(response, 'odata_next_link') else None
            page_count += 1  # Increment the page count

            # Handle throttling (retry mechanism)
            try:
                await asyncio.sleep(1)  # Small delay between requests
            except Exception as e:
                if hasattr(e, "status_code") and e.status_code == 429:  # Too many requests
                    retry_after = int(e.response_headers.get("Retry-After", 5))
                    print(f"Throttling detected. Retrying after {retry_after} seconds...")
                    time.sleep(retry_after)
                else:
                    raise e

        # Final summary
        print(f"Total users fetched from Azure AD: {user_count}")
        print(f"Total new users added: {new_users_count}")
        print(f"Total users modified: {modified_users_count}")
        print(f"Finished processing {page_count} pages.")

    except Exception as e:
        print(f"An error occurred while fetching users: {e}")