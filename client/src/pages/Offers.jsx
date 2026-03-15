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
import TransactionStepper from "@/components/TransactionStepper";
import api from "../lib/api";
import { useAuth } from "@/context/AuthContext";
import { getUserId, isAuthenticated } from "@/utils/authStorage";
import { navigateBack } from "@/utils/navigation";

const STATUS_CLASS = {
  pending: "bg-yellow-100 text-yellow-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  countered: "bg-blue-100 text-blue-800",
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

const OffersPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useTranslation();
  const tr = useCallback(
    (key, fallback, options = {}) =>
      t(key, { defaultValue: fallback, ...options }),
    [t],
  );

  const authToken =
    localStorage.getItem("authToken") || localStorage.getItem("token");
  const userId =
    getUserId(user) ||
    localStorage.getItem("userId") ||
    localStorage.getItem("user_id");
  const canUseOffers = useMemo(
    () => Boolean(authToken && userId) && isAuthenticated(user),
    [authToken, userId, user],
  );

  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [role, setRole] = useState("seller");
  const [counterByOfferId, setCounterByOfferId] = useState({});
  const [processingOfferId, setProcessingOfferId] = useState(null);

  const requestRef = useRef(0);
  const localizedSteps = useMemo(
    () =>
      steps.map((step) => ({
        ...step,
        label: tr(step.labelKey, step.labelFallback),
        hint: tr(step.hintKey, step.hintFallback),
      })),
    [tr],
  );

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
    }

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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border p-6 text-center page-shell page-pad">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {tr("login_required", "Login required")}
          </h2>
          <p className="text-sm text-gray-600 mb-4">
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="icon"
              className="text-white"
              onClick={() => navigateBack(navigate)}
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold text-white flex items-center gap-3 flex-wrap">
                <DollarSign className="w-8 h-8" />{" "}
                {tr("offers_title", "Price Negotiations")}
              </h1>
              <p className="text-green-100 mt-1">
                {tr("offers_subtitle", "Manage your offers and counter-offers")}
              </p>
            </div>
          </div>

          <div className="flex gap-2 bg-white/10 p-1 rounded-xl w-fit">
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

      <div className="max-w-4xl mx-auto px-4 mt-2 -translate-y-2 page-shell page-pad">
        <TransactionStepper
          steps={localizedSteps}
          currentStep={1}
          className="bg-white dark:bg-gray-900"
        />
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 page-shell page-pad">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto" />
          </div>
        ) : error ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="py-10 text-center">
              <h3 className="text-xl font-semibold text-red-600 mb-2">
                {tr("offers_unable_to_load", "Unable to load offers")}
              </h3>
              <p className="text-gray-500 mb-4">{error}</p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Button
                  className="bg-green-600 hover:bg-green-700"
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
        ) : offers.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="text-center py-12">
              <DollarSign className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-600">
                {tr("offers_empty", "No offers yet")}
              </h3>
              <p className="text-gray-500 mt-2">
                {role === "seller"
                  ? tr(
                      "offers_empty_seller",
                      "You haven't received any offers yet",
                    )
                  : tr("offers_empty_buyer", "You haven't made any offers yet")}
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                <Button variant="outline" onClick={fetchOffers}>
                  {tr("refresh", "Refresh")}
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => navigate("/all-posts")}
                >
                  {tr("browse_listings", "Browse listings")}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {offers.map((offer) => {
              const status = String(offer.status || "pending").toLowerCase();
              const offerId = offer.offer_id || offer.id;
              const statusLabel = tr(
                `offers_status_${status}`,
                status.charAt(0).toUpperCase() + status.slice(1),
              );
              return (
                <Card
                  key={offerId}
                  className="border-0 shadow-lg overflow-hidden"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge
                            className={
                              STATUS_CLASS[status] ||
                              "bg-gray-100 text-gray-800"
                            }
                          >
                            {statusLabel}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            <Clock className="w-4 h-4 inline mr-1" />
                            {offer.created_at
                              ? new Date(offer.created_at).toLocaleDateString()
                              : "-"}
                          </span>
                        </div>

                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                          {offer.post_title ||
                            tr("offers_untitled_post", "Untitled Post")}
                        </h3>
                        <p className="text-sm text-gray-500 mb-3">
                          {role === "seller"
                            ? `${tr("offers_from", "From")}: ${offer.buyer_name || offer.buyer_username || tr("offers_buyer", "Buyer")}`
                            : `${tr("offers_to", "To")}: ${offer.seller_name || offer.seller_username || tr("offers_seller", "Seller")}`}
                        </p>

                        <div className="flex items-center gap-6 mb-3">
                          <div>
                            <p className="text-sm text-gray-500">
                              {tr("offers_original_price", "Original Price")}
                            </p>
                            <p className="text-lg font-bold text-gray-400 line-through">
                              ₹
                              {Number(
                                offer.original_price || 0,
                              ).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">
                              {tr("offers_offered_price", "Offered Price")}
                            </p>
                            <p className="text-xl font-bold text-green-600">
                              ₹
                              {Number(
                                offer.offered_price || 0,
                              ).toLocaleString()}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className="text-red-500 border-red-200"
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
                          <p className="text-sm text-gray-600 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                            <MessageCircle className="w-4 h-4 inline mr-2" />"
                            {offer.message}"
                          </p>
                        )}

                        {offer.counter_price && (
                          <p className="text-sm mt-2 text-blue-600 font-semibold">
                            {tr("offers_counter_offer", "Counter offer")}: ₹
                            {Number(offer.counter_price || 0).toLocaleString()}
                          </p>
                        )}
                      </div>

                      {role === "seller" && status === "pending" && (
                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
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
    </div>
  );
};

export default OffersPage;
