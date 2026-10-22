import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class WebsiteAudit(Base):
    __tablename__ = "website_audits"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    lead_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lead_records.id", ondelete="CASCADE"), nullable=False
    )
    target_url: Mapped[str] = mapped_column(Text, nullable=False)
    http_status: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_https: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    has_mobile_viewport: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    page_load_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    meta_title: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    meta_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    detected_technologies: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    identified_issues: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    audited_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )

    lead = relationship("LeadRecord", back_populates="audits")
