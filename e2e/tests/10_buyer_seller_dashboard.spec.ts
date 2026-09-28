import { test, expect } from '@playwright/test';

test.describe('E2E: Buyer & Seller Dashboard Segmentation', () => {
  test('seller dashboard loads tabs and consolidated Buyer Hub tab', async ({ page }) => {
    await page.route('**/api/v1/**', async (route) => {
      const url = route.request().url();
      if (url.includes('/profile')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'mock-seller-id',
            username: 'demo_seller',
            email: 'demo_seller@example.com',
            role: 'SELLER',
            first_name: 'Demo',
            shop_name: 'Demo Tech Store',
          }),
        });
      } else if (url.includes('/escrow/seller/transactions')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: [], count: 0 }),
        });
      } else if (url.includes('/escrow/seller/summary-metrics')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            total_revenue_ghs: 0,
            pending_escrow_ghs: 0,
            completed_orders_count: 0,
            active_orders_count: 0,
          }),
        });
      } else if (url.includes('/escrow/buyer-purchases')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
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
              id: 'mock-seller-id',
              username: 'demo_seller',
              email: 'demo_seller@example.com',
              role: 'SELLER',
              name: 'demo_seller',
            },
            isAuthenticated: true,
            isHydrated: true,
          },
          version: 0,
        })
      );
    });

    await page.goto('/dashboard');

    // Verify main seller tabs exist
    await expect(page.locator('text=/Merchant Sales & Escrows/i').first()).toBeVisible();
    await expect(page.locator('text=/Store Reviews & Ratings/i').first()).toBeVisible();
    await expect(page.locator('text=/Buyer Hub \\(Purchases & Reviews\\)/i').first()).toBeVisible();

    // Click into Store Reviews & Ratings tab
    const sellerReviewsTab = page.locator('text=/Store Reviews & Ratings/i').first();
    await sellerReviewsTab.click();
    await expect(page).toHaveURL(/.*tab=seller_reviews.*/);

    // Click into Buyer Hub tab
    const buyerHubTab = page.locator('text=/Buyer Hub \\(Purchases & Reviews\\)/i').first();
    await buyerHubTab.click();
    await expect(page).toHaveURL(/.*tab=(purchases|reviews).*/);
  });

  test('buyer dashboard displays purchases tab directly for buyer role', async ({ page }) => {
    await page.route('**/api/v1/**', async (route) => {
      const url = route.request().url();
      if (url.includes('/profile')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'mock-buyer-id',
            username: 'kofi_buyer',
            email: 'kofi@example.com',
            role: 'BUYER',
            first_name: 'Kofi',
          }),
        });
      } else if (url.includes('/escrow/buyer-purchases')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
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

    await page.goto('/dashboard');
    await expect(page.locator('text=/My Purchases & Orders/i').first()).toBeVisible();
  });
});
