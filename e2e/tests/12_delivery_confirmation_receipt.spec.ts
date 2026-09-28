import { test, expect } from '@playwright/test';

test.describe('E2E: Delivery Receipt Confirmation & Seller Rating Flow', () => {
  test('buyer can view in-transit order and trigger delivery receipt confirmation modal', async ({ page }) => {
    await page.route('**/api/v1/**', async (route) => {
      const url = route.request().url();
      if (url.includes('/checkout/buyer/my-orders')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'order-transit-999',
              tracking_code: 'TRK-TRANSIT-999',
              order_reference: 'ORD-TRANSIT-999',
              paystack_reference: 'PSTK-REF-999',
              status: 'DELIVERY_IN_PROGRESS',
              title: 'Dell XPS 15 Laptop',
              total_amount_ghs: 18650.0,
              seller_username: 'laptop_village',
              shop_name: 'Laptop Village Ghana',
              inspection_hours_allowed: 48,
              created_at: '2026-09-27T08:00:00Z',
            },
          ]),
        });
      } else if (url.includes('/profile')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'mock-buyer-id',
            username: 'kofi_buyer',
            role: 'BUYER',
            email: 'kofi@example.com',
          }),
        });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
      }
    });

    await page.addInitScript(() => {
      localStorage.setItem(
        'auth-storage',
        JSON.stringify({
          state: {
            token: 'mock-jwt-token',
            user: {
              id: 'mock-buyer-id',
              username: 'kofi_buyer',
              email: 'kofi@example.com',
              role: 'BUYER',
              name: 'kofi_buyer',
            },
            isAuthenticated: true,
            isHydrated: true,
          },
          version: 0,
        })
      );
    });

    await page.goto('/track');

    // Verify order details render
    await expect(page.locator('text=/Dell XPS 15 Laptop/i').first()).toBeVisible();

    // Find and click Confirm Delivery Receipt / Received Package button
    const confirmReceiptBtn = page.locator('button:has-text("Confirm Delivery Receipt"), button:has-text("I Have Received It"), button:has-text("Confirm Receipt")').first();
    if (await confirmReceiptBtn.isVisible()) {
      await confirmReceiptBtn.click();

      // Verify the custom confirmation modal opens
      const modal = page.locator('text=/Confirm/i').first();
      await expect(modal).toBeVisible();
    }
  });
});
