"""Document management repository.
"""
from __future__ import annotations

import os
from typing import Any

from app.repos.connection import (
    UPLOADS_DIR,
    _now,
    connect,
)
from app.services.supabase_storage import SupabaseStorageService


async def create_document(
    consultation_id: int,
    uploaded_by_user_id: int,
    document_label: str,
    original_filename: str,
    content_type: str,
    file_bytes: bytes,
) -> dict[str, Any]:
    now = _now()
    storage_key = f"DOC_{consultation_id}_{int(now.timestamp())}_{original_filename}"
    
    # Phase 7: Persistent Cloud Storage
    cloud_key = await SupabaseStorageService.upload_file(
        bucket="legal-documents",
        path=storage_key,
        content=file_bytes,
        content_type=content_type
    )

    # For dev fallback or if cloud upload fails, try local
    if cloud_key.startswith(("local://", "error://", "exception://")):
        file_path = UPLOADS_DIR / storage_key
        with open(file_path, "wb") as f:
            f.write(file_bytes)
    else:
        # storage_key should be the full bucket path if uploaded to cloud
        storage_key = cloud_key
        
    async with connect() as conn:
        res = await conn.execute(
            """
            INSERT INTO documents (
                consultation_id, uploaded_by_user_id, document_label, 
                storage_key, original_filename, content_type, size_bytes, created_on
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                consultation_id,
                uploaded_by_user_id,
                document_label,
                storage_key,
                original_filename,
                content_type,
                len(file_bytes),
                now,
            ),
        )
        await conn.commit()
        doc_id = res.lastrowid
        res2 = await conn.execute("SELECT * FROM documents WHERE id = ?", (doc_id,))
        row = res2.fetchone()
    return dict(row) if row else {}


async def list_documents_for_consultation(consultation_id: int) -> list[dict[str, Any]]:
    async with connect() as conn:
        res = await conn.execute(
            "SELECT * FROM documents WHERE consultation_id = ? ORDER BY created_on ASC",
            (consultation_id,),
        )
        rows = res.fetchall()
    return [dict(row) for row in rows]


async def get_document(document_id: int) -> dict[str, Any] | None:
    async with connect() as conn:
        res = await conn.execute("SELECT * FROM documents WHERE id = ?", (document_id,))
        row = res.fetchone()
    return dict(row) if row else None


async def get_document_url(document: dict[str, Any]) -> str:
    """
    Returns a secure, pre-signed URL for a private consultation document.
    """
    key = document["storage_key"]
    if "/" in key:
        bucket, path = key.split("/", 1)
        signed_url = await SupabaseStorageService.get_signed_url(bucket, path)
        if signed_url:
            return signed_url
            
    # Fallback for local files
    return f"/api/consultations/documents/{document['id']}/download"


async def user_can_access_document(user: dict[str, Any], document_id: int) -> bool:
    if user["role"] == "admin":
        return True
    doc = await get_document(document_id)
    if doc is None:
        return False
    
    # We check consultation access
    from app.repos.consultations import user_can_access_consultation
    return await user_can_access_consultation(user, doc["consultation_id"])
