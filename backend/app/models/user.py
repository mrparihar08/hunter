import enum
import uuid
from datetime import datetime
from sqlalchemy import Boolean, DateTime, Enum, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class UserRole(str, enum.Enum):
    OWNER_ADMIN = "OWNER_ADMIN"
    COLLABORATOR = "COLLABORATOR"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role"), default=UserRole.COLLABORATOR, nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    created_leads = relationship("LeadRecord", back_populates="creator", foreign_keys="LeadRecord.created_by_user_id")
    assigned_leads = relationship("LeadRecord", back_populates="assignee", foreign_keys="LeadRecord.assigned_user_id")
    assigned_tasks = relationship("FollowUpTask", back_populates="assignee")
    activities = relationship("LeadActivity", back_populates="user")
    presets = relationship("QueryPreset", back_populates="user", cascade="all, delete-orphan")
