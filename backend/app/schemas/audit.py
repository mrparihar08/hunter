import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class AuditTrigger(BaseModel):
    target_url: Optional[str] = None


class WebsiteAuditResponse(BaseModel):
    id: uuid.UUID
    lead_id: uuid.UUID
    target_url: str
    http_status: Optional[int] = None
    is_https: bool
    has_mobile_viewport: bool
    page_load_ms: Optional[int] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    detected_technologies: List[str] = []
    identified_issues: List[str] = []
    audited_at: datetime

    class Config:
        from_attributes = True
