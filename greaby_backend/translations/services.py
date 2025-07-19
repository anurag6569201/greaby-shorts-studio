# translations/services.py

from decimal import Decimal

def calculate_document_page_based_cost(page_count: int) -> Decimal:
    """Calculates cost based on page count (for PDF, PPTX)."""
    base_cost = Decimal('2.0')
    if page_count <= 2:
        return base_cost

    additional_cost = Decimal('0.0')
    # Tier 1: Pages 3-5
    if page_count >= 3:
        pages_in_tier = min(page_count, 5) - 2
        additional_cost += Decimal(pages_in_tier) * Decimal('0.3')
        
    # Tier 2: Pages 6-10
    if page_count >= 6:
        pages_in_tier = min(page_count, 10) - 5
        additional_cost += Decimal(pages_in_tier) * Decimal('0.5')

    # Tier 3: Pages 11-15
    if page_count >= 11:
        pages_in_tier = min(page_count, 15) - 10
        additional_cost += Decimal(pages_in_tier) * Decimal('0.7')
        
    # Tier 4: Pages 16-20
    if page_count >= 16:
        pages_in_tier = min(page_count, 20) - 15
        additional_cost += Decimal(pages_in_tier) * Decimal('1.0')
    
    total_cost = base_cost + additional_cost
    return round(total_cost, 2)

def calculate_document_char_based_cost(char_count: int) -> Decimal:
    """Calculates cost based on character count for other formats (DOCX, TXT)."""
    base_cost = Decimal('2.0')
    if char_count <= 2000:
        return base_cost

    # Calculate cost for characters above the 2000 base
    # Each block of 2000 characters (or part thereof) costs 0.5 credits.
    additional_chars = char_count - 2000
    additional_blocks = -(-additional_chars // 2000)  # Ceiling division
    additional_cost = Decimal(additional_blocks) * Decimal('0.5')
    
    total_cost = base_cost + additional_cost
    return round(total_cost, 2)