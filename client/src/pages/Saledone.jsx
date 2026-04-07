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
  Copy,
  Check as CheckIcon,
  Star,
  Home,
  TrendingUp,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { navigateBack } from "@/utils/navigation";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import TransactionStepper from "../components/TransactionStepper";
import LanguageSelector from "@/components/LanguageSelector";
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
  const [copied, setCopied] = useState(false);

  const copyTransactionId = (id) => {
    if (!id) return;
    navigator.clipboard.writeText(id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  const formatCurrency = (value, currency = "INR") => {
    if (value === null || value === undefined || value === "") return "-";
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "-";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const buildReceiptText = (sale) => {
    if (!sale?.receipt) return "";
    const receipt = sale.receipt;
    const item = sale.item || {};
    const buyer = sale.buyer || {};
    return [
      `Receipt ID: ${receipt.receiptId || receipt.transactionId || "-"}`,
      `Transaction ID: ${receipt.transactionId || sale.transactionId || "-"}`,
      `Amount: ${formatCurrency(receipt.amount, receipt.currency || "INR")}`,
      `Completed At: ${receipt.completedAt || sale.completedAt || "—"}`,
      `Item: ${item.title || "-"}`,
      `Buyer: ${buyer.name || buyer.username || "-"}`,
    ].join("\n");
  };

  const handleDownloadReceipt = (sale) => {
    const text = buildReceiptText(sale);
    if (!text) return;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `receipt-${sale?.receipt?.receiptId || sale?.transactionId || "sale"}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleShareReceipt = async (sale) => {
    const text = buildReceiptText(sale);
    if (!text) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Sale Receipt",
          text,
        });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        toast({
          title: tr("receipt_copied", "Receipt copied"),
          description: tr("receipt_copied_desc", "Receipt details copied."),
        });
      }
    } catch {
      // ignore share failures
    }
  };

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
  const [pendingError, setPendingError] = useState(null);
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
      setPendingError(null);
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
          setPendingError(error);
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

  const pendingErrorMessage = pendingError
    ? toSafeMessage(
        pendingError,
        tr("pending_sales_load_failed", "Could not load pending sales."),
      )
    : "";

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
      const payloadData = payload?.data ?? payload ?? {};
      const tx =
        payloadData?.transaction ||
        payloadData?.data?.transaction ||
        payload ||
        {};
      const normalizedTransactionId = String(
        tx.transactionId || tx.transaction_id || transactionId || "",
      );
      const postStatus = String(
        payloadData?.postStatus || tx.postStatus || tx.post_status || "",
      ).toLowerCase();
      const completedAt =
        tx.completedAt ||
        tx.completed_at ||
        payloadData?.receipt?.completedAt ||
        new Date().toISOString();
      const normalizedTx = {
        ...tx,
        transactionId: normalizedTransactionId,
        status: tx.status || "completed",
        completedAt,
        agreedPrice:
          tx.agreedPrice ||
          tx.agreed_price ||
          payloadData?.transaction?.agreedPrice ||
          payloadData?.receipt?.amount ||
          null,
        postStatus,
      };

      const completion = {
        ...normalizedTx,
        item: payloadData?.item || null,
        buyer: payloadData?.buyer || null,
        seller: payloadData?.seller || null,
        rewards: payloadData?.rewards || null,
        receipt: payloadData?.receipt || null,
      };

      setCompletedSale(completion);
      if (postStatus && postStatus !== "sold") {
        toast({
          title: tr(
            "sale_post_status_not_verified",
            "Listing status could not be verified as Sold yet.",
          ),
          description: tr(
            "sale_post_status_pending_desc",
            "We will refresh the listing status shortly.",
          ),
        });
      }
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

  const saleItem = completedSale?.item || null;
  const saleBuyer = completedSale?.buyer || null;
  const saleSeller = completedSale?.seller || null;
  const saleRewards = completedSale?.rewards || null;
  const saleReceipt = completedSale?.receipt || null;

  if (completedSale) {
    return (
      <div className="mhub-page-saledone min-h-screen mhub-premium-page mhub-page-pad-bottom bg-gradient-to-br from-emerald-400 via-green-500 to-teal-600 dark:from-[#0b1220] dark:via-[#102a29] dark:to-[#0b1220] relative overflow-hidden dark:bg-gradient-to-br">
        {/* Celebration blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse dark:bg-slate-900/10" />
          <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-yellow-300/10 rounded-full blur-3xl animate-pulse dark:bg-yellow-900/10" style={{ animationDelay: "0.8s" }} />
          <div className="absolute top-1/3 right-0 w-48 h-48 bg-white/5 rounded-full blur-2xl animate-pulse dark:bg-slate-900/5" style={{ animationDelay: "1.4s" }} />
        </div>
        <div className="relative max-w-3xl mx-auto page-shell page-pad pt-10 pb-12">
          <Card className="mhub-premium-surface rounded-3xl overflow-hidden">
            <CardContent className="p-8 sm:p-10 text-center dark:text-center">
              {/* Animated success icon */}
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-20 dark:bg-green-800/30" />
                <div className="relative w-28 h-28 mx-auto rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-2xl dark:bg-gradient-to-br">
                  <CheckCircle className="w-14 h-14 text-white dark:text-white" />
                </div>
              </div>

              <div className="text-4xl mb-2">??</div>
              <h2 className="text-4xl font-black bg-gradient-to-r from-green-600 to-emerald-700 bg-clip-text text-transparent mb-3 dark:bg-gradient-to-r dark:bg-clip-text dark:text-transparent">
                {t("sale_confirmed") || "Sale Confirmed!"}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-lg mb-6 dark:text-gray-200">
                {t("both_verified") || "Buyer verification completed. Post moved to Sold."}
              </p>

              {/* Transaction ID with copy button */}
              <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4 text-left mb-6 dark:border dark:border-green-600/40 dark:bg-green-950/20 dark:text-left">
                <p className="text-xs font-semibold text-green-700 dark:text-green-300 uppercase tracking-wide mb-1">
                  {tr("transaction_id", "Transaction ID")}
                </p>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-green-900 dark:text-green-100 break-all text-sm flex-1 dark:text-green-200">
                    {completedSale.transactionId || "-"}
                  </p>
                  {completedSale.transactionId && (
                    <button
                      type="button"
                      onClick={() => copyTransactionId(completedSale.transactionId)}
                      className="flex-shrink-0 p-2 rounded-lg bg-green-100 dark:bg-green-800 hover:bg-green-200 dark:hover:bg-green-700 transition-colors dark:bg-green-950/20 dark:hover:bg-green-900/20"
                      title="Copy transaction ID"
                    >
                      {copied ? <CheckIcon className="w-4 h-4 text-green-600 dark:text-green-300" /> : <Copy className="w-4 h-4 text-green-600 dark:text-green-300" />}
                    </button>
                  )}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 mb-6 text-left dark:text-left">
                <div className="rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-white/80 dark:bg-gray-900/40 p-4 dark:border dark:border-emerald-600/40 dark:bg-slate-900/80">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300 mb-1">
                    {tr("listing_status", "Listing Status")}
                  </p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white dark:text-slate-100">
                    {(completedSale.postStatus || "sold").toUpperCase()}
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-white/80 dark:bg-gray-900/40 p-4 dark:border dark:border-emerald-600/40 dark:bg-slate-900/80">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300 mb-1">
                    {tr("completed_at", "Completed At")}
                  </p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white dark:text-slate-100">
                    {completedSale.completedAt
                      ? new Date(completedSale.completedAt).toLocaleString()
                      : "Just now"}
                  </p>
                </div>
              </div>

              {(saleItem || saleBuyer) && (
                <div className="grid gap-4 sm:grid-cols-2 mb-6 text-left dark:text-left">
                  <div className="rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-white/90 dark:bg-slate-900/70 p-4 dark:border dark:border-emerald-600/40">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300 mb-2">
                      {tr("sold_item", "Sold Item")}
                    </p>
                    {saleItem ? (
                      <div className="flex gap-4">
                        {saleItem.image_url && (
                          <img
                            src={saleItem.image_url}
                            alt={saleItem.title}
                            className="w-20 h-20 rounded-xl object-cover shadow-sm"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {saleItem.title}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-300 mt-1">
                            {saleItem.category_name || tr("category", "Category")}
                            {saleItem.subcategory_name ? ` • ${saleItem.subcategory_name}` : ""}
                          </p>
                          <p className="text-sm text-slate-900 dark:text-slate-100 mt-1">
                            {tr("agreed_price", "Agreed")}: {formatCurrency(saleItem.agreed_price || completedSale.agreedPrice)}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-300">
                            {tr("listing_price", "Listing")}: {formatCurrency(saleItem.price)}
                          </p>
                          {saleItem.location && (
                            <p className="text-xs text-slate-500 dark:text-slate-300">
                              {saleItem.location}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 dark:text-slate-300">
                        {tr("sale_item_unavailable", "Item details unavailable.")}
                      </p>
                    )}
                    {saleItem?.post_id && (
                      <div className="mt-3">
                        <Button
                          type="button"
                          onClick={() => navigate(`/post/${saleItem.post_id}`)}
                          className="h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                        >
                          {tr("view_sold_item", "View Sold Item")}
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-white/90 dark:bg-slate-900/70 p-4 dark:border dark:border-emerald-600/40">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300 mb-2">
                      {tr("buyer_details", "Buyer")}
                    </p>
                    {saleBuyer ? (
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center overflow-hidden">
                          {saleBuyer.avatar_url ? (
                            <img
                              src={saleBuyer.avatar_url}
                              alt={saleBuyer.name || saleBuyer.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
                              {(saleBuyer.name || saleBuyer.username || "B").slice(0, 1)}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {saleBuyer.name || saleBuyer.username}
                          </p>
                          {saleBuyer.username && (
                            <p className="text-xs text-slate-500 dark:text-slate-300">
                              @{saleBuyer.username}
                            </p>
                          )}
                          {saleBuyer.id && (
                            <p className="text-xs text-slate-400 dark:text-slate-400 break-all">
                              {tr("buyer_id", "Buyer ID")}: {saleBuyer.id}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 dark:text-slate-300">
                        {tr("buyer_unavailable", "Buyer details unavailable.")}
                      </p>
                    )}
                    {saleBuyer?.id && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => navigate(`/profile/${saleBuyer.id}`)}
                          className="h-9 rounded-xl text-xs font-semibold"
                        >
                          {tr("view_buyer", "View Buyer")}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => navigate(`/chat?user=${saleBuyer.id}`)}
                          className="h-9 rounded-xl text-xs font-semibold"
                        >
                          {tr("message_buyer", "Message Buyer")}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {saleRewards && (
                <div className="rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-white/90 dark:bg-slate-900/70 p-4 mb-6 text-left dark:text-left">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300 mb-3">
                    {tr("rewards_summary", "Rewards Summary")}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/30 p-3">
                      <p className="text-xs text-emerald-700 dark:text-emerald-300">
                        {tr("seller_points", "Seller Points")}
                      </p>
                      <p className="text-lg font-bold text-emerald-800 dark:text-emerald-200">
                        {saleRewards.sellerPoints || 0}
                      </p>
                    </div>
                    <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/30 p-3">
                      <p className="text-xs text-emerald-700 dark:text-emerald-300">
                        {tr("buyer_points", "Buyer Points")}
                      </p>
                      <p className="text-lg font-bold text-emerald-800 dark:text-emerald-200">
                        {saleRewards.buyerPoints || 0}
                      </p>
                    </div>
                    <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/30 p-3">
                      <p className="text-xs text-emerald-700 dark:text-emerald-300">
                        {tr("bonus_points", "Bonus Points")}
                      </p>
                      <p className="text-lg font-bold text-emerald-800 dark:text-emerald-200">
                        {saleRewards.bonusPoints || 0}
                      </p>
                    </div>
                    <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/30 p-3">
                      <p className="text-xs text-emerald-700 dark:text-emerald-300">
                        {tr("referral_points", "Referral Points")}
                      </p>
                      <p className="text-lg font-bold text-emerald-800 dark:text-emerald-200">
                        {(saleRewards.referralPoints || 0) + (saleRewards.chainPoints || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {saleReceipt && (
                <div className="rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-white/90 dark:bg-slate-900/70 p-4 mb-6 text-left dark:text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                        {tr("receipt", "Receipt")}
                      </p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white break-all">
                        {saleReceipt.receiptId || saleReceipt.transactionId || completedSale.transactionId}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-300">
                        {tr("amount", "Amount")}: {formatCurrency(saleReceipt.amount, saleReceipt.currency || "INR")}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-300">
                        {tr("completed_at", "Completed At")}: {saleReceipt.completedAt || completedSale.completedAt}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => copyTransactionId(saleReceipt.receiptId || saleReceipt.transactionId)}
                        className="h-9 rounded-xl text-xs font-semibold"
                      >
                        <Copy className="w-3.5 h-3.5 mr-1.5" />
                        {tr("copy_receipt", "Copy")}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleDownloadReceipt(completedSale)}
                        className="h-9 rounded-xl text-xs font-semibold"
                      >
                        {tr("download_receipt", "Download")}
                      </Button>
                      <Button
                        type="button"
                        onClick={() => handleShareReceipt(completedSale)}
                        className="h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                      >
                        {tr("share_receipt", "Share")}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Next steps */}
              <div className="rounded-xl border border-emerald-100 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4 text-left mb-8 dark:border dark:border-emerald-600/40 dark:bg-emerald-950/20 dark:text-left">
                <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200 mb-3">
                  {tr("next_steps", "What's next?")}
                </p>
                <div className="space-y-2">
                  {[
                    { icon: Home, text: tr("next_view_sold", "View your post in My Home ? Sold tab") },
                    { icon: Star, text: tr("next_leave_review", "Leave a review for the buyer") },
                    { icon: TrendingUp, text: tr("next_list_more", "List more items to grow your sales") },
                  ].map(({ icon: Icon, text }, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span>{text}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  variant="outline"
                  onClick={resetFlow}
                  className="border-2 border-green-500 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-xl px-8 py-3 font-semibold dark:border-2 dark:border-green-500/40 dark:hover:bg-green-950/20"
                >
                  {t("confirm_another_sale") || "Confirm Another Sale"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    navigate("/feedback", {
                      state: {
                        transactionId: completedSale.transactionId,
                        postId: saleItem?.post_id || null,
                        buyerId: saleBuyer?.id || null,
                      },
                    })
                  }
                  className="border-2 border-emerald-500 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl px-8 py-3 font-semibold dark:border-2 dark:border-emerald-500/40 dark:hover:bg-emerald-950/20"
                >
                  <Star className="w-4 h-4 mr-2" />
                  {tr("leave_feedback", "Leave Feedback")}
                </Button>
                <Button
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-xl px-8 py-3 font-semibold shadow-lg dark:bg-gradient-to-r"
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
      className="mhub-page-saledone min-h-screen mhub-premium-page mhub-page-pad-bottom relative nav-clearance bg-gradient-to-b from-slate-50 via-emerald-50 to-white dark:from-slate-950 dark:via-emerald-950/40 dark:to-slate-950 dark:bg-gradient-to-b"
    >
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 profile-hero-bg" />
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fillRule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fillOpacity=\'0.1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          }}
        />
        <div className="relative max-w-3xl mx-auto px-4 py-5 sm:px-6 sm:py-6 page-shell page-pad">
          <div className="mb-2 max-w-3xl text-left dark:text-left mhub-hero-card min-h-[132px] sm:min-h-[150px] rounded-2xl px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex flex-wrap items-center justify-between gap-4 min-h-[34px]">
              <button
                type="button"
                onClick={() => navigateBack(navigate, "/my-home")}
                className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/20 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_8px_18px_rgba(15,23,42,0.18)] hover:bg-white/30 transition"
                aria-label={tr("back", "Back")}
              >
                <ArrowLeft className="w-4 h-4" />
                {tr("back", "Back")}
              </button>
              <LanguageSelector compact className="shrink-0" />
            </div>
            <p className="text-[clamp(9px,0.95vw,11px)] font-semibold uppercase tracking-[0.2em] text-white/70 mb-1 dark:text-white/70">
              {tr("sale_verification_label", "Sale verification")}
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center dark:bg-slate-900/15">
                <CheckCircle className="w-5 h-5 text-white dark:text-white" />
              </div>
              <h1 className="text-[clamp(20px,2.1vw,28px)] leading-[1.1] font-bold text-white dark:text-white">
                {t("sale") || "Sale"} {t("confirmation") || "Confirmation"}
              </h1>
            </div>
            <p className="text-[clamp(12px,1.3vw,16px)] leading-[1.5] text-white/80 mt-1 dark:text-white/80">
              {tr(
                "sale_complete_desc",
                "Use real transaction ID + OTP to complete sale.",
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="relative max-w-3xl mx-auto page-shell page-pad pt-5 pb-10 space-y-6">
        <div className="profile-panel rounded-2xl p-4 sm:p-5 space-y-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 mb-1 dark:text-slate-300">
              {tr("sale_progress_label", "Sale progress")}
            </p>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white dark:text-slate-100">
              {tr("sale_progress_title", "Complete the verification")}
            </h2>
          </div>
          <TransactionStepper steps={steps} currentStep={3} />
          <div className="flex flex-wrap gap-3">
            <Badge className="bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20 px-4 py-2 rounded-full dark:bg-green-800/10 dark:border-green-500/20">
              <Shield className="w-4 h-4 mr-2" />
              {t("secure_verification") || "Secure Verification"}
            </Badge>
            <Badge className="bg-blue-500/10 text-blue-700 border-blue-500/20 px-4 py-2 rounded-full dark:bg-blue-800/10 dark:text-blue-300 dark:border-blue-500/20">
              <Clock className="w-4 h-4 mr-2" />
              {t("24h_validity") || "24h validity"}
            </Badge>
            <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/20 px-4 py-2 rounded-full dark:bg-amber-800/10 dark:text-amber-300 dark:border-amber-500/20">
              <CircleDollarSign className="w-4 h-4 mr-2" />
              {t("earn_trust_points") || "Trust rewards"}
            </Badge>
          </div>
        </div>

        <Card className="profile-panel rounded-3xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 text-white p-6 dark:bg-gradient-to-r dark:text-white">
            <CardTitle className="text-2xl">
              {t("dual_verification_process") || "Dual Verification Process"}
            </CardTitle>
            <CardDescription className="text-green-100 text-base mt-2 dark:text-green-200">
              {tr(
                "sale_dual_verification_desc",
                "Seller initiates sale. Buyer confirms with OTP.",
              )}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-5">
            {/* -- Testing Guide -- */}
            <details className="rounded-2xl border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 overflow-hidden dark:border dark:border-blue-600/40 dark:bg-blue-950/20">
              <summary className="flex items-center gap-2 cursor-pointer px-4 py-3 text-sm font-semibold text-blue-800 dark:text-blue-200 select-none">
                <Info className="w-4 h-4 shrink-0" />
                {tr(
                  "testing_guide_title",
                  "How to test this page — click to expand",
                )}
              </summary>
              <div className="px-4 pb-4 space-y-3 text-sm text-blue-900 dark:text-blue-100 dark:text-blue-200">
                <div className="rounded-xl bg-white/60 dark:bg-white/5 border border-blue-100 dark:border-blue-700 p-3 space-y-1 dark:bg-slate-900/60 dark:border dark:border-blue-600/40">
                  <p className="font-bold">
                    {tr("sale_test_step1_title", "Step 1 — Find your Post ID")}
                  </p>
                  <p>
                    {tr("sale_test_step1_prefix", "Go to")}{" "}
                    <strong>{tr("my_home", "My Home")}</strong>{" "}
                    {tr(
                      "sale_test_step1_middle",
                      "? tap any of your active listings ? the URL ends in",
                    )}{" "}
                    <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded dark:bg-blue-950/20">
                      /post/&#123;post_id&#125;
                    </code>
                    . {tr("sale_test_step1_suffix", "Copy that number.")}
                  </p>
                </div>
                <div className="rounded-xl bg-white/60 dark:bg-white/5 border border-blue-100 dark:border-blue-700 p-3 space-y-1 dark:bg-slate-900/60 dark:border dark:border-blue-600/40">
                  <p className="font-bold">
                    {tr(
                      "sale_test_step2_title",
                      "Step 2 — Find the Buyer's User ID",
                    )}
                  </p>
                  <p>
                    {tr("sale_test_step2_prefix", "Ask the buyer to open")}{" "}
                    <strong>
                      {tr(
                        "profile_settings_account_info",
                        "Profile ? Settings ? Account Info",
                      )}
                    </strong>{" "}
                    {tr(
                      "sale_test_step2_suffix",
                      "and share their User ID. In dev mode you can also check the browser console after login.",
                    )}
                  </p>
                </div>
                <div className="rounded-xl bg-white/60 dark:bg-white/5 border border-blue-100 dark:border-blue-700 p-3 space-y-1 dark:bg-slate-900/60 dark:border dark:border-blue-600/40">
                  <p className="font-bold">
                    {tr("sale_test_step3_title", "Step 3 — Seller initiates")}
                  </p>
                  <p>
                    {tr(
                      "sale_test_step3_prefix",
                      "Enter Post ID, Buyer User ID and agreed sale amount, then tap",
                    )}{" "}
                    <strong>{tr("initiate_sale", "Initiate Sale")}</strong>.{" "}
                    {tr(
                      "sale_test_step3_suffix",
                      "A Transaction ID and OTP will appear — share both with the buyer.",
                    )}
                  </p>
                </div>
                <div className="rounded-xl bg-white/60 dark:bg-white/5 border border-blue-100 dark:border-blue-700 p-3 space-y-1 dark:bg-slate-900/60 dark:border dark:border-blue-600/40">
                  <p className="font-bold">
                    {tr("sale_test_step4_title", "Step 4 — Buyer confirms")}
                  </p>
                  <p>
                    {tr(
                      "sale_test_step4_prefix",
                      "Switch to the",
                    )}{" "}
                    <strong>{tr("im_the_buyer", "I am the Buyer")}</strong>{" "}
                    {tr(
                      "sale_test_step4_middle",
                      "tab (or the buyer opens this page). Enter the Transaction ID and OTP, then tap",
                    )}{" "}
                    <strong>
                      {tr("confirm_purchase", "Confirm Purchase")}
                    </strong>
                    .{" "}
                    {tr(
                      "sale_test_step4_suffix",
                      "The post moves to Sold automatically.",
                    )}
                  </p>
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-300 pt-1">
                  {tr(
                    "sale_test_otp_expiry",
                    "OTPs expire in 24 hours. If expired, seller must re-initiate.",
                  )}
                </p>
              </div>
            </details>

            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="rewards-tab-bar grid w-full grid-cols-2 mb-6 bg-white/80 dark:bg-slate-900/70 rounded-2xl p-1.5 h-12 border border-slate-200/70 dark:border-slate-800/60 dark:bg-slate-900/80 dark:border dark:border-slate-700/70">
                <TabsTrigger
                  value="seller"
                  className="rewards-tab-btn rounded-xl text-sm sm:text-base font-semibold text-slate-600 dark:text-slate-300 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all dark:text-slate-200 dark:data-[state=active]:bg-emerald-700/40 dark:data-[state=active]:text-white"
                >
                  {t("im_the_seller") || "I am the Seller"}
                </TabsTrigger>
                <TabsTrigger
                  value="buyer"
                  className="rewards-tab-btn rounded-xl text-sm sm:text-base font-semibold text-slate-600 dark:text-slate-300 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all dark:text-slate-200 dark:data-[state=active]:bg-blue-700/40 dark:data-[state=active]:text-white"
                >
                  {t("im_the_buyer") || "I am the Buyer"}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="seller" className="space-y-6">
                <div className="rounded-2xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4 dark:border dark:border-green-600/40 dark:bg-green-950/20">
                  <p className="text-sm text-green-800 font-medium dark:text-green-200">
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
                    className="w-full h-14 text-lg font-bold bg-gradient-to-r from-green-500 to-emerald-600 dark:bg-gradient-to-r"
                  >
                    {isInitiating
                      ? tr("sale_initiating", "Initiating...")
                      : tr("initiate_sale", "Initiate Sale")}
                  </Button>
                </form>

                {initiatedSale && (
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 space-y-2 dark:border dark:border-blue-600/40 dark:bg-blue-950/20">
                    <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                      {tr("transaction_created", "Transaction created")}
                    </p>
                    <p className="text-sm text-blue-700 break-all dark:text-blue-300">
                      {tr("transaction_id", "Transaction ID")}:{" "}
                      <span className="font-mono">
                        {initiatedSale.transactionId}
                      </span>
                    </p>
                    {initiatedSale.secretOTP ? (
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        {tr("otp_to_share_with_buyer", "OTP to share with buyer")}:{" "}
                        <span className="font-mono font-bold">
                          {initiatedSale.secretOTP}
                        </span>
                      </p>
                    ) : (
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        {tr(
                          "otp_sent_to_buyer",
                          "OTP sent to buyer notification channel. Ask buyer to use received OTP.",
                        )}
                      </p>
                    )}
                    {initiatedSale.otpExpiresIn && (
                      <p className="text-xs text-blue-600 dark:text-blue-300">
                        {tr("expires_in", "Expires in")}:{" "}
                        {initiatedSale.otpExpiresIn}
                      </p>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="buyer" className="space-y-6">
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border dark:border-blue-600/40 dark:bg-blue-950/20">
                  <p className="text-sm text-blue-800 font-medium dark:text-blue-200">
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
                    className="w-full h-14 text-lg font-bold bg-gradient-to-r from-blue-500 to-indigo-600 dark:bg-gradient-to-r"
                  >
                    {isConfirming
                      ? t("confirming") || "Confirming..."
                      : t("confirm_purchase") || "Confirm Purchase"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <Card className="border border-gray-200 dark:border-gray-700 dark:border">
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
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-200">
                    <RefreshCw className="w-4 h-4 animate-spin" />{" "}
                    {tr("pending_sales_loading", "Loading pending sales...")}
                  </div>
                ) : pendingErrorMessage ? (
                  <div className="space-y-2">
                    <p className="text-sm text-red-600 dark:text-red-300">
                      {pendingErrorMessage}
                    </p>
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
                  <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-300">
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
                        className="rounded-xl border border-gray-200 p-3 flex items-center justify-between gap-3 dark:border dark:border-gray-700"
                      >
                        <div>
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 break-all dark:text-gray-100">
                            {sale.post_title ||
                              tr("untitled_post", "Untitled post")}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 break-all font-mono dark:text-gray-300">
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
          className="fixed bottom-24 right-6 w-14 h-14 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-all z-50 dark:bg-gradient-to-r dark:text-white"
        >
          <ArrowUp className="w-6 h-6" />
        </button>
      )}
    </div>
  );
};

export default SaleDone;
