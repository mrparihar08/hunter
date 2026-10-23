import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class QueryPreset(Base):
    __tablename__ = "query_presets"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    preset_name: Mapped[str] = mapped_column(String(100), nullable=False)
    platform: Mapped[str] = mapped_column(String(50), nullable=False)
    industry: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    location_target: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    positive_keywords: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    negative_keywords: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    language: Mapped[str] = mapped_column(String(20), default="en", nullable=False)
    intent_level: Mapped[str] = mapped_column(String(50), default="HIGH", nullable=False)
    is_favorite: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    user = relationship("User", back_populates="presets")

    __table_args__ = (
        Index("idx_presets_user_id", "user_id"),
    )
