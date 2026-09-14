import { test, expect } from '@playwright/test';

test.describe('Security & RBAC Enforcement', () => {
  test('redirects unauthenticated user accessing seller dashboard to login page', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Unauthenticated user should be redirected to login page
    await expect(page).toHaveURL(/.*login.*/i);
  });

  test('prevents access to staff admin dashboard route without authentication', async ({ page }) => {
    await page.goto('/admin/dashboard');
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*login.*/i);
  });
});
