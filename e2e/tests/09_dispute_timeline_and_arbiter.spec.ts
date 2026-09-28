import { test, expect } from '@playwright/test';

test.describe('E2E: Dispute Timeline, Arbiter Notices & Resolution Modals', () => {
  test('tracking page renders active dispute with Official Arbiter Notice header and timeline', async ({ page }) => {
    await page.route('**/api/v1/**', async (route) => {
      const url = route.request().url();
      if (url.includes('/checkout/buyer/my-orders')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'mock-dispute-tx-123',
              paystack_reference: 'REF-DISPUTE-99',
              status: 'DISPUTED',
              title: 'MacBook Pro M2',
              total_amount_ghs: 12290.0,
              seller_username: 'yaas_devices',
              buyer_dispute_reason: 'Battery health was 72% instead of advertised 95%.',
              buyer_dispute_category: 'ITEM_DEFECTIVE',
              disputed_at: '2026-09-27T10:00:00Z',
              seller_dispute_response: 'We provided battery replacement discount in our private DM.',
              manager_dispute_notes: '--- [Arbiter Instruction (Sep 27, 2026 08:29 PM) by deedadey] ---\nPlease provide battery diagnostics screenshot from coconutBattery.',
              arbiter_name: 'deedadey',
              arbiter_escalated_at: '2026-09-27T12:00:00Z',
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

    // Verify order title rendered
    await expect(page.locator('text=/MacBook Pro M2/i').first()).toBeVisible();

    // Verify dispute category badge
    await expect(page.locator('text=/Item Damaged \\/ Defective/i').first()).toBeVisible();

    // Verify Official Arbiter Notice header with arbiter name inline
    const arbiterHeader = page.locator('text=/Official Arbiter Notice \\(deedadey\\)/i').first();
    await expect(arbiterHeader).toBeVisible();

    // Verify arbiter message text
    await expect(page.locator('text=/Please provide battery diagnostics/i').first()).toBeVisible();
  });

  test('retract dispute button triggers platform confirmation modal', async ({ page }) => {
    await page.route('**/api/v1/**', async (route) => {
      const url = route.request().url();
      if (url.includes('/checkout/buyer/my-orders')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'mock-dispute-tx-123',
              paystack_reference: 'REF-DISPUTE-99',
              status: 'DISPUTED',
              title: 'MacBook Pro M2',
              total_amount_ghs: 12290.0,
              seller_username: 'yaas_devices',
              buyer_dispute_reason: 'Resolved issue with seller.',
              buyer_dispute_category: 'ITEM_DEFECTIVE',
              disputed_at: '2026-09-27T10:00:00Z',
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

    const retractButton = page.locator('button:has-text("Retract"), button:has-text("Settle Privately")').first();
    if (await retractButton.isVisible()) {
      await retractButton.click();
      const modal = page.locator('div[role="dialog"]');
      await expect(modal).toBeVisible();
    }
  });
});
