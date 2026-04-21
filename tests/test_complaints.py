import asyncio
from app.complaints import complaint_severity
from app.db import get_lawyer, reset_db_for_tests
from app.models import ComplaintCategory


def setup_function() -> None:
    asyncio.run(reset_db_for_tests())


def test_complaint_severity_mapping() -> None:
    assert complaint_severity(ComplaintCategory.no_show) == "minor"
    assert complaint_severity(ComplaintCategory.misrepresentation) == "major"
    assert complaint_severity(ComplaintCategory.fraud) == "severe"


def test_severe_complaint_sets_severe_flag() -> None:
    from app.db import create_complaint

    created = asyncio.run(create_complaint(
        lawyer_id="lw_001",
        category=ComplaintCategory.misconduct,
        details="Serious conduct violation reported by client.",
    ))
    assert created is not None

    lawyer = asyncio.run(get_lawyer("lw_001"))
    assert lawyer is not None
    assert lawyer.severe_flag is True
    assert lawyer.active_complaints == 1
