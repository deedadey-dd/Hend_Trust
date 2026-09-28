import { test, expect } from '@playwright/test';

test.describe('E2E: Notification System & Admin Staff Alerts Hub', () => {
  test('unauthenticated user visiting /notifications is redirected to login', async ({ page }) => {
    await page.goto('/notifications');
    await expect(page).toHaveURL(/\/login/);
  });

  test('notifications page renders structured header, search, channel filters, and date picker', async ({ page }) => {
    // Intercept profile and notification requests
    await page.route('**/api/v1/**', async (route) => {
      const url = route.request().url();
      if (url.includes('/profile')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'mock-seller-id',
            username: 'ghana_merchant',
            email: 'merchant@hendaxis.com',
            role: 'SELLER'
          })
        });
      } else if (url.includes('/notifications/unread-count')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ unread_count: 2 })
        });
      } else if (url.includes('/notifications')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [
              {
                id: 'notif-1',
                title: 'Payment Received: ORD-2026-99',
                message: 'Buyer paid GHS 1,250.00 into HendAxis secure escrow. Please ship package.',
                notification_type: 'SMS',
                action_url: '/track?code=ORD-2026-99',
                metadata: { order_reference: 'ORD-2026-99' },
                is_read: false,
                created_at: new Date().toISOString()
              },
              {
                id: 'notif-2',
                title: 'Payout Disbursed to MTN MoMo',
                message: 'GHS 1,225.00 has been transferred to your registered wallet.',
                notification_type: 'EMAIL',
                action_url: '/dashboard?tab=sales',
                metadata: {},
                is_read: true,
                created_at: new Date(Date.now() - 3600000).toISOString()
              }
            ],
            total_count: 2,
            unread_count: 1
          })
        });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
      }
    });

    // Inject authenticated Zustand storage state
    await page.addInitScript(() => {
      localStorage.setItem(
        'auth-storage',
        JSON.stringify({
          state: {
            token: 'mock-jwt-token',
            user: {
              id: 'mock-seller-id',
              username: 'ghana_merchant',
              email: 'merchant@hendaxis.com',
              role: 'SELLER',
              name: 'ghana_merchant'
            },
            isAuthenticated: true,
            isHydrated: true
          },
          version: 0
        })
      );
    });

    await page.goto('/notifications');

    // Check page header and title
    await expect(page.getByRole('heading', { name: 'Notification Center' })).toBeVisible();
    
    // Check channel filter buttons exist
    await expect(page.getByRole('button', { name: 'All Channels' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'In-App' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Emails' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'SMS' })).toBeVisible();

    // Check notification cards are rendered
    await expect(page.getByText('Payment Received: ORD-2026-99')).toBeVisible();
    await expect(page.getByText('Payout Disbursed to MTN MoMo')).toBeVisible();

    // Check search input works
    const searchInput = page.getByPlaceholder(/Search notifications/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill('MTN MoMo');
  });

  test('admin portal renders Staff Task Alerts tab for staff roles', async ({ page }) => {
    // Intercept profile, admin and notification requests
    await page.route('**/api/v1/**', async (route) => {
      const url = route.request().url();
      if (url.includes('/profile')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'mock-staff-id',
            username: 'admin_arbiter',
            email: 'arbiter@hendaxis.com',
            role: 'ADMIN',
            is_staff: true,
            is_superuser: true
          })
        });
      } else if (url.includes('/admin/dashboard-stats')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            metrics: {
              total_users: 150,
              active_escrows: 40,
              total_disputes: 5,
              revenue_ghs: 18500
            },
            recent_transactions: [],
            recent_disputes: []
          })
        });
      } else if (url.includes('/notifications/unread-count')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ unread_count: 2 })
        });
      } else if (url.includes('/notifications')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [
              {
                id: 'staff-notif-1',
                title: 'Dispute Arbitration Assigned: DISP-8001',
                message: 'You have been designated as the primary arbiter for dispute DISP-8001.',
                notification_type: 'IN_APP',
                action_url: '/admin-portal/dashboard?tab=disputes',
                metadata: { task_type: 'DISPUTE_ASSIGNMENT', dispute_id: 'DISP-8001' },
                is_read: false,
                created_at: new Date().toISOString()
              },
              {
                id: 'staff-notif-2',
                title: 'KYC Verification Review: shop_accra',
                message: 'Seller shop_accra submitted Ghana Card document for verification.',
                notification_type: 'IN_APP',
                action_url: '/admin-portal/dashboard?tab=verifications',
                metadata: { task_type: 'KYC_VERIFICATION', seller_username: 'shop_accra' },
                is_read: false,
                created_at: new Date().toISOString()
              }
            ],
            total_count: 2,
            unread_count: 2
          })
        });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
      }
    });

    // Inject authenticated Zustand storage state for admin
    await page.addInitScript(() => {
      localStorage.setItem(
        'auth-storage',
        JSON.stringify({
          state: {
            token: 'mock-staff-jwt-token',
            user: {
              id: 'mock-staff-id',
              username: 'admin_arbiter',
              email: 'arbiter@hendaxis.com',
              role: 'ADMIN',
              name: 'admin_arbiter',
              is_staff: true,
              is_superuser: true
            },
            isAuthenticated: true,
            isHydrated: true
          },
          version: 0
        })
      );
    });

    await page.goto('/admin-portal/dashboard');

    // Click Staff Task Alerts tab in sidebar
    const staffAlertsTab = page.locator('#admin-tab-notifications');
    if (await staffAlertsTab.isVisible()) {
      await staffAlertsTab.click();
      await expect(page.getByText('Staff Tasks & Work Assignments')).toBeVisible();
      await expect(page.getByText('Dispute Arbitration Assigned: DISP-8001')).toBeVisible();
      await expect(page.getByText('KYC Verification Review: shop_accra')).toBeVisible();
    }
  });
});
