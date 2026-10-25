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


class LeadFeedbackRequest(BaseModel):
    feedback: str  # REAL_BUYER | DEVELOPER_PROMOTION | NOT_RELEVANT
    notes: Optional[str] = None


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
    author_role: Optional[str] = None
    intent_category: Optional[str] = None
    lead_score: Optional[int] = None
    confidence_score: Optional[float] = None
    positive_evidence: Optional[List[str]] = None
    negative_evidence: Optional[List[str]] = None
    explanation: Optional[str] = None
    search_group: Optional[str] = None


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
    feedback_label: Optional[str] = None
    intent_category: Optional[str] = None
    lead_score: Optional[int] = None
    explanation: Optional[str] = None


class LeadResponse(LeadBase):
    id: uuid.UUID
    ai_fit_score: Optional[int] = None
    ai_qualification_category: Optional[AICategory] = None
    ai_qualification_reason: Optional[str] = None
    intent_category: Optional[str] = None
    lead_score: Optional[int] = None
    confidence_score: Optional[float] = None
    positive_evidence: Optional[List[str]] = None
    negative_evidence: Optional[List[str]] = None
    explanation: Optional[str] = None
    feedback_label: Optional[str] = None
    search_group: Optional[str] = None
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
