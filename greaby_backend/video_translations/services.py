# video_translations/services.py

from decimal import Decimal

# This pricing is an EXAMPLE. You must replace it with your actual business logic.
# A common model is cost-per-minute of video.
COST_PER_MINUTE = Decimal('5.0') 
BASE_FEE = Decimal('1.0') # A flat fee for every translation job

def calculate_translation_cost(duration_seconds: float) -> Decimal:
    """
    Calculates the cost of a video translation based on its duration.
    """
    if not isinstance(duration_seconds, (int, float)) or duration_seconds <= 0:
        return BASE_FEE

    duration_minutes = Decimal(duration_seconds) / Decimal('60.0')
    
    # Calculate the variable cost based on duration
    variable_cost = duration_minutes * COST_PER_MINUTE
    
    # Total cost is the base fee plus the variable cost
    total_cost = BASE_FEE + variable_cost
    
    # Return the cost rounded to 2 decimal places
    return round(total_cost, 2)