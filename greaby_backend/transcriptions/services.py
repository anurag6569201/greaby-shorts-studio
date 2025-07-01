# transcriptions/services.py

from decimal import Decimal

# --- This is the central "Costing Engine" for transcription ---

# 1. Base cost for initiating any transcription job.
BASE_FEE = Decimal('1.0')

# 2. Cost per minute of audio/video.
COST_PER_MINUTE = Decimal('0.25')

# 3. Surcharge for enabling speaker separation (diarization).
SPEAKER_SEPARATION_SURCHARGE = Decimal('0.50')

# 4. Surcharge for the premium AI Insights feature.
AI_INSIGHTS_SURCHARGE = Decimal('1.50')

def calculate_transcription_cost(duration_minutes: int, enable_speaker_separation: bool, generate_insights: bool) -> Decimal:
    """
    Calculates the credit cost for a transcription job, including optional features.
    """
    if duration_minutes <= 0:
        duration_minutes = 1 # Ensure there's at least a minimum charge

    duration_cost = Decimal(duration_minutes) * COST_PER_MINUTE
    
    total_cost = BASE_FEE + duration_cost
    
    if enable_speaker_separation:
        total_cost += SPEAKER_SEPARATION_SURCHARGE
        
    if generate_insights:
        total_cost += AI_INSIGHTS_SURCHARGE
        
    return round(total_cost, 2)