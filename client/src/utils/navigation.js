export const DEFAULT_BACK_FALLBACK = "/all-posts";

export const canNavigateBack = () => {
  if (typeof window === "undefined") return false;
  const historyIndex =
    typeof window.history?.state?.idx === "number"
      ? window.history.state.idx
      : null;
  if (historyIndex !== null) {
    return historyIndex > 0;
  }
  return window.history.length > 1;
};

export const navigateBack = (navigate, fallback = DEFAULT_BACK_FALLBACK) => {
  if (typeof navigate !== "function") return;
  if (canNavigateBack()) {
    navigate(-1);
    return;
  }
  navigate(fallback);
};
