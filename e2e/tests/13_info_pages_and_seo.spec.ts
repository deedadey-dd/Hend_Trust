import { test, expect } from '@playwright/test';

test.describe('E2E: Informational, Trust & SEO Landing Pages', () => {
  test('navigates to For Buyers page and checks value propositions', async ({ page }) => {
    await page.goto('/for-buyers');
    await expect(page).toHaveURL(/.*\/for-buyers.*/i);
    await expect(page.locator('h1, h2').first()).toBeVisible();
    await expect(page.locator('text=/Buyer Protection|Protected Purchases|Shop with Confidence/i').first()).toBeVisible();
  });

  test('navigates to For Sellers page and checks seller escrow features', async ({ page }) => {
    await page.goto('/for-sellers');
    await expect(page).toHaveURL(/.*\/for-sellers.*/i);
    await expect(page.locator('h1, h2').first()).toBeVisible();
    await expect(page.locator('text=/Seller|Payment Links|Zero Chargebacks|Verified/i').first()).toBeVisible();
  });

  test('navigates to How It Works page and verifies step progression', async ({ page }) => {
    await page.goto('/how-it-works');
    await expect(page).toHaveURL(/.*\/how-it-works.*/i);
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('navigates to Trust Center and Guides Hub', async ({ page }) => {
    await page.goto('/trust-center');
    await expect(page).toHaveURL(/.*\/trust-center.*/i);

    await page.goto('/guides');
    await expect(page).toHaveURL(/.*\/guides.*/i);
  });

  test('navigates to Referrals & Cash Rewards page', async ({ page }) => {
    await page.goto('/referrals');
    await expect(page).toHaveURL(/.*\/referrals.*/i);
    await expect(page.locator('text=/Referral|Invite|Earn|Reward/i').first()).toBeVisible();
  });
});
