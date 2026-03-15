import React, { useState } from "react";
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
import { useNavigate, Link, useLocation } from "react-router-dom";
import {
  Shield,
  Phone,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { getDeviceId } from "@/utils/device";
import {
  getBestAvailableLocation,
  captureLocation,
} from "@/services/locationService";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";

const INVALID_LOGIN_MESSAGE =
  "Invalid mobile number or password. Please try again.";

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const { toast } = useToast();
  const { login, refreshAuth } = useAuth();

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ mobile: "", password: "" });
  const [showOtpChallenge, setShowOtpChallenge] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

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

    if (s === 429 || msg.includes("too many") || msg.includes("rate limit"))
      return "Too many sign-in attempts. Please wait a few minutes.";
    if (s === 423 || msg.includes("locked"))
      return "Your account is temporarily locked. Use Forgot Password or retry later.";
    if (s === 401 || msg.includes("invalid")) return INVALID_LOGIN_MESSAGE;
    if (msg.includes("network") || msg.includes("fetch") || msg.includes("timeout"))
      return "Login service unreachable. Please retry shortly.";
    return fallback || parsed?.data?.error || t("login_failed") || "Login failed";
  };

  const getUserId = (user) => {
    const id = user?.id ?? user?.user_id;
    return id != null && id !== "" ? String(id) : null;
  };

  const getReturnPath = () => {
    const params = new URLSearchParams(routeLocation.search).get("returnTo");
    const path = routeLocation.state?.returnTo || params || "/all-posts";
    return typeof path === "string" && path.startsWith("/") ? path : "/all-posts";
  };

  const captureLoginLocation = async () => {
    try {
      const loc = await Promise.race([
        getBestAvailableLocation({
          allowCache: true,
          allowIpFallback: true,
          requiredAccuracy: 1500,
          strictAccuracy: false,
        }),
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
        const msg = result.message || "Additional verification required.";
        setErrorMessage(msg);
        toast({ title: "Security Check", description: msg });
        return;
      }

      if (result?.success) {
        await refreshAuth();
        setShowOtpChallenge(false);
        setOtpCode("");
        const userId = getUserId(result.user) || localStorage.getItem("userId");
        if (userId) captureLocation(userId).catch(() => {});
        toast({
          title: t("login_successful") || "Login Successful",
          description: t("welcome_back_msg") || "Welcome back!",
        });
        setErrorMessage("");
        navigate(getReturnPath(), { replace: true });
        return;
      }

      const msg = result?.error || INVALID_LOGIN_MESSAGE;
      setErrorMessage(msg);
      toast({ title: "Sign-in Failed", description: msg, variant: "destructive" });
    } catch (err) {
      const parsed = extractError(err);
      const msg = friendlyError(parsed, INVALID_LOGIN_MESSAGE);
      setErrorMessage(msg);
      toast({ title: "Sign-in Failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800 px-4 py-8 sm:py-12 transition-colors duration-300">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="flex justify-center mb-5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-r from-sky-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Shield className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
            </div>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">
            {t("welcome_back") || "Welcome Back"}
          </h2>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            {t("sign_in_to_account") || "Sign in with your mobile number"}
          </p>
        </div>

        <Card className="shadow-xl border-0 rounded-2xl sm:rounded-3xl overflow-hidden dark:bg-gray-800/80 dark:border-gray-700/50 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-sky-500 to-blue-600 text-white text-center py-5 sm:py-6">
            <CardTitle className="text-xl sm:text-2xl font-bold">
              {t("sign_in") || "Sign In"}
            </CardTitle>
            <CardDescription className="text-sky-100 text-sm">
              {t("mobile_login_hint") || "Use your Aadhaar-registered mobile number"}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 sm:p-8">
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <Label htmlFor="mobile" className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Phone className="w-4 h-4" /> {t("mobile_number") || "Mobile Number"}
                </Label>
                <div className="relative mt-2 flex">
                  <span className="inline-flex items-center px-3 bg-gray-100 dark:bg-gray-600 border-2 border-r-0 border-gray-200 dark:border-gray-600 rounded-l-xl text-gray-500 dark:text-gray-300 text-sm">
                    +91
                  </span>
                  <Input
                    id="mobile"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={form.mobile}
                    onChange={(e) => setForm((p) => ({ ...p, mobile: e.target.value }))}
                    className="h-11 sm:h-12 border-2 border-gray-200 dark:border-gray-600 focus:border-sky-500 dark:bg-gray-700 dark:text-white rounded-l-none rounded-r-xl"
                    placeholder="9876543210"
                  />
                </div>
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  {t("mobile_login_help") || "Enter the mobile number linked to your Aadhaar."}
                </p>
              </div>

              <div>
                <Label htmlFor="password" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {t("password") || "Password"}
                </Label>
                <div className="relative mt-2">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={form.password}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    className="h-11 sm:h-12 border-2 border-gray-200 dark:border-gray-600 focus:border-sky-500 dark:bg-gray-700 dark:text-white rounded-xl pr-12"
                    placeholder={t("password_placeholder") || "Enter your password"}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <p className="text-gray-600 dark:text-gray-400">
                  {t("dont_have_account") || "Don't have an account?"}{" "}
                  <span
                    className="text-blue-600 dark:text-blue-400 cursor-pointer hover:underline font-medium"
                    onClick={() => navigate("/signup")}
                  >
                    {t("sign_up_here") || "Sign up here"}
                  </span>
                </p>
                <Link
                  to="/forgot-password"
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium whitespace-nowrap ml-2"
                >
                  {t("forgot_password") || "Forgot?"}
                </Link>
              </div>

              {errorMessage && (
                <div className="rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 p-3 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {showOtpChallenge && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                  <Label htmlFor="challenge-otp" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {t("security_code") || "Security Code"}
                  </Label>
                  <Input
                    id="challenge-otp"
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="mt-2 h-11 sm:h-12 border-2 border-orange-300 focus:border-orange-500 dark:bg-gray-700 dark:text-white rounded-xl text-center text-lg tracking-widest bg-orange-50 dark:bg-orange-900/20"
                    placeholder="123456"
                    maxLength={6}
                    autoFocus
                  />
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                    {t("enter_authenticator_code") || "Enter your authenticator code to continue."}
                  </p>
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
