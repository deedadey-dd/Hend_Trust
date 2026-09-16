import { test, expect } from '@playwright/test';

test.describe('E2E: Seller Registration, Login & Profile Setup', () => {
  test('seller can view registration form and navigate to login', async ({ page }) => {
    await page.goto('/register');
    
    // Check form fields exist
    await expect(page.locator('input[placeholder="johndoe"]')).toBeVisible();
    await expect(page.locator('input[placeholder="john@example.com"]')).toBeVisible();
    await expect(page.locator('input[placeholder="0241234567"]')).toBeVisible();
    await expect(page.locator('input[placeholder="••••••••"]')).toBeVisible();

    // Click link to navigate to login page
    const loginLink = page.locator('a[href="/login"]').first();
    await loginLink.click();
    await expect(page).toHaveURL(/.*\/login.*/i);
  });

  test('seller can fill login form', async ({ page }) => {
    await page.goto('/login');

    const identifierInput = page.locator('input[placeholder="johndoe"]').first();
    const passwordInput = page.locator('input[placeholder="••••••••"]').first();

    await identifierInput.fill('demo_seller@example.com');
    await passwordInput.fill('Password123!');

    await expect(identifierInput).toHaveValue('demo_seller@example.com');
  });
});
