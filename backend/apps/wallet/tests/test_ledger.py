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


@pytest.mark.django_db
def test_get_ledger_bundles_withdrawal_and_non_dispatch_penalties(seller_user, external_account):
    import uuid
    from apps.wallet.api import get_ledger

    request = MockRequest(seller_user)
    wallet = get_user_wallet(seller_user)

    # 1. Create a paired Withdrawal + Transfer Gateway Fee sharing the same reference_id
    withdraw_ref = uuid.uuid4()
    LedgerEntry.objects.create(
        reference_id=withdraw_ref,
        debit_account=wallet.ledger_account,
        credit_account=external_account,
        amount_ghs=Decimal("100.00"),
        entry_type="SELLER_WITHDRAWAL_REQUEST",
        payout_destination_type="MOMO",
        payout_account_number="0244000000",
    )
    LedgerEntry.objects.create(
        reference_id=withdraw_ref,
        debit_account=wallet.ledger_account,
        credit_account=external_account,
        amount_ghs=Decimal("1.95"),
        entry_type="PAYSTACK_PAYOUT_FEE",
    )

    # 2. Create a paired Non-Dispatch Penalty (Platform Fee + Gateway Fee) sharing the same order reference_id
    order_ref = uuid.uuid4()
    LedgerEntry.objects.create(
        reference_id=order_ref,
        debit_account=wallet.ledger_account,
        credit_account=external_account,
        amount_ghs=Decimal("13.00"),
        entry_type="NON_DISPATCH_SELLER_PENALTY_PLATFORM_FEE",
    )
    LedgerEntry.objects.create(
        reference_id=order_ref,
        debit_account=wallet.ledger_account,
        credit_account=external_account,
        amount_ghs=Decimal("3.90"),
        entry_type="NON_DISPATCH_SELLER_PENALTY_GATEWAY_FEE",
    )

    res = get_ledger(request)
    # 4 underlying debit entries should be bundled into 2 rows
    assert len(res["items"]) == 2

    by_ref = {item["reference_id"]: item for item in res["items"]}

    withdrawal_bundle = by_ref[str(withdraw_ref)]
    assert withdrawal_bundle["entry_type"] == "SELLER_WITHDRAWAL_REQUEST"
    assert withdrawal_bundle["is_bundled"] is True
    assert withdrawal_bundle["bundle_count"] == 2
    assert withdrawal_bundle["amount_ghs"] == 101.95
    assert len(withdrawal_bundle["fee_breakdown"]) == 2

    penalty_bundle = by_ref[str(order_ref)]
    assert penalty_bundle["entry_type"] == "NON_DISPATCH_SELLER_PENALTY"
    assert penalty_bundle["is_bundled"] is True
    assert penalty_bundle["bundle_count"] == 2
    assert penalty_bundle["amount_ghs"] == 16.90
    assert len(penalty_bundle["fee_breakdown"]) == 2

