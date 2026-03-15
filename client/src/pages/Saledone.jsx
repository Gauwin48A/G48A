import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle,
  Shield,
  Clock,
  ArrowUp,
  ArrowLeft,
  RefreshCw,
  KeyRound,
  CircleDollarSign,
  Info,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { navigateBack } from "@/utils/navigation";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import PageHeader from "../components/PageHeader";
import TransactionStepper from "../components/TransactionStepper";
import api from "@/services/api";

const SaleDone = () => {
  const { t } = useTranslation();
  const tr = (key, fallback, options = {}) =>
    t(key, { defaultValue: fallback, ...options });
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [showScrollTop, setShowScrollTop] = useState(false);
  const [activeTab, setActiveTab] = useState("seller");

  const [sellerForm, setSellerForm] = useState({
    postId: "",
    buyerId: "",
    saleAmount: "",
  });
  const [buyerForm, setBuyerForm] = useState({
    transactionId: "",
    otp: "",
  });

  const [isInitiating, setIsInitiating] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const [initiatedSale, setInitiatedSale] = useState(null);
  const [completedSale, setCompletedSale] = useState(null);

  const [pendingSales, setPendingSales] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingError, setPendingError] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);

  const steps = useMemo(
    () => [
      {
        key: "listing",
        label: tr("sale_step_listing", "Listing Live"),
        hint: tr("sale_step_listing_hint", "Buyer discovers post"),
      },
      {
        key: "offer",
        label: tr("sale_step_offer", "Deal Agreed"),
        hint: tr("sale_step_offer_hint", "Price and terms finalized"),
      },
      {
        key: "handover",
        label: tr("sale_step_handover", "Payment/Handover"),
        hint: tr("sale_step_handover_hint", "Both parties complete exchange"),
      },
      {
        key: "confirm",
        label: tr("sale_step_confirm", "Dual Confirmation"),
        hint: tr("sale_step_confirm_hint", "Buyer verifies OTP"),
      },
      {
        key: "complete",
        label: tr("sale_step_complete", "Sale Completed"),
        hint: tr("sale_step_complete_hint", "Post moves to Sold"),
      },
    ],
    [tr],
  );

  const toSafeMessage = (error, fallback) => {
    const status = Number(error?.status || error?.response?.status || 0);
    const message = String(
      error?.message || error?.data?.error || "",
    ).toLowerCase();

    if (
      status === 401 ||
      message.includes("authentication") ||
      message.includes("login")
    ) {
      return tr(
        "please_sign_in_again",
        "Please sign in again and retry this action.",
      );
    }
    if (status === 403) {
      return tr(
        "sale_not_authorized",
        "You are not authorized for this sale action.",
      );
    }
    if (status === 404 || message.includes("not found")) {
      return tr(
        "sale_record_not_found",
        "Record not found. Verify Post ID / Transaction ID and retry.",
      );
    }
    if (message.includes("otp") && message.includes("expired")) {
      return tr("sale_otp_expired", "OTP expired. Seller must initiate a new sale.");
    }
    if (
      message.includes("schema") ||
      message.includes("missing sale columns")
    ) {
      return tr(
        "sale_schema_incomplete",
        "Backend sale schema is incomplete. Please run pending migrations.",
      );
    }
    return error?.message || fallback;
  };

  const isRouteMissing = (error) => {
    const status = Number(error?.status || error?.response?.status || 0);
    const message = String(error?.message || "").toLowerCase();
    return status === 404 || message.includes("route not found");
  };

  const requestWithFallback = async (method, primaryPath, fallbackPath, payload) => {
    try {
      return await api[method](primaryPath, payload);
    } catch (error) {
      if (fallbackPath && isRouteMissing(error)) {
        return await api[method](fallbackPath, payload);
      }
      throw error;
    }
  };

  useEffect(() => {
    const onScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search || "");
    const prefillPostId =
      params.get("postId") || location.state?.postId || "";
    const prefillBuyerId =
      params.get("buyerId") || location.state?.buyerId || "";
    const prefillAmount =
      params.get("amount") || location.state?.saleAmount || "";
    const prefillTransactionId =
      params.get("transactionId") || location.state?.transactionId || "";

    if (prefillPostId || prefillBuyerId || prefillAmount) {
      setSellerForm((prev) => ({
        ...prev,
        postId: prev.postId || prefillPostId,
        buyerId: prev.buyerId || prefillBuyerId,
        saleAmount: prev.saleAmount || prefillAmount,
      }));
    }

    if (prefillTransactionId) {
      setBuyerForm((prev) => ({
        ...prev,
        transactionId: prev.transactionId || prefillTransactionId,
      }));
      setActiveTab("buyer");
    }
  }, [location.key, location.search, location.state]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setPendingLoading(true);
      setPendingError("");
      try {
        const response = await requestWithFallback(
          "get",
          "/sale/pending",
          "/transactions/pending",
          { params: { limit: 10 } },
        );
        const list = Array.isArray(response?.pendingSales)
          ? response.pendingSales
          : Array.isArray(response?.data?.pendingSales)
            ? response.data.pendingSales
            : Array.isArray(response)
              ? response
              : [];
        if (!cancelled) {
          setPendingSales(list);
        }
      } catch (error) {
        if (!cancelled) {
          setPendingSales([]);
          setPendingError(
            toSafeMessage(
              error,
              tr("pending_sales_load_failed", "Could not load pending sales."),
            ),
          );
        }
      } finally {
        if (!cancelled) {
          setPendingLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  const handleInitiateSale = async (event) => {
    event.preventDefault();

    const postId = String(sellerForm.postId || "").trim();
    const buyerId = String(sellerForm.buyerId || "").trim();
    const agreedPrice = Number(
      String(sellerForm.saleAmount || "").replace(/,/g, "").trim(),
    );

    if (
      !postId ||
      !buyerId ||
      !Number.isFinite(agreedPrice) ||
      agreedPrice <= 0
    ) {
      toast({
        title: tr("missing_details_title", "Missing details"),
        description: tr(
          "sale_incomplete_details_desc",
          "Post ID, Buyer ID and valid sale amount are required.",
        ),
        variant: "destructive",
      });
      return;
    }

    setIsInitiating(true);
    try {
      const payload = await requestWithFallback(
        "post",
        "/sale/initiate",
        "/transactions/initiate",
        { postId, buyerId, agreedPrice },
      );

      const tx = payload?.transaction || payload?.data?.transaction || payload || {};
      const transactionId = String(
        tx.transactionId || tx.transaction_id || tx.id || payload?.transactionId || "",
      );
      const normalizedTx = {
        ...tx,
        transactionId,
      };
      setInitiatedSale(normalizedTx);
      setBuyerForm((prev) => ({
        ...prev,
        transactionId: transactionId || prev.transactionId || "",
      }));
      setActiveTab("buyer");
      setRefreshTick((prev) => prev + 1);

      toast({
        title: tr("sale_initiated_title", "Sale Initiated"),
        description:
          payload?.instructions ||
          tr(
            "sale_initiated_desc",
            "Transaction created. Share transaction id and OTP with buyer.",
          ),
      });
    } catch (error) {
      toast({
        title: tr("sale_initiate_failed_title", "Could not initiate sale"),
        description: toSafeMessage(
          error,
          tr("sale_initiate_failed_desc", "Please try again."),
        ),
        variant: "destructive",
      });
    } finally {
      setIsInitiating(false);
    }
  };

  const handleConfirmSale = async (event) => {
    event.preventDefault();

    const transactionId = String(buyerForm.transactionId || "").trim();
    const otp = String(buyerForm.otp || "").trim();

    if (!transactionId || !otp) {
      toast({
        title: tr("missing_details_title", "Missing details"),
        description: tr(
          "sale_confirm_missing_desc",
          "Transaction ID and OTP are required.",
        ),
        variant: "destructive",
      });
      return;
    }

    setIsConfirming(true);
    try {
      const payload = await requestWithFallback(
        "post",
        "/sale/confirm",
        "/transactions/confirm",
        { transactionId, otp },
      );
      const tx = payload?.transaction || payload?.data?.transaction || payload || {};
      const normalizedTransactionId = String(
        tx.transactionId || tx.transaction_id || transactionId || "",
      );
      const normalizedTx = {
        ...tx,
        transactionId: normalizedTransactionId,
        status: tx.status || "completed",
      };

      setCompletedSale(normalizedTx);
      setRefreshTick((prev) => prev + 1);
      try {
        const marker = {
          transactionId: normalizedTransactionId,
          focusTab: "sold",
          completedAt: new Date().toISOString(),
        };
        localStorage.setItem("mhub:sale:lastCompletedAt", marker.completedAt);
        localStorage.setItem("mhub:sale:lastCompleted", JSON.stringify(marker));
      } catch {
        // Non-blocking: completion UI should still proceed if storage is unavailable.
      }

      toast({
        title: tr("sale_confirmed", "Sale Confirmed"),
        description:
          payload?.message ||
          tr(
            "sale_confirmed_desc",
            "Sale completed. Listing is moved to Sold and will show in My Home > Sold.",
          ),
      });
    } catch (error) {
      toast({
        title: tr("sale_confirm_failed_title", "Sale confirmation failed"),
        description: toSafeMessage(
          error,
          tr("sale_confirm_failed_desc", "Please verify OTP and retry."),
        ),
        variant: "destructive",
      });
    } finally {
      setIsConfirming(false);
    }
  };

  const resetFlow = () => {
    setSellerForm({ postId: "", buyerId: "", saleAmount: "" });
    setBuyerForm({ transactionId: "", otp: "" });
    setInitiatedSale(null);
    setCompletedSale(null);
    setActiveTab("seller");
  };

  const navigateToMyHome = () => {
    navigate("/my-home", {
      state: {
        focusTab: "sold",
        saleCompleted: true,
        transactionId: completedSale?.transactionId || null,
      },
    });
  };

  if (completedSale) {
    return (
      <div
        className="min-h-screen bg-gradient-to-br from-emerald-400 via-green-500 to-teal-600 dark:from-emerald-800 dark:via-green-900 dark:to-teal-900 relative"
      >
        <div className="relative max-w-2xl mx-auto page-shell page-pad pt-16 pb-12">
          <Card className="shadow-2xl border-0 rounded-3xl overflow-hidden backdrop-blur-xl bg-white/95 dark:bg-gray-800/95">
            <CardContent className="p-12 text-center">
              <div className="w-28 h-28 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-2xl">
                <CheckCircle className="w-14 h-14 text-white" />
              </div>

              <h2 className="text-4xl font-black bg-gradient-to-r from-green-600 to-emerald-700 bg-clip-text text-transparent mb-4">
                {t("sale_confirmed") || "Sale Confirmed"}
              </h2>

              <p className="text-gray-600 dark:text-gray-400 text-lg mb-6">
                {t("both_verified") ||
                  "Buyer verification completed. Post moved to Sold."}
              </p>

              <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4 text-left mb-8">
                <p className="text-sm text-green-700 dark:text-green-300 font-semibold">
                  {tr("transaction_id", "Transaction ID")}
                </p>
                <p className="font-mono text-green-900 dark:text-green-100 break-all">
                  {completedSale.transactionId || "-"}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  variant="outline"
                  onClick={resetFlow}
                  className="border-2 border-green-500 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-xl px-8 py-3 font-semibold"
                >
                  {t("confirm_another_sale") || "Confirm Another Sale"}
                </Button>
                <Button
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-xl px-8 py-3 font-semibold shadow-lg"
                  onClick={navigateToMyHome}
                >
                  {t("go_to_my_home") || "Go to My Home"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-slate-900 dark:via-green-900 dark:to-emerald-900 relative nav-clearance"
    >
      <PageHeader
        transparent={true}
        className="text-white"
        title=""
        backTo="/my-home"
      />

      <div className="relative max-w-2xl mx-auto page-shell page-pad pt-6 pb-12 space-y-8">
        <div className="flex gap-2 items-center">
          <button
            type="button"
            onClick={() => navigateBack(navigate, "/my-home")}
            className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>

        <div className="text-center pt-2">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 shadow-2xl shadow-green-500/30 mb-6">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white mb-3">
            {t("sale") || "Sale"}{" "}
            <span className="bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent">
              {t("confirmation") || "Confirmation"}
            </span>
          </h1>
          <p className="text-green-700 dark:text-green-200 text-lg max-w-md mx-auto">
            {tr(
              "sale_complete_desc",
              "Use real transaction ID + OTP to complete sale.",
            )}
          </p>
        </div>

        <TransactionStepper steps={steps} currentStep={3} />

        <div className="flex flex-wrap justify-center gap-3">
          <Badge className="bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20 px-4 py-2 rounded-full">
            <Shield className="w-4 h-4 mr-2" />
            {t("secure_verification") || "Secure Verification"}
          </Badge>
          <Badge className="bg-blue-500/10 text-blue-700 border-blue-500/20 px-4 py-2 rounded-full">
            <Clock className="w-4 h-4 mr-2" />
            {t("24h_validity") || "24h validity"}
          </Badge>
          <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/20 px-4 py-2 rounded-full">
            <CircleDollarSign className="w-4 h-4 mr-2" />
            {t("earn_trust_points") || "Trust rewards"}
          </Badge>
        </div>

        <Card className="shadow-2xl border-0 rounded-3xl overflow-hidden backdrop-blur-xl bg-white/95 dark:bg-gray-800/95">
          <CardHeader className="bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 text-white p-8">
            <CardTitle className="text-2xl">
              {t("dual_verification_process") || "Dual Verification Process"}
            </CardTitle>
            <CardDescription className="text-green-100 text-base mt-2">
              {tr(
                "sale_dual_verification_desc",
                "Seller initiates sale. Buyer confirms with OTP.",
              )}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-8 space-y-6">
            {/* ── Testing Guide ── */}
            <details className="rounded-2xl border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 overflow-hidden">
              <summary className="flex items-center gap-2 cursor-pointer px-4 py-3 text-sm font-semibold text-blue-800 dark:text-blue-200 select-none">
                <Info className="w-4 h-4 shrink-0" />
                {tr("testing_guide_title", "How to test this page — click to expand")}
              </summary>
              <div className="px-4 pb-4 space-y-3 text-sm text-blue-900 dark:text-blue-100">
                <div className="rounded-xl bg-white/60 dark:bg-white/5 border border-blue-100 dark:border-blue-700 p-3 space-y-1">
                  <p className="font-bold">Step 1 — Find your Post ID</p>
                  <p>Go to <strong>My Home</strong> → tap any of your active listings → the URL ends in <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">/post/&#123;post_id&#125;</code>. Copy that number.</p>
                </div>
                <div className="rounded-xl bg-white/60 dark:bg-white/5 border border-blue-100 dark:border-blue-700 p-3 space-y-1">
                  <p className="font-bold">Step 2 — Find the Buyer&apos;s User ID</p>
                  <p>Ask the buyer to open <strong>Profile → Settings → Account Info</strong> and share their User ID. In dev mode you can also check the browser console after login.</p>
                </div>
                <div className="rounded-xl bg-white/60 dark:bg-white/5 border border-blue-100 dark:border-blue-700 p-3 space-y-1">
                  <p className="font-bold">Step 3 — Seller initiates</p>
                  <p>Enter Post ID, Buyer User ID and agreed sale amount, then tap <strong>Initiate Sale</strong>. A Transaction ID and OTP will appear — share both with the buyer.</p>
                </div>
                <div className="rounded-xl bg-white/60 dark:bg-white/5 border border-blue-100 dark:border-blue-700 p-3 space-y-1">
                  <p className="font-bold">Step 4 — Buyer confirms</p>
                  <p>Switch to the <strong>I am the Buyer</strong> tab (or the buyer opens this page). Enter the Transaction ID and OTP, then tap <strong>Confirm Purchase</strong>. The post moves to Sold automatically.</p>
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-300 pt-1">OTPs expire in 24 hours. If expired, seller must re-initiate.</p>
              </div>
            </details>

            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 mb-8 bg-white/80 dark:bg-gray-700/80 rounded-2xl p-1.5 h-14 border border-gray-100 dark:border-gray-700">
                <TabsTrigger
                  value="seller"
                  className="rounded-xl text-base font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white transition-all"
                >
                  {t("im_the_seller") || "I am the Seller"}
                </TabsTrigger>
                <TabsTrigger
                  value="buyer"
                  className="rounded-xl text-base font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white transition-all"
                >
                  {t("im_the_buyer") || "I am the Buyer"}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="seller" className="space-y-6">
                <div className="rounded-2xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4">
                  <p className="text-sm text-green-800 font-medium">
                    {tr(
                      "seller_details_hint",
                      "Enter seller details to create a real pending transaction.",
                    )}
                  </p>
                </div>

                <form onSubmit={handleInitiateSale} className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <Label
                        htmlFor="sellerPostId"
                        className="text-sm font-bold mb-2 block"
                      >
                        {tr("post_id", "Post ID")}
                      </Label>
                      <Input
                        id="sellerPostId"
                        value={sellerForm.postId}
                        onChange={(event) =>
                          setSellerForm((prev) => ({
                            ...prev,
                            postId: event.target.value,
                          }))
                        }
                        placeholder={tr("post_id_example", "e.g., 126")}
                        className="h-12"
                        required
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="sellerBuyerId"
                        className="text-sm font-bold mb-2 block"
                      >
                        {tr("buyer_user_id", "Buyer User ID")}
                      </Label>
                      <Input
                        id="sellerBuyerId"
                        value={sellerForm.buyerId}
                        onChange={(event) =>
                          setSellerForm((prev) => ({
                            ...prev,
                            buyerId: event.target.value,
                          }))
                        }
                        placeholder={tr(
                          "buyer_user_id_placeholder",
                          "Buyer account ID",
                        )}
                        className="h-12"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label
                      htmlFor="sellerAmount"
                      className="text-sm font-bold mb-2 block"
                    >
                      {t("sale_amount") || "Sale Amount"} (INR)
                    </Label>
                    <Input
                      id="sellerAmount"
                      type="number"
                      min="1"
                      value={sellerForm.saleAmount}
                      onChange={(event) =>
                        setSellerForm((prev) => ({
                          ...prev,
                          saleAmount: event.target.value,
                        }))
                      }
                      placeholder={tr("eg_50000", "e.g., 50000")}
                      className="h-12"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isInitiating}
                    className="w-full h-14 text-lg font-bold bg-gradient-to-r from-green-500 to-emerald-600"
                  >
                    {isInitiating
                      ? tr("sale_initiating", "Initiating...")
                      : tr("initiate_sale", "Initiate Sale")}
                  </Button>
                </form>

                {initiatedSale && (
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 space-y-2">
                    <p className="text-sm font-semibold text-blue-800">
                      {tr("transaction_created", "Transaction created")}
                    </p>
                    <p className="text-sm text-blue-700 break-all">
                      {tr("transaction_id", "Transaction ID")}:{" "}
                      <span className="font-mono">
                        {initiatedSale.transactionId}
                      </span>
                    </p>
                    {initiatedSale.secretOTP ? (
                      <p className="text-sm text-blue-700">
                        {tr("otp_to_share_with_buyer", "OTP to share with buyer")}:{" "}
                        <span className="font-mono font-bold">
                          {initiatedSale.secretOTP}
                        </span>
                      </p>
                    ) : (
                      <p className="text-sm text-blue-700">
                        {tr(
                          "otp_sent_to_buyer",
                          "OTP sent to buyer notification channel. Ask buyer to use received OTP.",
                        )}
                      </p>
                    )}
                    {initiatedSale.otpExpiresIn && (
                      <p className="text-xs text-blue-600">
                        {tr("expires_in", "Expires in")}:{" "}
                        {initiatedSale.otpExpiresIn}
                      </p>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="buyer" className="space-y-6">
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                  <p className="text-sm text-blue-800 font-medium">
                    {tr(
                      "buyer_confirm_hint",
                      "Buyer confirms using Transaction ID + OTP from seller.",
                    )}
                  </p>
                </div>

                <form onSubmit={handleConfirmSale} className="space-y-6">
                  <div>
                      <Label
                        htmlFor="buyerTransactionId"
                        className="text-sm font-bold mb-2 block"
                      >
                      {tr("transaction_id", "Transaction ID")}
                      </Label>
                      <Input
                        id="buyerTransactionId"
                        value={buyerForm.transactionId}
                      onChange={(event) =>
                        setBuyerForm((prev) => ({
                          ...prev,
                          transactionId: event.target.value,
                        }))
                      }
                      placeholder={tr(
                        "transaction_id_placeholder",
                        "e.g., ABC123",
                      )}
                      className="h-12"
                      required
                    />
                  </div>

                  <div>
                      <Label
                        htmlFor="buyerOtp"
                        className="text-sm font-bold mb-2 block"
                      >
                      <KeyRound className="w-4 h-4 inline mr-1" />{" "}
                      {tr("otp", "OTP")}
                      </Label>
                      <Input
                        id="buyerOtp"
                        value={buyerForm.otp}
                      onChange={(event) =>
                        setBuyerForm((prev) => ({
                          ...prev,
                          otp: event.target.value,
                        }))
                      }
                      placeholder={tr("enter_otp", "Enter OTP")}
                      className="h-12"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isConfirming}
                    className="w-full h-14 text-lg font-bold bg-gradient-to-r from-blue-500 to-indigo-600"
                  >
                    {isConfirming
                      ? t("confirming") || "Confirming..."
                      : t("confirm_purchase") || "Confirm Purchase"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <Card className="border border-gray-200 dark:border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {tr("pending_sales_title", "Pending sales for your account")}
                </CardTitle>
                <CardDescription>
                  {tr(
                    "pending_sales_desc",
                    "Pick a pending transaction to auto-fill buyer confirmation.",
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingLoading ? (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <RefreshCw className="w-4 h-4 animate-spin" />{" "}
                    {tr("pending_sales_loading", "Loading pending sales...")}
                  </div>
                ) : pendingError ? (
                  <div className="space-y-2">
                    <p className="text-sm text-red-600">{pendingError}</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setRefreshTick((prev) => prev + 1)}
                    >
                      {tr("retry", "Retry")}
                    </Button>
                  </div>
                ) : pendingSales.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {tr("pending_sales_empty", "No pending sales right now.")}
                  </p>
                ) : (
                  pendingSales.map((sale, index) => {
                    const transactionId =
                      sale?.transaction_id ||
                      sale?.transactionId ||
                      sale?.id ||
                      index;
                    return (
                      <div
                        key={transactionId}
                        className="rounded-xl border border-gray-200 p-3 flex items-center justify-between gap-3"
                      >
                        <div>
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 break-all">
                            {sale.post_title ||
                              tr("untitled_post", "Untitled post")}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 break-all font-mono">
                            {transactionId}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setBuyerForm((prev) => ({
                              ...prev,
                              transactionId: String(
                                sale?.transaction_id ||
                                  sale?.transactionId ||
                                  "",
                              ),
                            }));
                            setActiveTab("buyer");
                          }}
                        >
                          {tr("use", "Use")}
                        </Button>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/saleundone")}
              className="w-full"
            >
              {t("sale_undone") || "Sale Undone"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-24 right-6 w-14 h-14 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-all z-50"
        >
          <ArrowUp className="w-6 h-6" />
        </button>
      )}
    </div>
  );
};

export default SaleDone;
