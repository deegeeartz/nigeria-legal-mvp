from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import List

async def list_templates(session: AsyncSession) -> List[dict]:
    stmt = text("""
        SELECT id, name, description, category, price_ngn, created_on
        FROM document_templates
        ORDER BY created_on DESC
    """)
    result = await session.execute(stmt)
    return [dict(row._mapping) for row in result.fetchall()]

async def get_template(session: AsyncSession, template_id: int) -> dict:
    stmt = text("""
        SELECT id, name, description, category, price_ngn, created_on
        FROM document_templates
        WHERE id = :id
    """)
    result = await session.execute(stmt, {"id": template_id})
    row = result.fetchone()
    return dict(row._mapping) if row else None
