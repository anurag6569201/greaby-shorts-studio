from decimal import Decimal

COST_PER_MINUTE = Decimal('3.0') 
BASE_FEE = Decimal('4.0')

def calculate_translation_cost(duration_seconds: float) -> Decimal:
    if not isinstance(duration_seconds, (int, float)) or duration_seconds <= 0:
        return BASE_FEE

    duration_minutes = Decimal(duration_seconds) / Decimal('60.0')
    variable_cost = duration_minutes * COST_PER_MINUTE
    total_cost = BASE_FEE + variable_cost
    
    return round(total_cost, 2)