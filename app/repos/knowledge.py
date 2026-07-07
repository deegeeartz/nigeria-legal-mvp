from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import List

async def create_question(session: AsyncSession, summary: str, category: str) -> dict:
    stmt = text("""
        INSERT INTO public_questions (summary, category)
        VALUES (:summary, :category)
        RETURNING id, summary, category, status, created_on
    """)
    result = await session.execute(stmt, {"summary": summary, "category": category})
    row = result.fetchone()
    return dict(row._mapping) if row else None

async def list_questions(session: AsyncSession, limit: int = 50) -> List[dict]:
    stmt = text("""
        SELECT id, summary, category, status, created_on
        FROM public_questions
        ORDER BY created_on DESC
        LIMIT :limit
    """)
    result = await session.execute(stmt, {"limit": limit})
    return [dict(row._mapping) for row in result.fetchall()]

async def create_answer(session: AsyncSession, question_id: int, lawyer_id: str, answer_body: str) -> dict:
    stmt = text("""
        INSERT INTO lawyer_answers (question_id, lawyer_id, answer_body)
        VALUES (:question_id, :lawyer_id, :answer_body)
        RETURNING id, question_id, lawyer_id, answer_body, upvotes, created_on
    """)
    result = await session.execute(stmt, {
        "question_id": question_id,
        "lawyer_id": lawyer_id,
        "answer_body": answer_body
    })
    row = result.fetchone()
    
    # Update lawyer's knowledge score (+2 for answering a question)
    update_stmt = text("""
        UPDATE lawyers 
        SET knowledge_contribution_score = knowledge_contribution_score + 2.0
        WHERE id = :lawyer_id
    """)
    await session.execute(update_stmt, {"lawyer_id": lawyer_id})
    
    return dict(row._mapping) if row else None

async def list_answers_for_question(session: AsyncSession, question_id: int) -> List[dict]:
    stmt = text("""
        SELECT id, question_id, lawyer_id, answer_body, upvotes, created_on
        FROM lawyer_answers
        WHERE question_id = :question_id
        ORDER BY upvotes DESC, created_on ASC
    """)
    result = await session.execute(stmt, {"question_id": question_id})
    return [dict(row._mapping) for row in result.fetchall()]

async def create_article(session: AsyncSession, lawyer_id: str, title: str, body: str) -> dict:
    stmt = text("""
        INSERT INTO educational_articles (lawyer_id, title, body)
        VALUES (:lawyer_id, :title, :body)
        RETURNING id, lawyer_id, title, body, upvotes, created_on
    """)
    result = await session.execute(stmt, {
        "lawyer_id": lawyer_id,
        "title": title,
        "body": body
    })
    row = result.fetchone()
    
    # Update lawyer's knowledge score (+10 for writing an article)
    update_stmt = text("""
        UPDATE lawyers 
        SET knowledge_contribution_score = knowledge_contribution_score + 10.0
        WHERE id = :lawyer_id
    """)
    await session.execute(update_stmt, {"lawyer_id": lawyer_id})
    
    return dict(row._mapping) if row else None

async def list_articles(session: AsyncSession, limit: int = 50) -> List[dict]:
    stmt = text("""
        SELECT id, lawyer_id, title, body, upvotes, created_on
        FROM educational_articles
        ORDER BY upvotes DESC, created_on DESC
        LIMIT :limit
    """)
    result = await session.execute(stmt, {"limit": limit})
    return [dict(row._mapping) for row in result.fetchall()]
