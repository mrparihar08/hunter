import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.activity import LeadActivity
from app.models.audit import WebsiteAudit
from app.models.lead import LeadRecord
from app.models.user import User
from app.schemas.audit import AuditTrigger, WebsiteAuditResponse
from app.services.website_auditor import perform_safe_website_audit

router = APIRouter()


@router.post("/leads/{lead_id}/audit", response_model=WebsiteAuditResponse)
async def trigger_lead_audit(
    lead_id: uuid.UUID,
    payload: AuditTrigger = AuditTrigger(),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(LeadRecord).where(LeadRecord.id == lead_id)
    result = await db.execute(stmt)
    lead = result.scalars().first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    target_url = payload.target_url or (f"https://{lead.canonical_domain}" if lead.canonical_domain else None)
    if not target_url:
        raise HTTPException(
            status_code=400,
            detail="No target URL provided or associated with this lead.",
        )

    try:
        audit_data = await perform_safe_website_audit(target_url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Audit failed: {str(e)}")

    new_audit = WebsiteAudit(
        lead_id=lead.id,
        target_url=audit_data["target_url"],
        http_status=audit_data["http_status"],
        is_https=audit_data["is_https"],
        has_mobile_viewport=audit_data["has_mobile_viewport"],
        page_load_ms=audit_data["page_load_ms"],
        meta_title=audit_data["meta_title"],
        meta_description=audit_data["meta_description"],
        detected_technologies=audit_data["detected_technologies"],
        identified_issues=audit_data["identified_issues"],
    )
    db.add(new_audit)

    # Log activity
    issues_summary = f"{len(audit_data['identified_issues'])} issues identified"
    activity = LeadActivity(
        lead_id=lead.id,
        user_id=current_user.id,
        activity_type="AUDIT_RUN",
        description=f"Website technical audit executed for {target_url}. Result: {issues_summary}.",
    )
    db.add(activity)

    await db.commit()
    await db.refresh(new_audit)
    return WebsiteAuditResponse.model_validate(new_audit)
