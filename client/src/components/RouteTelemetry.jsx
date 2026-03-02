import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { beginRouteSession, endRouteSession, trackRouteAction } from '@/lib/uxTelemetry';

const toSafeLabel = (element) => {
  const explicit = String(element.getAttribute('data-ux-action-label') || '').trim();
  if (explicit) {
    return explicit.slice(0, 120);
  }

  const ariaLabel = String(element.getAttribute('aria-label') || '').trim();
  if (ariaLabel) {
    return ariaLabel.slice(0, 120);
  }

  const text = String(element.textContent || '').replace(/\s+/g, ' ').trim();
  if (text) {
    return text.slice(0, 120);
  }

  return '';
};

const toSafeHref = (element) => {
  const href = String(element.getAttribute('href') || '').trim();
  return href.slice(0, 240);
};

const RouteTelemetry = () => {
  const location = useLocation();

  useEffect(() => {
    beginRouteSession({
      pathname: location.pathname,
      search: location.search
    });

    return () => {
      endRouteSession('route_change');
    };
  }, [location.pathname, location.search]);

  useEffect(() => {
    const handleClick = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const clickable = target.closest('button, a, [role="button"], [data-ux-action]');
      if (!clickable) {
        return;
      }

      const explicitName = String(clickable.getAttribute('data-ux-action') || '').trim();
      const actionName = explicitName || 'ui_click';

      trackRouteAction(actionName, {
        label: toSafeLabel(clickable),
        element: clickable.tagName.toLowerCase(),
        href: toSafeHref(clickable)
      });
    };

    document.addEventListener('click', handleClick, true);

    return () => {
      document.removeEventListener('click', handleClick, true);
    };
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        endRouteSession('hidden');
      } else if (document.visibilityState === 'visible') {
        beginRouteSession({
          pathname: window.location.pathname,
          search: window.location.search
        });
      }
    };

    const handlePageHide = () => {
      endRouteSession('pagehide');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, []);

  return null;
};

export default RouteTelemetry;

