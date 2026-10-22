import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class OutreachGenerateRequest(BaseModel):
    channel: str = "EMAIL"  # EMAIL, LINKEDIN, CONTACT_FORM
    custom_instructions: Optional[str] = None


class OutreachDraftResponse(BaseModel):
    id: uuid.UUID
    lead_id: uuid.UUID
    created_by_user_id: uuid.UUID
    channel: str
    subject_line: Optional[str] = None
    body_text: str
    is_approved: bool
    created_at: datetime

    class Config:
        from_attributes = True
