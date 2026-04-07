import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Shield,
  Phone,
  Lock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  KeyRound,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";

const verhoeffTableD = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const verhoeffTableP = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

const normalizeAadhaar = (value) => String(value || "").replace(/\s+/g, "");

const isValidAadhaarNumber = (value) => {
  const digits = normalizeAadhaar(value).replace(/\D/g, "");
  if (!/^\d{12}$/.test(digits)) return false;
  let c = 0;
  for (let i = 0; i < digits.length; i += 1) {
    const digit = Number(digits[digits.length - 1 - i]);
    c = verhoeffTableD[c][verhoeffTableP[i % 8][digit]];
  }
  return c === 0;
};

const normalizeMobile = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (/^91[6-9]\d{9}$/.test(digits)) return digits.slice(2);
  return digits;
};
const isValidMobile = (value) => /^[6-9]\d{9}$/.test(normalizeMobile(value));

const normalizePan = (value) =>
  String(value || "").trim().toUpperCase().replace(/\s+/g, "");
const isValidPan = (value) => /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(normalizePan(value));
const maskPan = (value) => {
  const normalized = normalizePan(value);
  if (!normalized) return "";
  return `XXXXX${normalized.slice(-4)}`;
};

export default function SignUp() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { refreshAuth, setUser } = useAuth();
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    aadhaar: "",
    mobile: "",
    otp: "",
    pan: "",
    password: "",
    confirmPassword: "",
    referralCode: "",
  });
  const [panVerified, setPanVerified] = useState(false);
  const [panMasked, setPanMasked] = useState("");
  const [txnId, setTxnId] = useState("");
  const [signupToken, setSignupToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const timer = setInterval(() => setResendIn((t) => Math.max(0, t - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendIn]);

  const referralParam = useMemo(() => {
    const raw =
      searchParams.get("ref") ||
      searchParams.get("referral") ||
      searchParams.get("referralCode") ||
      searchParams.get("code") ||
      "";
    return String(raw || "").trim();
  }, [searchParams]);

  useEffect(() => {
    if (!referralParam) return;
    setForm((prev) =>
      prev.referralCode
        ? prev
        : { ...prev, referralCode: referralParam },
    );
  }, [referralParam]);

  const aadhaarStatus = useMemo(() => {
    if (!form.aadhaar) return null;
    return isValidAadhaarNumber(form.aadhaar) ? "valid" : "invalid";
  }, [form.aadhaar]);

  const mobileStatus = useMemo(() => {
    if (!form.mobile) return null;
    return isValidMobile(form.mobile) ? "valid" : "invalid";
  }, [form.mobile]);

  const panStatus = useMemo(() => {
    if (!form.pan) return null;
    return isValidPan(form.pan) ? "valid" : "invalid";
  }, [form.pan]);

  const passwordStrength = useMemo(() => {
    const pw = form.password;
    if (!pw) return { score: 0, label: "", color: "" };
    let score = 0;
    if (pw.length >= 8) score += 1;
    if (pw.length >= 12) score += 1;
    if (/[A-Z]/.test(pw)) score += 1;
    if (/[a-z]/.test(pw)) score += 1;
    if (/\d/.test(pw)) score += 1;
    if (/[^A-Za-z0-9]/.test(pw)) score += 1;

    if (score <= 2) return { score: 1, label: t("weak") || "Weak", color: "bg-red-500" };
    if (score <= 4) return { score: 2, label: t("medium") || "Medium", color: "bg-yellow-500" };
    return { score: 3, label: t("strong") || "Strong", color: "bg-green-500" };
  }, [form.password, t]);

  const applyAuthResponse = async (response) => {
    if (response?.token) {
      localStorage.setItem("authToken", response.token);
      localStorage.removeItem("token");
      localStorage.setItem("authSession", "true");
    }
    if (response?.user) {
      setUser(response.user);
    } else if (response?.token) {
      await refreshAuth();
    }
  };

  const handleSendOtp = async () => {
    setErrorMessage("");
    const aadhaarDigits = normalizeAadhaar(form.aadhaar);
    const mobileDigits = normalizeMobile(form.mobile);

    if (!isValidAadhaarNumber(aadhaarDigits) || !isValidMobile(mobileDigits)) {
      const msg =
        t("aadhaar_mobile_required") ||
        "Enter a valid Aadhaar number and Aadhaar-registered mobile number.";
      setErrorMessage(msg);
      toast({
        title: t("validation_error") || "Validation Error",
        description: msg,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/auth/aadhaar/send-otp", {
        aadhaarNumber: aadhaarDigits,
        mobileNumber: mobileDigits,
      });
      setTxnId(response?.txnId || "");
      setResendIn(30);
      setStep(2);
      toast({
        title: t("otp_sent") || "OTP Sent",
        description:
          t("aadhaar_otp_sent") || "OTP sent to your Aadhaar-registered mobile.",
      });
    } catch (err) {
      const msg = err?.message || t("otp_send_failed") || "Failed to send OTP.";
      setErrorMessage(msg);
      toast({ title: t("error") || "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setErrorMessage("");
    const otpValue = String(form.otp || "").trim();
    if (!/^\d{4,8}$/.test(otpValue)) {
      const msg = t("otp_valid_desc") || "Please enter a valid OTP.";
      setErrorMessage(msg);
      toast({ title: t("invalid_otp") || "Invalid OTP", description: msg, variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const response = await api.post("/auth/aadhaar/verify-otp", {
        aadhaarNumber: normalizeAadhaar(form.aadhaar),
        mobileNumber: normalizeMobile(form.mobile),
        otp: otpValue,
        txnId,
      });
      setSignupToken(response?.signupToken || "");
      setForm((p) => ({ ...p, pan: "" }));
      setPanVerified(false);
      setPanMasked("");
      setStep(3);
      toast({
        title: t("otp_verified") || "OTP Verified",
        description: t("pan_verification") || "Verify your PAN to finish setup.",
      });
    } catch (err) {
      const msg = err?.message || t("otp_verify_failed") || "OTP verification failed.";
      setErrorMessage(msg);
      toast({ title: t("error") || "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPan = async () => {
    setErrorMessage("");
    const panValue = normalizePan(form.pan);
    if (!isValidPan(panValue)) {
      const msg = t("pan_invalid") || "Please enter a valid PAN number.";
      setErrorMessage(msg);
      toast({ title: t("validation_error") || "Validation Error", description: msg, variant: "destructive" });
      return;
    }
    if (!signupToken) {
      const msg = t("signup_session_expired") || "Signup session expired. Please verify Aadhaar again.";
      setErrorMessage(msg);
      toast({ title: t("error") || "Error", description: msg, variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const response = await api.post("/auth/pan/verify", {
        signupToken,
        panNumber: panValue,
      });
      const normalizedPan =
        response?.panNumber || response?.pan_number || panValue;
      const maskedPan =
        response?.panMasked || response?.pan_masked || maskPan(normalizedPan);
      setForm((p) => ({ ...p, pan: normalizedPan }));
      setPanMasked(maskedPan);
      setPanVerified(true);
      setStep(4);
      toast({
        title: t("pan_verified") || "PAN Verified",
        description: t("create_password") || "Create your password to finish setup.",
      });
    } catch (err) {
      const msg = err?.message || t("pan_verification_failed") || "PAN verification failed.";
      setErrorMessage(msg);
      toast({ title: t("error") || "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteSignup = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!panVerified) {
      const msg =
        t("pan_verification_required") ||
        "Please verify your PAN number before continuing.";
      setErrorMessage(msg);
      toast({ title: t("error") || "Error", description: msg, variant: "destructive" });
      return;
    }
    if (!form.password || !form.confirmPassword) {
      const msg = t("fill_all_fields") || "Please fill in all fields.";
      setErrorMessage(msg);
      toast({ title: t("error") || "Error", description: msg, variant: "destructive" });
      return;
    }
    if (form.password !== form.confirmPassword) {
      const msg = t("passwords_do_not_match") || "Passwords do not match.";
      setErrorMessage(msg);
      toast({ title: t("error") || "Error", description: msg, variant: "destructive" });
      return;
    }
    if (!/\d/.test(form.password) || !/[^A-Za-z0-9]/.test(form.password) || form.password.length < 12) {
      const msg =
        t("password_policy") ||
        "Password must be 12+ characters with at least 1 number and 1 special character.";
      setErrorMessage(msg);
      toast({ title: t("weak_password") || "Weak Password", description: msg, variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        signupToken,
        password: form.password,
        confirmPassword: form.confirmPassword,
        panNumber: normalizePan(form.pan),
      };
      const referralCode = String(form.referralCode || "").trim();
      if (referralCode) {
        payload.referralCode = referralCode;
      }
      const response = await api.post("/auth/aadhaar/complete-signup", payload);
      await applyAuthResponse(response);
      toast({
        title: t("welcome_to_mhub") || "Welcome to MHub!",
        description: t("account_created_success") || "Account created successfully.",
      });
      navigate("/all-posts", { replace: true });
    } catch (err) {
      const msg = err?.message || t("signup_failed") || "Signup failed.";
      setErrorMessage(msg);
      toast({ title: t("signup_failed") || "Signup Failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const FieldStatus = ({ status }) => {
    if (status === "valid") return <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-300" />;
    if (status === "invalid") return <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-300" />;
    return null;
  };

  return (
    <div className="min-h-screen mhub-premium-page flex items-center justify-center py-8 px-4 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-950 dark:via-purple-950/30 dark:to-gray-900 relative overflow-hidden transition-colors duration-300 dark:bg-gradient-to-br">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300/30 dark:bg-purple-500/20 rounded-full blur-3xl animate-pulse dark:bg-purple-900/30" />
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-300/30 dark:bg-indigo-500/20 rounded-full blur-3xl animate-pulse dark:bg-indigo-900/30"
          style={{ animationDelay: "1s" }}
        />
      </div>

      <div className="w-full max-w-md relative z-10 space-y-6">
        <button
          type="button"
          onClick={() => step > 1 ? setStep((s) => s - 1) : navigate(-1)}
          className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors dark:text-gray-300"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/></svg>
          {step > 1 ? (t("back") || "Back") : (t("back") || "Back")}
        </button>
        <div className="text-center dark:text-center">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/25 dark:bg-gradient-to-br">
              <Sparkles className="h-7 w-7 sm:h-8 sm:w-8 text-white dark:text-white" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1 dark:text-gray-100">
            {t("create_account") || "Create Account"}
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 dark:text-gray-200">
            {t("aadhaar_signup_hint") || "Register with your Aadhaar and PAN details"}
          </p>
        </div>

        <div className="flex justify-center gap-6">
          {[
            { n: 1, label: t("aadhaar_verification") || "Verify Aadhaar" },
            { n: 2, label: t("otp_verification") || "Enter OTP" },
            { n: 3, label: t("pan_verification") || "Verify PAN" },
            { n: 4, label: t("create_password") || "Set Password" },
          ].map(({ n, label }) => (
            <div key={n} className="flex flex-col items-center gap-1">
              <div
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  step >= n ? "bg-purple-500 scale-110" : "bg-gray-300 dark:bg-gray-600"
                }`}
              />
              <span className={`text-[10px] font-medium ${step >= n ? "text-purple-600 dark:text-purple-400" : "text-gray-400 dark:text-gray-500"}`}>
                {label}
              </span>
            </div>
          ))}
        </div>

        <Card className="shadow-xl border-0 rounded-2xl sm:rounded-3xl overflow-hidden mhub-premium-surface backdrop-blur-sm dark:border-0">
          <CardHeader className="text-center py-6 sm:py-8 bg-gradient-to-r from-indigo-600 to-purple-600 dark:text-center dark:bg-gradient-to-r">
            <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 rounded-2xl bg-white/20 flex items-center justify-center dark:bg-slate-900/20">
              {step === 4 ? (
                <KeyRound className="w-7 h-7 sm:w-8 sm:h-8 text-white dark:text-white" />
              ) : (
                <Shield className="w-7 h-7 sm:w-8 sm:h-8 text-white dark:text-white" />
              )}
            </div>
            <CardTitle className="text-xl sm:text-2xl text-white font-bold dark:text-white">
              {step === 1
                ? t("aadhaar_verification") || "Aadhaar Verification"
                : step === 2
                  ? t("otp_verification") || "OTP Verification"
                  : step === 3
                    ? t("pan_verification") || "PAN Verification"
                    : t("create_password") || "Create Password"}
            </CardTitle>
            <CardDescription className="text-purple-100 text-sm dark:text-purple-200">
              {step === 1
                ? t("enter_aadhaar_details") || "Enter your Aadhaar details to continue"
                : step === 2
                  ? t("enter_otp_received") || "Enter the OTP sent to your Aadhaar-registered mobile"
                  : step === 3
                    ? t("pan_verification_hint") || "Verify your PAN to continue"
                    : t("set_secure_password") || "Set a strong password for your account"}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 sm:p-8">
            {errorMessage && (
              <div className="rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 p-3 text-sm text-amber-800 dark:text-amber-200 flex items-start gap-2 mb-4 dark:border dark:border-amber-600/40 dark:bg-amber-950/20">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block dark:text-gray-200">
                    {t("aadhaar_number") || "Aadhaar Number"}
                  </Label>
                  <div className="relative">
                    <Input
                      type="text"
                      inputMode="numeric"
                      maxLength={12}
                      value={form.aadhaar}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, aadhaar: e.target.value }))
                      }
                      className="h-11 sm:h-12 border-2 border-gray-200 dark:border-gray-600 focus:border-purple-500 dark:bg-gray-700 dark:text-white rounded-xl pr-10 dark:border-2 dark:border-gray-700 dark:focus:border-purple-500/40"
                      placeholder={t("aadhaar_placeholder") || "Enter your 12-digit Aadhaar number"}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <FieldStatus status={aadhaarStatus} />
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-300">
                    {t("aadhaar_validation_hint") || "We validate Aadhaar in real time."}{" "}
                    <Link to="/privacy-policy" className="underline text-purple-500 hover:text-purple-700 dark:text-purple-300 dark:hover:text-purple-300">
                      {t("privacy_policy") || "Privacy Policy"}
                    </Link>
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block dark:text-gray-200">
                    {t("aadhaar_mobile") || "Aadhaar Registered Mobile"}
                  </Label>
                  <div className="relative flex">
                    <span className="inline-flex items-center px-3 bg-gray-100 dark:bg-gray-600 border-2 border-r-0 border-gray-200 dark:border-gray-600 rounded-l-xl text-gray-500 dark:text-gray-300 text-sm dark:bg-gray-950 dark:border-2 dark:border-r-0 dark:border-gray-700">
                      +91
                    </span>
                    <Input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={form.mobile}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, mobile: e.target.value }))
                      }
                      className="h-11 sm:h-12 border-2 border-gray-200 dark:border-gray-600 focus:border-purple-500 dark:bg-gray-700 dark:text-white rounded-l-none rounded-r-xl pr-10 dark:border-2 dark:border-gray-700 dark:focus:border-purple-500/40"
                      placeholder="9876543210"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <FieldStatus status={mobileStatus} />
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading}
                  className="w-full h-11 sm:h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/25 disabled:opacity-50 transition-all flex items-center justify-center gap-2 dark:bg-gradient-to-r dark:text-white"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      {t("send_otp") || "Send OTP"} <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block dark:text-gray-200">
                    {t("enter_otp") || "Enter OTP"}
                  </Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={form.otp}
                    onChange={(e) => setForm((p) => ({ ...p, otp: e.target.value }))}
                    className="h-11 sm:h-12 border-2 border-gray-200 dark:border-gray-600 focus:border-purple-500 dark:bg-gray-700 dark:text-white rounded-xl text-center text-lg tracking-widest dark:border-2 dark:border-gray-700 dark:focus:border-purple-500/40 dark:text-center"
                    placeholder="123456"
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <Button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={loading}
                    className="w-full h-11 sm:h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl dark:bg-gradient-to-r dark:text-white"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t("verifying") || "Verifying..."}
                      </span>
                    ) : (
                      t("verify_otp") || "Verify OTP"
                    )}
                  </Button>
                  <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 dark:text-gray-300">
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={resendIn > 0 || loading}
                      onClick={handleSendOtp}
                      className="text-indigo-600 dark:text-indigo-400 dark:text-indigo-300"
                    >
                      {resendIn > 0
                        ? `${t("resend_in") || "Resend in"} ${resendIn}s`
                        : t("resend_otp") || "Resend OTP"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setStep(1)}
                      className="text-gray-500 dark:text-gray-300"
                    >
                      <ArrowLeft className="w-4 h-4 mr-1" /> {t("back") || "Back"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block dark:text-gray-200">
                    {t("pan_number") || "PAN Number"}
                  </Label>
                  <div className="relative">
                    <Input
                      type="text"
                      maxLength={10}
                      value={form.pan}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, pan: normalizePan(e.target.value) }))
                      }
                      className="h-11 sm:h-12 border-2 border-gray-200 dark:border-gray-600 focus:border-purple-500 dark:bg-gray-700 dark:text-white rounded-xl pr-10 dark:border-2 dark:border-gray-700 dark:focus:border-purple-500/40"
                      placeholder={t("pan_placeholder") || "ABCDE1234F"}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <FieldStatus status={panStatus} />
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-300">
                    {t("pan_verification_hint") || "We verify PAN in real time."}
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(2)}
                    className="flex-1 h-11 sm:h-12 rounded-xl dark:border-gray-600 dark:text-gray-200"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" /> {t("back") || "Back"}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleVerifyPan}
                    disabled={loading}
                    className="flex-1 h-11 sm:h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/25 dark:bg-gradient-to-r dark:text-white"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      t("verify_pan") || "Verify PAN"
                    )}
                  </Button>
                </div>
              </div>
            )}

            {step === 4 && (
              <form onSubmit={handleCompleteSignup} className="space-y-5">
                {panVerified ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
                    {t("pan_verified") || "PAN verified"}
                    {panMasked ? ` - ${panMasked}` : ""}
                  </div>
                ) : null}
                <div>
                  <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block dark:text-gray-200">
                    <Lock className="w-4 h-4 inline-block mr-1" /> {t("password") || "Password"}
                  </Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    className="h-11 sm:h-12 border-2 border-gray-200 dark:border-gray-600 focus:border-purple-500 dark:bg-gray-700 dark:text-white rounded-xl dark:border-2 dark:border-gray-700 dark:focus:border-purple-500/40"
                    placeholder={t("create_password_placeholder") || "Create a strong password"}
                  />
                  {form.password && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {[1, 2, 3].map((level) => (
                          <div
                            key={level}
                            className={`h-1 flex-1 rounded-full transition-all ${
                              passwordStrength.score >= level
                                ? passwordStrength.color
                                : "bg-gray-200 dark:bg-gray-600"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-300">
                        {t("password_strength") || "Password strength"}: {" "}
                        <span
                          className={`font-medium ${
                            passwordStrength.score === 3
                              ? "text-green-500"
                              : passwordStrength.score === 2
                                ? "text-yellow-500"
                                : "text-red-500"
                          }`}
                        >
                          {passwordStrength.label}
                        </span>
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block dark:text-gray-200">
                    {t("confirm_new_password_label") || "Confirm Password"}
                  </Label>
                  <Input
                    type="password"
                    value={form.confirmPassword}
                    onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                    className="h-11 sm:h-12 border-2 border-gray-200 dark:border-gray-600 focus:border-purple-500 dark:bg-gray-700 dark:text-white rounded-xl dark:border-2 dark:border-gray-700 dark:focus:border-purple-500/40"
                    placeholder={t("confirm_password_placeholder") || "Re-enter your password"}
                  />
                </div>

                <div>
                  <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block dark:text-gray-200">
                    {t("referral_code_optional") || "Referral Code (optional)"}
                  </Label>
                  <Input
                    type="text"
                    value={form.referralCode}
                    onChange={(e) => setForm((p) => ({ ...p, referralCode: e.target.value }))}
                    className="h-11 sm:h-12 border-2 border-gray-200 dark:border-gray-600 focus:border-purple-500 dark:bg-gray-700 dark:text-white rounded-xl dark:border-2 dark:border-gray-700 dark:focus:border-purple-500/40"
                    placeholder={t("enter_referral_code") || "Enter referral code"}
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-300">
                    {t("referral_code_hint") || "Paste a referral code to credit your referrer."}
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl text-xs border border-gray-200 dark:border-gray-600 dark:bg-gray-950 dark:border dark:border-gray-700">
                  <p className="font-semibold mb-2 text-gray-700 dark:text-gray-300 dark:text-gray-200">
                    {t("password_requirements") || "Password Requirements"}
                  </p>
                  <ul className="space-y-1 text-gray-600 dark:text-gray-400 dark:text-gray-200">
                    <li>- {t("req_min_chars") || "At least 8 characters"}</li>
                    <li>- {t("req_number") || "One number"}</li>
                    <li>- {t("req_special") || "One special character"}</li>
                  </ul>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(3)}
                    className="flex-1 h-11 sm:h-12 rounded-xl dark:border-gray-600 dark:text-gray-200"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" /> {t("back") || "Back"}
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 h-11 sm:h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/25 dark:bg-gradient-to-r dark:text-white"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      t("create_account") || "Create Account"
                    )}
                  </Button>
                </div>
              </form>
            )}

            <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-6 dark:text-center dark:text-gray-200">
              {t("already_have_account") || "Already have an account?"}{" "}
              <Link to="/login" className="text-purple-600 dark:text-purple-400 hover:underline font-medium dark:text-purple-300">
                {t("sign_in") || "Sign In"}
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

