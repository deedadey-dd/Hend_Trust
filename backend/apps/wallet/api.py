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
    amount_ghs: float
    entry_type: str
    timestamp: str
    type: str # 'CREDIT' or 'DEBIT'

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
    
    entries = LedgerEntry.objects.filter(
        Q(debit_account=ledger_account) | Q(credit_account=ledger_account)
    ).order_by('-timestamp')
    
    if start_date:
        entries = entries.filter(timestamp__gte=start_date)
    if end_date:
        entries = entries.filter(timestamp__lte=end_date)
    if entry_type:
        entries = entries.filter(entry_type=entry_type)
        
    return [
        {
            "id": e.id,
            "amount_ghs": float(e.amount_ghs),
            "entry_type": e.entry_type,
            "timestamp": e.timestamp.isoformat(),
            "type": "DEBIT" if e.debit_account == ledger_account else "CREDIT"
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
