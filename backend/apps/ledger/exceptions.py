class LedgerImbalanceException(Exception):
    """Raised when total debits do not equal total credits in a ledger transaction."""
    pass
