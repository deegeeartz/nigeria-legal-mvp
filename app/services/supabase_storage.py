import httpx
import logging
from typing import Optional
from app.settings import SUPABASE_URL, SUPABASE_KEY

logger = logging.getLogger("legal_mvp.storage")

class SupabaseStorageService:
    @staticmethod
    async def upload_file(bucket: str, path: str, content: bytes, content_type: str = "application/octet-stream") -> str:
        """
        Uploads a file to a Supabase bucket.
        Returns the storage path on success.
        """
        if not SUPABASE_URL or not SUPABASE_KEY:
            logger.warning("Supabase storage not configured. Skipping upload.")
            return f"local://{path}"

        url = f"{SUPABASE_URL}/storage/v1/object/{bucket}/{path}"
        headers = {
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": content_type
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, content=content, headers=headers)
                if response.status_code == 200:
                    logger.info(f"Successfully uploaded {path} to bucket {bucket}")
                    return f"{bucket}/{path}"
                else:
                    logger.error(f"Failed to upload to Supabase: {response.status_code} - {response.text}")
                    return f"error://{path}"
            except Exception as e:
                logger.error(f"Exception during Supabase upload: {str(e)}")
                return f"exception://{path}"

    @staticmethod
    async def get_signed_url(bucket: str, path: str, expires_in: int = 3600) -> Optional[str]:
        """
        Generates a pre-signed URL for secure, temporary access to a private file.
        """
        if not SUPABASE_URL or not SUPABASE_KEY:
            return None

        url = f"{SUPABASE_URL}/storage/v1/object/sign/{bucket}/{path}"
        headers = {
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json"
        }
        data = {"expiresIn": expires_in}

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, json=data, headers=headers)
                if response.status_code == 200:
                    signed_url = response.json().get("signedURL")
                    # Supabase might return a relative URL or a path depending on config
                    if signed_url and not signed_url.startswith("http"):
                         return f"{SUPABASE_URL}/storage/v1{signed_url}"
                    return signed_url
                return None
            except Exception as e:
                logger.error(f"Exception generating signed URL: {str(e)}")
                return None
