import enum
from sqlalchemy import String, SMALLINT, Enum
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base, TimestampMixin

class QuarterWindowPhase(str, enum.Enum):
    PLANNING = "planning"
    Q1 = "q1"
    Q2 = "q2"
    Q3 = "q3"
    Q4 = "q4"

class QuarterWindowConfig(Base, TimestampMixin):
    """
    Configuration for default scheduled cycles/phases.
    """
    __tablename__ = "quarter_window_configs"

    phase: Mapped[QuarterWindowPhase] = mapped_column(
        Enum(QuarterWindowPhase), nullable=False, unique=True, index=True
    )
    start_month: Mapped[int] = mapped_column(SMALLINT, nullable=False) # 1-12
    start_day: Mapped[int] = mapped_column(SMALLINT, nullable=False)   # 1-31
    end_month: Mapped[int] = mapped_column(SMALLINT, nullable=False)   # 1-12
    end_day: Mapped[int] = mapped_column(SMALLINT, nullable=False)     # 1-31
