from ninja import Router, Schema
from ninja.errors import HttpError
from django.shortcuts import get_object_or_404
from decimal import Decimal
from apps.wallet.models import SellerWallet
from apps.wallet.services import sync_wallet_balance, execute_withdrawal

wallet_router = Router(tags=["Seller Wallet"])

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

@wallet_router.get("/balance", response=BalanceResponse)
def get_balance(request):
    # In a real system, we get the wallet for the authenticated user
    # user = request.user
    # For now, we'll fetch the first wallet or require a user_id param for MVP testing
    # Let's assume we pass user_id in headers or use a mock user for now.
    # To keep it simple, fetch first wallet for now.
    wallet = SellerWallet.objects.first()
    if not wallet:
        raise HttpError(404, "Wallet not found")
        
    sync_wallet_balance(wallet)
    
    return {
        "available_balance_ghs": wallet.available_balance_ghs,
        "momo_number": wallet.momo_number,
        "bank_account_number": wallet.bank_account_number
    }

@wallet_router.post("/withdraw", response=MessageResponse)
def request_withdrawal(request, data: WithdrawRequest):
    wallet = SellerWallet.objects.first()
    if not wallet:
        raise HttpError(404, "Wallet not found")
        
    execute_withdrawal(
        wallet=wallet,
        amount=data.amount,
        destination_type=data.destination_type,
        destination_account=data.destination_account
    )
    
    return {"message": f"Successfully withdrew {data.amount} GHS to {data.destination_type}"}
