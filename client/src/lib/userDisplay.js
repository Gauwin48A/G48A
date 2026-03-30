export function getInitials(value, fallback = "U", options = {}) {
  const { uppercase = false, max = 0 } = options || {};
  if (typeof value !== "string") {
    return fallback;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return fallback;
  }
  let initials = parts.map((part) => part[0]).join("");
  if (!initials) {
    return fallback;
  }
  if (Number.isFinite(max) && max > 0) {
    initials = initials.slice(0, max);
  }
  return uppercase ? initials.toUpperCase() : initials;
}

export function safeText(value, fallback = "-") {
  if (value === null || value === undefined) {
    return fallback;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : fallback;
  }
  return String(value);
}
