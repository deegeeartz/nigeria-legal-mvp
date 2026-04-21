from app.data import SEED_LAWYERS
from app.models import IntakeRequest, Urgency
from app.ranking import (
    exposure_band_percent,
    is_eligible_for_listing,
    is_eligible_for_new_rotation,
    rank_lawyers,
)
import asyncio


def test_exposure_band_thresholds() -> None:
    assert exposure_band_percent(10) == 25
    assert exposure_band_percent(20) == 20
    assert exposure_band_percent(60) == 15
    assert exposure_band_percent(200) == 10


def test_ineligible_lawyer_filtered_out() -> None:
    ineligible = next(lawyer for lawyer in SEED_LAWYERS if lawyer.id == "lw_009")
    assert is_eligible_for_listing(ineligible) is False


def test_new_rotation_eligibility() -> None:
    candidate = next(lawyer for lawyer in SEED_LAWYERS if lawyer.id == "lw_004")
    assert is_eligible_for_new_rotation(candidate) is True


def test_rank_lawyers_returns_matches_and_disclaimer_context() -> None:
    payload = IntakeRequest(
        summary="I have a property and tenancy dispute with my landlord in Lagos.",
        state="Lagos",
        urgency=Urgency.this_week,
        budget_max_ngn=50000,
    )
    category, band, matches = asyncio.run(rank_lawyers(payload, SEED_LAWYERS, top_n=5))

    assert category == "property"
    assert band in {10, 15, 20, 25}
    assert len(matches) == 5
    assert all(match["why_recommended"] for match in matches)
