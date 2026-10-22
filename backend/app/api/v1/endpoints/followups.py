import uuid
from datetime import date, datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.activity import LeadActivity
from app.models.follow_up import FollowUpTask
from app.models.lead import LeadRecord
from app.models.user import User
from app.schemas.follow_up import FollowUpCreate, FollowUpResponse, FollowUpUpdate

router = APIRouter()


@router.get("", response_model=List[FollowUpResponse])
async def list_follow_ups(
    is_completed: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(FollowUpTask)
        .where(
            FollowUpTask.assigned_to_user_id == current_user.id,
            FollowUpTask.is_completed == is_completed,
        )
        .order_by(FollowUpTask.due_date.asc())
    )
    result = await db.execute(stmt)
    tasks = result.scalars().all()
    return [FollowUpResponse.model_validate(t) for t in tasks]


@router.post("", response_model=FollowUpResponse, status_code=status.HTTP_201_CREATED)
async def create_follow_up(
    task_in: FollowUpCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(LeadRecord).where(LeadRecord.id == task_in.lead_id)
    result = await db.execute(stmt)
    lead = result.scalars().first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    new_task = FollowUpTask(
        lead_id=lead.id,
        assigned_to_user_id=current_user.id,
        due_date=task_in.due_date,
        task_note=task_in.task_note.strip(),
        is_completed=False,
    )
    db.add(new_task)

    activity = LeadActivity(
        lead_id=lead.id,
        user_id=current_user.id,
        activity_type="FOLLOW_UP_SCHEDULED",
        description=f"Follow-up scheduled for {task_in.due_date}: {task_in.task_note}",
    )
    db.add(activity)

    await db.commit()
    await db.refresh(new_task)
    return FollowUpResponse.model_validate(new_task)


@router.patch("/{id}", response_model=FollowUpResponse)
async def update_follow_up(
    id: uuid.UUID,
    task_in: FollowUpUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(FollowUpTask).where(FollowUpTask.id == id)
    result = await db.execute(stmt)
    task = result.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if task_in.is_completed is not None:
        task.is_completed = task_in.is_completed
        task.completed_at = datetime.utcnow() if task_in.is_completed else None

    if task_in.due_date is not None:
        task.due_date = task_in.due_date

    if task_in.task_note is not None:
        task.task_note = task_in.task_note

    await db.commit()
    await db.refresh(task)
    return FollowUpResponse.model_validate(task)
