/**
 * PullToRefreshWrapper — M-01
 * Provides native-feel pull-to-refresh gesture on mobile feed pages.
 *
 * Strategy: dispatch a custom DOM event `mhub:pull-refresh` when the user
 * pulls down far enough. Any page component can listen to this event via
 * useEffect to trigger its own data refetch — no modification of minified
 * page files required.
 *
 * Usage in App.jsx AppShell:
 *   import PullToRefreshWrapper from '@/components/PullToRefreshWrapper';
 *   // Wrap the <main> or route outlet with <PullToRefreshWrapper>
 *
 * Usage in a page to respond:
 *   useEffect(() => {
 *     const handler = () => refetch();
 *     window.addEventListener('mhub:pull-refresh', handler);
 *     return () => window.removeEventListener('mhub:pull-refresh', handler);
 *   }, [refetch]);
 */

import React from 'react';
import { useLocation } from 'react-router-dom';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

// Routes where pull-to-refresh is enabled
const PULL_ENABLED_ROUTES = new Set([
  '/all-posts',
  '/feed',
  '/my-feed',
  '/for-you',
  '/',
]);

function isPullEnabled(pathname) {
  // Exact match or starts with a known feed prefix
  if (PULL_ENABLED_ROUTES.has(pathname)) return true;
  if (pathname.startsWith('/all-posts')) return true;
  if (pathname.startsWith('/feed')) return true;
  return false;
}

/**
 * @param {{ children: React.ReactNode }} props
 */
export default function PullToRefreshWrapper({ children }) {
  const { pathname } = useLocation();
  const enabled = isPullEnabled(pathname);

  const handleRefresh = React.useCallback(() => {
    // Dispatch custom event — pages listen and call their own refetch
    window.dispatchEvent(new CustomEvent('mhub:pull-refresh', { bubbles: false }));
  }, []);

  const { pullIndicator } = usePullToRefresh({
    onRefresh: handleRefresh,
    disabled: !enabled,
  });

  return (
    <>
      {/* Pull indicator floats above page content */}
      {enabled && pullIndicator}
      {children}
    </>
  );
}
