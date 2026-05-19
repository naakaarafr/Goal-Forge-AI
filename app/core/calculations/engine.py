from app.models.enums import UoMType
from app.core.calculations.formulas import (
    ProgressFormula,
    MinFormula,
    MaxFormula,
    TimelineFormula,
    ZeroFormula
)

class CalculationEngine:
    """
    Enterprise Progress Engine that routes UoM types to specific strategy formulas.
    Thread-safe and async-safe via stateless execution.
    """
    
    _registry = {
        UoMType.numeric_min: MinFormula(),
        UoMType.percentage_min: MinFormula(),
        UoMType.numeric_max: MaxFormula(),
        UoMType.percentage_max: MaxFormula(),
        UoMType.timeline: TimelineFormula(),
        UoMType.zero: ZeroFormula()
    }

    @classmethod
    def calculate(cls, uom: UoMType, target: float, actual: float) -> float:
        """
        Calculates the normalized progress score for a given UoM.
        """
        formula: ProgressFormula = cls._registry.get(uom)
        if not formula:
            return 0.0
        return formula.calculate(target, actual)
