from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.repos.connection import get_db
from app.routers.auth import require_lawyer, require_client_or_lawyer, get_current_user
from app.models import (
    PublicQuestionCreateRequest,
    PublicQuestionResponse,
    LawyerAnswerCreateRequest,
    LawyerAnswerResponse,
    EducationalArticleCreateRequest,
    EducationalArticleResponse,
    UserRole
)
from app.repos.knowledge import (
    create_question,
    list_questions,
    create_answer,
    list_answers_for_question,
    create_article,
    list_articles
)

router = APIRouter(prefix="/api/knowledge", tags=["Knowledge Hub"])

@router.post("/questions", response_model=PublicQuestionResponse, status_code=status.HTTP_201_CREATED)
async def ask_question(
    req: PublicQuestionCreateRequest,
    user: dict = Depends(require_client_or_lawyer),
    db: AsyncSession = Depends(get_db)
):
    """Clients or lawyers can post anonymous public legal questions."""
    question = await create_question(db, req.summary, req.category)
    if not question:
        raise HTTPException(status_code=500, detail="Failed to create question")
    return question

@router.get("/questions", response_model=List[PublicQuestionResponse])
async def get_questions(limit: int = 50, db: AsyncSession = Depends(get_db)):
    """List public questions."""
    return await list_questions(db, limit)

@router.post("/questions/{question_id}/answers", response_model=LawyerAnswerResponse, status_code=status.HTTP_201_CREATED)
async def answer_question(
    question_id: int,
    req: LawyerAnswerCreateRequest,
    user: dict = Depends(require_lawyer),
    db: AsyncSession = Depends(get_db)
):
    """Verified lawyers can answer public questions. Boosts their ranking score."""
    if not user.get("nba_verified"):
        raise HTTPException(status_code=403, detail="Only NBA-verified lawyers can post answers.")
    
    answer = await create_answer(db, question_id, user["lawyer_id"], req.answer_body)
    if not answer:
        raise HTTPException(status_code=500, detail="Failed to post answer")
    return answer

@router.get("/questions/{question_id}/answers", response_model=List[LawyerAnswerResponse])
async def get_answers(question_id: int, db: AsyncSession = Depends(get_db)):
    """List answers for a specific question."""
    return await list_answers_for_question(db, question_id)

@router.post("/articles", response_model=EducationalArticleResponse, status_code=status.HTTP_201_CREATED)
async def post_article(
    req: EducationalArticleCreateRequest,
    user: dict = Depends(require_lawyer),
    db: AsyncSession = Depends(get_db)
):
    """Verified lawyers can post educational articles. Boosts their ranking score heavily."""
    if not user.get("nba_verified"):
        raise HTTPException(status_code=403, detail="Only NBA-verified lawyers can post articles.")
    
    article = await create_article(db, user["lawyer_id"], req.title, req.body)
    if not article:
        raise HTTPException(status_code=500, detail="Failed to post article")
    return article

@router.get("/articles", response_model=List[EducationalArticleResponse])
async def get_all_articles(limit: int = 50, db: AsyncSession = Depends(get_db)):
    """List all educational articles published by lawyers."""
    return await list_articles(db, limit)
