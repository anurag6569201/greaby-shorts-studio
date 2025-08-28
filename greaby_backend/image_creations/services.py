from decimal import Decimal

# Base cost for a single standard quality 1024x1024 image
BASE_COST = Decimal('1.0')

def calculate_image_cost(n: int, size: str, quality: str) -> Decimal:
    """
    Calculates the cost for an image generation request.
    This logic MUST live on the backend to be secure.
    """
    cost = BASE_COST

    # Add surcharge for larger images
    if size != '1024x1024':
        cost += Decimal('0.5')
    
    # Double the cost for HD quality
    if quality == 'hd':
        cost *= 2
    
    # Multiply by the number of images requested
    total_cost = cost * n
    
    return round(total_cost, 2)