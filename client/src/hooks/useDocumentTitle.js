import { useEffect } from "react";

const BASE_TITLE = "MHub - Verified Marketplace";

/**
 * Sets document.title for the current page.
 * @param {string} title — page-specific title
 */
export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | MHub` : BASE_TITLE;
    return () => {
      document.title = BASE_TITLE;
    };
  }, [title]);
}
