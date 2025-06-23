from decimal import Decimal

# --- This is the central "Costing Engine" for audio generation ---

def calculate_audio_cost(text_input: str, response_format: str) -> Decimal:
    """
    Calculates the credit cost for generating audio based on its parameters.
    """
    # --- Base Costs ---
    base_cost = Decimal('0.5') # A flat fee for every audio generation
    
    # --- Character-based Cost ---
    # Example: 1 credit per 1000 characters
    character_cost = Decimal(len(text_input)) / Decimal('1000.0')

    # --- Format Surcharge ---
    # Lossless formats are larger and might cost more to store/process.
    format_costs = {
        'flac': Decimal('0.2'),
        'wav': Decimal('0.2'),
        'pcm': Decimal('0.2'),
    }
    format_surcharge = format_costs.get(response_format, Decimal('0.0'))

    # --- Total Cost Calculation ---
    total_cost = base_cost + character_cost + format_surcharge
    
    # Return cost rounded to 2 decimal places, with a minimum cost.
    min_cost = Decimal('0.5')
    return max(round(total_cost, 2), min_cost)