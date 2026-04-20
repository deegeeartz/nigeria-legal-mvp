from __future__ import annotations

from math import ceil
from typing import Dict, List, Tuple

from app.models import ExpertiseTier, IntakeRequest, Lawyer, MatchReason

BALANCED_WEIGHTS = {
    "expertise_fit": 0.30,
    "trust_verification": 0.20,
    "quality_outcomes": 0.20,
    "responsiveness": 0.15,
    "price_fit": 0.10,
    "availability": 0.05,
}

DISCLAIMER = (
    "Ranking reflects platform performance and verification signals. "
    "It is not an official NBA or government ranking."
)


def classify_intake(summary: str) -> str:
    text = summary.lower()
    if any(token in text for token in ["land", "tenancy", "property", "rent"]):
        return "property"
    if any(token in text for token in ["divorce", "custody", "marriage", "family"]):
        return "family"
    if any(token in text for token in ["job", "salary", "termination", "employment"]):
        return "employment"
    if any(token in text for token in ["contract", "agreement", "vendor"]):
        return "contracts"
    return "general"


def is_eligible_for_listing(lawyer: Lawyer) -> bool:
    return (
        lawyer.nin_verified
        and lawyer.nba_verified
        and lawyer.profile_completeness >= 70
        and lawyer.active_complaints == 0
    )


def is_eligible_for_new_rotation(lawyer: Lawyer) -> bool:
    return (
        is_eligible_for_listing(lawyer)
        and lawyer.completed_matters < 5
        and lawyer.rating >= 4.0
        and lawyer.response_rate >= 80
    )


def expertise_tier(lawyer: Lawyer) -> ExpertiseTier:
    if lawyer.severe_flag:
        return ExpertiseTier.associate_counsel
    if lawyer.completed_matters >= 50 and lawyer.rating >= 4.8 and lawyer.repeat_client_rate >= 30:
        return ExpertiseTier.distinguished_counsel
    if lawyer.completed_matters >= 20 and lawyer.rating >= 4.5 and lawyer.response_rate >= 90:
        return ExpertiseTier.senior_counsel
    if lawyer.completed_matters >= 5 and lawyer.rating >= 4.0:
        return ExpertiseTier.verified_counsel
    return ExpertiseTier.associate_counsel


def _liquidity_count(lawyers: List[Lawyer], state: str, category: str) -> int:
    count = 0
    for lawyer in lawyers:
        if not is_eligible_for_listing(lawyer):
            continue
        if lawyer.state.lower() != state.lower():
            continue
        if category != "general" and category not in lawyer.practice_areas:
            continue
        count += 1
    return count


def exposure_band_percent(liquidity_count: int) -> int:
    if liquidity_count < 15:
        return 25
    if liquidity_count <= 40:
        return 20
    if liquidity_count <= 100:
        return 15
    return 10


def _normalize(value: float, floor: float, ceiling: float) -> float:
    if value <= floor:
        return 0.0
    if value >= ceiling:
        return 100.0
    return ((value - floor) / (ceiling - floor)) * 100


def _build_component_scores(lawyer: Lawyer, intake: IntakeRequest, category: str) -> Dict[str, float]:
    expertise_fit = 100.0 if category == "general" or category in lawyer.practice_areas else 30.0
    trust_verification = 60.0
    if lawyer.nin_verified:
        trust_verification += 20
    if lawyer.nba_verified:
        trust_verification += 20
    if lawyer.bvn_verified:
        trust_verification += 5
    
    # Add seal & stamp bonus (+10 points) if lawyer is CPD-compliant
    from app.db import get_latest_practice_seal
    seal = get_latest_practice_seal(lawyer.id)
    if seal and seal.get("cpd_compliant"):
        trust_verification += 10
    
    trust_verification = min(100.0, trust_verification)

    quality_outcomes = (
        (_normalize(lawyer.rating, 3.5, 5.0) * 0.65)
        + (_normalize(lawyer.repeat_client_rate, 0, 60) * 0.35)
    )

    responsiveness = (
        (_normalize(lawyer.response_rate, 60, 100) * 0.7)
        + ((100 - _normalize(lawyer.avg_response_hours, 1, 24)) * 0.3)
    )

    if intake.budget_max_ngn <= 0:
        price_fit = 60.0
    else:
        delta = intake.budget_max_ngn - lawyer.base_consult_fee_ngn
        price_fit = 100.0 if delta >= 0 else max(20.0, 100.0 - abs(delta) / max(intake.budget_max_ngn, 1) * 100)

    urgency_factor = {
        "urgent": 2.0,
        "this_week": 8.0,
        "researching": 18.0,
    }[intake.urgency.value]
    availability = max(15.0, 100.0 - _normalize(lawyer.avg_response_hours, urgency_factor, 48))

    return {
        "expertise_fit": round(expertise_fit, 2),
        "trust_verification": round(trust_verification, 2),
        "quality_outcomes": round(quality_outcomes, 2),
        "responsiveness": round(responsiveness, 2),
        "price_fit": round(price_fit, 2),
        "availability": round(availability, 2),
    }


def _total_score(components: Dict[str, float]) -> float:
    score = 0.0
    for key, weight in BALANCED_WEIGHTS.items():
        score += components[key] * weight
    return round(score, 2)


def _build_reasons(lawyer: Lawyer, category: str, score: float) -> List[MatchReason]:
    reasons = []
    if category in lawyer.practice_areas or category == "general":
        reasons.append(MatchReason(label="Practice match", value=category.replace("_", " ").title()))
    reasons.append(MatchReason(label="Verification", value="NIN + NBA verified"))
    reasons.append(MatchReason(label="Response time", value=f"~{lawyer.avg_response_hours:.1f}h average"))
    reasons.append(MatchReason(label="Client rating", value=f"{lawyer.rating:.1f}/5"))
    reasons.append(MatchReason(label="Platform score", value=f"{score}"))
    return reasons[:3]


def rank_lawyers(intake: IntakeRequest, lawyers: List[Lawyer], top_n: int = 10) -> Tuple[str, int, List[dict]]:
    category = classify_intake(intake.summary)

    eligible_lawyers = [lawyer for lawyer in lawyers if is_eligible_for_listing(lawyer)]
    state_lawyers = [lawyer for lawyer in eligible_lawyers if lawyer.state.lower() == intake.state.lower()]
    pool = state_lawyers if state_lawyers else eligible_lawyers

    scored = []
    for lawyer in pool:
        components = _build_component_scores(lawyer, intake, category)
        total = _total_score(components)
        scored.append((lawyer, total, components))

    scored.sort(key=lambda item: item[1], reverse=True)

    liquidity = _liquidity_count(eligible_lawyers, intake.state, category)
    band = exposure_band_percent(liquidity)
    new_slots = ceil((band / 100) * top_n)

    new_candidates = [item for item in scored if is_eligible_for_new_rotation(item[0])]
    established_candidates = [item for item in scored if not is_eligible_for_new_rotation(item[0])]

    selected = []
    selected.extend(new_candidates[:new_slots])

    already_selected_ids = {item[0].id for item in selected}
    for candidate in established_candidates:
        if len(selected) >= top_n:
            break
        if candidate[0].id in already_selected_ids:
            continue
        selected.append(candidate)

    if len(selected) < top_n:
        for candidate in new_candidates:
            if len(selected) >= top_n:
                break
            if candidate[0].id in already_selected_ids:
                continue
            selected.append(candidate)

    matches = []
    for lawyer, total, _ in selected:
        from app.db import get_latest_practice_seal
        
        tier = expertise_tier(lawyer)
        badges = [tier.value.replace("_", " ").title(), "NIN Verified", "NBA Verified"]
        if lawyer.bvn_verified:
            badges.append("BVN Verified")
        
        # Add seal badge if lawyer is CPD-compliant
        seal = get_latest_practice_seal(lawyer.id)
        if seal and seal.get("cpd_compliant"):
            seal_year = seal.get("practice_year", "")
            badges.append(f"Seal & Stamp {seal_year}")
        
        matches.append(
            {
                "lawyer_id": lawyer.id,
                "full_name": lawyer.full_name,
                "state": lawyer.state,
                "tier": tier,
                "score": total,
                "price_ngn": lawyer.base_consult_fee_ngn,
                "why_recommended": _build_reasons(lawyer, category, total),
                "badges": badges,
            }
        )

    return category, band, matches
