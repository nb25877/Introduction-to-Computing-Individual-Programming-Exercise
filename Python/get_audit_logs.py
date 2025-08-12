import datetime  # Ensure the datetime module is imported

async def get_audit_logs(graph_client, db):
    """
    Fetch directory audit logs from Microsoft Graph API and update the database.
    """
    try:
        print("Starting to fetch audit logs from Microsoft Graph API...")
        # Ensure a unique index on logId
        db.audit_logs.create_index("logId", unique=True)

        # Initialize counters and metadata variables
        inserted_count = 0
        duplicate_count = 0
        log_count = 0
        first_log_timestamp = None
        first_log_id = None

        # Fetch the last fetch metadata from the database
        metadata = db.fetch_metadata.find_one({"type": "audit_logs"})
        last_fetch_timestamp = metadata["lastFetchTimestamp"] if metadata else None

        # Ensure the timestamp is in ISO 8601 format
        if last_fetch_timestamp and isinstance(last_fetch_timestamp, datetime.datetime):
            last_fetch_timestamp = last_fetch_timestamp.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"

        # Build the query URL
        query_url = "https://graph.microsoft.com/v1.0/auditLogs/directoryAudits"
        if last_fetch_timestamp:
            query_url += f"?$filter=activityDateTime ge {last_fetch_timestamp}"

        next_page = query_url

        while next_page:
            print(f"Fetching audit logs from: {next_page}")
            logs = await graph_client.audit_logs.directory_audits.with_url(next_page).get()

            if logs and hasattr(logs, 'value'):
                for log in logs.value:

                    # Use the correct field name for activityDateTime
                    activity_date_time = getattr(log, 'activityDateTime', None) or getattr(log, 'activity_date_time', None)

                    if first_log_timestamp is None and first_log_id is None:
                        first_log_timestamp = activity_date_time
                        first_log_id = log.id

                    # Convert complex objects to dictionaries
                    initiated_by_app = {
                        "appId": log.initiated_by.app.app_id if log.initiated_by and log.initiated_by.app else None,
                        "displayName": log.initiated_by.app.display_name if log.initiated_by and log.initiated_by.app else None,
                        "servicePrincipalId": log.initiated_by.app.service_principal_id if log.initiated_by and log.initiated_by.app else None,
                        "servicePrincipalName": log.initiated_by.app.service_principal_name if log.initiated_by and log.initiated_by.app else None,
                    }
                    target_resources = [
                        {
                            "id": resource.id,
                            "displayName": resource.display_name,
                            "type": resource.type,
                            "modifiedProperties": [
                                {
                                    "displayName": prop.display_name,
                                    "oldValue": prop.old_value,
                                    "newValue": prop.new_value,
                                }
                                for prop in resource.modified_properties
                            ] if resource.modified_properties else [],
                        }
                        for resource in log.target_resources
                    ] if log.target_resources else []
                    additional_details = [
                        {
                            "key": detail.key,
                            "value": detail.value,
                        }
                        for detail in log.additional_details
                    ] if log.additional_details else []

                    # Prepare log data for insertion
                    log_data = {
                        "logId": log.id,
                        "category": log.category,
                        "activityDateTime": activity_date_time,
                        "activityDisplayName": log.activity_display_name,
                        "operationType": log.operation_type,
                        "initiatedBy": {
                            "app": initiated_by_app,
                        },
                        "targetResources": target_resources,
                        "additionalDetails": additional_details,
                    }

                    # Insert or update the log in the database
                    try:
                        result = db.audit_logs.update_one(
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
                        logger.error(f"Error processing log ID: {log.id} - {e}")

            else:
                logger.warning("No audit logs found or unexpected response format.")
                break

            # Handle pagination
            next_page = logs.odata_next_link if hasattr(logs, 'odata_next_link') else None

        # Summary
        print(f"Total audit logs fetched from Graph API: {log_count}")
        print(f"Duplicates found: {duplicate_count}")
        print(f"Documents inserted into DB: {inserted_count}")

        # Update the metadata with the first log's timestamp and ID
        if first_log_timestamp and first_log_id:
            db.fetch_metadata.update_one(
                {"type": "audit_logs"},
                {"$set": {"lastFetchTimestamp": first_log_timestamp, "lastLogId": first_log_id}},
                upsert=True
            )
            print(f"Updated last fetch metadata: timestamp={first_log_timestamp}, logId={first_log_id}")

        print(f"Finished processing {log_count} audit logs.")

    except Exception as e:
        print(f"An error occurred while fetching audit logs: {e}")