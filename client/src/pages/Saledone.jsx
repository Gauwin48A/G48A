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
  RefreshCw,
  KeyRound,
  CircleDollarSign,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import PageHeader from "../components/PageHeader";
import TransactionStepper from "../components/TransactionStepper";
import api from "@/services/api";

const SaleDone = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();

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
        label: "Listing Live",
        hint: "Buyer discovers post",
      },
      {
        key: "offer",
        label: "Deal Agreed",
        hint: "Price and terms finalized",
      },
      {
        key: "handover",
        label: "Payment/Handover",
        hint: "Both parties complete exchange",
      },
      {
        key: "confirm",
        label: "Dual Confirmation",
        hint: "Buyer verifies OTP",
      },
      {
        key: "complete",
        label: "Sale Completed",
        hint: "Post moves to Sold",
      },
    ],
    [],
  );

  const toSafeMessage = (error, fallback) => {
    const status = Number(error?.status || error?.response?.status || 0);
    const message = String(error?.message || error?.data?.error || "").toLowerCase();

    if (status === 401 || message.includes("authentication") || message.includes("login")) {
      return "Please sign in again and retry this action.";
    }
    if (status === 403) {
      return "You are not authorized for this sale action.";
    }
    if (status === 404 || message.includes("not found")) {
      return "Record not found. Verify Post ID / Transaction ID and retry.";
    }
    if (message.includes("otp") && message.includes("expired")) {
      return "OTP expired. Seller must initiate a new sale.";
    }
    if (message.includes("schema") || message.includes("missing sale columns")) {
      return "Backend sale schema is incomplete. Please run pending migrations.";
    }
    return error?.message || fallback;
  };

  useEffect(() => {
    const onScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setPendingLoading(true);
      setPendingError("");
      try {
        const response = await api.get("/sale/pending?limit=10");
        const list = Array.isArray(response?.pendingSales) ? response.pendingSales : [];
        if (!cancelled) {
          setPendingSales(list);
        }
      } catch (error) {
        if (!cancelled) {
          setPendingSales([]);
          setPendingError(toSafeMessage(error, "Could not load pending sales."));
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
    const agreedPrice = Number(sellerForm.saleAmount);

    if (!postId || !buyerId || !Number.isFinite(agreedPrice) || agreedPrice <= 0) {
      toast({
        title: "Incomplete details",
        description: "Post ID, Buyer ID and valid sale amount are required.",
        variant: "destructive",
      });
      return;
    }

    setIsInitiating(true);
    try {
      const payload = await api.post("/sale/initiate", {
        postId,
        buyerId,
        agreedPrice,
      });

      const tx = payload?.transaction || {};
      setInitiatedSale(tx);
      setBuyerForm((prev) => ({
        ...prev,
        transactionId: String(tx.transactionId || prev.transactionId || ""),
      }));
      setActiveTab("buyer");
      setRefreshTick((prev) => prev + 1);

      toast({
        title: "Sale Initiated",
        description:
          payload?.instructions ||
          "Transaction created. Share transaction id and OTP with buyer.",
      });
    } catch (error) {
      toast({
        title: "Could not initiate sale",
        description: toSafeMessage(error, "Please try again."),
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
        title: "Missing details",
        description: "Transaction ID and OTP are required.",
        variant: "destructive",
      });
      return;
    }

    setIsConfirming(true);
    try {
      const payload = await api.post("/sale/confirm", { transactionId, otp });
      const tx = payload?.transaction || {};
      const normalizedTransactionId = String(tx.transactionId || tx.transaction_id || transactionId || "");
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
        title: "Sale Confirmed",
        description:
          payload?.message ||
          "Sale completed. Listing is moved to Sold and will show in My Home > Sold.",
      });
    } catch (error) {
      toast({
        title: "Sale confirmation failed",
        description: toSafeMessage(error, "Please verify OTP and retry."),
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
        className="bg-gradient-to-br from-emerald-400 via-green-500 to-teal-600 relative"
        style={{ minHeight: "100vh", paddingBottom: "120px" }}
      >
        <div className="relative max-w-2xl mx-auto p-6 pt-20">
          <Card className="shadow-2xl border-0 rounded-3xl overflow-hidden backdrop-blur-xl bg-white/95 dark:bg-gray-800/95">
            <CardContent className="p-12 text-center">
              <div className="w-28 h-28 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-2xl">
                <CheckCircle className="w-14 h-14 text-white" />
              </div>

              <h2 className="text-4xl font-black bg-gradient-to-r from-green-600 to-emerald-700 bg-clip-text text-transparent mb-4">
                {t("sale_confirmed") || "Sale Confirmed"}
              </h2>

              <p className="text-gray-600 text-lg mb-6">
                {t("both_verified") || "Buyer verification completed. Post moved to Sold."}
              </p>

              <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-left mb-8">
                <p className="text-sm text-green-700 font-semibold">Transaction ID</p>
                <p className="font-mono text-green-900 break-all">
                  {completedSale.transactionId || "-"}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  variant="outline"
                  onClick={resetFlow}
                  className="border-2 border-green-500 text-green-700 hover:bg-green-50 rounded-xl px-8 py-3 font-semibold"
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
      className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-slate-900 dark:via-green-900 dark:to-emerald-900 relative"
      style={{ minHeight: "100vh", paddingBottom: "120px" }}
    >
      <PageHeader transparent={true} backTo="/profile" className="text-white" title="" />

      <div className="relative max-w-lg mx-auto p-4 sm:p-6 space-y-6">
        <div className="text-center pt-4">
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
            {t("complete_dual_verification") ||
              "Use real transaction ID + OTP to complete sale."}
          </p>
        </div>

        <TransactionStepper steps={steps} currentStep={3} />

        <div className="flex flex-wrap justify-center gap-3">
          <Badge className="bg-green-500/10 text-green-700 border-green-500/20 px-4 py-2 rounded-full">
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
              {t("dual_verification_desc") ||
                "Seller initiates sale. Buyer confirms with OTP."}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-8 space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8 bg-gray-100 dark:bg-gray-700 rounded-2xl p-1.5 h-14">
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
                <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
                  <p className="text-sm text-green-800 font-medium">
                    Enter seller details to create a real pending transaction.
                  </p>
                </div>

                <form onSubmit={handleInitiateSale} className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="sellerPostId" className="text-sm font-bold mb-2 block">
                        Post ID
                      </Label>
                      <Input
                        id="sellerPostId"
                        value={sellerForm.postId}
                        onChange={(event) =>
                          setSellerForm((prev) => ({ ...prev, postId: event.target.value }))
                        }
                        placeholder="e.g., 126"
                        className="h-12"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="sellerBuyerId" className="text-sm font-bold mb-2 block">
                        Buyer User ID
                      </Label>
                      <Input
                        id="sellerBuyerId"
                        value={sellerForm.buyerId}
                        onChange={(event) =>
                          setSellerForm((prev) => ({ ...prev, buyerId: event.target.value }))
                        }
                        placeholder="Buyer account ID"
                        className="h-12"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="sellerAmount" className="text-sm font-bold mb-2 block">
                      {t("sale_amount") || "Sale Amount"} (INR)
                    </Label>
                    <Input
                      id="sellerAmount"
                      type="number"
                      min="1"
                      value={sellerForm.saleAmount}
                      onChange={(event) =>
                        setSellerForm((prev) => ({ ...prev, saleAmount: event.target.value }))
                      }
                      placeholder="e.g., 50000"
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
                      ? t("verifying") || "Initiating..."
                      : t("initiate_sale_confirmation") || "Initiate Sale"}
                  </Button>
                </form>

                {initiatedSale && (
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 space-y-2">
                    <p className="text-sm font-semibold text-blue-800">Transaction created</p>
                    <p className="text-sm text-blue-700 break-all">
                      Transaction ID: <span className="font-mono">{initiatedSale.transactionId}</span>
                    </p>
                    {initiatedSale.secretOTP ? (
                      <p className="text-sm text-blue-700">
                        OTP to share with buyer: <span className="font-mono font-bold">{initiatedSale.secretOTP}</span>
                      </p>
                    ) : (
                      <p className="text-sm text-blue-700">
                        OTP sent to buyer notification channel. Ask buyer to use received OTP.
                      </p>
                    )}
                    {initiatedSale.otpExpiresIn && (
                      <p className="text-xs text-blue-600">Expires in: {initiatedSale.otpExpiresIn}</p>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="buyer" className="space-y-6">
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                  <p className="text-sm text-blue-800 font-medium">
                    Buyer confirms using Transaction ID + OTP from seller.
                  </p>
                </div>

                <form onSubmit={handleConfirmSale} className="space-y-6">
                  <div>
                    <Label htmlFor="buyerTransactionId" className="text-sm font-bold mb-2 block">
                      Transaction ID
                    </Label>
                    <Input
                      id="buyerTransactionId"
                      value={buyerForm.transactionId}
                      onChange={(event) =>
                        setBuyerForm((prev) => ({ ...prev, transactionId: event.target.value }))
                      }
                      placeholder="Paste transaction id"
                      className="h-12"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="buyerOtp" className="text-sm font-bold mb-2 block">
                      <KeyRound className="w-4 h-4 inline mr-1" /> OTP
                    </Label>
                    <Input
                      id="buyerOtp"
                      value={buyerForm.otp}
                      onChange={(event) =>
                        setBuyerForm((prev) => ({ ...prev, otp: event.target.value }))
                      }
                      placeholder="Enter OTP"
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
                <CardTitle className="text-base">Pending sales for your account</CardTitle>
                <CardDescription>
                  Pick a pending transaction to auto-fill buyer confirmation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingLoading ? (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <RefreshCw className="w-4 h-4 animate-spin" /> Loading pending sales...
                  </div>
                ) : pendingError ? (
                  <p className="text-sm text-red-600">{pendingError}</p>
                ) : pendingSales.length === 0 ? (
                  <p className="text-sm text-gray-500">No pending sales right now.</p>
                ) : (
                  pendingSales.map((sale) => (
                    <div
                      key={sale.transaction_id}
                      className="rounded-xl border border-gray-200 p-3 flex items-center justify-between gap-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-800 break-all">
                          {sale.post_title || "Untitled post"}
                        </p>
                        <p className="text-xs text-gray-500 break-all font-mono">
                          {sale.transaction_id}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setBuyerForm((prev) => ({
                            ...prev,
                            transactionId: String(sale.transaction_id || ""),
                          }));
                          setActiveTab("buyer");
                        }}
                      >
                        Use
                      </Button>
                    </div>
                  ))
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
