import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertCircle, CheckCircle, Shield } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { isAuthenticated } from "@/utils/authStorage";
import { PageAuthGateState, PageLoadingState } from "@/components/page-state/PageStateBlocks";

const normalizeAadhaar = (value) => String(value || "").replace(/\D/g, "");
const isValidAadhaar = (value) => /^\d{12}$/.test(normalizeAadhaar(value));

const STATUS_META = {
  pending: {
    label: "Not verified",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
  },
  otp_sent: {
    label: "OTP sent",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200",
  },
  verified: {
    label: "Verified",
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200",
  },
};

const AadhaarVerify = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const isAuthed = useMemo(() => isAuthenticated(user), [user]);

  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [otpValue, setOtpValue] = useState("");
  const [txnId, setTxnId] = useState("");
  const [status, setStatus] = useState("pending");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSendOtp = async () => {
    const aadhaarDigits = normalizeAadhaar(aadhaarNumber);
    if (!isValidAadhaar(aadhaarDigits)) {
      toast({
        title: t("invalid_aadhaar") || "Invalid Aadhaar number",
        description:
          t("aadhaar_validation_hint") ||
          "Enter a valid 12-digit Aadhaar number.",
        variant: "destructive",
      });
      return;
    }
    setIsSending(true);
    try {
      const response = await api.post("/aadhaar/send-otp", {
        aadhaar: aadhaarDigits,
      });
      const payload = response?.data ?? response;
      const nextTxnId = payload?.txnId || payload?.txn_id;
      if (!nextTxnId) {
        throw new Error("OTP session missing");
      }
      setTxnId(nextTxnId);
      setStatus("otp_sent");
      toast({
        title: t("success") || "OTP sent",
        description:
          t("aadhaar_otp_sent") ||
          "OTP sent to your Aadhaar-registered mobile.",
      });
    } catch (err) {
      toast({
        title: t("error") || "Error",
        description:
          err?.message ||
          t("otp_send_failed") ||
          "Failed to send OTP. Please retry.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    const aadhaarDigits = normalizeAadhaar(aadhaarNumber);
    if (!txnId) {
      toast({
        title: t("error") || "Error",
        description: t("otp_session_missing") || "Send OTP first.",
        variant: "destructive",
      });
      return;
    }
    if (!otpValue.trim()) {
      toast({
        title: t("error") || "Error",
        description: t("otp_required") || "Enter the OTP to continue.",
        variant: "destructive",
      });
      return;
    }
    setIsVerifying(true);
    try {
      const response = await api.post("/aadhaar/verify-otp", {
        aadhaar: aadhaarDigits,
        otp: otpValue.trim(),
        txnId,
      });
      const payload = response?.data ?? response;
      const verified =
        payload?.verified === true ||
        payload?.success === true ||
        String(payload?.status || "").toLowerCase() === "success";
      if (!verified) {
        throw new Error(payload?.error || "OTP verification failed");
      }
      setStatus("verified");
      toast({
        title: t("success") || "Verified",
        description:
          t("aadhaar_verified_success") ||
          "Your Aadhaar verification is complete.",
      });
    } catch (err) {
      toast({
        title: t("verification_failed") || "Verification failed",
        description:
          err?.message ||
          t("otp_verify_failed") ||
          "OTP verification failed.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const meta = STATUS_META[status] || STATUS_META.pending;

  if (authLoading) {
    return (
      <div className="min-h-screen page-shell page-pad">
        <PageLoadingState
          title={t("loading") || "Loading"}
          description={t("loading_verify") || "Preparing verification flow."}
        />
      </div>
    );
  }

  if (!isAuthed) {
    return (
      <div className="min-h-screen page-shell page-pad">
        <PageAuthGateState
          title={t("login_required") || "Login required"}
          description={
            t("aadhaar_login_required") ||
            "Please sign in to verify your identity."
          }
          primaryAction={
            <Button onClick={() => navigate("/login")}>
              {t("sign_in") || "Sign in"}
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen mhub-premium-page bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900/60 dark:to-slate-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 page-shell page-pad">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Shield className="w-8 h-8 text-emerald-600 dark:text-emerald-300" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {t("aadhaar_verification_title") || "Aadhaar Verification"}
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-300">
            {t("aadhaar_subtitle") ||
              "Verify your Aadhaar to unlock trust badges and safer transactions."}
          </p>
          <div className="mt-4">
            <Badge className={meta.className}>{meta.label}</Badge>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>
              {t("aadhaar_steps_title") || "How verification works"}
            </CardTitle>
            <CardDescription>
              {t("aadhaar_steps_desc") ||
                "Send an OTP to your Aadhaar-linked number and confirm it here."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3 text-sm text-gray-600 dark:text-gray-300">
              <li className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 text-emerald-500" />
                {t("aadhaar_step_one") ||
                  "Enter your 12-digit Aadhaar number and request an OTP."}
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 text-emerald-500" />
                {t("aadhaar_step_two") ||
                  "Confirm the OTP sent to your registered mobile number."}
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 text-emerald-500" />
                {t("aadhaar_step_three") ||
                  "Your profile will be marked as verified once successful."}
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("aadhaar_verify_now") || "Verify now"}</CardTitle>
            <CardDescription>
              {t("aadhaar_verify_desc") ||
                "We never store your Aadhaar number and use it only for verification."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div>
                <Label htmlFor="aadhaarNumber">
                  {t("aadhaar_number") || "Aadhaar number"}
                </Label>
                <Input
                  id="aadhaarNumber"
                  type="text"
                  inputMode="numeric"
                  maxLength={12}
                  value={aadhaarNumber}
                  onChange={(event) => {
                    if (txnId) {
                      setTxnId("");
                      setOtpValue("");
                      setStatus("pending");
                    }
                    setAadhaarNumber(event.target.value);
                  }}
                  placeholder={t("aadhaar_placeholder") || "XXXX XXXX XXXX"}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="aadhaarOtp">{t("aadhaar_otp") || "OTP"}</Label>
                <Input
                  id="aadhaarOtp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpValue}
                  onChange={(event) => setOtpValue(event.target.value)}
                  placeholder={t("enter_otp") || "Enter OTP"}
                  className="mt-2"
                  disabled={!txnId}
                />
                {!txnId && (
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    {t("send_otp_first") || "Send OTP to unlock verification."}
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={isSending || isVerifying}
                  variant="outline"
                >
                  {isSending
                    ? t("sending_otp") || "Sending OTP..."
                    : t("send_otp") || "Send OTP"}
                </Button>
                <Button
                  type="submit"
                  disabled={isVerifying || !txnId}
                >
                  {isVerifying
                    ? t("verifying") || "Verifying..."
                    : t("verify_now") || "Verify now"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AadhaarVerify;
