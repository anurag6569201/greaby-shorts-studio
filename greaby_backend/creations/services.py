from decimal import Decimal

# --- This is the central "Costing Engine" for video generation ---
# By keeping it here, we can easily adjust pricing without touching the views or models.

def calculate_video_cost(resolution: str, duration: int, n_variants: int) -> Decimal:
    """
    Calculates the credit cost for generating a video based on its parameters.
    """
    # --- Base Costs ---
    base_cost = Decimal('2.0') # A flat fee for every video generation
    
    # --- Resolution Multiplier ---
    resolution_costs = {
        '480p': Decimal('1.0'),
        '720p': Decimal('1.5'),
        '1080p': Decimal('2.5'),
    }
    resolution_multiplier = resolution_costs.get(resolution, Decimal('1.0'))
    
    # --- Duration Cost ---
    # Example: 0.5 credits per second
    duration_cost = Decimal(duration) * Decimal('0.5')
    
    # --- Total Cost Calculation ---
    single_video_cost = base_cost + (duration_cost * resolution_multiplier)
    total_cost = single_video_cost * Decimal(n_variants)
    
    # Return cost rounded to 2 decimal places
    return round(total_cost, 2)