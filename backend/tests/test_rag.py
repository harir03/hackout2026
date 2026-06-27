import pytest
from app.rag.chunker import chunk_text
from app.rag.advisor import _build_applicant_context, _build_generation_prompt


def test_chunk_text():
    text = "This is a very long string that should be split into multiple smaller chunks of text."
    chunks = chunk_text(text, chunk_size=5, overlap=1)
    assert len(chunks) > 0


def test_build_applicant_context():
    score_res = {
        "score": 720,
        "risk_band": "Good",
        "tier": "Tier 2",
        "hard_caps_applied": ["High EMI burden cap applied"],
        "shap_details": [
            {"worker": "D1 Bank", "label": "monthly_inflow", "points": 25.0, "direction": "positive", "feature_value": 50000.0},
            {"worker": "D2 Telecom", "label": "missed_payments", "points": -15.0, "direction": "negative", "feature_value": 1.0}
        ]
    }
    context = _build_applicant_context(score_res)
    assert "Score: 720 / 850" in context
    assert "Risk Band: Good" in context
    assert "Hard Caps Applied: High EMI burden cap applied" in context
    assert "Top Positive Factors" in context
    assert "Top Negative Factors" in context


def test_build_generation_prompt():
    prompt = _build_generation_prompt(
        question="How can I improve my score?",
        applicant_context="Score details",
        retrieved_policy=[{"id": "p1", "source": "RBI", "text": "RBI policy section 1"}],
        retrieved_precedents=[{"id": "c1", "text": "Precedent details"}]
    )
    assert "How can I improve my score?" in prompt
    assert "Score details" in prompt
    assert "RBI policy section 1" in prompt
    assert "Precedent details" in prompt
