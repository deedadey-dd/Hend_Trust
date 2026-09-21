import pytest
from decimal import Decimal
from django.utils import timezone
from apps.users.models import User, Role, VerificationStatus
from apps.escrow.models import (
    Transaction,
    TransactionStatus,
    DisputeResolutionAction,
    DisputeActionType,
    ArbiterActivityLog,
    ArbiterActivityType,
    ArbiterPayoutBatch,
    ArbiterPayoutStatus,
)
from apps.links.models import PaymentLink
from apps.ledger.models import LedgerAccount
from apps.escrow.api import (
    resolve_dispute_admin,
    assign_dispute_arbiter,
    get_dispute_actions,
    list_arbiter_activities,
    list_arbiter_balances,
    create_arbiter_payout_batch,
    list_staff_members,
    update_staff_role,
    create_staff_member,
    DisputeResolutionAdminSchema,
    AssignArbiterSchema,
    CreateArbiterPayoutBatchSchema,
    UpdateStaffRoleSchema,
    CreateStaffMemberSchema,
)
from ninja.errors import HttpError


class MockRequest:
    def __init__(self, user):
        self.user = user


@pytest.fixture
def system_users(db):
    admin_mgr = User.objects.create_user(
        phone_number="0241111111",
        email="admin_mgr@trust.com",
        username="admin_manager",
        role=Role.ADMIN,
        is_staff=True
    )
    arbiter_user = User.objects.create_user(
        phone_number="0242222222",
        email="arbiter@trust.com",
        username="dispute_arbiter",
        role=Role.ARBITER,
        is_staff=True
    )
    compliance_user = User.objects.create_user(
        phone_number="0243333333",
        email="compliance@trust.com",
        username="compliance_officer",
        role=Role.COMPLIANCE_OFFICER,
        is_staff=True
    )
    finance_user = User.objects.create_user(
        phone_number="0244444444",
        email="finance@trust.com",
        username="finance_admin",
        role=Role.FINANCE_ADMIN,
        is_staff=True
    )
    support_user = User.objects.create_user(
        phone_number="0245555555",
        email="support@trust.com",
        username="support_agent",
        role=Role.SUPPORT_AGENT,
        is_staff=True
    )
    seller_user = User.objects.create_user(
        phone_number="0246666666",
        email="seller@trust.com",
        username="regular_seller",
        role=Role.SELLER,
        is_staff=False
    )
    buyer_user = User.objects.create_user(
        phone_number="0247777777",
        email="buyer@trust.com",
        username="regular_buyer",
        role=Role.BUYER,
        is_staff=False
    )
    superuser = User.objects.create_superuser(
        phone_number="0248888888",
        email="super@trust.com",
        username="superadmin",
        password="superpassword"
    )
    return {
        "admin": admin_mgr,
        "arbiter": arbiter_user,
        "compliance": compliance_user,
        "finance": finance_user,
        "support": support_user,
        "seller": seller_user,
        "buyer": buyer_user,
        "superuser": superuser,
    }


@pytest.fixture
def disputed_txn(db, system_users):
    seller = system_users["seller"]
    link = PaymentLink.objects.create(
        seller=seller,
        title="Gaming Laptop",
        price_ghs=Decimal("500.00"),
        shipping_fee_ghs=Decimal("20.00")
    )
    txn = Transaction.objects.create(
        link=link,
        paystack_reference="REF-DISPUTE-TEST-001",
        buyer_name="Kwame Mensah",
        buyer_phone="0247777777",
        buyer_email="buyer@trust.com",
        total_amount_ghs=Decimal("520.00"),
        platform_fee_ghs=Decimal("25.00"),
        status=TransactionStatus.DISPUTED,
        buyer_dispute_reason="Screen damaged upon unboxing",
    )
    return txn


@pytest.mark.django_db
def test_rbac_dispute_resolution_permission(system_users, disputed_txn):
    """Arbiter and Admin Manager are permitted to resolve disputes; Seller and Support Agent are rejected."""
    arbiter_req = MockRequest(system_users["arbiter"])
    seller_req = MockRequest(system_users["seller"])
    support_req = MockRequest(system_users["support"])

    data = DisputeResolutionAdminSchema(
        action="RELEASE_TO_SELLER",
        admin_notes="Evidence checked and valid."
    )

    # Seller must be rejected with 403
    with pytest.raises(HttpError) as exc_info:
        resolve_dispute_admin(seller_req, disputed_txn.id, data)
    assert exc_info.value.status_code == 403

    # Support agent must be rejected with 403
    with pytest.raises(HttpError) as exc_info:
        resolve_dispute_admin(support_req, disputed_txn.id, data)
    assert exc_info.value.status_code == 403

    # Arbiter is authorized
    res = resolve_dispute_admin(arbiter_req, disputed_txn.id, data)
    assert "Funds released to seller" in res["message"]


@pytest.mark.django_db
def test_dispute_resolution_creates_audit_action_and_activity_log(system_users, disputed_txn):
    """Resolving a dispute creates a DisputeResolutionAction and an ArbiterActivityLog."""
    arbiter_user = system_users["arbiter"]
    arbiter_req = MockRequest(arbiter_user)

    data = DisputeResolutionAdminSchema(
        action="PARTIAL_REFUND_TO_BUYER",
        refund_amount_ghs=200.0,
        seller_amount_ghs=300.0,
        platform_retained_fee_ghs=20.0,
        admin_notes="Mutual settlement agreed with buyer and seller."
    )

    res = resolve_dispute_admin(arbiter_req, disputed_txn.id, data)
    assert "settlement processed successfully" in res["message"]

    disputed_txn.refresh_from_db()
    assert disputed_txn.status == TransactionStatus.REFUNDED
    assert disputed_txn.assigned_arbiter == arbiter_user

    # Verify DisputeResolutionAction
    action = DisputeResolutionAction.objects.filter(transaction=disputed_txn).first()
    assert action is not None
    assert action.arbiter == arbiter_user
    assert action.action_type == "PARTIAL_REFUND_TO_BUYER"
    assert action.refund_amount_ghs == Decimal("200.00")
    assert action.seller_amount_ghs == Decimal("300.00")
    assert action.platform_retained_fee_ghs == Decimal("20.00")
    assert "Mutual settlement" in action.admin_notes

    # Verify ArbiterActivityLog
    act_log = ArbiterActivityLog.objects.filter(transaction=disputed_txn).first()
    assert act_log is not None
    assert act_log.arbiter == arbiter_user
    assert act_log.activity_type == ArbiterActivityType.DISPUTE_RESOLVED
    assert act_log.fee_rate_ghs == Decimal("25.00")
    assert act_log.payout_status == ArbiterPayoutStatus.PENDING
    assert act_log.resolution_action == action


@pytest.mark.django_db
def test_assign_dispute_arbiter_and_get_actions(system_users, disputed_txn):
    """Test assigning an arbiter and fetching dispute action audit trail."""
    admin_req = MockRequest(system_users["admin"])
    arbiter_user = system_users["arbiter"]

    # Assign arbiter
    assign_data = AssignArbiterSchema(
        arbiter_id=arbiter_user.id,
        notes="Assigned senior electronics arbiter."
    )
    assign_res = assign_dispute_arbiter(admin_req, disputed_txn.id, assign_data)
    assert assign_res["assigned_arbiter_username"] == arbiter_user.username

    disputed_txn.refresh_from_db()
    assert disputed_txn.assigned_arbiter == arbiter_user

    # Fetch actions
    actions_res = get_dispute_actions(admin_req, disputed_txn.id)
    assert len(actions_res) == 1
    assert actions_res[0]["action_type"] == DisputeActionType.ASSIGNED
    assert "Assigned senior electronics arbiter" in actions_res[0]["admin_notes"]


@pytest.mark.django_db
def test_finance_arbiter_balances_and_payout_batch(system_users, disputed_txn):
    """Test arbiter balance calculation and batch payout processing by Finance Admin."""
    arbiter_user = system_users["arbiter"]
    finance_user = system_users["finance"]
    arbiter_req = MockRequest(arbiter_user)
    finance_req = MockRequest(finance_user)

    # Resolve dispute to create pending activity log
    data = DisputeResolutionAdminSchema(
        action="RELEASE_TO_SELLER",
        admin_notes="Item verified delivered in good condition."
    )
    resolve_dispute_admin(arbiter_req, disputed_txn.id, data)

    # Check arbiter balances
    balances = list_arbiter_balances(finance_req)
    arb_bal = next((b for b in balances if b["arbiter_id"] == str(arbiter_user.id)), None)
    assert arb_bal is not None
    assert arb_bal["unpaid_count"] == 1
    assert arb_bal["unpaid_balance_ghs"] == 25.0
    assert arb_bal["paid_balance_ghs"] == 0.0

    # Process payout batch
    payout_data = CreateArbiterPayoutBatchSchema(
        arbiter_id=arbiter_user.id,
        payout_method="MOMO",
        payout_account_details={"phone": "0242222222", "network": "MTN"},
        notes="Weekly settlement batch"
    )
    payout_res = create_arbiter_payout_batch(finance_req, payout_data)
    assert payout_res["activity_count"] == 1
    assert payout_res["total_amount_ghs"] == 25.0

    # Verify activity log updated to PAID
    act_log = ArbiterActivityLog.objects.filter(arbiter=arbiter_user).first()
    assert act_log.payout_status == ArbiterPayoutStatus.PAID
    assert act_log.paid_at is not None
    assert act_log.approved_by == finance_user

    # Verify batch record
    batch = ArbiterPayoutBatch.objects.get(id=payout_res["batch_id"])
    assert batch.total_amount_ghs == Decimal("25.00")
    assert batch.finance_admin == finance_user
    assert batch.status == "PAID"

    # Re-check balances: unpaid balance is now 0, paid is 25.0
    balances_after = list_arbiter_balances(finance_req)
    arb_bal_after = next((b for b in balances_after if b["arbiter_id"] == str(arbiter_user.id)), None)
    assert arb_bal_after["unpaid_count"] == 0
    assert arb_bal_after["unpaid_balance_ghs"] == 0.0
    assert arb_bal_after["paid_balance_ghs"] == 25.0


@pytest.mark.django_db
def test_staff_management_endpoints(system_users):
    """Test listing staff, updating role, and creating/promoting staff members."""
    admin_req = MockRequest(system_users["admin"])
    seller_user = system_users["seller"]

    # List staff
    staff_list = list_staff_members(admin_req)
    usernames = [s["username"] for s in staff_list]
    assert "admin_manager" in usernames
    assert "dispute_arbiter" in usernames
    assert "finance_admin" in usernames

    # Promote regular seller to Compliance Officer
    role_data = UpdateStaffRoleSchema(role=Role.COMPLIANCE_OFFICER, is_staff=True)
    update_res = update_staff_role(admin_req, seller_user.id, role_data)
    assert update_res["user"]["role"] == Role.COMPLIANCE_OFFICER
    assert update_res["user"]["is_staff"] is True

    seller_user.refresh_from_db()
    assert seller_user.role == Role.COMPLIANCE_OFFICER
    assert seller_user.is_staff is True

    # Create a new Arbiter
    new_staff_data = CreateStaffMemberSchema(
        email="new_arbiter@trust.com",
        phone_number="0249999999",
        role=Role.ARBITER,
        first_name="Kofi",
        last_name="Arbiter"
    )
    create_res = create_staff_member(admin_req, new_staff_data)
    assert create_res["user"]["role"] == Role.ARBITER
    assert create_res["user"]["is_staff"] is True

    created_user = User.objects.get(id=create_res["user"]["id"])
    assert created_user.email == "new_arbiter@trust.com"
    assert created_user.first_name == "Kofi"
