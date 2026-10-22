from datetime import date
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.follow_up import FollowUpTask
from app.models.lead import LeadRecord, LeadSource, LeadStatus
from app.models.user import User

router = APIRouter()


@router.get("/overview")
async def get_analytics_overview(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Pipeline counts by status
    status_stmt = (
        select(LeadRecord.current_status, func.count(LeadRecord.id))
        .where(LeadRecord.is_archived.is_(False))
        .group_by(LeadRecord.current_status)
    )
    status_results = await db.execute(status_stmt)
    pipeline_counts = {status.value: count for status, count in status_results.all()}

    # Total leads
    total_leads_stmt = select(func.count(LeadRecord.id)).where(LeadRecord.is_archived.is_(False))
    total_leads = (await db.execute(total_leads_stmt)).scalar() or 0

    # Leads by source platform
    source_stmt = (
        select(LeadSource.platform, func.count(LeadSource.id))
        .group_by(LeadSource.platform)
    )
    source_results = await db.execute(source_stmt)
    leads_by_source = {platform: count for platform, count in source_results.all()}

    # Follow-ups due today or overdue
    today = date.today()
    due_stmt = (
        select(func.count(FollowUpTask.id))
        .where(
            FollowUpTask.assigned_to_user_id == current_user.id,
            FollowUpTask.is_completed.is_(False),
            FollowUpTask.due_date <= today,
        )
    )
    followups_due = (await db.execute(due_stmt)).scalar() or 0

    return {
        "total_active_leads": total_leads,
        "pipeline_counts": pipeline_counts,
        "leads_by_source": leads_by_source,
        "followups_due_today": followups_due,
    }
