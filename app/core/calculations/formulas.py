import abc
from app.core.calculations.utils import safe_divide, normalize_percentage

class ProgressFormula(abc.ABC):
    """Abstract base class for all progress formulas."""
    
    @abc.abstractmethod
    def calculate(self, target: float, actual: float) -> float:
        """Returns the calculated progress as a raw percentage float (0.0 to 100.0)."""
        pass

class MinFormula(ProgressFormula):
    """
    Min (Numeric / %): Higher is better.
    Formula: (Actual / Target) * 100
    If Target is 0, returning 100 if Actual >= 0 else 0.
    """
    def calculate(self, target: float, actual: float) -> float:
        if target == 0:
            val = 100.0 if actual >= 0 else 0.0
            return normalize_percentage(val)
        
        result = safe_divide(actual, target) * 100.0
        return normalize_percentage(result)

class MaxFormula(ProgressFormula):
    """
    Max (Numeric / %): Lower is better.
    Formula: (Target / Actual) * 100
    If Actual is 0, typically means achieved perfectly (or better).
    """
    def calculate(self, target: float, actual: float) -> float:
        if actual <= 0:
            return 100.0
        if target == 0:
            return 0.0 if actual > 0 else 100.0
            
        result = safe_divide(target, actual) * 100.0
        return normalize_percentage(result)

class TimelineFormula(ProgressFormula):
    """
    Timeline: Completion Date vs Deadline
    Formula: 100% if actual <= target, else 0%
    Expects actual and target to be represented as timestamps or similar numeric equivalents.
    """
    def calculate(self, target: float, actual: float) -> float:
        if target == 0:
            return 0.0
        val = 100.0 if actual <= target else 0.0
        return normalize_percentage(val)

class ZeroFormula(ProgressFormula):
    """
    Zero: 100% if actual >= target, else 0%
    Usually used for binary features where "done" = target reached.
    """
    def calculate(self, target: float, actual: float) -> float:
        if target == 0:
            val = 100.0 if actual == 0 else 0.0
            return normalize_percentage(val)
        val = 100.0 if actual >= target else 0.0
        return normalize_percentage(val)
