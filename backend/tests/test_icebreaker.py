import pytest
from app.services.ai_qualifier import generate_icebreaker_pitch


@pytest.mark.asyncio
async def test_twitter_icebreaker_fallback_concise():
    res = await generate_icebreaker_pitch(
        platform="TWITTER",
        lead_title="Apex Clinic",
        contact_name="Dr. Sharma",
        industry="Healthcare",
        tone="FRIENDLY",
    )
    assert res["platform"] == "TWITTER"
    assert "Apex Clinic" in res["message_body"]
    assert len(res["message_body"]) <= 280


@pytest.mark.asyncio
async def test_hinglish_icebreaker_contains_hindi_tokens():
    res = await generate_icebreaker_pitch(
        platform="HINGLISH",
        lead_title="Modern Bakery",
        contact_name="Rahul",
        language="hinglish",
    )
    assert "Modern Bakery" in res["message_body"]
    assert ("website" in res["message_body"].lower())
