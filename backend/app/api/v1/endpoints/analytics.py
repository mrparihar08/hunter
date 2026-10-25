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


@router.get("/relevance")
async def get_relevance_metrics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns metrics on buyer intent detection, false-positive rates,
    precision among high-priority leads, and user feedback.
    """
    # 1. Total leads evaluated
    total_stmt = select(func.count(LeadRecord.id)).where(LeadRecord.is_archived.is_(False))
    total_evaluated = (await db.execute(total_stmt)).scalar() or 0

    # 2. Counts by intent category
    intent_stmt = (
        select(LeadRecord.intent_category, func.count(LeadRecord.id))
        .where(LeadRecord.is_archived.is_(False))
        .group_by(LeadRecord.intent_category)
    )
    intent_results = await db.execute(intent_stmt)
    intent_counts = {cat or "UNCERTAIN": count for cat, count in intent_results.all()}

    genuine_buyers = intent_counts.get("ACTIVE_BUYER", 0) + intent_counts.get("PROJECT_REQUEST", 0)
    dev_promos = intent_counts.get("DEVELOPER_PROMOTION", 0)
    gen_discussions = intent_counts.get("GENERAL_DISCUSSION", 0)
    biz_opps = intent_counts.get("BUSINESS_OPPORTUNITY", 0)
    uncertains = intent_counts.get("UNCERTAIN", 0)

    # 3. High priority count (score >= 80)
    high_priority_stmt = select(func.count(LeadRecord.id)).where(
        LeadRecord.is_archived.is_(False),
        LeadRecord.lead_score >= 80,
    )
    high_priority_count = (await db.execute(high_priority_stmt)).scalar() or 0

    # High priority genuine count
    high_prio_genuine_stmt = select(func.count(LeadRecord.id)).where(
        LeadRecord.is_archived.is_(False),
        LeadRecord.lead_score >= 80,
        LeadRecord.intent_category.in_(["ACTIVE_BUYER", "PROJECT_REQUEST"]),
    )
    high_priority_genuine = (await db.execute(high_prio_genuine_stmt)).scalar() or 0

    high_priority_precision = (
        round((high_priority_genuine / high_priority_count) * 100, 1)
        if high_priority_count > 0
        else 100.0
    )

    # 4. User Feedback counts
    feedback_stmt = (
        select(LeadRecord.feedback_label, func.count(LeadRecord.id))
        .where(LeadRecord.feedback_label.is_not(None))
        .group_by(LeadRecord.feedback_label)
    )
    feedback_results = await db.execute(feedback_stmt)
    feedback_counts = {label: count for label, count in feedback_results.all()}

    total_feedback = sum(feedback_counts.values())
    false_positives = feedback_counts.get("DEVELOPER_PROMOTION", 0) + feedback_counts.get("NOT_RELEVANT", 0)
    false_positive_rate = (
        round((false_positives / total_feedback) * 100, 1) if total_feedback > 0 else 0.0
    )

    # 5. Counts by Search Group
    group_stmt = (
        select(LeadRecord.search_group, func.count(LeadRecord.id))
        .where(LeadRecord.is_archived.is_(False))
        .group_by(LeadRecord.search_group)
    )
    group_results = await db.execute(group_stmt)
    search_group_counts = {grp or "UNASSIGNED": count for grp, count in group_results.all()}

    return {
        "total_evaluated": total_evaluated,
        "genuine_buyer_leads": genuine_buyers,
        "developer_promotions": dev_promos,
        "general_discussions": gen_discussions,
        "business_opportunities": biz_opps,
        "uncertain": uncertains,
        "false_positive_rate": false_positive_rate,
        "high_priority_precision": high_priority_precision,
        "counts_by_intent": intent_counts,
        "counts_by_search_group": search_group_counts,
        "user_feedback": feedback_counts,
    }
