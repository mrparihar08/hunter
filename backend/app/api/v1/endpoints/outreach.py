import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.activity import LeadActivity
from app.models.audit import WebsiteAudit
from app.models.lead import AICategory, LeadRecord
from app.models.outreach import OutreachDraft
from app.models.user import User
from app.schemas.lead import LeadResponse
from app.schemas.outreach import OutreachDraftResponse, OutreachGenerateRequest
from app.services.ai_qualifier import evaluate_lead_qualification, generate_personalized_outreach

router = APIRouter()


@router.post("/leads/{lead_id}/qualify", response_model=LeadResponse)
async def qualify_lead(
    lead_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Triggers Gemini AI lead fit scoring and classification."""
    stmt = (
        select(LeadRecord)
        .options(selectinload(LeadRecord.sources), selectinload(LeadRecord.audits))
        .where(LeadRecord.id == lead_id)
    )
    result = await db.execute(stmt)
    lead = result.scalars().first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Gather audit issues if any exist
    latest_audit = lead.audits[-1] if lead.audits else None
    audit_issues = latest_audit.identified_issues if latest_audit else []

    # Gather post or source text
    source_context = ""
    if lead.sources:
        for s in lead.sources:
            if s.raw_payload:
                source_context += f" [{s.platform}: {s.raw_payload}]"

    eval_result = await evaluate_lead_qualification(
        business_or_title=lead.business_or_title,
        lead_type=lead.lead_type.value,
        raw_text_or_post=source_context,
        audit_issues=audit_issues,
        website_url=lead.canonical_domain,
    )

    lead.intent_category = eval_result.get("intent_category")
    lead.lead_score = eval_result["score"]
    lead.confidence_score = eval_result.get("confidence")
    lead.positive_evidence = eval_result.get("positive_evidence", [])
    lead.negative_evidence = eval_result.get("negative_evidence", [])
    lead.explanation = eval_result.get("reason")
    lead.ai_fit_score = eval_result["score"]
    lead.ai_qualification_category = AICategory(eval_result["category"])
    lead.ai_qualification_reason = eval_result["reason"]

    # Log activity
    activity = LeadActivity(
        lead_id=lead.id,
        user_id=current_user.id,
        activity_type="AI_QUALIFIED",
        description=f"AI Qualification: Score {lead.ai_fit_score}/100 ({lead.ai_qualification_category.value}). Reason: {lead.ai_qualification_reason}",
    )
    db.add(activity)

    await db.commit()
    await db.refresh(lead)
    return LeadResponse.model_validate(lead)


@router.post("/leads/{lead_id}/outreach", response_model=OutreachDraftResponse)
async def create_outreach_draft(
    lead_id: uuid.UUID,
    request: OutreachGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generates a personalized pitch draft targeting the lead's exact technical gaps."""
    stmt = (
        select(LeadRecord)
        .options(selectinload(LeadRecord.audits))
        .where(LeadRecord.id == lead_id)
    )
    result = await db.execute(stmt)
    lead = result.scalars().first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    latest_audit = lead.audits[-1] if lead.audits else None
    audit_issues = latest_audit.identified_issues if latest_audit else []

    pitch_data = await generate_personalized_outreach(
        business_or_title=lead.business_or_title,
        channel=request.channel,
        contact_name=lead.contact_email.split("@")[0] if lead.contact_email else None,
        audit_issues=audit_issues,
        custom_instructions=request.custom_instructions,
    )

    draft = OutreachDraft(
        lead_id=lead.id,
        created_by_user_id=current_user.id,
        channel=request.channel,
        subject_line=pitch_data.get("subject_line"),
        body_text=pitch_data.get("body_text", ""),
        is_approved=False,
    )
    db.add(draft)

    activity = LeadActivity(
        lead_id=lead.id,
        user_id=current_user.id,
        activity_type="DRAFT_GENERATED",
        description=f"Generated {request.channel} outreach pitch draft via Gemini.",
    )
    db.add(activity)

    await db.commit()
    await db.refresh(draft)
    return OutreachDraftResponse.model_validate(draft)
