import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../../services/api";
import { Button } from "@/components/ui/button";
import TransactionStepper from "@/components/TransactionStepper";
import { useAuth } from "@/context/AuthContext";
import { getUserId, isAuthenticated } from "@/utils/authStorage";
import { fetchWithCache } from "@/lib/requestCache";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Copy, ExternalLink, Lock, RefreshCw } from "lucide-react";
import { useCmsPage } from "@/hooks/useCmsPage";

const normalizePayload = (payload) => payload?.data ?? payload ?? null;

const normalizeConfig = (raw) => {
  const payload = normalizePayload(raw) || {};
  const tiers =
    payload?.tiers && typeof payload.tiers === "object" ? payload.tiers : {};
  const boosts =
    payload?.boosts && typeof payload.boosts === "object" ? payload.boosts : {};
  return {
    upi_id: payload?.upi_id || "",
    merchant_name: payload?.merchant_name || "Mhub Merchant",
    gateway_enabled: Boolean(payload?.gateway_enabled),
    razorpay_key_id: payload?.razorpay_key_id || "",
    tiers,
    boosts,
    instructions: Array.isArray(payload?.instructions)
      ? payload.instructions
      : [],
  };
};

const normalizeHistory = (raw) => {
  const payload = normalizePayload(raw) || {};
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.payments)) return payload.payments;
  return [];
};

const PAYMENT_STEPS = [
  {
    key: "discover",
    labelKey: "payment_step_select_plan",
    labelFallback: "Select Plan",
    hintKey: "payment_step_select_plan_hint",
    hintFallback: "Choose membership tier",
  },
  {
    key: "pay",
    labelKey: "payment_step_pay",
    labelFallback: "Pay",
    hintKey: "payment_step_pay_hint",
    hintFallback: "Scan UPI or app link",
  },
  {
    key: "submit",
    labelKey: "payment_step_submit",
    labelFallback: "Submit UTR",
    hintKey: "payment_step_submit_hint",
    hintFallback: "Provide transaction ID",
  },
  {
    key: "verify",
    labelKey: "payment_step_verify",
    labelFallback: "Verification",
    hintKey: "payment_step_verify_hint",
    hintFallback: "Team validates payment",
  },
  {
    key: "active",
    labelKey: "payment_step_active",
    labelFallback: "Membership Active",
    hintKey: "payment_step_active_hint",
    hintFallback: "Tier updated on approval",
  },
];

// Status chip color map
function statusChipClass(status) {
  if (status === "verified") return "bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300";
  if (status === "rejected" || status === "failed") return "bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/30 dark:text-red-300";
  return "bg-amber-100 text-amber-800 border border-amber-200 dark:bg-yellow-900/30 dark:text-yellow-300";
}

const PaymentPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: cmsContent } = useCmsPage("payment");
  const tr = useCallback(
    (key, fallback, options = {}) =>
      t(key, { defaultValue: fallback, ...options }),
    [t],
  );

  const cmsSteps = useMemo(() => {
    if (Array.isArray(cmsContent?.steps)) return cmsContent.steps;
    if (Array.isArray(cmsContent?.paymentSteps)) return cmsContent.paymentSteps;
    return null;
  }, [cmsContent]);

  const searchParams = useMemo(
    () => new URLSearchParams(location.search || ""),
    [location.search],
  );
  const purposeParam = String(searchParams.get("purpose") || "").toLowerCase();
  const planParam = String(searchParams.get("plan") || "").toLowerCase();
  const boostTypeParam = String(
    searchParams.get("boostType") || searchParams.get("boost_type") || "",
  ).toLowerCase();
  const postIdParam = searchParams.get("postId") || searchParams.get("post_id") || "";
  const returnToParam =
    searchParams.get("returnTo") || searchParams.get("return_to") || "";
  const isBoostFlow =
    purposeParam === "boost" || Boolean(boostTypeParam || postIdParam);
  const safeReturnTo = useMemo(() => {
    if (!returnToParam) return "";
    const normalized = String(returnToParam).trim();
    return normalized.startsWith("/") ? normalized : "";
  }, [returnToParam]);

  const userId = useMemo(() => getUserId(user), [user]);
  const loggedIn = useMemo(
    () => isAuthenticated(user) || Boolean(userId),
    [user, userId],
  );
  const loginReturnTo = useMemo(
    () => `${location.pathname || "/payment"}${location.search || ""}`,
    [location.pathname, location.search],
  );

  const [paymentConfig, setPaymentConfig] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState("silver");
  const [selectedBoost, setSelectedBoost] = useState("boost");
  const [transactionId, setTransactionId] = useState("");
  const [submitState, setSubmitState] = useState({
    loading: false,
    message: "",
    error: "",
  });
  const razorpayScriptRef = useRef(null);
  const [gatewayState, setGatewayState] = useState({
    loading: false,
    message: "",
    error: "",
  });

  const [history, setHistory] = useState([]);
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState("");
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    document.title = isBoostFlow ? "MHub — Boost Payment" : "MHub — Payment";
    return () => { document.title = "MHub"; };
  }, [isBoostFlow]);

  const localizedSteps = useMemo(() => {
    const source = cmsSteps?.length ? cmsSteps : PAYMENT_STEPS;
    const steps = source.map((step, index) => ({
      ...step,
      label: tr(
        step.labelKey || step.key || `payment_step_${index}`,
        step.labelFallback || step.label || step.title || "",
      ),
      hint: tr(
        step.hintKey || step.key || `payment_step_${index}_hint`,
        step.hintFallback || step.hint || step.description || "",
      ),
    }));

    if (isBoostFlow && steps.length) {
      steps[0] = {
        ...steps[0],
        label: tr("payment_step_select_boost", "Select Boost"),
        hint: tr("payment_step_select_boost_hint", "Choose boost type"),
      };
    }

    return steps;
  }, [tr, isBoostFlow, cmsSteps]);

  const loadConfig = useCallback(async () => {
    setConfigLoading(true);
    setConfigError("");

    try {
      const response = await fetchWithCache(
        "payments:upi-details",
        () => api.get("/payments/upi-details"),
        { ttlMs: 2 * 60 * 1000 },
      );
      const normalized = normalizeConfig(response);
      setPaymentConfig(normalized);
      const tiersEmpty =
        !normalized.tiers || Object.keys(normalized.tiers).length === 0;
      const boostsEmpty =
        !normalized.boosts || Object.keys(normalized.boosts).length === 0;
      if (isBoostFlow ? boostsEmpty : tiersEmpty) {
        setConfigError(
          isBoostFlow
            ? tr(
                "payment_no_boosts",
                "No boost options are available right now.",
              )
            : tr(
                "payment_no_plans",
                "No payment plans are available right now.",
              ),
        );
      }
    } catch (error) {
      setPaymentConfig(null);
      const status = Number(error?.status || error?.response?.status || 0);
      setConfigError(
        status === 401 || status === 403
          ? tr(
              "payment_sign_in_continue",
              "Please sign in to continue payments.",
            )
          : error?.response?.data?.error ||
              tr("payment_load_failed", "Failed to load payment details."),
      );
    } finally {
      setConfigLoading(false);
    }
  }, [isBoostFlow, tr]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError("");

    try {
      const response = await api.get("/payments/status");
      setHistory(normalizeHistory(response));
    } catch (error) {
      setHistory([]);
      const status = Number(error?.status || error?.response?.status || 0);
      setHistoryError(
        status === 401 || status === 403
          ? tr(
              "payment_history_sign_in",
              "Please sign in to view payment history.",
            )
          : error?.response?.data?.error ||
              tr(
                "payment_history_load_failed",
                "Failed to load payment history.",
              ),
      );
    } finally {
      setHistoryLoading(false);
    }
  }, [tr]);

  useEffect(() => {
    if (!loggedIn) {
      setConfigLoading(false);
      setHistoryLoading(false);
      return;
    }

    loadConfig();
    loadHistory();
  }, [loadConfig, loadHistory, loggedIn]);

  const plans = useMemo(
    () => Object.keys(paymentConfig?.tiers || {}),
    [paymentConfig],
  );
  const boosts = useMemo(
    () => Object.keys(paymentConfig?.boosts || {}),
    [paymentConfig],
  );

  useEffect(() => {
    if (planParam && plans.includes(planParam)) {
      setSelectedPlan(planParam);
    }
  }, [planParam, plans]);

  useEffect(() => {
    if (boostTypeParam && boosts.includes(boostTypeParam)) {
      setSelectedBoost(boostTypeParam);
    }
  }, [boostTypeParam, boosts]);

  useEffect(() => {
    if (plans.length && !plans.includes(selectedPlan)) {
      setSelectedPlan(plans[0]);
    }
  }, [plans, selectedPlan]);

  useEffect(() => {
    if (boosts.length && !boosts.includes(selectedBoost)) {
      setSelectedBoost(boosts[0]);
    }
  }, [boosts, selectedBoost]);

  useEffect(() => {
    setGatewayState({ loading: false, message: "", error: "" });
  }, [selectedPlan, selectedBoost, isBoostFlow]);

  const selectedTier = paymentConfig?.tiers?.[selectedPlan];
  const selectedBoostOption = paymentConfig?.boosts?.[selectedBoost];
  const activeOptions = isBoostFlow ? boosts : plans;
  const selectedOption = isBoostFlow ? selectedBoostOption : selectedTier;
  const selectedKey = isBoostFlow ? selectedBoost : selectedPlan;
  const gatewayEnabled = Boolean(
    paymentConfig?.gateway_enabled && paymentConfig?.razorpay_key_id,
  );

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!loggedIn) {
      navigate("/login", { state: { returnTo: loginReturnTo } });
      return;
    }

    if (!selectedOption) {
      setSubmitState({
        loading: false,
        message: "",
        error: isBoostFlow
          ? tr("payment_select_boost", "Please select a valid boost.")
          : tr("payment_select_plan", "Please select a valid plan."),
      });
      return;
    }

    if (isBoostFlow && !postIdParam) {
      setSubmitState({
        loading: false,
        message: "",
        error: tr(
          "payment_post_required",
          "Post ID is required for boost payments.",
        ),
      });
      return;
    }

    if (!transactionId.trim()) {
      setSubmitState({
        loading: false,
        message: "",
        error: tr(
          "payment_transaction_required",
          "Transaction ID is required.",
        ),
      });
      return;
    }

    setSubmitState({ loading: true, message: "", error: "" });

    try {
      const submitPayload = isBoostFlow
        ? {
            boost_type: selectedBoost,
            post_id: postIdParam,
            transaction_id: transactionId.trim(),
            amount: selectedOption.amount,
          }
        : {
            plan_type: selectedPlan,
            transaction_id: transactionId.trim(),
            amount: selectedOption.amount,
          };
      const response = await api.post("/payments/submit", submitPayload);
      const payload = normalizePayload(response) || {};
      const successMessage =
        payload?.message ||
        tr("payment_submit_success", "Payment submitted successfully.");
      setSubmitState({
        loading: false,
        message: successMessage,
        error: "",
      });
      toast({
        title: tr("payment_submit_success_title", "Payment submitted"),
        description: successMessage,
      });
      setTransactionId("");
      await loadHistory();
    } catch (error) {
      const status = Number(error?.status || error?.response?.status || 0);
      setSubmitState({
        loading: false,
        message: "",
        error:
          status === 401 || status === 403
            ? tr("payment_sign_in_submit", "Please sign in to submit payment.")
            : error?.response?.data?.error ||
              tr("payment_submit_failed", "Submission failed."),
      });
    }
  };

  const loadRazorpayScript = useCallback(() => {
    if (razorpayScriptRef.current) {
      return razorpayScriptRef.current;
    }

    razorpayScriptRef.current = new Promise((resolve, reject) => {
      if (typeof window === "undefined") {
        reject(new Error("Razorpay is unavailable in this environment"));
        return;
      }

      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => reject(new Error("Failed to load Razorpay"));
      document.body.appendChild(script);
    });

    return razorpayScriptRef.current;
  }, []);

  if (!loggedIn) {
    return (
      <div className="min-h-screen mhub-premium-page bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center px-4 dark:bg-gradient-to-br">
        <div className="w-full max-w-md text-center dark:text-center">
          <div className="mhub-premium-surface mhub-shine rounded-3xl p-8 shadow-2xl">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30 dark:bg-gradient-to-br">
              <Lock className="h-7 w-7 text-white dark:text-white" />
            </div>
            <h2 className="mb-2 text-xl font-black mhub-gradient-text">
              {tr("login_required", "Please login to access this feature")}
            </h2>
            <p className="mb-6 text-sm text-slate-500 dark:text-slate-400 leading-relaxed dark:text-slate-300">
              {tr(
                "payment_login_desc",
                isBoostFlow
                  ? "Sign in to submit boost payment confirmations."
                  : "Sign in to view membership plans and submit payment confirmations.",
              )}
            </p>
            <Button
              type="button"
              className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 transition-all duration-200 active:scale-[0.98] dark:bg-gradient-to-r dark:text-white"
              onClick={() =>
                navigate("/login", { state: { returnTo: loginReturnTo } })
              }
            >
              {tr("go_to_login", "Go to Login")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (configLoading) {
    return (
      <div className="min-h-screen mhub-premium-page flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950 dark:bg-gradient-to-br">
        <div className="mhub-premium-surface rounded-3xl p-10 flex flex-col items-center gap-4 shadow-2xl">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600 dark:border-indigo-800 dark:border-t-indigo-400 dark:border-4 dark:border-indigo-600/40 dark:border-t-indigo-600" />
          <p className="text-slate-600 text-sm font-medium dark:text-slate-400 dark:text-slate-200">
            {tr("payment_loading_details", "Loading payment details...")}
          </p>
        </div>
      </div>
    );
  }

  if (!paymentConfig || configError) {
    return (
      <div className="min-h-screen mhub-premium-page bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center px-4 dark:bg-gradient-to-br">
        <div className="w-full max-w-md">
          <div className="mhub-premium-surface rounded-3xl p-8 shadow-2xl text-center dark:text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-900/20 dark:bg-red-950/20">
              <ExternalLink className="h-6 w-6 text-red-500 dark:text-red-300" />
            </div>
            <h2 className="mb-2 text-lg font-black text-red-700 dark:text-red-400 dark:text-red-300">
              {tr("payment_unable_to_load", "Unable to load payment details")}
            </h2>
            <p className="mb-6 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-300">
              {configError ||
                tr(
                  "payment_unavailable",
                  "Payment details are unavailable right now.",
                )}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                type="button"
                className="bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold shadow-lg shadow-red-500/20 hover:shadow-xl transition-all duration-200 dark:bg-red-700/40 dark:hover:bg-red-800/30 dark:text-white"
                onClick={loadConfig}
              >
                {tr("retry", "Retry")}
              </Button>
              {(configError || "").toLowerCase().includes("sign in") && (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() =>
                    navigate("/login", { state: { returnTo: loginReturnTo } })
                  }
                >
                  {tr("go_to_login", "Go to Login")}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const selectedLabel = isBoostFlow
    ? paymentConfig?.boosts?.[selectedKey]?.label || selectedKey
    : selectedKey;
  const upiUri = `upi://pay?pa=${paymentConfig.upi_id}&pn=${encodeURIComponent(
    paymentConfig.merchant_name,
  )}&am=${selectedOption?.amount || 0}&cu=INR`;
  const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    upiUri,
  )}`;
  const handleCopyUpi = async () => {
    const upiId = String(paymentConfig?.upi_id || "");
    if (!upiId) return;
    try {
      await navigator.clipboard.writeText(upiId);
      toast({
        title: tr("copied", "Copied"),
        description: tr("upi_id_copied", "UPI ID copied to clipboard."),
      });
    } catch {
      toast({
        title: tr("copy_failed", "Copy failed"),
        description: tr("copy_failed_desc", "Please copy the UPI ID manually."),
        variant: "destructive",
      });
    }
  };
  const handleOpenUpi = () => {
    if (typeof window === "undefined") return;
    window.location.href = upiUri;
  };

  const handleRazorpayPay = async () => {
    if (!loggedIn) {
      navigate("/login", { state: { returnTo: loginReturnTo } });
      return;
    }

    if (!gatewayEnabled) {
      setGatewayState({
        loading: false,
        message: "",
        error: tr(
          "payment_gateway_unavailable",
          "Instant payment is unavailable. Please use manual UPI instead.",
        ),
      });
      return;
    }

    if (!selectedOption) {
      setGatewayState({
        loading: false,
        message: "",
        error: isBoostFlow
          ? tr("payment_select_boost", "Please select a valid boost.")
          : tr("payment_select_plan", "Please select a valid plan."),
      });
      return;
    }

    if (isBoostFlow && !postIdParam) {
      setGatewayState({
        loading: false,
        message: "",
        error: tr(
          "payment_post_required",
          "Post ID is required for boost payments.",
        ),
      });
      return;
    }

    setGatewayState({ loading: true, message: "", error: "" });

    try {
      await loadRazorpayScript();

      const orderPayload = isBoostFlow
        ? { boost_type: selectedBoost, post_id: postIdParam }
        : { plan_type: selectedPlan };
      const response = await api.post("/payments/razorpay/order", orderPayload);
      const order = normalizePayload(response) || {};

      if (!order.order_id) {
        throw new Error("Order creation failed");
      }

      const options = {
        key: order.key_id || paymentConfig.razorpay_key_id,
        amount: order.amount,
        currency: order.currency || "INR",
        name: paymentConfig.merchant_name,
        description: isBoostFlow
          ? tr("payment_boost_title", "Boost Listing")
          : tr("payment_upgrade_title", "Upgrade Membership"),
        order_id: order.order_id,
        prefill: order.prefill || undefined,
        handler: async (payload) => {
          try {
            const verifyRes = await api.post("/payments/razorpay/verify", {
              razorpay_order_id: payload.razorpay_order_id,
              razorpay_payment_id: payload.razorpay_payment_id,
              razorpay_signature: payload.razorpay_signature,
            });

            const verifyPayload = normalizePayload(verifyRes) || {};
            setGatewayState({
              loading: false,
              message:
                verifyPayload.message ||
                tr(
                  "payment_gateway_success",
                  "Payment verified successfully.",
                ),
              error: "",
            });
            toast({
              title: tr("payment_success", "Payment Success"),
              description: tr(
                "payment_success_desc",
                "Your payment was verified instantly.",
              ),
            });
            await loadHistory();
          } catch (error) {
            setGatewayState({
              loading: false,
              message: "",
              error:
                error?.response?.data?.error ||
                tr(
                  "payment_gateway_verify_failed",
                  "Payment verification failed. Please contact support.",
                ),
            });
          }
        },
        modal: {
          ondismiss: () => {
            setGatewayState({
              loading: false,
              message: "",
              error: tr(
                "payment_gateway_cancelled",
                "Payment window was closed.",
              ),
            });
          },
        },
        theme: { color: "#4f46e5" },
      };

      if (!window.Razorpay) {
        throw new Error("Razorpay checkout is unavailable");
      }

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", () => {
        setGatewayState({
          loading: false,
          message: "",
          error: tr(
            "payment_gateway_failed",
            "Payment failed. Please try again.",
          ),
        });
      });
      rzp.open();
    } catch (error) {
      setGatewayState({
        loading: false,
        message: "",
        error:
          error?.response?.data?.error ||
          error?.message ||
          tr(
            "payment_gateway_init_failed",
            "Unable to start instant payment. Please try manual UPI.",
          ),
      });
    }
  };

  return (
    <div className="min-h-screen mhub-premium-page bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-950 page-shell page-pad nav-clearance dark:bg-gradient-to-br">
      {/* Transaction stepper */}
      <div className="mx-auto max-w-4xl px-4 pt-4">
        <TransactionStepper steps={localizedSteps} currentStep={2} />
      </div>

      {/* Header card */}
      <div className="mx-auto max-w-4xl px-4 mt-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900 via-blue-900 to-purple-900 px-6 py-5 text-white shadow-xl dark:bg-gradient-to-r dark:text-white">
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-3xl pointer-events-none dark:bg-slate-900/10" />
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-300 dark:text-indigo-200">
            {isBoostFlow
              ? tr("payment_boost_title", "Boost Listing")
              : tr("payment_upgrade_title", "Upgrade Membership")}
          </p>
          <h1 className="mt-1 text-xl sm:text-2xl font-black text-white dark:text-white">
            {selectedOption
              ? tr("payment_paying_for", "Paying for {{plan}}", {
                  plan: isBoostFlow
                    ? `${selectedLabel} Boost`
                    : `${selectedLabel} Plan`,
                })
              : tr("payment_select_a_plan", "Select a plan to continue")}
          </h1>
          {selectedOption ? (
            <p className="mt-1 text-3xl font-black tabular-nums bg-gradient-to-br from-white to-indigo-300 dark:from-indigo-200 dark:to-indigo-400 bg-clip-text text-transparent">
              ₹{selectedOption.amount}
            </p>
          ) : null}
          <div className="flex items-center justify-center gap-3 mt-3 px-3 py-2 bg-white/20 backdrop-blur-sm rounded-lg dark:bg-slate-900/20">
            <svg className="h-4 w-4 text-emerald-300 dark:text-emerald-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            <span className="text-xs font-medium text-white/80 dark:text-white/80">Secure Payment • SSL Encrypted • Verified</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 pb-10 mt-5 grid md:grid-cols-2 gap-6">
        {/* LEFT: form area */}
        <div className="space-y-5">

          {/* SUCCESS CARD — shown after successful submission */}
          {submitState.message && !submitState.error ? (
            <div className="rounded-2xl border border-emerald-200 mhub-premium-surface p-7 shadow-lg text-center dark:border dark:border-emerald-600/40 dark:text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-emerald-950/20">
                <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-300" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2 dark:text-gray-100">
                {tr("payment_submitted_title", "Payment Submitted!")}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6 dark:text-gray-200">{submitState.message}</p>
              <div aria-live="polite" className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-center mb-6 flex items-center justify-center gap-2 dark:bg-blue-950/20 dark:border dark:border-blue-600/40 dark:text-center">
                <svg className="h-5 w-5 flex-shrink-0 text-blue-500 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span className="text-sm text-blue-700 dark:text-blue-300">{tr(
                  "payment_verification_notice",
                  "Our team will verify your payment within 2–24 hours and activate your plan.",
                )}</span>
              </div>
              <Button
                onClick={() => navigate(safeReturnTo || "/post-welcome")}
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl dark:bg-emerald-700/40 dark:hover:bg-emerald-700/40 dark:text-white"
              >
                {tr("continue_start_posting", "Continue — Go to Post Welcome →")}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/tier-selection")}
                className="w-full mt-3 rounded-xl font-semibold"
              >
                {tr("view_all_plans", "View All Plans")}
              </Button>
            </div>
          ) : (
            <>
              {/* Plan / boost selector — horizontal pills */}
              <div className="rounded-2xl border border-slate-200 mhub-premium-surface mhub-shine p-5 shadow-sm dark:border-gray-700 dark:border dark:border-slate-700">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 dark:text-slate-300">
                  {isBoostFlow
                    ? tr("select_boost_label", "Select Boost")
                    : tr("select_plan_label", "Select Plan")}
                </p>
                <div className="flex flex-wrap gap-2 overflow-x-auto">
                  {activeOptions.map((optionKey) => (
                    <button
                      key={optionKey}
                      type="button"
                      onClick={() =>
                        isBoostFlow
                          ? setSelectedBoost(optionKey)
                          : setSelectedPlan(optionKey)
                      }
                      aria-current={selectedKey === optionKey ? "true" : undefined}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold capitalize transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 ${
                        selectedKey === optionKey
                          ? "border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 ring-2 ring-indigo-500/30"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:border-indigo-300 hover:bg-slate-100 hover:shadow-sm dark:hover:bg-gray-700"
                      }`}
                    >
                      {isBoostFlow
                        ? paymentConfig?.boosts?.[optionKey]?.label || optionKey
                        : optionKey}
                    </button>
                  ))}
                </div>

                {selectedOption ? (
                  <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50 p-4 dark:border-indigo-900 dark:bg-indigo-950/30 dark:border dark:border-indigo-600/40 dark:bg-indigo-950/20">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="font-bold text-lg capitalize text-gray-900 dark:text-white dark:text-gray-100">
                        {isBoostFlow
                          ? tr("payment_selected_boost", "{{boost}} Boost", { boost: selectedLabel })
                          : tr("payment_selected_plan", "{{plan}} Plan", { plan: selectedLabel })}
                      </h3>
                      <span className="text-2xl font-black text-indigo-700 dark:text-indigo-300">
                        ₹{selectedOption.amount}
                      </span>
                    </div>
                    {selectedOption.description ? (
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 dark:text-gray-200">{selectedOption.description}</p>
                    ) : null}
                    {isBoostFlow && selectedOption.durationDays ? (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">
                        {tr("payment_boost_duration", "Duration: {{days}} days", {
                          days: selectedOption.durationDays,
                        })}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border dark:border-amber-600/40 dark:bg-amber-950/20">
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      {tr(
                        isBoostFlow
                          ? "payment_selected_boost_unavailable"
                          : "payment_selected_plan_unavailable",
                        isBoostFlow
                          ? "Selected boost data is unavailable. Please choose another boost."
                          : "Selected plan data is unavailable. Please choose another plan.",
                      )}
                    </p>
                  </div>
                )}
              </div>

              {/* Gateway section */}
              {gatewayEnabled ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm dark:border dark:border-emerald-600/40 dark:bg-emerald-950/20">
                  <h3 className="text-sm font-bold text-emerald-800 mb-1 dark:text-emerald-200">
                    {tr("payment_gateway_title", "Instant payment")}
                  </h3>
                  <p className="text-xs text-emerald-700 mb-3 dark:text-emerald-300">
                    {tr(
                      "payment_gateway_desc",
                      "Pay instantly with UPI, cards, or netbanking. Verification happens automatically.",
                    )}
                  </p>
                  {gatewayState.error ? (
                    <p role="alert" className="text-xs text-red-600 mb-2 dark:text-red-300">{gatewayState.error}</p>
                  ) : null}
                  {gatewayState.message ? (
                    <p className="text-xs text-emerald-700 mb-2 dark:text-emerald-300">{gatewayState.message}</p>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-500/25 text-white font-bold rounded-xl transition-all duration-200 dark:bg-emerald-700/40 dark:hover:bg-emerald-700/40 dark:text-white"
                    onClick={handleRazorpayPay}
                    disabled={gatewayState.loading}
                  >
                    {gatewayState.loading
                      ? <><svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>{tr("payment_processing", "Processing...")}</>
                      : tr("pay_now", "Pay Now")}
                  </Button>
                </div>
              ) : (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm dark:border dark:border-amber-600/40 dark:bg-amber-950/20">
                  <h3 className="text-sm font-bold text-amber-800 mb-1 dark:text-amber-200">
                    {tr("payment_gateway_unavailable_title", "Instant pay paused")}
                  </h3>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    {tr(
                      "payment_gateway_unavailable_desc",
                      "Instant payment is currently unavailable. Use the manual UPI flow below.",
                    )}
                  </p>
                </div>
              )}

              {/* UPI section */}
              <div className="rounded-2xl border border-slate-200 mhub-premium-surface p-5 shadow-sm dark:border-gray-700 dark:border dark:border-slate-700">
                <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 dark:text-slate-300">
                  {tr("pay_via_upi", "Pay via UPI")}
                </p>

                {/* QR code centered */}
                <div className="flex flex-col items-center gap-3 mb-5">
                  <div className="mhub-premium-surface p-4 rounded-2xl shadow-inner border-2 border-indigo-100 dark:border-indigo-900/30 dark:border-2 dark:border-indigo-600/40">
                    <img
                      src={qrCode}
                      alt={tr("payment_scan_to_pay", "Scan to Pay")}
                      className="h-[140px] w-[140px] sm:h-[160px] sm:w-[160px] rounded-xl"
                      onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling && (e.target.nextElementSibling.style.display = 'flex'); }}
                    />
                    <div className="hidden h-[140px] w-[140px] sm:h-[160px] sm:w-[160px] rounded-xl border-2 border-dashed border-slate-300 items-center justify-center text-center text-xs text-slate-500 p-4 dark:border-gray-600 dark:text-slate-400 dark:border-2 dark:border-dashed dark:border-slate-600 dark:text-center dark:text-slate-300">
                      {tr("qr_unavailable", "QR unavailable — use UPI ID below")}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-300">
                    {tr("payment_scan_instructions", "Scan using GPay, PhonePe, or Paytm")}
                  </p>

                  {/* UPI ID chip */}
                  <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 px-4 py-3 rounded-xl dark:bg-indigo-950/20 dark:border dark:border-indigo-600/40">
                    <span className="text-sm font-mono font-semibold text-slate-700 dark:text-gray-300 dark:text-slate-200">
                      {paymentConfig.upi_id}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyUpi}
                      className="rounded-lg p-1 text-slate-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 hover:text-slate-600 transition-colors duration-200 active:scale-95 dark:text-slate-300 dark:hover:bg-indigo-950/20 dark:hover:text-slate-200"
                      title={tr("copy_upi_id", "Copy UPI ID")}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Deep link button */}
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 font-bold dark:bg-indigo-700/40 dark:text-white dark:hover:bg-indigo-700/40"
                    onClick={handleOpenUpi}
                  >
                    <ExternalLink className="mr-2 h-3.5 w-3.5" />
                    {tr("open_upi_app", "Open UPI App")}
                  </Button>
                </div>

                {/* UTR form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 dark:text-gray-200">
                      {tr("payment_transaction_label", "Transaction ID (UTR)")}
                    </label>
                    <input
                      type="text"
                      value={transactionId}
                      onChange={(event) => setTransactionId(event.target.value)}
                      aria-label={tr("payment_transaction_label", "Transaction ID (UTR)")}
                      placeholder={tr(
                        "payment_transaction_placeholder_long",
                        "Enter 12-digit UTR / Transaction ID",
                      )}
                      className="mhub-input w-full rounded-xl px-4 py-3 text-sm placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-4 focus:ring-indigo-400/30 focus:ring-offset-0 transition-all duration-200 dark:placeholder:text-[var(--text-faint)]"
                      required
                      minLength={6}
                    />
                  </div>

                  {submitState.error ? (
                    <p role="alert" className="text-sm text-red-600 font-medium dark:text-red-300">{submitState.error}</p>
                  ) : null}

                  <Button
                    type="submit"
                    className="w-full h-12 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/25 disabled:opacity-60 transition-all duration-200 dark:bg-indigo-700/40 dark:text-white dark:hover:bg-indigo-700/40"
                    disabled={
                      submitState.loading ||
                      !selectedOption ||
                      (isBoostFlow && !postIdParam)
                    }
                  >
                    {submitState.loading
                      ? <><svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>{tr("payment_verifying", "Submitting...")}</>
                      : tr("payment_submit", "Submit Payment")}
                  </Button>
                </form>
              </div>
            </>
          )}
        </div>

        {/* RIGHT: instructions + history */}
        <div className="space-y-5">
          {/* Instructions */}
          {(paymentConfig.instructions || []).length > 0 ? (
            <div className="rounded-2xl border border-amber-200 dark:border-amber-800/30 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 p-5 shadow-sm dark:border dark:border-amber-600/40 dark:bg-gradient-to-br">
              <h3 className="mb-3 font-bold text-gray-900 dark:text-white dark:text-gray-100">
                {tr("payment_how_it_works", "How it works")}
              </h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300 dark:text-gray-200">
                {(paymentConfig.instructions || []).map((instruction, index) => (
                  <li key={index} className="flex gap-2">
                    <span className="flex-shrink-0 font-bold text-indigo-500 dark:text-indigo-300">{index + 1}.</span>
                    <span>{instruction}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Payment history — collapsible */}
          <div className="rounded-2xl border border-slate-200 mhub-premium-surface shadow-sm overflow-hidden dark:border-gray-700 dark:border dark:border-slate-700">
            <button
              type="button"
              aria-expanded={historyOpen}
              aria-controls="payment-history"
              className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors dark:text-left dark:hover:bg-slate-950"
              onClick={() => setHistoryOpen((o) => !o)}
            >
              <span className="font-bold text-gray-900 dark:text-white dark:text-gray-100">
                {tr("payment_history_title", "Payment History")}
                {history.length > 0 ? (
                  <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-300">
                    {history.length}
                  </span>
                ) : null}
              </span>
              <div className="flex items-center gap-2">
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={tr("refresh_payment_history", "Refresh payment history")}
                  onClick={(e) => { e.stopPropagation(); loadHistory(); }}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); loadHistory(); } }}
                  className="rounded-lg p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer dark:text-slate-500 dark:hover:text-slate-300 dark:text-slate-300 dark:hover:text-slate-200"
                  title={tr("refresh", "Refresh")}
                >
                  <RefreshCw className="h-4 w-4" />
                </span>
                <span className="text-slate-400 text-sm dark:text-slate-300">{historyOpen ? "▲" : "▼"}</span>
              </div>
            </button>

            {historyOpen ? (
              <div id="payment-history" className="border-t border-slate-100 px-5 pb-5 pt-3 dark:border-t dark:border-slate-700">
                {historyLoading ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-300">{tr("payment_history_loading", "Loading history...")}</p>
                ) : historyError ? (
                  <div className="rounded-xl border border-red-100 bg-red-50 p-3 dark:border dark:border-red-600/40 dark:bg-red-950/20">
                    <p className="text-sm text-red-600 mb-2 dark:text-red-300">{historyError}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold dark:bg-red-700/40 dark:hover:bg-red-700/40 dark:text-white"
                        size="sm"
                        onClick={loadHistory}
                      >
                        {tr("retry", "Retry")}
                      </Button>
                      {historyError.toLowerCase().includes("sign in") && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-xl"
                          onClick={() =>
                            navigate("/login", { state: { returnTo: loginReturnTo } })
                          }
                        >
                          {tr("go_to_login", "Go to Login")}
                        </Button>
                      )}
                    </div>
                  </div>
                ) : history.length === 0 ? (
                  <p className="text-sm text-slate-400 dark:text-slate-300">{tr("payment_history_empty", "No payments yet.")}</p>
                ) : (
                  <div className="space-y-3">
                    {history.map((payment) => {
                      const isBoostPayment =
                        payment.purchase_type === "boost" || Boolean(payment.boost_type);
                      let metadata = payment.metadata;
                      if (typeof metadata === "string") {
                        try { metadata = JSON.parse(metadata); } catch { metadata = null; }
                      }
                      const postLabel = metadata?.post_title || payment.post_id || "";
                      const titleLabel = isBoostPayment
                        ? tr("payment_boost_label", "{{boost}} Boost", {
                            boost: payment.boost_type || "boost",
                          })
                        : tr("payment_plan_label", "{{plan}} Plan", {
                            plan: payment.plan_purchased,
                          });
                      return (
                        <div
                          key={payment.id}
                          className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 dark:bg-gray-900 dark:border-gray-600 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 dark:border dark:border-slate-700 dark:bg-slate-950"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold capitalize text-gray-900 dark:text-white text-sm dark:text-gray-100">{titleLabel}</p>
                              {isBoostPayment && postLabel ? (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 dark:text-slate-300">
                                  {tr("payment_boost_post", "Post: {{post}}", { post: postLabel })}
                                </p>
                              ) : null}
                              <p className="text-xs text-slate-400 mt-0.5 dark:text-slate-300">
                                {payment.created_at
                                  ? new Date(payment.created_at).toLocaleDateString()
                                  : "-"}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className="font-bold text-sm text-gray-900 dark:text-white dark:text-gray-100">
                                {tr("payment_amount_rupees", "Rs {{amount}}", {
                                  amount: payment.amount,
                                })}
                              </span>
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusChipClass(payment.status)}`}
                              >
                                {tr(`payment_status_${payment.status}`, payment.status)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
