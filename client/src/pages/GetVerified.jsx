import React, { useMemo, useState } from "react";
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
import { Shield, Upload, CheckCircle, AlertCircle, Award } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import api from "@/services/api";
import { useCmsPage } from "@/hooks/useCmsPage";

const normalizeAadhaar = (value) => String(value || "").replace(/\D/g, "");
const isValidAadhaar = (value) => /^\d{12}$/.test(normalizeAadhaar(value));

const GetVerified = () => {
  const { t } = useTranslation();
  const { data: cmsContent } = useCmsPage("get-verified");
  const tr = (key, fallback, options = {}) =>
    t(key, { defaultValue: fallback, ...options });
  const [verificationData, setVerificationData] = useState({
    fullName: "",
    aadhaarNumber: "",
    dateOfBirth: "",
    address: "",
  });
  const [otpValue, setOtpValue] = useState("");
  const [txnId, setTxnId] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState("pending"); // pending, otp_sent, verified
  const { toast } = useToast();

  const iconMap = useMemo(
    () => ({
      shield: Shield,
      award: Award,
      check: CheckCircle,
      upload: Upload,
      alert: AlertCircle,
      verified: CheckCircle,
    }),
    [],
  );

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "aadhaarNumber" && txnId) {
      setTxnId("");
      setOtpValue("");
      setVerificationStatus("pending");
    }
    setVerificationData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSendOtp = async () => {
    const aadhaarDigits = normalizeAadhaar(verificationData.aadhaarNumber);
    if (!isValidAadhaar(aadhaarDigits)) {
      toast({
        title: t("invalid_aadhaar") || t("error"),
        description: t("aadhaar_validation_hint") || "Enter a valid 12-digit Aadhaar number.",
        variant: "destructive",
      });
      return;
    }
    setIsSendingOtp(true);
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
      setVerificationStatus("otp_sent");
      toast({
        title: t("success"),
        description:
          t("aadhaar_otp_sent") ||
          "OTP sent to your Aadhaar-registered mobile.",
      });
    } catch (err) {
      toast({
        title: t("error"),
        description:
          err?.message ||
          t("otp_send_failed") ||
          "Failed to send OTP. Please retry.",
        variant: "destructive",
      });
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const aadhaarDigits = normalizeAadhaar(verificationData.aadhaarNumber);
    if (!txnId) {
      toast({
        title: t("error"),
        description: t("otp_session_missing") || "Send OTP first.",
        variant: "destructive",
      });
      return;
    }
    if (!otpValue.trim()) {
      toast({
        title: t("error"),
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
      setVerificationStatus("verified");
      toast({
        title: t("success"),
        description: t("aadhaar_verified_success"),
      });
    } catch (err) {
      toast({
        title: t("verification_failed") || t("error"),
        description:
          err?.message || t("otp_verify_failed") || "OTP verification failed.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const benefits = useMemo(() => {
    const cmsBenefits = Array.isArray(cmsContent?.benefits)
      ? cmsContent.benefits
      : Array.isArray(cmsContent?.items)
        ? cmsContent.items
        : [];
    if (cmsBenefits.length) {
      return cmsBenefits.map((item, index) => {
        const iconKey = String(item?.icon || item?.iconKey || "")
          .trim()
          .toLowerCase();
        const Icon =
          iconMap[iconKey] ||
          iconMap[item?.key?.toLowerCase?.()] ||
          Shield;
        return {
          icon: Icon,
          title: tr(
            item?.titleKey || item?.labelKey || item?.key || `benefit_${index + 1}`,
            item?.title || item?.label || "",
          ),
          description: tr(
            item?.descriptionKey || item?.descKey || item?.key || `benefit_${index + 1}_desc`,
            item?.description || item?.desc || "",
          ),
        };
      });
    }
    return [
      {
        icon: Shield,
        title: tr("verified", "Verified"),
        description:
          tr("verification_details", "Display verified status on your profile"),
      },
      {
        icon: Award,
        title: tr("rewards", "Rewards"),
        description: tr("points", "Gain buyer and seller confidence"),
      },
      {
        icon: CheckCircle,
        title: tr("top_deals", "Top deals"),
        description:
          tr("personalized_posts", "Your posts appear higher in search"),
      },
      {
        icon: Upload,
        title: tr("rewards", "Rewards"),
        description: tr("points", "Earn bonus points for transactions"),
      },
    ];
  }, [cmsContent, iconMap, tr]);

  const heroTitle = cmsContent?.titleKey
    ? tr(cmsContent.titleKey, cmsContent.titleFallback || tr("get_aadhaar_verified", "Get Aadhaar verified"))
    : tr("get_aadhaar_verified", "Get Aadhaar verified");
  const heroSubtitle = cmsContent?.subtitleKey
    ? tr(cmsContent.subtitleKey, cmsContent.subtitleFallback || tr("aadhaar_subtitle", "Verify your Aadhaar to unlock trust badges and safer transactions."))
    : tr("aadhaar_subtitle", "Verify your Aadhaar to unlock trust badges and safer transactions.");

  return (
    <div className="min-h-screen mhub-premium-page bg-gradient-to-br from-green-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900/60 dark:to-slate-950 p-4 transition-colors duration-300 dark:bg-gradient-to-br">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8 dark:text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-green-950/20">
            <Shield className="w-8 h-8 text-green-600 dark:text-emerald-300 dark:text-green-300" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-2 dark:text-3xl dark:text-gray-100">
            {heroTitle}
          </h1>
          <p className="text-gray-600 dark:text-slate-300 dark:text-gray-200">
            {heroSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Verification Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-green-600 dark:text-emerald-300 dark:text-green-300" />
                <span>{t("aadhaar_verification_title")}</span>
              </CardTitle>
              <CardDescription>{t("aadhaar_upload_desc")}</CardDescription>
            </CardHeader>
            <CardContent>
              {verificationStatus !== "verified" && (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <Label htmlFor="fullName" className="text-gray-700 dark:text-slate-200 dark:text-gray-200">
                      {t("full_name_aadhaar")}
                    </Label>
                    <Input
                      id="fullName"
                      name="fullName"
                      type="text"
                      required
                      value={verificationData.fullName}
                      onChange={handleInputChange}
                      className="mt-1 dark:bg-slate-900/60 dark:border-slate-700 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <Label htmlFor="aadhaarNumber" className="text-gray-700 dark:text-slate-200 dark:text-gray-200">
                      {t("aadhaar_number") || "Aadhaar Number"}
                    </Label>
                    <Input
                      id="aadhaarNumber"
                      name="aadhaarNumber"
                      type="text"
                      inputMode="numeric"
                      required
                      maxLength={12}
                      value={verificationData.aadhaarNumber}
                      onChange={handleInputChange}
                      className="mt-1 dark:bg-slate-900/60 dark:border-slate-700 dark:text-slate-100"
                      placeholder={t("aadhaar_placeholder") || "XXXX XXXX XXXX"}
                    />
                  </div>

                  <div>
                    <Label htmlFor="dateOfBirth" className="text-gray-700 dark:text-slate-200 dark:text-gray-200">
                      {t("date_of_birth")}
                    </Label>
                    <Input
                      id="dateOfBirth"
                      name="dateOfBirth"
                      type="date"
                      required
                      value={verificationData.dateOfBirth}
                      onChange={handleInputChange}
                      className="mt-1 dark:bg-slate-900/60 dark:border-slate-700 dark:text-slate-100"
                    />
                  </div>

                  <div className="border-2 border-dashed border-gray-300 dark:border-slate-700 dark:bg-slate-900/40 rounded-lg p-6 dark:border-2 dark:border-dashed dark:border-gray-600">
                    <div className="text-center dark:text-center">
                      <Upload className="w-12 h-12 text-gray-400 dark:text-slate-400 mx-auto mb-4 dark:text-gray-300" />
                      <Label
                        htmlFor="aadhaarOtp"
                        className="block text-sm font-medium mb-2 text-gray-700 dark:text-slate-200 dark:text-sm dark:text-gray-200"
                      >
                        {t("aadhaar_otp") || "Aadhaar OTP"}
                      </Label>
                      <Input
                        id="aadhaarOtp"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={otpValue}
                        onChange={(event) => setOtpValue(event.target.value)}
                        className="mb-2 dark:bg-slate-900/60 dark:border-slate-700 dark:text-slate-100"
                        placeholder={t("enter_otp") || "Enter OTP"}
                        disabled={!txnId}
                      />
                      <div className="flex flex-col sm:flex-row gap-2 justify-center">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleSendOtp}
                          disabled={isSendingOtp}
                        >
                          {isSendingOtp ? t("sending") || "Sending..." : t("send_otp") || "Send OTP"}
                        </Button>
                        {txnId ? (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleSendOtp}
                            disabled={isSendingOtp}
                          >
                            {t("resend_otp") || "Resend"}
                          </Button>
                        ) : null}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-2 dark:text-xs dark:text-gray-300">
                        {t("otp_sent_hint") || "OTP is sent to your Aadhaar-linked mobile."}
                      </p>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isVerifying || !txnId}
                  >
                    {isVerifying ? t("verifying") || "Verifying..." : t("submit_verification") || "Verify OTP"}
                  </Button>
                </form>
              )}

              {verificationStatus === "verified" && (
                <div className="text-center space-y-4 dark:text-center">
                  <div className="w-16 h-16 bg-green-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center mx-auto dark:bg-green-950/20">
                    <CheckCircle className="w-8 h-8 text-green-600 dark:text-emerald-300 dark:text-green-300" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-green-600 dark:text-emerald-300 dark:text-lg dark:text-green-300">
                      {t("verification_complete")}
                    </h3>
                    <p className="text-gray-600 dark:text-slate-300 dark:text-gray-200">{t("aadhaar_success_msg")}</p>
                  </div>
                  <Badge className="bg-green-600 dark:bg-emerald-500/20 dark:text-emerald-100 dark:bg-green-700/40">
                    <Shield className="w-3 h-3 mr-1" />
                    Aadhaar Verified
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Benefits Section */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("verification_benefits")}</CardTitle>
                <CardDescription>{t("why_get_verified")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {benefits.map((benefit, index) => {
                    const Icon = benefit.icon;
                    return (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-sky-900/40 rounded-full flex items-center justify-center flex-shrink-0 dark:bg-blue-950/20">
                          <Icon className="w-4 h-4 text-blue-600 dark:text-sky-300 dark:text-blue-300" />
                        </div>
                        <div>
                          <h3 className="font-medium">{benefit.title}</h3>
                          <p className="text-sm text-gray-600 dark:text-slate-300 dark:text-sm dark:text-gray-200">
                            {benefit.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-400/30 dark:bg-amber-950/20 dark:border-amber-600/40">
              <CardContent className="pt-6">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-300 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-amber-800 dark:text-amber-200">
                      {t("privacy_security")}
                    </h3>
                    <p className="text-sm text-amber-700 dark:text-amber-200 mt-1 dark:text-sm dark:text-amber-300">
                      {t("privacy_desc")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GetVerified;

