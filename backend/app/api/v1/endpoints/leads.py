import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.activity import LeadActivity
from app.models.lead import AICategory, LeadRecord, LeadSource, LeadStatus, LeadType
from app.models.user import User
from app.schemas.lead import LeadCreate, LeadFeedbackRequest, LeadListResponse, LeadResponse, LeadUpdate
from app.services.deduplication import (
    canonicalize_domain,
    check_duplicate_lead,
    normalize_phone_number,
)

from app.services.lead_classifier import IntentCategory, ReviewStatus, classify_lead_intent

router = APIRouter()


@router.get("", response_model=LeadListResponse)
async def list_leads(
    lead_type: Optional[LeadType] = None,
    current_status: Optional[LeadStatus] = None,
    intent_category: Optional[str] = None,
    assigned_user_id: Optional[uuid.UUID] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(LeadRecord).where(LeadRecord.is_archived.is_(False))

    if lead_type:
        query = query.where(LeadRecord.lead_type == lead_type)
    if current_status:
        query = query.where(LeadRecord.current_status == current_status)
    if intent_category:
        query = query.where(LeadRecord.intent_category == intent_category)
    if assigned_user_id:
        query = query.where(LeadRecord.assigned_user_id == assigned_user_id)
    if search:
        search_filter = f"%{search.strip()}%"
        query = query.where(LeadRecord.business_or_title.ilike(search_filter))

    # Total count
    count_stmt = select(func.count()).select_from(query.subquery())
    total_count = (await db.execute(count_stmt)).scalar() or 0

    # Paginate and order by recency
    query = (
        query.options(selectinload(LeadRecord.sources))
        .order_by(LeadRecord.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    leads = result.scalars().all()

    return LeadListResponse(
        items=[LeadResponse.model_validate(lead) for lead in leads],
        total=total_count,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
async def create_or_import_lead(
    lead_in: LeadCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # 1. Normalize Domain & Phone
    clean_domain = canonicalize_domain(lead_in.canonical_domain)
    clean_phone = normalize_phone_number(lead_in.normalized_phone)

    # 2. Tier 1 Deduplication Check
    is_dupe, existing_lead, reason = await check_duplicate_lead(
        session=db,
        canonical_domain=clean_domain,
        normalized_phone=clean_phone,
        source_platform=lead_in.source_platform,
        source_external_id=lead_in.source_external_id,
    )

    if is_dupe and existing_lead:
        # Link source to existing lead rather than creating a duplicate
        new_source = LeadSource(
            lead_id=existing_lead.id,
            platform=lead_in.source_platform,
            external_id=lead_in.source_external_id,
            source_url=lead_in.source_url,
            raw_payload=lead_in.source_payload or {},
        )
        db.add(new_source)

        # Log Activity
        activity = LeadActivity(
            lead_id=existing_lead.id,
            user_id=current_user.id,
            activity_type="DUPLICATE_SOURCE_ATTACHED",
            description=f"Opportunity re-discovered via {lead_in.source_platform}. Source linked. ({reason})",
        )
        db.add(activity)
        await db.commit()

        # Reload with sources
        stmt = (
            select(LeadRecord)
            .options(selectinload(LeadRecord.sources))
            .where(LeadRecord.id == existing_lead.id)
        )
        reloaded = (await db.execute(stmt)).scalars().first()
        return LeadResponse.model_validate(reloaded)

    # 2.5 Run Lead Intelligence Intent Classification & Scoring
    notes_context = ""
    if lead_in.source_payload:
        notes_context = lead_in.source_payload.get("notes", "") or str(lead_in.source_payload)

    classification = classify_lead_intent(
        text=notes_context or lead_in.business_or_title,
        business_or_title=lead_in.business_or_title,
        author_role=lead_in.author_role,
        website_url=clean_domain,
        search_group=lead_in.search_group,
    )

    intent_cat = lead_in.intent_category or classification.intent_category.value
    final_score = lead_in.lead_score if lead_in.lead_score is not None else classification.lead_score
    confidence = lead_in.confidence_score if lead_in.confidence_score is not None else classification.confidence
    pos_ev = lead_in.positive_evidence if lead_in.positive_evidence is not None else classification.positive_evidence
    neg_ev = lead_in.negative_evidence if lead_in.negative_evidence is not None else classification.negative_evidence
    explanation = lead_in.explanation or classification.explanation
    search_group = lead_in.search_group

    initial_status = lead_in.current_status
    if initial_status == LeadStatus.NEW:
        if classification.intent_category == IntentCategory.DEVELOPER_PROMOTION:
            initial_status = LeadStatus.NOT_RELEVANT
        elif classification.review_status == ReviewStatus.NEEDS_REVIEW:
            initial_status = LeadStatus.NEEDS_REVIEW

    # Legacy category mapping
    if intent_cat in (IntentCategory.ACTIVE_BUYER.value, IntentCategory.PROJECT_REQUEST.value):
        legacy_cat = AICategory.EXPLICIT_NEED
    elif intent_cat == IntentCategory.BUSINESS_OPPORTUNITY.value:
        legacy_cat = AICategory.INFERRED_OPPORTUNITY
    else:
        legacy_cat = AICategory.SPECULATIVE

    # 3. Create New Lead Record
    new_lead = LeadRecord(
        business_or_title=lead_in.business_or_title.strip(),
        lead_type=lead_in.lead_type,
        current_status=initial_status,
        canonical_domain=clean_domain,
        normalized_phone=clean_phone,
        contact_email=lead_in.contact_email,
        city=lead_in.city,
        country=lead_in.country,
        estimated_budget=lead_in.estimated_budget,
        intent_category=intent_cat,
        lead_score=final_score,
        confidence_score=confidence,
        positive_evidence=pos_ev,
        negative_evidence=neg_ev,
        explanation=explanation,
        search_group=search_group,
        ai_fit_score=final_score,
        ai_qualification_category=legacy_cat,
        ai_qualification_reason=explanation,
        created_by_user_id=current_user.id,
        assigned_user_id=current_user.id,
    )
    db.add(new_lead)
    await db.flush()

    # Attach initial source
    source = LeadSource(
        lead_id=new_lead.id,
        platform=lead_in.source_platform,
        external_id=lead_in.source_external_id,
        source_url=lead_in.source_url,
        raw_payload=lead_in.source_payload or {},
    )
    db.add(source)

    # Log initial creation activity
    activity = LeadActivity(
        lead_id=new_lead.id,
        user_id=current_user.id,
        activity_type="CREATED",
        description=f"Lead created via {lead_in.source_platform} by {current_user.full_name}",
    )
    db.add(activity)

    await db.commit()

    stmt = (
        select(LeadRecord)
        .options(selectinload(LeadRecord.sources))
        .where(LeadRecord.id == new_lead.id)
    )
    result = await db.execute(stmt)
    created = result.scalars().first()
    return LeadResponse.model_validate(created)


@router.get("/{id}", response_model=LeadResponse)
async def get_lead(
    id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(LeadRecord)
        .options(selectinload(LeadRecord.sources))
        .where(LeadRecord.id == id, LeadRecord.is_archived.is_(False))
    )
    result = await db.execute(stmt)
    lead = result.scalars().first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return LeadResponse.model_validate(lead)


@router.patch("/{id}", response_model=LeadResponse)
async def update_lead(
    id: uuid.UUID,
    lead_update: LeadUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(LeadRecord)
        .options(selectinload(LeadRecord.sources))
        .where(LeadRecord.id == id)
    )
    result = await db.execute(stmt)
    lead = result.scalars().first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    update_dict = lead_update.model_dump(exclude_unset=True)
    if "current_status" in update_dict and update_dict["current_status"] != lead.current_status:
        activity = LeadActivity(
            lead_id=lead.id,
            user_id=current_user.id,
            activity_type="STATUS_CHANGE",
            description=f"Status changed from {lead.current_status} to {update_dict['current_status']}",
        )
        db.add(activity)

    if "assigned_user_id" in update_dict and update_dict["assigned_user_id"] != lead.assigned_user_id:
        activity = LeadActivity(
            lead_id=lead.id,
            user_id=current_user.id,
            activity_type="REASSIGNED",
            description=f"Assigned user updated",
        )
        db.add(activity)

    for field, value in update_dict.items():
        setattr(lead, field, value)

    await db.commit()
    await db.refresh(lead)
    return LeadResponse.model_validate(lead)


@router.post("/{id}/feedback", response_model=LeadResponse)
async def submit_lead_feedback(
    id: uuid.UUID,
    feedback_in: LeadFeedbackRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Submits user feedback (REAL_BUYER, DEVELOPER_PROMOTION, NOT_RELEVANT) to measure false positive
    rates and improve ranking.
    """
    stmt = (
        select(LeadRecord)
        .options(selectinload(LeadRecord.sources))
        .where(LeadRecord.id == id)
    )
    result = await db.execute(stmt)
    lead = result.scalars().first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    feed_upper = feedback_in.feedback.upper().strip()
    lead.feedback_label = feed_upper

    if feed_upper == "REAL_BUYER":
        if lead.current_status in (LeadStatus.NEW, LeadStatus.NEEDS_REVIEW, LeadStatus.NOT_RELEVANT):
            lead.current_status = LeadStatus.QUALIFIED
        if lead.lead_score is not None and lead.lead_score < 70:
            lead.lead_score = min(100, lead.lead_score + 30)
            lead.ai_fit_score = lead.lead_score
        if not lead.intent_category or lead.intent_category in ("DEVELOPER_PROMOTION", "GENERAL_DISCUSSION", "UNCERTAIN"):
            lead.intent_category = "ACTIVE_BUYER"
    elif feed_upper == "DEVELOPER_PROMOTION":
        lead.current_status = LeadStatus.NOT_RELEVANT
        lead.intent_category = "DEVELOPER_PROMOTION"
        lead.lead_score = 0
        lead.ai_fit_score = 0
    elif feed_upper == "NOT_RELEVANT":
        lead.current_status = LeadStatus.NOT_RELEVANT

    activity = LeadActivity(
        lead_id=lead.id,
        user_id=current_user.id,
        activity_type="USER_FEEDBACK",
        description=f"User feedback submitted: '{feed_upper}'. Notes: {feedback_in.notes or 'None'}",
    )
    db.add(activity)

    await db.commit()
    await db.refresh(lead)
    return LeadResponse.model_validate(lead)
