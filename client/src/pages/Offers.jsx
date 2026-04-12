import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Clock,
  DollarSign,
  MessageCircle,
  RefreshCw,
  TrendingDown,
  X,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import TransactionStepper from "@/components/TransactionStepper";
import api from "../lib/api";
import { useAuth } from "@/context/AuthContext";
import { useCategoryMode } from "@/context/CategoryModeContext";
import { useCmsPage } from "@/hooks/useCmsPage";
import { getUserId, isAuthenticated } from "@/utils/authStorage";
import { navigateBack } from "@/utils/navigation";
import {
  buildActiveAppMatcher,
  matchesCategoryModeItem,
} from "@/utils/categoryModeFilters";

const STATUS_CLASS = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200",
  accepted: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200",
  countered: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200",
  paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200",
  awaiting_payment: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
  completed: "bg-slate-200 text-slate-800 dark:bg-slate-700/40 dark:text-slate-200",
  closed: "bg-slate-200 text-slate-800 dark:bg-slate-700/40 dark:text-slate-200",
};
const SAVED_OFFERS_KEY = "mhub_saved_offers_v1";

const readSavedOfferIds = () => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SAVED_OFFERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((id) => String(id)) : [];
  } catch {
    return [];
  }
};

const persistSavedOfferIds = (ids) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SAVED_OFFERS_KEY, JSON.stringify(ids || []));
  } catch {
    // ignore storage errors
  }
};

const steps = [
  {
    key: "offer",
    labelKey: "offer_step_submitted",
    labelFallback: "Offer Submitted",
    hintKey: "offer_step_submitted_hint",
    hintFallback: "Buyer proposes price",
  },
  {
    key: "review",
    labelKey: "offer_step_review",
    labelFallback: "Seller Review",
    hintKey: "offer_step_review_hint",
    hintFallback: "Accept, reject, or counter",
  },
  {
    key: "payment",
    labelKey: "offer_step_payment",
    labelFallback: "Payment",
    hintKey: "offer_step_payment_hint",
    hintFallback: "Buyer pays after acceptance",
  },
  {
    key: "verify",
    labelKey: "offer_step_verify",
    labelFallback: "Verification",
    hintKey: "offer_step_verify_hint",
    hintFallback: "Both parties confirm completion",
  },
  {
    key: "closed",
    labelKey: "offer_step_closed",
    labelFallback: "Transaction Closed",
    hintKey: "offer_step_closed_hint",
    hintFallback: "Sale done or reopened",
  },
];

const getOfferStepIndex = (status) => {
  switch (status) {
    case "pending":
      return 0;
    case "countered":
      return 1;
    case "accepted":
    case "awaiting_payment":
    case "payment_pending":
      return 2;
    case "paid":
    case "verify":
    case "delivered":
      return 3;
    case "completed":
    case "closed":
      return 4;
    case "rejected":
      return 1;
    default:
      return 0;
  }
};

const getNextAction = (status, role, t) => {
  const tr = typeof t === "function" ? t : (_k, v) => v;
  switch (status) {
    case "pending":
      return role === "seller"
        ? tr("offer_action_review", "Review and respond to this offer.")
        : tr("offer_action_waiting_seller", "Waiting for the seller to respond.");
    case "countered":
      return role === "buyer"
        ? tr("offer_action_counter", "Review the counter offer and reply.")
        : tr("offer_action_waiting_buyer", "Waiting for the buyer to accept or counter.");
    case "accepted":
    case "awaiting_payment":
    case "payment_pending":
      return role === "buyer"
        ? tr("offer_action_pay", "Complete payment to move forward.")
        : tr("offer_action_waiting_payment", "Waiting for buyer payment.");
    case "paid":
    case "verify":
    case "delivered":
      return tr("offer_action_verify", "Confirm delivery and verify completion.");
    case "completed":
    case "closed":
      return tr("offer_action_done", "This offer is closed.");
    case "rejected":
      return role === "buyer"
        ? tr("offer_action_rejected", "Offer was rejected. You can make a new offer.")
        : tr("offer_action_rejected_seller", "Offer rejected. You can review new offers.");
    default:
      return tr("offer_action_default", "Track this negotiation for updates.");
  }
};

const normalizeOffers = (payload) => {
  const data = payload?.data ?? payload;
  if (Array.isArray(data?.offers)) return data.offers;
  if (Array.isArray(data)) return data;
  return [];
};

const normalizeOfferError = (
  error,
  translate,
  fallback = "Failed to process offer",
) => {
  const tr =
    typeof translate === "function" ? translate : (_key, value) => value;
  const status = Number(error?.status || error?.response?.status || 0);
  if (status === 401 || status === 403) {
    return tr(
      "offers_auth_required",
      "Please sign in again to continue offer actions.",
    );
  }
  return (
    String(error?.message || error?.response?.data?.error || "").trim() ||
    tr("offers_error_default", fallback)
  );
};

const toSavings = (offeredPrice, originalPrice) => {
  const offered = Number(offeredPrice);
  const original = Number(originalPrice);
  if (!Number.isFinite(offered) || !Number.isFinite(original) || original <= 0)
    return 0;
  return Math.max(0, Math.round(((original - offered) / original) * 100));
};
const getExpiryMeta = (offer, tr) => {
  const raw =
    offer?.expires_at ||
    offer?.expiresAt ||
    offer?.expiry ||
    offer?.expiration_date ||
    offer?.expirationDate ||
    offer?.expires_on;
  if (!raw) return null;
  const expiry = new Date(raw);
  if (Number.isNaN(expiry.getTime())) return null;
  const diffMs = expiry.getTime() - Date.now();
  if (diffMs <= 0) {
    return {
      label: tr("offer_expired", "Expired"),
      className: "bg-red-100 text-red-700 dark:bg-red-950/20 dark:text-red-300",
    };
  }
  const totalMins = Math.max(1, Math.round(diffMs / 60000));
  const days = Math.floor(totalMins / (60 * 24));
  const hours = Math.floor((totalMins % (60 * 24)) / 60);
  const mins = totalMins % 60;
  const label =
    days > 0
      ? tr("offer_expires_in_days", "Expires in {{count}}d", {
          count: days,
        })
      : hours > 0
        ? tr("offer_expires_in_hours", "Expires in {{h}}h {{m}}m", {
            h: hours,
            m: mins,
          })
        : tr("offer_expires_in_minutes", "Expires in {{count}}m", {
            count: mins,
          });
  return {
    label,
    className:
      diffMs < 60 * 60 * 1000
        ? "bg-amber-100 text-amber-800"
        : "bg-emerald-100 text-emerald-800",
  };
};

const OffersPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { data: cmsContent } = useCmsPage("offers");
  const tr = useCallback(
    (key, fallback, options = {}) =>
      t(key, { defaultValue: fallback, ...options }),
    [t],
  );

  const cmsSteps = useMemo(() => {
    if (Array.isArray(cmsContent?.steps)) return cmsContent.steps;
    if (Array.isArray(cmsContent?.offerSteps)) return cmsContent.offerSteps;
    return null;
  }, [cmsContent]);

  const userId =
    getUserId(user) ||
    localStorage.getItem("userId") ||
    localStorage.getItem("user_id");
  const canUseOffers = useMemo(
    () => Boolean(userId) && isAuthenticated(user),
    [userId, user],
  );
  const {
    activeCategory: categoryModeCategory,
    activeApp,
    hasSelection: hasCategoryMode,
    categories: categoryModeCategories,
  } = useCategoryMode();

  const categoryModeCategoryId = useMemo(() => {
    if (!hasCategoryMode || !categoryModeCategory?.name) return null;
    if (categoryModeCategory?.id) return String(categoryModeCategory.id);
    const normalized = String(categoryModeCategory.name).trim().toLowerCase();
    const match = (Array.isArray(categoryModeCategories)
      ? categoryModeCategories
      : []
    ).find(
      (item) =>
        String(
          item?.name ||
            item?.title ||
            item?.label ||
            item?.category_name ||
            "",
        )
          .trim()
          .toLowerCase() === normalized,
    );
    const id = match?.category_id || match?.id;
    return id ? String(id) : null;
  }, [
    hasCategoryMode,
    categoryModeCategory?.id,
    categoryModeCategory?.name,
    categoryModeCategories,
  ]);
  const activeAppMatcher = useMemo(
    () => buildActiveAppMatcher(activeApp, categoryModeCategories),
    [activeApp, categoryModeCategories],
  );

  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [role, setRole] = useState("seller");
  const [counterByOfferId, setCounterByOfferId] = useState({});
  const [processingOfferId, setProcessingOfferId] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // { offerId, action, offer }
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [savedOfferIds, setSavedOfferIds] = useState(() => readSavedOfferIds());

  const requestRef = useRef(0);
  const localizedSteps = useMemo(() => {
    const source = cmsSteps?.length ? cmsSteps : steps;
    return source.map((step, index) => ({
      ...step,
      label: tr(
        step.labelKey || step.key || `offer_step_${index}`,
        step.labelFallback || step.label || step.title || "",
      ),
      hint: tr(
        step.hintKey || step.key || `offer_step_${index}_hint`,
        step.hintFallback || step.hint || step.description || "",
      ),
    }));
  }, [tr, cmsSteps]);
  const savedOfferSet = useMemo(
    () => new Set(savedOfferIds.map((id) => String(id))),
    [savedOfferIds],
  );
  const statusOptions = useMemo(
    () => [
      { value: "all", label: tr("all", "All") },
      { value: "pending", label: tr("offers_status_pending", "Pending") },
      { value: "countered", label: tr("offers_status_countered", "Countered") },
      { value: "accepted", label: tr("offers_status_accepted", "Accepted") },
      { value: "awaiting_payment", label: tr("offers_status_awaiting_payment", "Awaiting payment") },
      { value: "paid", label: tr("offers_status_paid", "Paid") },
      { value: "completed", label: tr("offers_status_completed", "Completed") },
      { value: "rejected", label: tr("offers_status_rejected", "Rejected") },
      { value: "closed", label: tr("offers_status_closed", "Closed") },
    ],
    [tr],
  );

  const displayOffers = useMemo(() => {
    return offers.filter((offer) =>
      matchesCategoryModeItem(offer, {
        activeCategory: hasCategoryMode ? categoryModeCategory : null,
        activeCategoryId: categoryModeCategoryId,
        activeAppMatcher,
      }),
    );
  }, [
    offers,
    hasCategoryMode,
    categoryModeCategory,
    categoryModeCategoryId,
    activeAppMatcher,
  ]);
  const filteredOffers = useMemo(() => {
    const query = String(searchTerm || "").trim().toLowerCase();
    return displayOffers.filter((offer) => {
      const status = String(offer.status || "pending").toLowerCase();
      if (statusFilter !== "all" && status !== statusFilter) return false;
      const offerId = String(offer.offer_id || offer.id || "");
      if (showSavedOnly && !savedOfferSet.has(offerId)) return false;
      if (!query) return true;
      const haystack = [
        offerId,
        offer.post_title,
        offer.buyer_name,
        offer.buyer_username,
        offer.seller_name,
        offer.seller_username,
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());
      return haystack.some((value) => value.includes(query));
    });
  }, [displayOffers, savedOfferSet, searchTerm, showSavedOnly, statusFilter]);

  const isFilteredEmpty =
    (Boolean(hasCategoryMode && categoryModeCategory?.name) ||
      Boolean(activeAppMatcher?.activeApp)) &&
    offers.length > 0 &&
    displayOffers.length === 0;
  const isFilterSearchEmpty =
    displayOffers.length > 0 && filteredOffers.length === 0;

  useEffect(() => {
    persistSavedOfferIds(savedOfferIds);
  }, [savedOfferIds]);

  const toggleSavedOffer = useCallback((offerId) => {
    const id = String(offerId || "");
    if (!id) return;
    setSavedOfferIds((prev) => {
      const next = new Set(prev.map((value) => String(value)));
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return Array.from(next);
    });
  }, []);

  const fetchOffers = useCallback(async () => {
    if (!canUseOffers) {
      setOffers([]);
      setLoading(false);
      setError("");
      return;
    }

    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/offers", { params: { role } });
      if (requestId !== requestRef.current) return;
      setOffers(normalizeOffers(response));
    } catch (fetchError) {
      if (requestId !== requestRef.current) return;
      setOffers([]);
      setError(
        normalizeOfferError(
          fetchError,
          tr,
          tr("offers_load_failed", "Failed to load offers"),
        ),
      );
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false);
      }
    }
  }, [canUseOffers, role, tr]);

  useEffect(() => {
    fetchOffers();
    return () => {
      requestRef.current += 1;
    };
  }, [fetchOffers]);

  const handleOfferAction = async (offerId, action, counterPrice = null) => {
    if (!canUseOffers || processingOfferId) return;

    if (action === "counter") {
      const value = Number(counterPrice);
      const offer = offers.find((o) => (o.offer_id || o.id) === offerId);
      const originalPrice = Number(offer?.original_price || 0);
      const offeredPrice = Number(offer?.offered_price || 0);
      const minCounter = Math.max(1, offeredPrice);

      if (!Number.isFinite(value) || value <= 0) {
        toast({
          title: tr("offers_invalid_counter", "Invalid counter offer"),
          description: tr(
            "offers_invalid_counter_desc",
            "Enter a valid amount greater than 0.",
          ),
          variant: "destructive",
        });
        return;
      }

      if (originalPrice > 0 && value > originalPrice) {
        toast({
          title: tr("offers_counter_too_high", "Counter too high"),
          description: tr(
            "offers_counter_too_high_desc",
            "Counter offer cannot exceed the original listing price of ₹{{price}}.",
            { price: originalPrice.toLocaleString() },
          ),
          variant: "destructive",
        });
        return;
      }

      if (value <= offeredPrice) {
        toast({
          title: tr("offers_counter_too_low", "Counter too low"),
          description: tr(
            "offers_counter_too_low_desc",
            "Counter offer must be higher than the buyer's offer of ₹{{price}}.",
            { price: offeredPrice.toLocaleString() },
          ),
          variant: "destructive",
        });
        return;
      }
    }

    // For accept/reject, show confirmation dialog instead of acting immediately
    if (action === "accept" || action === "reject") {
      const offer = offers.find((o) => (o.offer_id || o.id) === offerId);
      setConfirmAction({ offerId, action, offer });
      return;
    }

    await executeOfferAction(offerId, action, counterPrice);
  };

  const executeOfferAction = async (offerId, action, counterPrice = null) => {
    setProcessingOfferId(offerId);
    try {
      const body = {
        action,
        ...(action === "counter" ? { counterPrice: Number(counterPrice) } : {}),
      };

      await api.patch(`/offers/${offerId}`, body);

      toast({
        title:
          action === "accept"
            ? tr("offers_accepted", "Offer Accepted")
            : action === "reject"
              ? tr("offers_rejected", "Offer Rejected")
              : tr("offers_counter_sent", "Counter Offer Sent"),
        description:
          action === "accept"
            ? tr("offers_congrats_sale", "Congratulations on your sale!")
            : action === "reject"
              ? tr("offers_buyer_notified", "The buyer has been notified.")
              : tr(
                  "offers_counter_sent_desc",
                  "Counter offer sent successfully.",
                ),
      });

      setCounterByOfferId((prev) => ({ ...prev, [offerId]: "" }));
      await fetchOffers();
    } catch (actionError) {
      toast({
        title: tr("error", "Error"),
        description: normalizeOfferError(actionError, tr),
        variant: "destructive",
      });
    } finally {
      setProcessingOfferId(null);
    }
  };

  if (!canUseOffers) {
    return (
      <div className="min-h-screen mhub-premium-page bg-gray-50 flex items-center justify-center p-4 dark:bg-gray-950">
        <div className="max-w-md w-full mhub-premium-surface rounded-2xl p-6 text-center page-shell page-pad dark:text-center">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3 dark:text-amber-300" />
          <h2 className="text-xl font-bold text-gray-900 mb-2 dark:text-gray-100">
            {tr("login_required", "Login required")}
          </h2>
          <p className="text-sm text-gray-600 mb-4 dark:text-gray-200">
            {tr(
              "offers_login_desc",
              "Sign in to view and manage your offer negotiations.",
            )}
          </p>
          <Button
            onClick={() =>
              navigate("/login", { state: { returnTo: "/offers" } })
            }
          >
            {tr("go_to_login", "Go to Login")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen mhub-premium-page bg-gray-50 dark:bg-gray-950">
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 dark:from-[#0b1220] dark:to-[#0f2a2a] px-4 py-8 dark:bg-gradient-to-r">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="icon"
              className="text-white dark:text-white"
              onClick={() => navigateBack(navigate)}
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold text-white flex items-center gap-3 flex-wrap dark:text-white">
                <DollarSign className="w-8 h-8" />{" "}
                {tr("offers_title", "Price Negotiations")}
              </h1>
              <p className="text-green-100 mt-1 dark:text-green-200">
                {tr("offers_subtitle", "Manage your offers and counter-offers")}
              </p>
            </div>
          </div>

          <div className="flex gap-2 bg-white/10 p-1 rounded-xl w-fit dark:bg-slate-900/10">
            <Button
              variant={role === "seller" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setRole("seller")}
              className={
                role === "seller" ? "" : "text-white hover:bg-white/20"
              }
            >
              {tr("offers_received", "Received Offers")}
            </Button>
            <Button
              variant={role === "buyer" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setRole("buyer")}
              className={role === "buyer" ? "" : "text-white hover:bg-white/20"}
            >
              {tr("offers_mine", "My Offers")}
            </Button>
          </div>
        </div>
      </div>

      {hasCategoryMode && categoryModeCategory?.name ? (
        <div className="max-w-4xl mx-auto px-4 -translate-y-2 page-shell page-pad">
          <div className="mb-3 rounded-2xl border border-emerald-100 bg-white/90 dark:border-emerald-900/40 dark:bg-gray-900/70 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm dark:border dark:border-emerald-600/40 dark:bg-slate-900/90">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white dark:text-slate-100">
                Category mode: {categoryModeCategory.name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-300">
                Offers are filtered to this category.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="border-emerald-200 text-emerald-700 w-fit dark:border-emerald-600/40 dark:text-emerald-300"
              onClick={() => navigate("/category-mode")}
            >
              {tr("switch_category", "Switch category")}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="max-w-4xl mx-auto px-4 mt-2 -translate-y-2 page-shell page-pad">
        <TransactionStepper
          steps={localizedSteps}
          currentStep={0}
          className="bg-white dark:bg-gray-900 dark:bg-slate-900"
        />
      </div>

      <div className="max-w-4xl mx-auto px-4 -translate-y-2 page-shell page-pad">
        <div className="mb-4 rounded-2xl border border-emerald-100 bg-white/95 dark:border-emerald-900/40 dark:bg-gray-900/70 p-4 shadow-sm dark:border dark:border-emerald-600/40 dark:bg-slate-900/95">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-300 uppercase">
                  {tr("status", "Status")}
                </label>
                <select
                  className="mhub-input h-9 rounded-lg px-3 text-sm"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-300 uppercase">
                  {tr("search", "Search")}
                </label>
                <Input
                  className="h-9 w-full sm:w-64"
                  placeholder={tr("offers_search_placeholder", "Search offers")}
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={showSavedOnly ? "secondary" : "outline"}
                size="sm"
                onClick={() => setShowSavedOnly((prev) => !prev)}
              >
                {showSavedOnly
                  ? tr("showing_saved", "Saved only")
                  : tr("show_saved", "Show saved")}
              </Button>
              <Button variant="outline" size="sm" onClick={fetchOffers}>
                <RefreshCw className="w-4 h-4 mr-1" />
                {tr("refresh", "Refresh")}
              </Button>
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-500 dark:text-slate-300">
            {filteredOffers.length} {tr("offers_count", "offers")}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 page-shell page-pad">
        {loading ? (
          <div className="text-center py-12 dark:text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto dark:border-b-2 dark:border-green-500/40" />
          </div>
        ) : error ? (
          <Card className="border-0 shadow-lg dark:border-0">
            <CardContent className="py-10 text-center dark:text-center">
              <h3 className="text-xl font-semibold text-red-600 mb-2 dark:text-red-300">
                {tr("offers_unable_to_load", "Unable to load offers")}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4 dark:text-gray-300">{error}</p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Button
                  className="bg-green-600 hover:bg-green-700 dark:bg-green-700/40 dark:hover:bg-green-700/40"
                  onClick={fetchOffers}
                >
                  <RefreshCw className="w-4 h-4 mr-2" /> {tr("retry", "Retry")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/all-posts")}
                >
                  {tr("browse_posts", "Browse posts")}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : filteredOffers.length === 0 ? (
          <Card className="border-0 shadow-lg dark:border-0">
            <CardContent className="text-center py-12 dark:text-center">
              {isFilteredEmpty ? (
                <>
                  <DollarSign className="w-16 h-16 mx-auto text-gray-300 mb-4 dark:text-gray-300" />
                  <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-200">
                    {tr("offers_empty_filtered", "No offers in this category")}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mt-2 dark:text-gray-300">
                    {categoryModeCategory?.name
                      ? `Offers are filtered to ${categoryModeCategory.name}. Switch category to see more.`
                      : tr("offers_empty", "No offers yet")}
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 mt-4">
                    <Button
                      variant="outline"
                      onClick={() => navigate("/category-mode")}
                    >
                      {tr("switch_category", "Switch category")}
                    </Button>
                    <Button
                      className="bg-green-600 hover:bg-green-700 dark:bg-green-700/40 dark:hover:bg-green-700/40"
                      onClick={() => navigate("/all-posts")}
                    >
                      {tr("browse_listings", "Browse listings")}
                    </Button>
                  </div>
                </>
              ) : isFilterSearchEmpty ? (
                <>
                  <DollarSign className="w-16 h-16 mx-auto text-gray-300 mb-4 dark:text-gray-300" />
                  <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-200">
                    {tr("offers_empty_filtered", "No matching offers")}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mt-2 dark:text-gray-300">
                    {tr(
                      "offers_filter_hint",
                      "Adjust your filters or clear search to see more offers.",
                    )}
                  </p>
                </>
              ) : (
                <>
                  <DollarSign className="w-16 h-16 mx-auto text-gray-300 mb-4 dark:text-gray-300" />
                  <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-200">
                    {tr("offers_empty", "No offers yet")}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mt-2 dark:text-gray-300">
                    {role === "seller"
                      ? tr(
                          "offers_empty_seller",
                          "You haven't received any offers yet",
                        )
                      : tr(
                          "offers_empty_buyer",
                          "You haven't made any offers yet",
                        )}
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 mt-4">
                    <Button variant="outline" onClick={fetchOffers}>
                      {tr("refresh", "Refresh")}
                    </Button>
                    <Button
                      className="bg-green-600 hover:bg-green-700 dark:bg-green-700/40 dark:hover:bg-green-700/40"
                      onClick={() => navigate("/all-posts")}
                    >
                      {tr("browse_listings", "Browse listings")}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredOffers.map((offer) => {
              const status = String(offer.status || "pending").toLowerCase();
              const offerId = offer.offer_id || offer.id;
              const isSaved = savedOfferSet.has(String(offerId));
              const expiryMeta = getExpiryMeta(offer, tr);
              const statusLabel = tr(
                `offers_status_${status}`,
                status.charAt(0).toUpperCase() + status.slice(1),
              );
              const stepIndex = getOfferStepIndex(status);
              const nextAction = getNextAction(status, role, tr);
              return (
                <Card
                  key={offerId}
                  className="border-0 shadow-lg overflow-hidden dark:border-0"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge
                            className={
                              STATUS_CLASS[status] ||
                              "bg-gray-100 text-gray-800"
                            }
                          >
                            {statusLabel}
                          </Badge>
                          {expiryMeta && (
                            <Badge className={expiryMeta.className}>
                              {expiryMeta.label}
                            </Badge>
                          )}
                          {isSaved && (
                            <Badge className="bg-slate-900 text-white dark:bg-slate-700 dark:text-white">
                              {tr("saved", "Saved")}
                            </Badge>
                          )}
                          <span className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-300">
                            <Clock className="w-4 h-4 inline mr-1" />
                            {offer.created_at
                              ? new Date(offer.created_at).toLocaleDateString()
                              : "-"}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="ml-auto h-8"
                            onClick={() => toggleSavedOffer(offerId)}
                          >
                            {isSaved
                              ? tr("saved", "Saved")
                              : tr("save", "Save")}
                          </Button>
                        </div>

                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 dark:text-gray-100">
                          {offer.post_title ||
                            tr("offers_untitled_post", "Untitled Post")}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 dark:text-gray-300">
                          {role === "seller"
                            ? `${tr("offers_from", "From")}: ${offer.buyer_name || offer.buyer_username || tr("offers_buyer", "Buyer")}`
                            : `${tr("offers_to", "To")}: ${offer.seller_name || offer.seller_username || tr("offers_seller", "Seller")}`}
                        </p>

                        <div className="flex items-center gap-3 mb-3">
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-300">
                              {tr("offers_original_price", "Original Price")}
                            </p>
                            <p className="text-lg font-bold text-gray-400 line-through dark:text-gray-300">
                              ₹
                              {Number(
                                offer.original_price || 0,
                              ).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-300">
                              {tr("offers_offered_price", "Offered Price")}
                            </p>
                            <p className="text-xl font-bold text-green-600 dark:text-green-300">
                              ₹
                              {Number(
                                offer.offered_price || 0,
                              ).toLocaleString()}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className="text-red-500 border-red-200 dark:text-red-300 dark:border-red-600/40"
                          >
                            <TrendingDown className="w-3 h-3 mr-1" />
                            {tr("offers_percent_off", "{{percent}}% off", {
                              percent: toSavings(
                                offer.offered_price,
                                offer.original_price,
                              ),
                            })}
                          </Badge>
                        </div>

                        {offer.message && (
                          <p className="text-sm text-gray-600 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg dark:text-gray-200 dark:bg-gray-950">
                            <MessageCircle className="w-4 h-4 inline mr-2" />&quot;
                            {offer.message}&quot;
                          </p>
                        )}

                        {offer.counter_price && (
                          <p className="text-sm mt-2 text-blue-600 font-semibold dark:text-blue-300">
                            {tr("offers_counter_offer", "Counter offer")}: ₹
                            {Number(offer.counter_price || 0).toLocaleString()}
                          </p>
                        )}
                      
                        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                            {tr("offers_next_step", "Next step")}
                          </p>
                          <p className="mt-1">{nextAction}</p>
                        </div>

                        <div className="mt-4">
                          <TransactionStepper
                            steps={localizedSteps}
                            currentStep={stepIndex}
                            className="bg-white dark:bg-slate-900"
                          />
                        </div>
                      </div>

                      {role === "seller" && status === "pending" && (
                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 dark:bg-green-700/40 dark:hover:bg-green-700/40"
                            disabled={processingOfferId === offerId}
                            onClick={() => handleOfferAction(offerId, "accept")}
                          >
                            <Check className="w-4 h-4 mr-1" />{" "}
                            {tr("accept", "Accept")}
                          </Button>

                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={processingOfferId === offerId}
                            onClick={() => handleOfferAction(offerId, "reject")}
                          >
                            <X className="w-4 h-4 mr-1" />{" "}
                            {tr("reject", "Reject")}
                          </Button>

                          <div className="flex gap-1">
                            <Input
                              type="number"
                              placeholder={tr(
                                "offers_counter_placeholder",
                                "Counter",
                              )}
                              className="w-24 text-sm"
                              min="1"
                              value={counterByOfferId[offerId] || ""}
                              onChange={(event) =>
                                setCounterByOfferId((prev) => ({
                                  ...prev,
                                  [offerId]: event.target.value,
                                }))
                              }
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={
                                !counterByOfferId[offerId] ||
                                processingOfferId === offerId
                              }
                              onClick={() =>
                                handleOfferAction(
                                  offerId,
                                  "counter",
                                  counterByOfferId[offerId],
                                )
                              }
                            >
                              {tr("send", "Send")}
                            </Button>
                          </div>
                        </div>
                      )}

                      {role === "buyer" && status === "countered" && (
                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 dark:bg-green-700/40 dark:hover:bg-green-700/40"
                            disabled={processingOfferId === offerId}
                            onClick={() => handleOfferAction(offerId, "accept")}
                          >
                            <Check className="w-4 h-4 mr-1" />{" "}
                            {tr("accept_counter", "Accept Counter")}
                          </Button>

                          <div className="flex gap-1">
                            <Input
                              type="number"
                              placeholder={tr(
                                "offers_counter_placeholder",
                                "Counter",
                              )}
                              className="w-24 text-sm"
                              min="1"
                              value={counterByOfferId[offerId] || ""}
                              onChange={(event) =>
                                setCounterByOfferId((prev) => ({
                                  ...prev,
                                  [offerId]: event.target.value,
                                }))
                              }
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={
                                !counterByOfferId[offerId] ||
                                processingOfferId === offerId
                              }
                              onClick={() =>
                                handleOfferAction(
                                  offerId,
                                  "counter",
                                  counterByOfferId[offerId],
                                )
                              }
                            >
                              {tr("send", "Send")}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation dialog for accept/reject */}
      <AlertDialog
        open={!!confirmAction}
        onOpenChange={(open) => { if (!open) setConfirmAction(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.action === "accept"
                ? tr("offers_confirm_accept_title", "Accept this offer?")
                : tr("offers_confirm_reject_title", "Reject this offer?")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.action === "accept"
                ? tr(
                    "offers_confirm_accept_desc",
                    "You are accepting ₹{{price}} for \"{{title}}\". This action cannot be undone.",
                    {
                      price: Number(confirmAction?.offer?.offered_price || 0).toLocaleString(),
                      title: confirmAction?.offer?.post_title || "",
                    },
                  )
                : tr(
                    "offers_confirm_reject_desc",
                    "You are rejecting the offer of ₹{{price}} for \"{{title}}\". The buyer will be notified.",
                    {
                      price: Number(confirmAction?.offer?.offered_price || 0).toLocaleString(),
                      title: confirmAction?.offer?.post_title || "",
                    },
                  )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tr("cancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className={
                confirmAction?.action === "accept"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }
              onClick={async () => {
                if (confirmAction) {
                  await executeOfferAction(confirmAction.offerId, confirmAction.action);
                  setConfirmAction(null);
                }
              }}
            >
              {confirmAction?.action === "accept"
                ? tr("confirm_accept", "Yes, Accept")
                : tr("confirm_reject", "Yes, Reject")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default OffersPage;
