from __future__ import annotations

from app.models import ComplaintCategory, Lawyer


def complaint_severity(category: ComplaintCategory) -> str:
    if category in {ComplaintCategory.no_show, ComplaintCategory.billing_issue}:
        return "minor"
    if category == ComplaintCategory.misrepresentation:
        return "major"
    return "severe"


def apply_open_complaint_trigger(lawyer: Lawyer, severity: str) -> Lawyer:
    lawyer.active_complaints += 1
    if severity == "severe":
        lawyer.severe_flag = True
    return lawyer


def apply_resolution_trigger(lawyer: Lawyer, has_open_severe: bool) -> Lawyer:
    lawyer.active_complaints = max(0, lawyer.active_complaints - 1)
    if not has_open_severe:
        lawyer.severe_flag = False
    return lawyer
