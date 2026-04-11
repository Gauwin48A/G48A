import React, { useState, useEffect, useCallback, useRef } from "react";
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
import { useNavigate, Link, useLocation as useRouterLocation } from "react-router-dom";
import {
  Shield,
  Phone,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Smartphone,
} from "lucide-react";
import { getDeviceId } from "@/utils/device";
import { useLocation as useLocationContext } from "@/context/LocationContext";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";

const INVALID_LOGIN_MESSAGE_FALLBACK =
  "Invalid mobile number or password. Please try again.";

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const routeLocation = useRouterLocation();
  const { toast } = useToast();
  const { login, refreshAuth } = useAuth();
  const {
    requestLocation,
    latitude,
    longitude,
    accuracy,
    provider,
  } = useLocationContext();

  useEffect(() => { document.title = "MHub — Sign In"; return () => { document.title = "MHub"; }; }, []);

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ mobile: "", password: "" });
  const [showOtpChallenge, setShowOtpChallenge] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const otpTimerRef = useRef(null);
  const otpAbortRef = useRef(null);

  // ── Web OTP API auto-read ─────────────────────────────────
  const startWebOtpAutoRead = useCallback(() => {
    if (!("OTPCredential" in window)) return;
    otpAbortRef.current?.abort();
    otpAbortRef.current = new AbortController();
    navigator.credentials
      .get({ otp: { transport: ["sms"] }, signal: otpAbortRef.current.signal })
      .then((cred) => {
        if (cred?.code && cred.code.length >= 4) {
          setOtpCode(cred.code);
          // Auto-submit by clicking the form submit button after a brief delay
          setTimeout(() => {
            const submitBtn = document.querySelector('form button[type="submit"]');
            if (submitBtn && !submitBtn.disabled) submitBtn.click();
          }, 300);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    return () => {
      otpAbortRef.current?.abort();
      if (otpTimerRef.current) clearInterval(otpTimerRef.current);
    };
  }, []);

  // ── OTP countdown timer ──────────────────────────────────
  const startOtpCountdown = useCallback((seconds = 120) => {
    setOtpCountdown(seconds);
    if (otpTimerRef.current) clearInterval(otpTimerRef.current);
    otpTimerRef.current = setInterval(() => {
      setOtpCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(otpTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // ── Auto-send OTP when SIM verification required ─────────
  const sendSimVerificationOtp = useCallback(async (mobile) => {
    if (otpSending) return;
    try {
      setOtpSending(true);
      const normalizedMobile = normalizeMobile(mobile);
      await api.post("/auth/send-otp", {
        phone: normalizedMobile,
        purpose: "sim_verification",
        deviceId: getDeviceId(),
      });
      startOtpCountdown(120);
      startWebOtpAutoRead();
      toast({
        title: t("otp_sent") || "OTP Sent",
        description: t("otp_sent_to_mobile") || `Verification code sent to ****${normalizedMobile.slice(-4)}`,
      });
    } catch (err) {
      const msg = err?.response?.data?.error || "Failed to send OTP. Please try again.";
      toast({ title: "OTP Error", description: msg, variant: "destructive" });
    } finally {
      setOtpSending(false);
    }
  }, [otpSending, startOtpCountdown, startWebOtpAutoRead, t, toast]);

  const extractError = (err) => ({
    status: err?.status ?? err?.response?.status ?? null,
    data: err?.data ?? err?.response?.data ?? {},
    message: err?.message || err?.response?.data?.error || err?.response?.data?.message || "",
  });

  const normalizeMobile = (value) => {
    const digits = String(value || "").replace(/\D/g, "");
    if (/^91[6-9]\d{9}$/.test(digits)) return digits.slice(2);
    return digits;
  };
  const isValidMobile = (value) => /^[6-9]\d{9}$/.test(normalizeMobile(value));

  const friendlyError = (parsed, fallback) => {
    const s = parsed?.status;
    const msg = String(
      parsed?.data?.error || parsed?.data?.message || parsed?.message || "",
    ).toLowerCase();
    const code = String(parsed?.data?.code || parsed?.code || "").toUpperCase();

    // Security restriction errors — use generic messages to avoid leaking internal logic
    const DEVICE_RESTRICTION_CODES = [
      "DEVICE_ALREADY_BOUND", "DEVICE_PREVIOUSLY_BOUND", "ACCOUNT_SWITCHING_BLOCKED",
      "MULTI_ACCOUNT_DETECTED", "MAX_DEVICES_EXCEEDED", "DEVICE_FINGERPRINT_REQUIRED",
      "DEVICE_FINGERPRINT_INVALID", "PHONE_DEVICE_MISMATCH",
    ];
    if (DEVICE_RESTRICTION_CODES.includes(code))
      return "This device cannot be used for this account. Contact support for assistance.";
    if (code === "DEVICE_BLOCKED")
      return "Access restricted. Contact support for assistance.";
    if (code === "LOGIN_COOLDOWN")
      return "Please wait a moment before trying again.";
    if (code === "VPN_BLOCKED" || code === "TIMEZONE_MISMATCH" || code === "PROXY_HEADER_DETECTED")
      return "Network security check failed. Please disable VPN/proxy and try again.";
    if (msg.includes("device") && msg.includes("another account"))
      return "This device cannot be used for this account. Contact support.";

    if (s === 429 || msg.includes("too many") || msg.includes("rate limit") || code.includes("ABUSE"))
      return "Too many sign-in attempts. Please wait a few minutes.";
    if (s === 423 || msg.includes("locked"))
      return "Your account is temporarily locked. Use Forgot Password or retry later.";
    if (s === 401 || s === 403 || msg.includes("invalid")) return t("invalid_login") || INVALID_LOGIN_MESSAGE_FALLBACK;
    if (msg.includes("network") || msg.includes("fetch") || msg.includes("timeout"))
      return "Login service unreachable. Please retry shortly.";
    return fallback || t("login_failed") || "Login failed";
  };

  const getReturnPath = () => {
    const params = new URLSearchParams(routeLocation.search).get("returnTo");
    const path = routeLocation.state?.returnTo || params || "/all-posts";
    return typeof path === "string" && path.startsWith("/") ? path : "/all-posts";
  };

  const captureLoginLocation = async () => {
    try {
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        return {
          lat: latitude,
          lng: longitude,
          accuracy: accuracy ?? null,
          provider: provider || "browser_gps",
        };
      }

      const loc = await Promise.race([
        requestLocation({ silent: true }),
        new Promise((resolve) => setTimeout(() => resolve(null), 8000)),
      ]);
      if (!loc) return null;
      return {
        lat: loc.latitude ?? loc.lat,
        lng: loc.longitude ?? loc.lng,
        accuracy: loc.accuracy ?? null,
        provider: loc.provider || "browser_gps",
      };
    } catch {
      return null;
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!isValidMobile(form.mobile) || !form.password) {
      const msg =
        t("mobile_password_required") ||
        "Mobile number and password are required.";
      setErrorMessage(msg);
      toast({
        title: t("validation_error") || "Validation Error",
        description: msg,
        variant: "destructive",
      });
      return;
    }
    if (showOtpChallenge && (!otpCode || otpCode.length < 4)) {
      const msg = t("enter_authenticator_code") || "Please enter your authenticator code.";
      setErrorMessage(msg);
      toast({ title: "OTP Required", description: msg, variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const loc = await captureLoginLocation();
      const deviceId = getDeviceId();
      if (!deviceId || typeof deviceId !== "string" || deviceId.length < 10) {
        setErrorMessage("Unable to identify your device. Please refresh the page and try again.");
        toast({ title: "Device Error", description: "Device identification failed.", variant: "destructive" });
        setLoading(false);
        return;
      }
      const mobileDigits = normalizeMobile(form.mobile);
      const body = {
        identifier: mobileDigits,
        password: form.password,
        deviceId,
      };
      if (loc?.lat != null && loc?.lng != null) {
        body.lat = loc.lat;
        body.lng = loc.lng;
        body.locationAccuracy = loc.accuracy;
        body.locationProvider = loc.provider;
      }
      if (showOtpChallenge) body.otp = otpCode;

      const result = await login(body);

      if (result?.requireOtp) {
        setShowOtpChallenge(true);
        const isSim = result?.code === "SIM_VERIFICATION_REQUIRED" || result?._triggerOtpSend;
        const msg = isSim
          ? "Verify your phone number. An OTP will be sent to your registered mobile."
          : result.message || "Additional verification required.";
        setErrorMessage(msg);

        // Auto-send OTP for SIM verification (WhatsApp-style)
        if (isSim) {
          sendSimVerificationOtp(form.mobile);
          toast({ title: "SIM Verification", description: "OTP is being sent to your registered mobile number." });
        } else {
          toast({ title: "Security Check", description: msg });
        }
        return;
      }

      if (result?.success) {
        await refreshAuth();
        setShowOtpChallenge(false);
        setOtpCode("");
        requestLocation({ silent: true }).catch(() => {});
        toast({
          title: t("login_successful") || "Login Successful",
          description: t("welcome_back_msg") || "Welcome back!",
          variant: "success",
          duration: 2500,
        });
        setErrorMessage("");
        navigate(getReturnPath(), { replace: true });
        return;
      }

      const msg = result?.error || t("invalid_login") || INVALID_LOGIN_MESSAGE_FALLBACK;
      setErrorMessage(msg);
      toast({ title: "Sign-in Failed", description: msg, variant: "destructive" });
    } catch (err) {
      const parsed = extractError(err);
      const msg = friendlyError(parsed, t("invalid_login") || INVALID_LOGIN_MESSAGE_FALLBACK);
      setErrorMessage(msg);
      toast({ title: "Sign-in Failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen mhub-premium-page flex items-center justify-center bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800 px-4 py-8 sm:py-12 transition-colors duration-300 dark:bg-gradient-to-br">
      <div className="w-full max-w-md space-y-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors dark:text-gray-300"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/></svg>
          {t("back") || "Back"}
        </button>
        <div className="text-center dark:text-center">
          <div className="flex justify-center mb-5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-r from-sky-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 dark:bg-gradient-to-r">
              <Shield className="h-7 w-7 sm:h-8 sm:w-8 text-white dark:text-white" />
            </div>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1 dark:text-gray-100">
            {t("welcome_back") || "Welcome Back"}
          </h2>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 dark:text-gray-200">
            {t("sign_in_to_account") || "Sign in with your mobile number"}
          </p>
        </div>

        <Card className="shadow-xl border-0 rounded-2xl sm:rounded-3xl overflow-hidden mhub-premium-surface backdrop-blur-sm dark:border-0">
          <CardHeader className="bg-gradient-to-r from-sky-500 to-blue-600 text-white text-center py-5 sm:py-6 dark:bg-gradient-to-r dark:text-white dark:text-center">
            <CardTitle className="text-xl sm:text-2xl font-bold">
              {t("sign_in") || "Sign In"}
            </CardTitle>
            <CardDescription className="text-sky-100 text-sm dark:text-sky-200">
              {t("mobile_login_hint") || "Use your Aadhaar-registered mobile number"}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 sm:p-8">
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <Label htmlFor="mobile" className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 dark:text-gray-200">
                  <Phone className="w-4 h-4" /> {t("mobile_number") || "Mobile Number"}
                </Label>
                <div className="relative mt-2 flex">
                  <span className="inline-flex items-center px-3 bg-gray-100 dark:bg-gray-600 border-2 border-r-0 border-gray-200 dark:border-gray-600 rounded-l-xl text-gray-500 dark:text-gray-300 text-sm dark:bg-gray-950 dark:border-2 dark:border-r-0 dark:border-gray-700">
                    +91
                  </span>
                  <Input
                    id="mobile"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={form.mobile}
                    onChange={(e) => setForm((p) => ({ ...p, mobile: e.target.value }))}
                    className="h-11 sm:h-12 border-2 border-gray-200 dark:border-gray-600 focus:border-sky-500 dark:bg-gray-700 dark:text-white rounded-l-none rounded-r-xl dark:border-2 dark:border-gray-700 dark:focus:border-sky-500/40"
                    placeholder="9876543210"
                  />
                </div>
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-300">
                  {t("mobile_login_help") || "Enter the mobile number linked to your Aadhaar."}
                </p>
              </div>

              <div>
                <Label htmlFor="password" className="text-sm font-semibold text-gray-700 dark:text-gray-300 dark:text-gray-200">
                  {t("password") || "Password"}
                </Label>
                <div className="relative mt-2">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={form.password}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    className="h-11 sm:h-12 border-2 border-gray-200 dark:border-gray-600 focus:border-sky-500 dark:bg-gray-700 dark:text-white rounded-xl pr-12 dark:border-2 dark:border-gray-700 dark:focus:border-sky-500/40"
                    placeholder={t("password_placeholder") || "Enter your password"}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 dark:text-gray-300"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <p className="text-gray-600 dark:text-gray-400 dark:text-gray-200">
                  {t("dont_have_account") || "Don't have an account?"}{" "}
                  <span
                    className="text-blue-600 dark:text-blue-400 cursor-pointer hover:underline font-medium dark:text-blue-300"
                    onClick={() => navigate("/signup")}
                  >
                    {t("sign_up_here") || "Sign up here"}
                  </span>
                </p>
                <Link
                  to="/forgot-password"
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium whitespace-nowrap ml-2 dark:text-blue-300"
                >
                  {t("forgot_password") || "Forgot?"}
                </Link>
              </div>

              {errorMessage && (
                <div className="rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 p-3 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2 dark:border dark:border-amber-600/40 dark:bg-amber-950/20">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {showOtpChallenge && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 dark:text-gray-200">
                    <Smartphone className="w-4 h-4 text-orange-500 dark:text-orange-300" />
                    {t("sim_verification") || "Phone Verification"}
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-xl p-3 text-xs text-orange-700 dark:text-orange-300 dark:bg-orange-950/20 dark:border dark:border-orange-600/40">
                    <p>Enter the 6-digit code sent to your registered mobile number. This verifies your SIM is in this device.</p>
                  </div>
                  <Input
                    id="challenge-otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                    className="h-12 sm:h-14 border-2 border-orange-300 focus:border-orange-500 dark:bg-gray-700 dark:text-white rounded-xl text-center text-2xl tracking-[0.3em] font-mono bg-orange-50 dark:bg-orange-900/20 dark:border-2 dark:border-orange-600/40 dark:focus:border-orange-500/40 dark:text-center dark:bg-orange-950/20"
                    placeholder="● ● ● ● ● ●"
                    maxLength={6}
                    autoFocus
                  />
                  <div className="flex items-center justify-between text-xs">
                    {otpCountdown > 0 ? (
                      <span className="text-gray-500 dark:text-gray-400 dark:text-gray-300">
                        Resend in {Math.floor(otpCountdown / 60)}:{String(otpCountdown % 60).padStart(2, "0")}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => sendSimVerificationOtp(form.mobile)}
                        disabled={otpSending}
                        className="text-blue-600 dark:text-blue-400 hover:underline font-medium disabled:opacity-50 dark:text-blue-300"
                      >
                        {otpSending ? "Sending..." : "Resend OTP"}
                      </button>
                    )}
                    <span className="text-gray-400 dark:text-gray-500 dark:text-gray-300">
                      ****{normalizeMobile(form.mobile).slice(-4)}
                    </span>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className={`w-full h-11 sm:h-12 rounded-xl text-base sm:text-lg font-semibold transition-all ${
                  showOtpChallenge
                    ? "bg-orange-500 hover:bg-orange-600"
                    : "bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700"
                }`}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t("verifying") || "Verifying..."}
                  </span>
                ) : showOtpChallenge ? (
                  t("verify_login") || "Verify Login"
                ) : (
                  t("sign_in") || "Sign In"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
