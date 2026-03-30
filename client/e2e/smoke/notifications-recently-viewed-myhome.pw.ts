import { expect, test } from '@playwright/test';

test.describe('Notifications / Recently Viewed / My Home smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('authToken', 'test.token.value');
      localStorage.setItem('userId', 'user-1');
      localStorage.setItem(
        'user',
        JSON.stringify({ id: 'user-1', name: 'E2E User' })
      );
      localStorage.setItem('authSession', 'true');
    });

    await page.route('**/api/**', async (route) => {
      const url = route.request().url();
      const method = route.request().method();

      if (url.includes('/api/health')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'ok', db: 'connected' })
        });
        return;
      }

      if (url.includes('/api/auth/session')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            authenticated: true,
            authState: 'authenticated',
            hasRefreshCookie: true,
            canRefresh: true,
            user: { id: 'user-1', name: 'E2E User' }
          })
        });
        return;
      }

      if (url.includes('/api/auth/me')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'user-1', name: 'E2E User' })
        });
        return;
      }

      if (url.includes('/api/auth/csrf-token')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true })
        });
        return;
      }

      if (url.includes('/api/auth/refresh-token')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
        return;
      }

      if (url.includes('/api/categories')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
        return;
      }

      if (url.includes('/api/analytics/')) {
        await route.fulfill({
          status: 202,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true })
        });
        return;
      }

      if (url.includes('/api/location')) {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
        return;
      }

      if (url.includes('/api/notifications')) {
        if (method === 'GET' && url.includes('/notifications/preferences')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({})
          });
          return;
        }
        if (method === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              notifications: [
                {
                  id: 'notif-1',
                  title: 'Price drop alert',
                  message: 'Your saved item dropped in price.',
                  created_at: new Date().toISOString(),
                  read: false,
                  icon: 'trending',
                  sender_name: 'MHub'
                }
              ],
              unreadCount: 1,
              hasMore: false
            })
          });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
        return;
      }

      if (url.includes('/api/recently-viewed')) {
        if (method !== 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true })
          });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [
              {
                post_id: 'post-1',
                title: 'Vintage Camera',
                price: 2500,
                status: 'active',
                source: 'allposts',
                image_url: '/placeholder.svg',
                viewed_at: new Date().toISOString()
              }
            ],
            hasMore: false
          })
        });
        return;
      }

      if (url.includes('/api/posts/mine/totals')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            totals: { total: 0, active: 0, sold: 0, bought: 0 }
          })
        });
        return;
      }

      if (url.includes('/api/posts/mine')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ posts: [] })
        });
        return;
      }

      if (url.includes('/api/wishlist')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: [] })
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({})
      });
    });

    await page.route('**/socket.io/**', async (route) => {
      await route.abort('failed');
    });

    await page.route('**/auth/**', async (route) => {
      const url = route.request().url();
      if (url.includes('/auth/session')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            authenticated: true,
            authState: 'authenticated',
            hasRefreshCookie: true,
            canRefresh: true,
            user: { id: 'user-1', name: 'E2E User' }
          })
        });
        return;
      }
      if (url.includes('/auth/me')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'user-1', name: 'E2E User' })
        });
        return;
      }
      if (url.includes('/auth/refresh-token')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, token: 'test.token.value' })
        });
        return;
      }
      if (url.includes('/auth/csrf-token')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true })
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({})
      });
    });

  });

  test('renders notifications list', async ({ page }) => {
    await page.goto('/notifications', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Price drop alert')).toBeVisible();
  });

  test('renders recently viewed list', async ({ page }) => {
    await page.goto('/recently-viewed', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Vintage Camera')).toBeVisible();
  });

  test('renders My Home header', async ({ page }) => {
    await page.goto('/my-home', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'My Home' })).toBeVisible();
  });
});
