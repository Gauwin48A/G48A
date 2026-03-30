import React, { useState, useCallback } from 'react';

import { useTranslation } from 'react-i18next';

/** Maximum allowed search query length */
const MAX_QUERY_LENGTH = 200;

/** Strip potentially dangerous characters while keeping useful search chars */
function sanitizeQuery(raw) {
  if (typeof raw !== 'string') return '';
  // Remove control characters and trim; allow alphanumeric, spaces, hyphens, dots, commas
  const cleaned = raw.replace(/[<>{}()`\\]/g, '');
  const withoutControl = Array.from(cleaned)
    .filter((ch) => ch.charCodeAt(0) >= 32)
    .join('');
  return withoutControl
    .slice(0, MAX_QUERY_LENGTH)
    .trim();
}

const SearchBar = ({ onSearch, minLength = 1 }) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  const handleChange = useCallback((e) => {
    const sanitized = sanitizeQuery(e.target.value);
    setQuery(sanitized);
    if (error) setError('');
  }, [error]);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    const trimmed = query.trim();

    if (trimmed.length > 0 && trimmed.length < minLength) {
      setError(t('search_too_short', `Enter at least ${minLength} characters.`));
      return;
    }

    setError('');
    try {
      if (onSearch) onSearch(trimmed);
    } catch {
      setError(t('search_error', 'Search failed. Please try again.'));
    }
  }, [query, minLength, onSearch, t]);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col w-full max-w-xl mx-auto py-4" role="search" aria-label={t("search_products_placeholder")}>
      <div className="flex items-center w-full">
        <input
          type="search"
          className={`mhub-input flex-1 px-4 py-2 rounded-l-xl focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 ${error ? 'border-red-400 ring-red-300' : ''}`}
          placeholder={t("search_products_placeholder")}
          value={query}
          onChange={handleChange}
          maxLength={MAX_QUERY_LENGTH}
          autoComplete="off"
          spellCheck="false"
          aria-invalid={!!error}
          aria-describedby={error ? 'search-error' : undefined}
        />
        <button
          type="submit"
          className="px-4 py-2 bg-indigo-600 text-white rounded-r font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
          disabled={query.trim().length > 0 && query.trim().length < minLength}
        >
          {t("search")}
        </button>
      </div>
      {error && (
        <p id="search-error" className="mt-1 text-xs text-red-500" role="alert">
          {error}
        </p>
      )}
    </form>
  );
};

export default SearchBar;
