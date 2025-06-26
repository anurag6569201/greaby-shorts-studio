from decimal import Decimal
from .costs import (
    PLATFORM_FEE,
    VOICE_MULTIPLIERS,
    DEFAULT_VOICE_MULTIPLIER
)

def calculate_audio_cost(text_input: str, response_format: str, voice: str) -> Decimal:
    """
    Calculates audio cost by looking up the specific multiplier for the voice.
    Formula: Platform Fee + (Character Cost * Voice Multiplier)
    """
    voice_multiplier = VOICE_MULTIPLIERS.get(voice, DEFAULT_VOICE_MULTIPLIER)
    
    character_cost = Decimal(len(text_input)) / Decimal('1000.0')

    usage_cost = character_cost * voice_multiplier

    format_costs = { 'flac': Decimal('0.2'), 'wav': Decimal('0.2') }
    format_surcharge = format_costs.get(response_format, Decimal('0.0'))

    total_cost = PLATFORM_FEE + usage_cost + format_surcharge
    
    final_cost = round(total_cost, 2)
    
    return max(final_cost, PLATFORM_FEE)