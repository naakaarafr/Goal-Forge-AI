def safe_divide(numerator: float, denominator: float) -> float:
    """Safely divide two numbers, returning 0.0 if denominator is 0."""
    if denominator == 0:
        return 0.0
    return numerator / denominator

def normalize_percentage(value: float, allow_negative: bool = False, max_value: float = 100.0) -> float:
    """Normalizes a percentage to bounded limits, ensuring 2 decimal precision."""
    if not allow_negative and value < 0:
        value = 0.0
    if max_value is not None and value > max_value:
        value = max_value
    return round(value, 2)
