import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, HttpUrl
from app.models.lead import AICategory, LeadStatus, LeadType


class LeadSourceBase(BaseModel):
    platform: str
    external_id: Optional[str] = None
    source_url: str
    raw_payload: Optional[Dict[str, Any]] = None


class LeadSourceResponse(LeadSourceBase):
    id: uuid.UUID
    discovered_at: datetime

    class Config:
        from_attributes = True


class LeadBase(BaseModel):
    business_or_title: str
    lead_type: LeadType
    current_status: LeadStatus = LeadStatus.NEW
    canonical_domain: Optional[str] = None
    normalized_phone: Optional[str] = None
    contact_email: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    estimated_budget: Optional[str] = None


class LeadCreate(LeadBase):
    source_platform: str = "MANUAL"
    source_url: str
    source_external_id: Optional[str] = None
    source_payload: Optional[Dict[str, Any]] = None


class LeadUpdate(BaseModel):
    business_or_title: Optional[str] = None
    current_status: Optional[LeadStatus] = None
    contact_email: Optional[str] = None
    normalized_phone: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    estimated_budget: Optional[str] = None
    assigned_user_id: Optional[uuid.UUID] = None
    is_archived: Optional[bool] = None


class LeadResponse(LeadBase):
    id: uuid.UUID
    ai_fit_score: Optional[int] = None
    ai_qualification_category: Optional[AICategory] = None
    ai_qualification_reason: Optional[str] = None
    assigned_user_id: Optional[uuid.UUID] = None
    created_by_user_id: uuid.UUID
    is_archived: bool
    created_at: datetime
    updated_at: datetime
    sources: List[LeadSourceResponse] = []

    class Config:
        from_attributes = True


class LeadListResponse(BaseModel):
    items: List[LeadResponse]
    total: int
    page: int
    page_size: int
