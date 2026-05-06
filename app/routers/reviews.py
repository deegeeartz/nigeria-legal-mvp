from fastapi import APIRouter, Header, HTTPException, Query
from typing import Optional

from app.dependencies import (
    log_event,
    notify_users,
    require_user,
)
from app.db import (
    get_consultation,
    user_can_access_consultation,
    list_consultation_participant_user_ids,
    get_lawyer_user_ids,
)
from app.repos.reviews import (
    create_review,
    get_review,
    list_reviews_for_lawyer,
    get_lawyer_average_rating,
    add_lawyer_reply,
)
from app.models import (
    ReviewCreateRequest,
    ReviewReplyRequest,
    ReviewResponse,
    LawyerRatingSummary,
)

router = APIRouter(tags=["reviews"])


def _to_response(review: dict) -> ReviewResponse:
    return ReviewResponse(
        review_id=review["id"],
        consultation_id=review["consultation_id"],
        client_user_id=review["client_user_id"],
        lawyer_id=review["lawyer_id"],
        rating=review["rating"],
        review_text=review.get("review_text"),
        lawyer_reply=review.get("lawyer_reply"),
        lawyer_replied_on=review.get("lawyer_replied_on"),
        created_on=review["created_on"],
    )


@router.post("/api/reviews", response_model=ReviewResponse)
async def submit_review(
    payload: ReviewCreateRequest,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> ReviewResponse:
    """Submit a star rating and optional text review for a completed consultation."""
    user = await require_user(x_auth_token)

    # Verify the consultation exists and is completed
    consultation = await get_consultation(payload.consultation_id)
    if consultation is None:
        raise HTTPException(status_code=404, detail="Consultation not found")
    if consultation["status"] != "completed":
        raise HTTPException(status_code=400, detail="Can only review completed consultations")
    if consultation["client_user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Only the client can review this consultation")

    review = await create_review(
        consultation_id=payload.consultation_id,
        client_user_id=user["id"],
        lawyer_id=consultation["lawyer_id"],
        rating=payload.rating,
        review_text=payload.review_text,
    )

    if "error" in review:
        raise HTTPException(status_code=409, detail=review["error"])

    await log_event(user["id"], "review.submitted", "review", str(review["id"]),
                    f"Client submitted {payload.rating}-star review for consultation {payload.consultation_id}")

    # Notify the lawyer about the new review
    await notify_users(
        await get_lawyer_user_ids(consultation["lawyer_id"]),
        kind="review_received",
        title="New client review",
        body=f"You received a {payload.rating}-star review.",
        resource_type="review",
        resource_id=str(review["id"]),
    )

    return _to_response(review)


@router.post("/api/reviews/{review_id}/reply", response_model=ReviewResponse)
async def reply_to_review(
    review_id: int,
    payload: ReviewReplyRequest,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> ReviewResponse:
    """Allow a lawyer to reply to a client's review."""
    user = await require_user(x_auth_token)

    review = await get_review(review_id)
    if review is None:
        raise HTTPException(status_code=404, detail="Review not found")
    if review.get("lawyer_reply"):
        raise HTTPException(status_code=409, detail="A reply already exists for this review")

    # Verify the user is the lawyer who was reviewed
    if user.get("role") != "lawyer" and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only the reviewed lawyer can reply")
    if user.get("role") == "lawyer" and user.get("lawyer_id") != review["lawyer_id"]:
        raise HTTPException(status_code=403, detail="You can only reply to your own reviews")

    updated = await add_lawyer_reply(review_id, payload.reply_text)
    if updated is None:
        raise HTTPException(status_code=404, detail="Review not found")

    await log_event(user["id"], "review.replied", "review", str(review_id),
                    f"Lawyer replied to review {review_id}")

    return _to_response(updated)


@router.get("/api/lawyers/{lawyer_id}/reviews", response_model=list[ReviewResponse])
async def get_lawyer_reviews(
    lawyer_id: str,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> list[ReviewResponse]:
    """List all reviews for a lawyer (public, no auth required)."""
    reviews = await list_reviews_for_lawyer(lawyer_id, limit=limit, offset=offset)
    return [_to_response(r) for r in reviews]


@router.get("/api/lawyers/{lawyer_id}/rating", response_model=LawyerRatingSummary)
async def get_lawyer_rating(lawyer_id: str) -> LawyerRatingSummary:
    """Get a lawyer's average rating and review count (public)."""
    stats = await get_lawyer_average_rating(lawyer_id)
    return LawyerRatingSummary(
        lawyer_id=lawyer_id,
        average_rating=stats["average_rating"],
        review_count=stats["review_count"],
    )
