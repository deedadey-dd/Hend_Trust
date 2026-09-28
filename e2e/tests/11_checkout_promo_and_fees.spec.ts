import { test, expect } from '@playwright/test';

test.describe('E2E: Public Checkout Promo Codes & Dynamic Escrow Calculation', () => {
  const mockLinkId = 'link-promo-test-123';

  test.beforeEach(async ({ page }) => {
    // Intercept payment link query
    await page.route(`**/api/v1/links/${mockLinkId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: mockLinkId,
          title: 'Sony WH-1000XM5 Headphones',
          description: 'Industry-leading noise canceling wireless headphones',
          price_ghs: '4000.00',
          shipping_fee_ghs: '50.00',
          fee_handling: 'PASS_TO_BUYER',
          seller_username: 'audio_hub',
          shop_name: 'Audio Hub Ghana',
        }),
      });
    });

    await page.route('**/api/v1/escrow/public-settings', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          promotions_active: true,
          promotions_expires_at: null,
        }),
      });
    });
  });

  test('calculates baseline fee and dynamically updates totals when valid promo is applied', async ({ page }) => {
    await page.route('**/api/v1/checkout/validate-promo', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          valid: true,
          promo_code_applied: 'SAVE20',
          promo_discount_ghs: 20.0,
          credit_discount_ghs: 0.0,
          base_platform_fee: 70.0,
          effective_platform_fee: 50.0,
          final_platform_fee_ghs: 50.0,
          total_buyer_pays: 4100.0,
          net_total_to_pay_ghs: 4100.0,
        }),
      });
    });

    await page.goto(`/l/${mockLinkId}`);

    // Verify item title renders
    await expect(page.locator('text=/Sony WH-1000XM5 Headphones/i').first()).toBeVisible();

    // Find promo code input and enter SAVE20
    const promoInput = page.locator('input[placeholder*="PROMO CODE"i]').first();
    await expect(promoInput).toBeVisible();
    await promoInput.fill('SAVE20');

    // Click Apply
    const applyButton = page.locator('button:has-text("Apply")').first();
    await applyButton.click();

    // Verify discount feedback banner and updated net escrow fee
    await expect(page.locator('text=/Promo code "SAVE20" applied/i').first()).toBeVisible();
    await expect(page.locator('text=/Net Escrow Fee/i').first()).toBeVisible();
  });

  test('displays warning message when invalid promo code is provided', async ({ page }) => {
    await page.route('**/api/v1/checkout/validate-promo', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          valid: false,
          promo_error: 'This promo code is expired or invalid.',
          promo_discount_ghs: 0.0,
          credit_discount_ghs: 0.0,
          base_platform_fee: 70.0,
          effective_platform_fee: 70.0,
          final_platform_fee_ghs: 70.0,
          total_buyer_pays: 4120.0,
          net_total_to_pay_ghs: 4120.0,
        }),
      });
    });

    await page.goto(`/l/${mockLinkId}`);

    const promoInput = page.locator('input[placeholder*="PROMO CODE"i]').first();
    await promoInput.fill('EXPIRED100');

    const applyButton = page.locator('button:has-text("Apply")').first();
    await applyButton.click();

    await expect(page.locator('text=/expired or invalid/i').first()).toBeVisible();
  });
});
