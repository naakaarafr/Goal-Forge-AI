import uuid
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, Boolean, UUID, ForeignKey, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin, SoftDeleteMixin, GUID
from app.models.enums import UserRole

if TYPE_CHECKING:
    from app.models.goal import Goal
    from app.models.goal_share import GoalShare
    from app.models.notification import Notification
    from app.models.department import Department
    from app.models.manager_feedback import ManagerFeedback


class User(Base, TimestampMixin, SoftDeleteMixin):
    """
    User entity representing employees, managers, and admins.
    Uses selectin loading for relationships to avoid N+1 issues in async environments.
    """
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=True)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole), default=UserRole.employee, nullable=False, index=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False)

    # Hierarchy: Self-referencing relationship
    manager_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        GUID(), ForeignKey("users.id"), nullable=True, index=True
    )
    department_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        GUID(), ForeignKey("departments.id"), nullable=True, index=True
    )
    
    # Relationships
    manager: Mapped[Optional["User"]] = relationship(
        "User", remote_side="User.id", back_populates="subordinates"
    )
    subordinates: Mapped[List["User"]] = relationship(
        "User", back_populates="manager", lazy="selectin"
    )
    department: Mapped[Optional["Department"]] = relationship(
        "Department", back_populates="users"
    )
    
    goals: Mapped[List["Goal"]] = relationship(
        "Goal", back_populates="owner", cascade="all, delete-orphan", lazy="selectin"
    )
    shared_goals: Mapped[List["GoalShare"]] = relationship(
        "GoalShare", back_populates="user", cascade="all, delete-orphan", lazy="selectin"
    )
    notifications: Mapped[List["Notification"]] = relationship(
        "Notification", back_populates="user", cascade="all, delete-orphan", lazy="selectin"
    )
    
    received_feedback: Mapped[List["ManagerFeedback"]] = relationship(
        "ManagerFeedback", 
        foreign_keys="[ManagerFeedback.employee_id]", 
        back_populates="employee", 
        cascade="all, delete-orphan", 
        lazy="selectin"
    )
    given_feedback: Mapped[List["ManagerFeedback"]] = relationship(
        "ManagerFeedback", 
        foreign_keys="[ManagerFeedback.manager_id]", 
        back_populates="manager", 
        cascade="all, delete-orphan", 
        lazy="selectin"
    )
