# M365 Data Collector

## Overview
The **M365 Data Collector** is a Python application designed to fetch data from the Microsoft 365 Graph API and store it in a MongoDB database. It collects user data, sign-in logs, and audit logs, ensuring that only unique entries are stored and existing entries are updated with any modified properties. The application is built using modern Python practices and leverages the Microsoft Graph API SDK for seamless integration.

---

## Flow of Control and Logic

### 1. **`app.py`**
This is the entry point of the application. It orchestrates the execution of all tasks sequentially:
- **Connect to MongoDB**: Establishes a connection to the database using `mongo_client.py`.
- **Initialize Graph Client**: Authenticates and initializes the Microsoft Graph API client using `graph_client.py`.
- **Fetch Users**: Retrieves user data from the Microsoft Graph API and updates the database using `get_users.py`.
- **Fetch Sign-In Logs**: Retrieves sign-in logs from the Microsoft Graph API and updates the database using `get_sign_in_logs.py`.
- **Fetch Audit Logs**: Retrieves audit logs from the Microsoft Graph API and updates the database using `get_audit_logs.py`.

---

### 2. **`mongo_client.py`**
Handles the connection to the MongoDB database:
- **Environment Variables**: Loads the MongoDB connection string from the `.env` file.
- **Database Connection**: Establishes a connection to the MongoDB server and returns the database instance.

---

### 3. **`graph_client.py`**
Initializes the Microsoft Graph API Client:
- **Authentication**: Uses `ClientSecretCredential` from `azure.identity.aio` to authenticate requests to the Microsoft Graph API.
- **Access Token**: Fetches an access token for the API scope (`https://graph.microsoft.com/.default`).

---

### 4. **`get_users.py`**
Fetches user data from the Microsoft Graph API:
- **Pagination**: Handles paginated responses using `@odata.nextLink`.
- **Comparison**: Compares existing user properties in the database and updates modified fields.
- **Insertion**: Inserts new users into the database.
- **Summary**: Logs the total users fetched, new users added, and modified users.

---

### 5. **`get_sign_in_logs.py`**
Fetches sign-in logs from the Microsoft Graph API:
- **Residual Fetch**: Fetches logs created since the last fetch using `$filter=createdDateTime ge`.
- **Pagination**: Handles paginated responses using `@odata.nextLink`.
- **Upsert Logic**: Inserts new logs and updates existing ones using `update_one` with `upsert=True`.
- **Summary**: Logs the total logs fetched, duplicates found, and documents inserted.

---

### 6. **`get_audit_logs.py`**
Fetches audit logs from the Microsoft Graph API:
- **Residual Fetch**: Fetches logs created since the last fetch using `$filter=activityDateTime ge`.
- **Complex Object Handling**: Extracts and structures fields like `initiatedBy`, `targetResources`, and `additionalDetails`.
- **Pagination**: Handles paginated responses using `@odata.nextLink`.
- **Upsert Logic**: Inserts new logs and updates existing ones using `update_one` with `upsert=True`.
- **Summary**: Logs the total logs fetched, duplicates found, and documents inserted.

---

## Permissions Required for Microsoft Graph API
To use the Microsoft Graph API, the following permissions must be granted to the registered application in Azure Active Directory:
- **User.Read.All**: To fetch user data.
- **AuditLog.Read.All**: To fetch audit logs.
- **SignInActivity.Read.All**: To fetch sign-in logs.

Ensure these permissions are granted in the Azure portal under the "API permissions" section of the registered application.

---

## Environment Variables
The application requires the following environment variables to be defined in a `.env` file:

```properties
# The Client ID of the registered application in Azure Active Directory
GRAPH_CLIENT_ID=<Your_Client_ID>

# The Client Secret of the registered application in Azure Active Directory
GRAPH_CLIENT_SECRET=<Your_Client_Secret>

# The Tenant ID of the Azure Active Directory instance
GRAPH_TENANT_ID=<Your_Tenant_ID>

# The connection string for the MongoDB database
MONGO_URI=<Your_MongoDB_Connection_String>