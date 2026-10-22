import uuid
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel


class FollowUpCreate(BaseModel):
    lead_id: uuid.UUID
    due_date: date
    task_note: str


class FollowUpUpdate(BaseModel):
    is_completed: Optional[bool] = None
    due_date: Optional[date] = None
    task_note: Optional[str] = None


class FollowUpResponse(BaseModel):
    id: uuid.UUID
    lead_id: uuid.UUID
    assigned_to_user_id: uuid.UUID
    due_date: date
    task_note: str
    is_completed: bool
    completed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
