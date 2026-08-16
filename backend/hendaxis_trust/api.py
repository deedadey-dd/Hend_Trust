from ninja import NinjaAPI
from apps.users.api import auth_router
from apps.links.api import links_router
from apps.checkout.api import checkout_router
from apps.delivery.api import delivery_router
from apps.delivery.webhooks import webhooks_router
from apps.escrow.api import escrow_router, admin_router
from apps.escrow.webhooks import escrow_webhooks_router
from apps.wallet.api import wallet_router
from apps.notifications.api import notifications_router

api = NinjaAPI(
    title="HendAxis Trust API",
    version="1.0.0",
    docs_url="/docs/"
)

api.add_router("/auth", auth_router)
api.add_router("/links", links_router)
api.add_router("/checkout", checkout_router)
api.add_router("/delivery", delivery_router)
api.add_router("/webhooks", webhooks_router)
api.add_router("/webhooks/escrow", escrow_webhooks_router)
api.add_router("/escrow", escrow_router)
api.add_router("/wallet", wallet_router)
api.add_router("/admin", admin_router)
api.add_router("/notifications", notifications_router)
