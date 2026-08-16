from django.core.management.base import BaseCommand
from apps.ledger.models import LedgerAccount, AccountType

class Command(BaseCommand):
    help = 'Seeds the database with required system ledger accounts'

    def handle(self, *args, **options):
        accounts = [
            {'name': 'SYSTEM_BANK_ASSET', 'account_type': AccountType.ASSET},
            {'name': 'PAYSTACK_FEE_EXPENSE', 'account_type': AccountType.EXPENSE},
            {'name': 'BUYER_ESCROW_DEPOSIT', 'account_type': AccountType.LIABILITY},
            {'name': 'PLATFORM_FEE_REVENUE', 'account_type': AccountType.REVENUE},
            {'name': 'DISPUTED_HOLD_FUNDS', 'account_type': AccountType.LIABILITY},
        ]

        for acc_data in accounts:
            account, created = LedgerAccount.objects.get_or_create(
                name=acc_data['name'],
                defaults={'account_type': acc_data['account_type']}
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"Created system account: {account.name}"))
            else:
                self.stdout.write(self.style.WARNING(f"Account already exists: {account.name}"))
        
        self.stdout.write(self.style.SUCCESS('Successfully seeded ledger accounts.'))
