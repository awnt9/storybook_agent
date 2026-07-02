from __future__ import annotations

from functools import lru_cache

from minio import Minio

from app.core.config import settings


@lru_cache
def get_minio_client() -> Minio:
    client = Minio(
        settings.minio_endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key.get_secret_value(),
        secure=settings.minio_secure,
    )

    if not client.bucket_exists(settings.minio_bucket):
        client.make_bucket(settings.minio_bucket)

    return client
