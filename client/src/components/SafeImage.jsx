import React, { useState, useCallback } from "react";

const FALLBACK_SRC = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect fill='%23f1f5f9' width='200' height='200'/%3E%3Ctext x='50%25' y='50%25' font-family='sans-serif' font-size='14' fill='%2394a3b8' text-anchor='middle' dy='.3em'%3EImage unavailable%3C/text%3E%3C/svg%3E";

/**
 * Image component with built-in error fallback.
 * Shows a placeholder if the image fails to load.
 */
export default function SafeImage({ src, alt = "", fallbackSrc, className, ...props }) {
  const [hasError, setHasError] = useState(false);

  const handleError = useCallback(() => {
    if (!hasError) setHasError(true);
  }, [hasError]);

  return (
    <img
      src={hasError ? (fallbackSrc || FALLBACK_SRC) : (src || FALLBACK_SRC)}
      alt={alt}
      className={className}
      onError={handleError}
      {...props}
    />
  );
}
