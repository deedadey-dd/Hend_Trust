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

class LedgerEntrySchema(Schema):
    id: uuid.UUID
    reference_id: Optional[str] = None
    paystack_reference: Optional[str] = None
    amount_ghs: float
    entry_type: str
    timestamp: str
    type: str # 'CREDIT' or 'DEBIT'
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
        
    return [
        {
            "id": e.id,
            "reference_id": str(e.reference_id) if e.reference_id else None,
            "paystack_reference": txns_map.get(e.reference_id, {}).get("paystack_reference"),
            "amount_ghs": float(e.amount_ghs),
            "entry_type": e.entry_type,
            "timestamp": e.timestamp.isoformat(),
            "type": "DEBIT" if e.debit_account == ledger_account else "CREDIT",
            "transaction_title": txns_map.get(e.reference_id, {}).get("transaction_title"),
            "buyer_name": txns_map.get(e.reference_id, {}).get("buyer_name"),
            "buyer_phone": txns_map.get(e.reference_id, {}).get("buyer_phone"),
            "buyer_email": txns_map.get(e.reference_id, {}).get("buyer_email"),
            "shipping_address": txns_map.get(e.reference_id, {}).get("shipping_address"),
            "status": txns_map.get(e.reference_id, {}).get("status"),
            "waybill_photo_url": txns_map.get(e.reference_id, {}).get("waybill_photo_url"),
            "courier_name": txns_map.get(e.reference_id, {}).get("courier_name"),
            "tracking_number": txns_map.get(e.reference_id, {}).get("tracking_number"),
            "driver_phone": txns_map.get(e.reference_id, {}).get("driver_phone"),
            "destination_station": txns_map.get(e.reference_id, {}).get("destination_station"),
        } for e in entries
    ]

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
