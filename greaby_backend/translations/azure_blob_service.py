# translations/azure_blob_service.py

import logging
from datetime import datetime, timedelta, timezone
from django.conf import settings
from azure.storage.blob import (
    BlobServiceClient,
    generate_container_sas,
    ContainerSasPermissions,
)

logger = logging.getLogger(__name__)

def generate_container_sas_url(container_name: str, permission: str) -> str:
    """
    Generates a SAS URL for an Azure Blob Storage container.
    Permissions are a string like 'r' (read), 'w' (write), 'l' (list).
    Example: 'rl' for read and list. 'wl' for write and list.
    """
    try:
        blob_service_client = BlobServiceClient.from_connection_string(
            settings.AZURE_STORAGE_CONNECTION_STRING
        )
        
        sas_permissions = ContainerSasPermissions(
            read='r' in permission,
            write='w' in permission,
            delete='d' in permission,
            list='l' in permission,
            create='c' in permission,
        )

        sas_token = generate_container_sas(
            account_name=blob_service_client.account_name,
            container_name=container_name,
            account_key=blob_service_client.credential.account_key,
            permission=sas_permissions,
            expiry=datetime.now(timezone.utc) + timedelta(hours=24), # SAS token valid for 24 hours
        )
        
        sas_url = f"https://{blob_service_client.account_name}.blob.core.windows.net/{container_name}?{sas_token}"
        logger.info(f"Generated SAS URL for container '{container_name}' with permissions '{permission}'")
        return sas_url
    except Exception as e:
        logger.error(f"Failed to generate SAS URL for container '{container_name}': {e}", exc_info=True)
        raise