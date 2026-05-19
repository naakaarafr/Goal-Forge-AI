import enum

class UserRole(str, enum.Enum):
    admin = "admin"
    manager = "manager"
    employee = "employee"

class GoalStatus(str, enum.Enum):
    draft = "draft"
    submitted = "submitted"
    approved = "approved"
    rejected = "rejected"
    locked = "locked"

class UoMType(str, enum.Enum):
    numeric_min = "numeric_min"
    numeric_max = "numeric_max"
    percentage_min = "percentage_min"
    percentage_max = "percentage_max"
    timeline = "timeline"
    zero = "zero"

class TrackingStatus(str, enum.Enum):
    not_started = "not_started"
    on_track = "on_track"
    completed = "completed"

class GoalPriority(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"

class AccessLevel(str, enum.Enum):
    VIEW = "view"
    EDIT = "edit"

class EscalationStatus(str, enum.Enum):
    OPEN = "open"
    RESOLVED = "resolved"

class QuarterState(str, enum.Enum):
    PLANNING = "planning"
    ACTIVE = "active"
    REVIEW = "review"
    CLOSED = "closed"

class PerformanceRating(str, enum.Enum):
    exceeds_expectations = "exceeds_expectations"
    meets_expectations = "meets_expectations"
    needs_improvement = "needs_improvement"
