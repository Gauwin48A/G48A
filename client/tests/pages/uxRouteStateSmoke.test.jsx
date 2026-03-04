// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { FilterProvider } from '@/context/FilterContext';
import SearchPage from '@/pages/SearchPage';
import BuyerView from '@/pages/BuyerView';
import FeedPostDetail from '@/pages/FeedPostDetail';
import SecuritySettings from '@/pages/SecuritySettings';
import { fetchCategoriesCached } from '@/services/categoriesService';
import api from '@/services/api';

const routerFuture = {
  v7_startTransition: true,
  v7_relativeSplatPath: true
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key
  })
}));

vi.mock('@/services/categoriesService', () => ({
  fetchCategoriesCached: vi.fn()
}));

vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn()
  }
}));

function renderSearchPage() {
  return render(
    <MemoryRouter initialEntries={['/search']} future={routerFuture}>
      <FilterProvider>
        <SearchPage />
      </FilterProvider>
    </MemoryRouter>
  );
}

function renderBuyerView() {
  return render(
    <MemoryRouter initialEntries={['/buyer-view']} future={routerFuture}>
      <BuyerView />
    </MemoryRouter>
  );
}

function renderFeedPostDetail() {
  return render(
    <MemoryRouter initialEntries={['/feed/123']} future={routerFuture}>
      <Routes>
        <Route path="/feed/:id" element={<FeedPostDetail />} />
      </Routes>
    </MemoryRouter>
  );
}

function renderSecuritySettings() {
  return render(
    <MemoryRouter initialEntries={['/security']} future={routerFuture}>
      <Routes>
        <Route path="/security" element={<SecuritySettings />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('UX route smoke flows', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    cleanup();
  });

  it('supports search route error and retry recovery flow', async () => {
    fetchCategoriesCached
      .mockRejectedValueOnce(new Error('network-failed'))
      .mockResolvedValueOnce([{ category_id: '1', name: 'Mobiles' }]);

    renderSearchPage();

    expect(screen.getByText('Loading category suggestions')).toBeTruthy();
    expect(await screen.findByText('Category suggestions unavailable')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByRole('button', { name: 'Mobiles' })).toBeTruthy();
    expect(fetchCategoriesCached).toHaveBeenCalledTimes(2);
  });

  it('supports buyer route empty-state and reset flow', async () => {
    renderBuyerView();

    expect(screen.getByText(/loading/i)).toBeTruthy();
    expect(await screen.findByText('iPhone 13 Pro Max 128GB')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Search buyer listings'), {
      target: { value: 'zzzzzzzz' }
    });

    expect(await screen.findByText('No matching listings found')).toBeTruthy();

    const resetButtons = screen.getAllByRole('button', { name: /reset filters/i });
    fireEvent.click(resetButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('iPhone 13 Pro Max 128GB')).toBeTruthy();
    });
  });

  it('supports feed detail error and retry recovery flow', async () => {
    const originalFetch = globalThis.fetch;
    let postFetchAttempts = 0;

    globalThis.fetch = vi.fn(async (input) => {
      const url = String(input);

      if (url.includes('/api/posts/123/view')) {
        return { ok: true, json: async () => ({}) };
      }

      if (url.includes('/api/posts/123') && !url.includes('/view')) {
        postFetchAttempts += 1;
        if (postFetchAttempts === 1) {
          return { ok: false, json: async () => ({}) };
        }
        return {
          ok: true,
          json: async () => ({
            post: {
              id: 123,
              title: 'Recovered post title',
              description: 'Recovered post description',
              likes: 2,
              views: 7,
              created_at: '2026-03-02T10:00:00.000Z',
              user: { name: 'Demo User' }
            }
          })
        };
      }

      return { ok: true, json: async () => ({}) };
    });

    try {
      renderFeedPostDetail();

      expect(screen.getByText('feed_post_loading_desc')).toBeTruthy();
      expect(await screen.findByText('post_not_found')).toBeTruthy();

      fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

      expect(await screen.findByText('Recovered post title')).toBeTruthy();
      expect(postFetchAttempts).toBe(2);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('supports security route status error and retry recovery flow', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    localStorage.setItem('authToken', 'token-123');
    localStorage.setItem('userId', 'user-123');

    api.get
      .mockRejectedValueOnce(new Error('status-failed'))
      .mockResolvedValueOnce({ enabled: true, available: true });

    try {
      renderSecuritySettings();

      expect(screen.getByText('Loading security settings')).toBeTruthy();
      expect(await screen.findByText('Could not refresh security status')).toBeTruthy();

      fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

      expect(await screen.findByText('Your account is protected')).toBeTruthy();
      expect(api.get).toHaveBeenCalledTimes(2);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to check 2FA status:',
        expect.any(Error)
      );
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it('supports security setup error with dismiss and retry flow', async () => {
    localStorage.setItem('authToken', 'token-123');
    localStorage.setItem('userId', 'user-123');

    api.get.mockResolvedValueOnce({ enabled: false, available: true });
    api.post
      .mockRejectedValueOnce(new Error('setup-failed'))
      .mockResolvedValueOnce({ qrCode: 'data:image/png;base64,abcd' });

    renderSecuritySettings();

    const enableButton = await screen.findByRole('button', { name: 'Enable 2FA' });
    fireEvent.click(enableButton);

    expect(await screen.findByText('2FA setup unavailable')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByText('2FA setup unavailable')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Enable 2FA' }));
    expect(await screen.findByText('Step 1: Scan QR Code')).toBeTruthy();
  });
});
