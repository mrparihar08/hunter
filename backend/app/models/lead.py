import enum
import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class LeadType(str, enum.Enum):
    LOCAL_BUSINESS = "LOCAL_BUSINESS"
    FREELANCE_PROJECT = "FREELANCE_PROJECT"
    SOCIAL_OPPORTUNITY = "SOCIAL_OPPORTUNITY"


class LeadStatus(str, enum.Enum):
    NEW = "NEW"
    NEEDS_REVIEW = "NEEDS_REVIEW"
    QUALIFIED = "QUALIFIED"
    CONTACTED = "CONTACTED"
    REPLIED = "REPLIED"
    MEETING_SCHEDULED = "MEETING_SCHEDULED"
    PROPOSAL_SENT = "PROPOSAL_SENT"
    WON = "WON"
    LOST = "LOST"
    NOT_RELEVANT = "NOT_RELEVANT"


class AICategory(str, enum.Enum):
    EXPLICIT_NEED = "EXPLICIT_NEED"
    INFERRED_OPPORTUNITY = "INFERRED_OPPORTUNITY"
    SPECULATIVE = "SPECULATIVE"


class LeadRecord(Base):
    __tablename__ = "lead_records"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    business_or_title: Mapped[str] = mapped_column(String(255), nullable=False)
    lead_type: Mapped[LeadType] = mapped_column(
        Enum(LeadType, name="lead_type"), nullable=False
    )
    current_status: Mapped[LeadStatus] = mapped_column(
        Enum(LeadStatus, name="lead_status"), default=LeadStatus.NEW, nullable=False
    )

    # Identifiers for deduplication
    canonical_domain: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    normalized_phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    contact_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Geographic and Contextual info
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    country: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    estimated_budget: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # AI Qualification
    ai_fit_score: Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)
    ai_qualification_category: Mapped[Optional[AICategory]] = mapped_column(
        Enum(AICategory, name="ai_category"), nullable=True
    )
    ai_qualification_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Buyer Intent & Lead Intelligence
    intent_category: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    lead_score: Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)
    confidence_score: Mapped[Optional[float]] = mapped_column(nullable=True)
    positive_evidence: Mapped[Optional[list]] = mapped_column(JSONB, default=list, nullable=True)
    negative_evidence: Mapped[Optional[list]] = mapped_column(JSONB, default=list, nullable=True)
    explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    feedback_label: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    search_group: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Ownership & Assignment
    assigned_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )

    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    creator = relationship("User", back_populates="created_leads", foreign_keys=[created_by_user_id])
    assignee = relationship("User", back_populates="assigned_leads", foreign_keys=[assigned_user_id])
    sources: Mapped[List["LeadSource"]] = relationship(
        "LeadSource", back_populates="lead", cascade="all, delete-orphan"
    )
    audits = relationship("WebsiteAudit", back_populates="lead", cascade="all, delete-orphan")
    drafts = relationship("OutreachDraft", back_populates="lead", cascade="all, delete-orphan")
    tasks = relationship("FollowUpTask", back_populates="lead", cascade="all, delete-orphan")
    activities = relationship("LeadActivity", back_populates="lead", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_leads_canonical_domain", "canonical_domain", postgresql_where=(canonical_domain.is_not(None))),
        Index("idx_leads_normalized_phone", "normalized_phone", postgresql_where=(normalized_phone.is_not(None))),
        Index("idx_leads_status_assigned", "current_status", "assigned_user_id"),
    )


class LeadSource(Base):
    __tablename__ = "lead_sources"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    lead_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lead_records.id", ondelete="CASCADE"), nullable=False
    )
    platform: Mapped[str] = mapped_column(String(50), nullable=False)
    external_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    source_url: Mapped[str] = mapped_column(Text, nullable=False)
    raw_payload: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    discovered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )

    lead: Mapped["LeadRecord"] = relationship("LeadRecord", back_populates="sources")

    __table_args__ = (
        UniqueConstraint("platform", "external_id", name="uq_platform_external_id"),
    )
