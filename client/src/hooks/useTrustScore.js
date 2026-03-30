import { useEffect, useState } from "react";
import api from "@/lib/api";

const trustCache = new Map();
const inflightCache = new Map();

const normalizeScore = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.round(numeric) : null;
};

const deriveTrustLevel = (score) => {
  if (!Number.isFinite(score)) return "";
  if (score >= 70) return "verified";
  if (score >= 40) return "new";
  return "risky";
};

const deriveTrustLabel = (score) => {
  if (!Number.isFinite(score)) return "";
  if (score >= 70) return "Verified Seller";
  if (score >= 40) return "New Seller";
  return "Risky Seller";
};

export const isComplaintRiskState = (riskState) => {
  if (!riskState || riskState.status === "normal") return false;
  const reason = String(riskState.reason || "").toLowerCase();
  const source = String(riskState.details?.source || "").toLowerCase();
  return reason.includes("complaint") || source === "complaint";
};

export const getTrustBadgeClass = (level) => {
  if (level === "verified") {
    return "border border-emerald-200/70 bg-emerald-500/15 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-200";
  }
  if (level === "risky") {
    return "border border-rose-200/70 bg-rose-500/15 text-rose-700 dark:border-rose-400/40 dark:bg-rose-500/15 dark:text-rose-200";
  }
  if (level === "new") {
    return "border border-amber-200/70 bg-amber-500/15 text-amber-700 dark:border-amber-400/40 dark:bg-amber-500/15 dark:text-amber-200";
  }
  return "border border-slate-200/70 bg-slate-100 text-slate-600 dark:border-slate-700/60 dark:bg-slate-800 dark:text-slate-200";
};

export const normalizeTrustPayload = (payload) => {
  if (!payload || typeof payload !== "object") return null;
  const score = normalizeScore(
    payload?.score ?? payload?.trust_score ?? payload?.trustScore,
  );
  const level =
    String(payload?.level || payload?.trustLevel || "").trim().toLowerCase() ||
    (score !== null ? deriveTrustLevel(score) : "");
  const label =
    String(payload?.badge || payload?.label || payload?.trustLabel || "").trim() ||
    (score !== null ? deriveTrustLabel(score) : "");
  const riskState = payload?.risk_state || payload?.riskState || null;
  const underReviewRaw = payload?.under_review ?? payload?.underReview;
  const underReview =
    typeof underReviewRaw === "boolean"
      ? underReviewRaw
      : typeof underReviewRaw === "string"
        ? ["true", "1", "yes"].includes(underReviewRaw.toLowerCase())
        : underReviewRaw != null
          ? Boolean(underReviewRaw)
          : isComplaintRiskState(riskState);

  return {
    score,
    level,
    label,
    riskState,
    underReview: Boolean(underReview),
  };
};

const fetchTrustScore = async (userId) => {
  if (!userId) return null;
  if (trustCache.has(userId)) return trustCache.get(userId);
  if (inflightCache.has(userId)) return inflightCache.get(userId);

  const request = api
    .get(`/posts/trust/${userId}`)
    .then((response) => {
      const payload = response?.data ?? response;
      const normalized = normalizeTrustPayload(payload) || {
        score: null,
        level: "",
        label: "",
        riskState: null,
        underReview: false,
      };
      trustCache.set(userId, normalized);
      inflightCache.delete(userId);
      return normalized;
    })
    .catch((err) => {
      inflightCache.delete(userId);
      throw err;
    });

  inflightCache.set(userId, request);
  return request;
};

export const invalidateTrustCache = (userId) => {
  if (!userId) return;
  trustCache.delete(userId);
  inflightCache.delete(userId);
};

export const useTrustScore = (userId, { enabled = true } = {}) => {
  const emptyState = {
    loading: false,
    score: null,
    level: "",
    label: "",
    riskState: null,
    underReview: false,
  };
  const [state, setState] = useState(() => {
    if (!userId) {
      return emptyState;
    }
    const cached = trustCache.get(userId);
    if (cached) {
      return { loading: false, ...cached };
    }
    return { loading: true, ...emptyState };
  });

  useEffect(() => {
    let cancelled = false;
    if (!enabled || !userId) {
      setState(emptyState);
      return () => {};
    }

    const cached = trustCache.get(userId);
    if (cached) {
      setState({ loading: false, ...cached });
      return () => {};
    }

    setState((prev) => ({ ...prev, loading: true }));
    fetchTrustScore(userId)
      .then((result) => {
        if (cancelled) return;
        setState({ loading: false, ...result });
      })
      .catch((err) => {
        if (cancelled) return;
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err?.message || "Failed to load trust score",
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [userId, enabled]);

  return state;
};
