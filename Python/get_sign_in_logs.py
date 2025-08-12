import datetime  # Ensure the datetime module is imported

async def get_sign_in_logs(graph_client, db):
    """
    Fetch sign-in logs from Microsoft Graph API since the last fetch and update the database.
    """
    try:
        # Ensure a unique index on logId
        db.sign_in_logs.create_index("logId", unique=True)

        # Initialize counters and metadata variables
        inserted_count = 0
        duplicate_count = 0
        log_count = 0
        first_log_timestamp = None
        first_log_id = None

        # Fetch the last fetch metadata from the database
        metadata = db.fetch_metadata.find_one({"type": "sign_in_logs"})
        last_fetch_timestamp = metadata["lastFetchTimestamp"] if metadata and "lastFetchTimestamp" in metadata else None

        # Ensure the timestamp is in ISO 8601 format
        if last_fetch_timestamp and isinstance(last_fetch_timestamp, datetime.datetime):
            last_fetch_timestamp = last_fetch_timestamp.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"

        # Build the query URL
        query_url = "https://graph.microsoft.com/v1.0/auditLogs/signIns"
        if last_fetch_timestamp:
            query_url += f"?$filter=createdDateTime ge {last_fetch_timestamp}"

        next_page = query_url

        while next_page:
            print(f"Fetching logs from: {next_page}")
            logs = await graph_client.audit_logs.sign_ins.with_url(next_page).get()

            if logs and hasattr(logs, 'value'):
                for log in logs.value:
                    created_date_time = getattr(log, 'created_date_time', None)

                    if first_log_timestamp is None and first_log_id is None:
                        first_log_timestamp = created_date_time
                        first_log_id = log.id

                    # Prepare log data for insertion
                    log_data = {
                        "logId": log.id,
                        "createdDateTime": created_date_time,
                        "userDisplayName": log.user_display_name,
                        "userPrincipalName": log.user_principal_name,
                        "userId": log.user_id,
                        "appId": log.app_id,
                        "appDisplayName": log.app_display_name,
                        "ipAddress": log.ip_address,
                        "clientAppUsed": log.client_app_used,
                        "correlationId": log.correlation_id,
                        "conditionalAccessStatus": str(log.conditional_access_status),
                        "isInteractive": log.is_interactive,
                        "riskDetail": str(log.risk_detail),
                        "riskLevelAggregated": str(log.risk_level_aggregated),
                        "riskLevelDuringSignIn": str(log.risk_level_during_sign_in),
                        "riskState": str(log.risk_state),
                        "resourceDisplayName": log.resource_display_name,
                        "resourceId": log.resource_id,
                        "status": {
                            "errorCode": log.status.error_code if hasattr(log.status, 'error_code') else None,
                            "failureReason": log.status.failure_reason if hasattr(log.status, 'failure_reason') else None,
                            "additionalDetails": log.status.additional_details if hasattr(log.status, 'additional_details') else None,
                        },
                    }

                    # Insert or update the log in the database
                    try:
                        result = db.sign_in_logs.update_one(
                            {"logId": log.id},
                            {"$set": log_data},
                            upsert=True
                        )

                        if result.upserted_id:
                            inserted_count += 1
                        else:
                            duplicate_count += 1

                        log_count += 1
                    except Exception as e:
                        print(f"Error processing log ID: {log.id} - {e}")

            else:
                print("No sign-in logs found or unexpected response format.")
                break

            # Handle pagination
            next_page = logs.odata_next_link if hasattr(logs, 'odata_next_link') else None

        # Summary
        print(f"Query Summary:")
        print(f"Total logs fetched from Graph API: {log_count}")
        print(f"Duplicates found: {duplicate_count}")
        print(f"Documents inserted into DB: {inserted_count}")

        if first_log_timestamp and first_log_id:
            db.fetch_metadata.update_one(
                {"type": "sign_in_logs"},
                {"$set": {"lastFetchTimestamp": first_log_timestamp, "lastLogId": first_log_id}},
                upsert=True
            )
            print(f"Updated last fetch metadata: timestamp={first_log_timestamp}, logId={first_log_id}")

        print(f"Finished processing {log_count} sign-in logs.")

    except Exception as e:
        print(f"An error occurred while fetching sign-in logs: {e}")