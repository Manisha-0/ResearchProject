from functools import lru_cache

import boto3

from botocore.client import Config
from botocore.exceptions import (
    BotoCoreError,
    ClientError,
)

from app.core.config import settings


class StorageServiceError(Exception):
    pass


@lru_cache
def get_s3_client():
    return boto3.client(
        "s3",
        endpoint_url=(
            settings.supabase_s3_endpoint
        ),
        region_name=(
            settings.supabase_s3_region
        ),
        aws_access_key_id=(
            settings
            .supabase_s3_access_key_id
        ),
        aws_secret_access_key=(
            settings
            .supabase_s3_secret_access_key
        ),
        config=Config(
            signature_version="s3v4",
            s3={
                "addressing_style":
                    "path",
            },
        ),
    )


def upload_document(
    *,
    storage_path: str,
    content: bytes,
) -> None:
    client = get_s3_client()

    try:
        client.put_object(
            Bucket=(
                settings
                .supabase_storage_bucket
            ),
            Key=storage_path,
            Body=content,
            ContentType=(
                "application/pdf"
            ),
        )

    except (
        ClientError,
        BotoCoreError,
    ) as exc:
        raise StorageServiceError(
            "Unable to upload document "
            "to storage."
        ) from exc


def delete_document(
    *,
    storage_path: str,
) -> None:
    client = get_s3_client()

    try:
        client.delete_object(
            Bucket=(
                settings
                .supabase_storage_bucket
            ),
            Key=storage_path,
        )

    except (
        ClientError,
        BotoCoreError,
    ) as exc:
        raise StorageServiceError(
            "Unable to delete document "
            "from storage."
        ) from exc


def create_document_access_url(
    *,
    storage_path: str,
    expires_in_seconds: int = 300,
) -> str:
    client = get_s3_client()

    try:
        return client.generate_presigned_url(
            ClientMethod=(
                "get_object"
            ),
            Params={
                "Bucket": (
                    settings
                    .supabase_storage_bucket
                ),
                "Key": storage_path,
            },
            ExpiresIn=(
                expires_in_seconds
            ),
        )

    except (
        ClientError,
        BotoCoreError,
    ) as exc:
        raise StorageServiceError(
            "Unable to create document "
            "access URL."
        ) from exc