from decimal import Decimal

# A simple cost model for document translation.
# In a real-world scenario, this might be more complex, potentially
# charging after the job is complete based on the character count.
# For now, we use a flat fee per document.

def calculate_document_translation_cost() -> Decimal:
    """
    Calculates the credit cost for translating a single document.
    
    Current Model:
    - A flat fee of 2.0 credits per document, regardless of length.
    
    Future Enhancement:
    - Could be updated to charge based on character count after the translation
      is complete. For example: 0.5 base credits + 0.1 credits per 1000 characters.
    """
    base_cost = Decimal('2.0')
    return round(base_cost, 2)