import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { Button } from "@/components/ui/button";
import TransactionStepper from "@/components/TransactionStepper";
import { useAuth } from "@/context/AuthContext";
import { getUserId, isAuthenticated } from "@/utils/authStorage";

const normalizePayload = (payload) => payload?.data ?? payload ?? null;

const normalizeConfig = (raw) => {
  const payload = normalizePayload(raw) || {};
  const tiers = payload?.tiers && typeof payload.tiers === "object" ? payload.tiers : {};
  return {
    upi_id: payload?.upi_id || "",
    merchant_name: payload?.merchant_name || "Mhub Merchant",
    tiers,
    instructions: Array.isArray(payload?.instructions) ? payload.instructions : [],
  };
};

const normalizeHistory = (raw) => {
  const payload = normalizePayload(raw) || {};
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.payments)) return payload.payments;
  return [];
};

const PaymentPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const userId = useMemo(() => getUserId(user), [user]);
  const loggedIn = useMemo(() => isAuthenticated(user) || Boolean(userId), [user, userId]);

  const [paymentConfig, setPaymentConfig] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState("silver");
  const [transactionId, setTransactionId] = useState("");
  const [submitState, setSubmitState] = useState({
    loading: false,
    message: "",
    error: "",
  });

  const [history, setHistory] = useState([]);
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState("");
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");

  const loadConfig = async () => {
    setConfigLoading(true);
    setConfigError("");

    try {
      const response = await api.get("/payments/upi-details");
      const normalized = normalizeConfig(response);
      setPaymentConfig(normalized);
      if (!normalized.tiers || Object.keys(normalized.tiers).length === 0) {
        setConfigError("No payment plans are available right now.");
      }
    } catch (error) {
      setPaymentConfig(null);
      const status = Number(error?.status || error?.response?.status || 0);
      setConfigError(
        status === 401 || status === 403
          ? "Please sign in to continue payments."
          : error?.response?.data?.error || "Failed to load payment details.",
      );
    } finally {
      setConfigLoading(false);
    }
  };

  const loadHistory = async () => {
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
          ? "Please sign in to view payment history."
          : error?.response?.data?.error || "Failed to load payment history.",
      );
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (!loggedIn) {
      setConfigLoading(false);
      setHistoryLoading(false);
      return;
    }

    loadConfig();
    loadHistory();
  }, [loggedIn]);

  const plans = useMemo(() => Object.keys(paymentConfig?.tiers || {}), [paymentConfig]);

  useEffect(() => {
    if (plans.length && !plans.includes(selectedPlan)) {
      setSelectedPlan(plans[0]);
    }
  }, [plans, selectedPlan]);

  const selectedTier = paymentConfig?.tiers?.[selectedPlan];

  const steps = useMemo(
    () => [
      { key: "discover", label: "Select Plan", hint: "Choose membership tier" },
      { key: "pay", label: "Pay", hint: "Scan UPI or app link" },
      { key: "submit", label: "Submit UTR", hint: "Provide transaction ID" },
      { key: "verify", label: "Verification", hint: "Team validates payment" },
      { key: "active", label: "Membership Active", hint: "Tier updated on approval" },
    ],
    [],
  );

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!loggedIn) {
      navigate("/login", { state: { returnTo: "/payment" } });
      return;
    }

    if (!selectedTier) {
      setSubmitState({ loading: false, message: "", error: "Please select a valid plan." });
      return;
    }

    if (!transactionId.trim()) {
      setSubmitState({ loading: false, message: "", error: "Transaction ID is required." });
      return;
    }

    setSubmitState({ loading: true, message: "", error: "" });

    try {
      const response = await api.post("/payments/submit", {
        plan_type: selectedPlan,
        transaction_id: transactionId.trim(),
        amount: selectedTier.amount,
      });
      const payload = normalizePayload(response) || {};
      setSubmitState({
        loading: false,
        message: payload?.message || "Payment submitted successfully.",
        error: "",
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
            ? "Please sign in to submit payment."
            : error?.response?.data?.error || "Submission failed.",
      });
    }
  };

  if (!loggedIn) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-lg font-semibold text-amber-800 mb-2">Login required</h2>
          <p className="text-sm text-amber-700 mb-4">
            Sign in to view membership plans and submit payment confirmations.
          </p>
          <Button
            type="button"
            className="bg-amber-600 hover:bg-amber-700 text-white"
            onClick={() => navigate("/login", { state: { returnTo: "/payment" } })}
          >
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  if (configLoading) {
    return <div className="p-6 text-center">Loading payment details...</div>;
  }

  if (!paymentConfig || configError) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <h2 className="text-lg font-semibold text-red-700 mb-2">Unable to load payment details</h2>
          <p className="text-sm text-red-600 mb-4">
            {configError || "Payment details are unavailable right now."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" className="bg-red-600 hover:bg-red-700 text-white" onClick={loadConfig}>
              Retry
            </Button>
            {(configError || "").toLowerCase().includes("sign in") && (
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/login", { state: { returnTo: "/payment" } })}
              >
                Go to Login
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const upiUri = `upi://pay?pa=${paymentConfig.upi_id}&pn=${encodeURIComponent(
    paymentConfig.merchant_name,
  )}&am=${selectedTier?.amount || 0}&cu=INR`;
  const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    upiUri,
  )}`;

  return (
    <div className="max-w-4xl mx-auto p-6 pb-24 space-y-6">
      <TransactionStepper steps={steps} currentStep={2} />

      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold mb-4">Upgrade Membership</h1>

          <div className="mb-6 grid grid-cols-3 gap-2">
            {plans.map((plan) => (
              <button
                key={plan}
                type="button"
                onClick={() => setSelectedPlan(plan)}
                className={`p-2 rounded border capitalize ${
                  selectedPlan === plan
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                {plan}
              </button>
            ))}
          </div>

          {selectedTier ? (
            <div className="mb-6 p-4 bg-blue-50 rounded border border-blue-100">
              <h3 className="font-bold text-lg capitalize">{selectedPlan} Plan</h3>
              <p className="text-gray-600 mb-2">{selectedTier.description}</p>
              <div className="text-3xl font-bold text-blue-700">Rs {selectedTier.amount}</div>
            </div>
          ) : (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded">
              <p className="text-sm text-amber-700">
                Selected plan data is unavailable. Please choose another plan.
              </p>
            </div>
          )}

          <div className="flex flex-col items-center mb-6">
            <img src={qrCode} alt="Scan to Pay" className="border p-2 rounded mb-2" />
            <p className="text-sm text-gray-500">Scan using GPay, PhonePe, or Paytm</p>
            <p className="text-xs text-gray-400 mt-1">{paymentConfig.upi_id}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Transaction ID (UTR)</label>
              <input
                type="text"
                value={transactionId}
                onChange={(event) => setTransactionId(event.target.value)}
                placeholder="Enter UTR"
                className="w-full p-2 border rounded"
                required
                minLength={6}
              />
            </div>

            {submitState.error && <div className="text-red-500 text-sm">{submitState.error}</div>}
            {submitState.message && <div className="text-green-600 text-sm">{submitState.message}</div>}

            <button
              type="submit"
              disabled={submitState.loading || !selectedTier}
              className="w-full bg-green-600 text-white py-3 rounded font-bold hover:bg-green-700 transition disabled:opacity-60"
            >
              {submitState.loading ? "Verifying..." : "Submit Payment"}
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="font-bold mb-3">How it works</h3>
            <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600">
              {(paymentConfig.instructions || []).map((instruction, index) => (
                <li key={index}>{instruction}</li>
              ))}
            </ul>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">Payment History</h3>
              <Button type="button" variant="outline" size="sm" onClick={loadHistory}>
                Refresh
              </Button>
            </div>

            {historyLoading ? (
              <p className="text-gray-500 text-sm">Loading history...</p>
            ) : historyError ? (
              <div className="rounded border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-600 mb-2">{historyError}</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" className="bg-red-600 hover:bg-red-700 text-white" size="sm" onClick={loadHistory}>
                    Retry
                  </Button>
                  {historyError.toLowerCase().includes("sign in") && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => navigate("/login", { state: { returnTo: "/payment" } })}
                    >
                      Go to Login
                    </Button>
                  )}
                </div>
              </div>
            ) : history.length === 0 ? (
              <p className="text-gray-400 text-sm">No payments yet.</p>
            ) : (
              <div className="space-y-3">
                {history.map((payment) => (
                  <div key={payment.id} className="flex justify-between items-center p-3 border-b last:border-0">
                    <div>
                      <div className="font-medium capitalize">{payment.plan_purchased} Plan</div>
                      <div className="text-xs text-gray-500">
                        {payment.created_at ? new Date(payment.created_at).toLocaleDateString() : "-"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">Rs {payment.amount}</div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          payment.status === "verified"
                            ? "bg-green-100 text-green-800"
                            : payment.status === "rejected"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {payment.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
