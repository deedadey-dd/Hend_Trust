from typing import Optional
from ninja import Router, Schema
from ninja.errors import HttpError
from django.shortcuts import get_object_or_404
from hendaxis_trust.auth import JWTCookieAuth
from decimal import Decimal
from apps.wallet.services import sync_wallet_balance, execute_withdrawal
from apps.ledger.models import LedgerAccount, LedgerEntry, AccountType
from ninja.pagination import paginate, LimitOffsetPagination
from django.db.models import Q
import uuid

wallet_router = Router(tags=["Seller Wallet"], auth=JWTCookieAuth())

class BalanceResponse(Schema):
    available_balance_ghs: Decimal
    momo_number: str | None
    bank_account_number: str | None

class WithdrawRequest(Schema):
    amount: Decimal
    destination_type: str # 'MOMO' or 'BANK'
    destination_account: str # The actual number

class MessageResponse(Schema):
    message: str

class LedgerBreakdownItemSchema(Schema):
    id: str
    entry_type: str
    label: str
    amount_ghs: float
    type: str  # 'CREDIT' or 'DEBIT'
    timestamp: str

class LedgerEntrySchema(Schema):
    id: uuid.UUID
    reference_id: Optional[str] = None
    paystack_reference: Optional[str] = None
    amount_ghs: float
    entry_type: str
    timestamp: str
    type: str # 'CREDIT' or 'DEBIT'
    is_bundled: bool = False
    bundle_count: int = 1
    fee_breakdown: list[LedgerBreakdownItemSchema] = []
    gross_order_amount_ghs: Optional[float] = None
    order_platform_fee_ghs: Optional[float] = None
    payout_destination_type: Optional[str] = None
    payout_account_number: Optional[str] = None
    payout_bank_name: Optional[str] = None
    payout_account_name: Optional[str] = None
    payout_gateway: Optional[str] = None
    transaction_title: Optional[str] = None
    buyer_name: Optional[str] = None
    buyer_phone: Optional[str] = None
    buyer_email: Optional[str] = None
    shipping_address: Optional[str] = None
    status: Optional[str] = None
    waybill_photo_url: Optional[str] = None
    courier_name: Optional[str] = None
    tracking_number: Optional[str] = None
    driver_phone: Optional[str] = None
    destination_station: Optional[str] = None

BREAKDOWN_LABELS = {
    "SELLER_WITHDRAWAL_REQUEST": "Net Payout Sent to Account",
    "PAYSTACK_PAYOUT_FEE": "Payment Provider Transfer Fee",
    "NON_DISPATCH_SELLER_PENALTY_PLATFORM_FEE": "Platform Escrow Service Fee",
    "NON_DISPATCH_SELLER_PENALTY_GATEWAY_FEE": "Payment Provider Processing Fee",
    "REFUND_FEE_PENALTY": "Dispute Refund Penalty (Platform Fee)",
    "PAYSTACK_REFUND_FEE": "Payment Provider Refund Fee",
    "SHOP_PROMOTION_AD_FEE": "Sponsored Shop Promotion Fee",
    "ESCROW_RELEASE_NET": "Net Sale Payout Credit",
    "PARTIAL_REFUND_SELLER": "Partial Dispute Settlement Credit",
    "BUYER_CANCEL_WALLET_REFUND": "Cancelled Order Net Wallet Refund",
}

def get_user_wallet(user):
    from apps.wallet.models import SellerWallet
    ledger, _ = LedgerAccount.objects.get_or_create(
        name=f'SELLER_INTERNAL_WALLET_{user.id}',
        defaults={'account_type': AccountType.LIABILITY, 'user': user}
    )
    wallet, _ = SellerWallet.objects.get_or_create(
        user=user,
        defaults={'ledger_account': ledger}
    )
    return wallet

@wallet_router.get("/balance", response=BalanceResponse)
def get_balance(request):
    wallet = get_user_wallet(request.user)
        
    sync_wallet_balance(wallet)
    
    return {
        "available_balance_ghs": wallet.available_balance_ghs,
        "momo_number": wallet.momo_number,
        "bank_account_number": wallet.bank_account_number
    }

@wallet_router.get("/ledger", response=list[LedgerEntrySchema])
@paginate(LimitOffsetPagination)
def get_ledger(request, start_date: str = None, end_date: str = None, entry_type: str = None):
    wallet = get_user_wallet(request.user)
    ledger_account = wallet.ledger_account
    
    entries_qs = LedgerEntry.objects.filter(
        Q(debit_account=ledger_account) | Q(credit_account=ledger_account)
    ).order_by('-timestamp')
    
    if start_date:
        entries_qs = entries_qs.filter(timestamp__gte=start_date)
    if end_date:
        entries_qs = entries_qs.filter(timestamp__lte=end_date)
    if entry_type:
        if entry_type in ("NON_DISPATCH_SELLER_PENALTY", "NON_DISPATCH_SELLER_PENALTY_PLATFORM_FEE", "NON_DISPATCH_SELLER_PENALTY_GATEWAY_FEE"):
            entries_qs = entries_qs.filter(entry_type__in=[
                "NON_DISPATCH_SELLER_PENALTY",
                "NON_DISPATCH_SELLER_PENALTY_PLATFORM_FEE",
                "NON_DISPATCH_SELLER_PENALTY_GATEWAY_FEE",
            ])
        elif entry_type == "SELLER_WITHDRAWAL_REQUEST":
            entries_qs = entries_qs.filter(entry_type__in=[
                "SELLER_WITHDRAWAL_REQUEST",
                "PAYSTACK_PAYOUT_FEE",
            ])
        else:
            entries_qs = entries_qs.filter(entry_type=entry_type)

    entries = list(entries_qs)
    ref_ids = [e.reference_id for e in entries if e.reference_id]
    
    txns_map = {}
    if ref_ids:
        from apps.escrow.models import Transaction
        txns = Transaction.objects.filter(id__in=ref_ids).select_related('link').prefetch_related('delivery_logs')
        for t in txns:
            latest_log = t.delivery_logs.order_by('-created_at').first() if hasattr(t, 'delivery_logs') else None
            txns_map[t.id] = {
                "paystack_reference": t.paystack_reference,
                "transaction_title": t.link.title if t.link else "Escrow Purchase",
                "gross_order_amount_ghs": float(t.total_amount_ghs) if t.total_amount_ghs is not None else None,
                "order_platform_fee_ghs": float(t.platform_fee_ghs) if t.platform_fee_ghs is not None else None,
                "buyer_name": t.buyer_name,
                "buyer_phone": t.buyer_phone,
                "buyer_email": t.buyer_email,
                "shipping_address": t.shipping_address,
                "status": t.status,
                "waybill_photo_url": latest_log.waybill_photo_url if latest_log else None,
                "courier_name": latest_log.courier_name if latest_log else None,
                "tracking_number": latest_log.tracking_number if latest_log else None,
                "driver_phone": latest_log.driver_phone if latest_log else None,
                "destination_station": latest_log.destination_station if latest_log else None,
            }

    # Bundle related DEBIT deductions sharing the same reference_id so users see one simple deduction row
    raw_items = []
    debit_bundle_map = {}

    for e in entries:
        direction = "DEBIT" if e.debit_account == ledger_account else "CREDIT"
        ref_str = str(e.reference_id) if e.reference_id else None
        txn_info = txns_map.get(e.reference_id, {})

        breakdown_item = {
            "id": str(e.id),
            "entry_type": e.entry_type,
            "label": BREAKDOWN_LABELS.get(e.entry_type, e.entry_type.replace("_", " ").title()),
            "amount_ghs": float(e.amount_ghs),
            "type": direction,
            "timestamp": e.timestamp.isoformat(),
        }

        item_dict = {
            "id": e.id,
            "reference_id": ref_str,
            "paystack_reference": txn_info.get("paystack_reference"),
            "amount_ghs": float(e.amount_ghs),
            "entry_type": e.entry_type,
            "timestamp": e.timestamp.isoformat(),
            "type": direction,
            "is_bundled": False,
            "bundle_count": 1,
            "fee_breakdown": [breakdown_item],
            "gross_order_amount_ghs": txn_info.get("gross_order_amount_ghs"),
            "order_platform_fee_ghs": txn_info.get("order_platform_fee_ghs"),
            "payout_destination_type": e.payout_destination_type or None,
            "payout_account_number": e.payout_account_number or None,
            "payout_bank_name": e.payout_bank_name or None,
            "payout_account_name": e.payout_account_name or None,
            "payout_gateway": e.payout_gateway or None,
            "transaction_title": txn_info.get("transaction_title"),
            "buyer_name": txn_info.get("buyer_name"),
            "buyer_phone": txn_info.get("buyer_phone"),
            "buyer_email": txn_info.get("buyer_email"),
            "shipping_address": txn_info.get("shipping_address"),
            "status": txn_info.get("status"),
            "waybill_photo_url": txn_info.get("waybill_photo_url"),
            "courier_name": txn_info.get("courier_name"),
            "tracking_number": txn_info.get("tracking_number"),
            "driver_phone": txn_info.get("driver_phone"),
            "destination_station": txn_info.get("destination_station"),
        }

        # Group DEBIT entries that share a valid non-zero reference_id
        if direction == "DEBIT" and ref_str and ref_str != "00000000-0000-0000-0000-000000000000":
            if ref_str in debit_bundle_map:
                existing = debit_bundle_map[ref_str]
                existing["amount_ghs"] = round(existing["amount_ghs"] + float(e.amount_ghs), 2)
                existing["is_bundled"] = True
                existing["bundle_count"] += 1
                existing["fee_breakdown"].append(breakdown_item)

                # Preserve payout snapshot details from the main withdrawal entry
                if e.payout_destination_type and not existing["payout_destination_type"]:
                    existing["payout_destination_type"] = e.payout_destination_type
                if e.payout_account_number and not existing["payout_account_number"]:
                    existing["payout_account_number"] = e.payout_account_number
                if e.payout_bank_name and not existing["payout_bank_name"]:
                    existing["payout_bank_name"] = e.payout_bank_name
                if e.payout_account_name and not existing["payout_account_name"]:
                    existing["payout_account_name"] = e.payout_account_name
                if e.payout_gateway and not existing["payout_gateway"]:
                    existing["payout_gateway"] = e.payout_gateway

                types_in_bundle = {b["entry_type"] for b in existing["fee_breakdown"]}
                if "SELLER_WITHDRAWAL_REQUEST" in types_in_bundle:
                    existing["entry_type"] = "SELLER_WITHDRAWAL_REQUEST"
                    # Put main withdrawal amount first, fee second
                    existing["fee_breakdown"].sort(key=lambda x: 0 if x["entry_type"] == "SELLER_WITHDRAWAL_REQUEST" else 1)
                elif types_in_bundle & {"NON_DISPATCH_SELLER_PENALTY_PLATFORM_FEE", "NON_DISPATCH_SELLER_PENALTY_GATEWAY_FEE"}:
                    existing["entry_type"] = "NON_DISPATCH_SELLER_PENALTY"
                    existing["fee_breakdown"].sort(key=lambda x: 0 if "PLATFORM_FEE" in x["entry_type"] else 1)
                continue
            else:
                debit_bundle_map[ref_str] = item_dict

        raw_items.append(item_dict)

    return raw_items

@wallet_router.post("/withdraw", response=MessageResponse)
def request_withdrawal(request, data: WithdrawRequest):
    wallet = get_user_wallet(request.user)
        
    execute_withdrawal(
        wallet=wallet,
        amount=data.amount,
        destination_type=data.destination_type,
        destination_account=data.destination_account
    )
    
    return {"message": f"Successfully withdrew {data.amount} GHS to {data.destination_type}"}
