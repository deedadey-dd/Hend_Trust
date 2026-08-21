import pytest
from decimal import Decimal
from apps.users.models import User
from apps.ledger.models import LedgerAccount, LedgerEntry, AccountType
from apps.wallet.api import get_user_wallet

class MockRequest:
    def __init__(self, user):
        self.user = user

@pytest.fixture
def seller_user(db):
    return User.objects.create_user(username="ledger_seller", phone_number="000")

@pytest.fixture
def external_account(db):
    return LedgerAccount.objects.create(name="EXTERNAL", account_type=AccountType.ASSET)

@pytest.mark.django_db
def test_get_ledger_entries(seller_user, external_account):
    request = MockRequest(seller_user)
    
    # Init wallet
    wallet = get_user_wallet(seller_user)
    
    # Create some ledger entries
    # Credit the wallet
    LedgerEntry.objects.create(
        reference_id="00000000-0000-0000-0000-000000000000",
        debit_account=external_account,
        credit_account=wallet.ledger_account,
        amount_ghs=Decimal("150.00"),
        entry_type="ESCROW_RELEASE"
    )
    
    # Debit the wallet
    LedgerEntry.objects.create(
        reference_id="00000000-0000-0000-0000-000000000001",
        debit_account=wallet.ledger_account,
        credit_account=external_account,
        amount_ghs=Decimal("10.00"),
        entry_type="WITHDRAWAL"
    )
    
    from apps.wallet.api import get_ledger
    # Test without filters
    res = get_ledger(request)
    assert len(res["items"]) == 2
    
    # Type should be correctly identified
    # The first one is a CREDIT to the wallet
    assert any(e["type"] == "CREDIT" and e["amount_ghs"] == 150.0 for e in res["items"])
    # The second one is a DEBIT to the wallet
    assert any(e["type"] == "DEBIT" and e["amount_ghs"] == 10.0 for e in res["items"])
    
    # Test filtering by entry_type
    res_filtered = get_ledger(request, entry_type="WITHDRAWAL")
    assert len(res_filtered["items"]) == 1
    assert res_filtered["items"][0]["entry_type"] == "WITHDRAWAL"
