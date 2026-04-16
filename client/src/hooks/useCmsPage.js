import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchCmsPage } from "@/services/cmsService";

const normalizeSlug = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

export function useCmsPage(slug, options = {}) {
  const normalizedSlug = useMemo(() => normalizeSlug(slug), [slug]);
  const { auto = true, force = false, initialData = null } = options;

  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(Boolean(auto && normalizedSlug));
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(
    async ({ forceReload = false } = {}) => {
      if (!normalizedSlug) {
        setLoading(false);
        setData(null);
        setError("Missing CMS slug");
        return null;
      }
      setLoading(true);
      setError(null);
      try {
        const content = await fetchCmsPage(normalizedSlug, { force: forceReload || force });
        if (mountedRef.current) {
          setData(content);
        }
        return content;
      } catch (err) {
        if (mountedRef.current) {
          setError(err?.message || "Failed to load CMS content");
        }
        return null;
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    },
    [normalizedSlug, force]
  );

  useEffect(() => {
    if (!auto) return;
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    fetchCmsPage(normalizedSlug, {
      force,
      signal: controller?.signal,
    })
      .then((content) => {
        if (mountedRef.current) {
          setData(content);
          setError(null);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mountedRef.current) {
          setError(err?.message || "Failed to load CMS content");
          setLoading(false);
        }
      });

    return () => {
      controller?.abort();
    };
  }, [auto, normalizedSlug, force]);

  return {
    data,
    loading,
    error,
    refresh: () => load({ forceReload: true }),
  };
}

export default useCmsPage;
