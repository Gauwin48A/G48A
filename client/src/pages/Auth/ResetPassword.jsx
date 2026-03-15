import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate, useSearchParams, useParams } from "react-router-dom";
import { Lock, CheckCircle, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getApiOriginBase } from "@/lib/networkConfig";
import { mapPasswordResetError } from "@/utils/passwordResetErrorMapper";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { token: paramToken } = useParams();

  const queryToken = searchParams.get("token");
  const phoneParam = searchParams.get("phone");
  const token = paramToken || queryToken;
  const otpMode = !token && Boolean(phoneParam);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState(phoneParam || "");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const requirements = useMemo(
    () => ({
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecial: /[!@#$%^&*]/.test(password),
      isLongEnough: password.length >= 8,
    }),
    [password],
  );

  const mapError = (status, msg) =>
    mapPasswordResetError({ status, message: msg, t, context: "reset" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!token && !otpMode) {
      const msg = t("invalid_reset_link") || "Invalid reset link";
      setErrorMessage(msg);
      toast({ title: t("error") || "Error", description: msg, variant: "destructive" });
      return;
    }
    if (!password || !confirmPassword) {
      const msg = t("fill_all_fields") || "Please fill in all fields";
      setErrorMessage(msg);
      toast({ title: t("error") || "Error", description: msg, variant: "destructive" });
      return;
    }
    if (otpMode && (!phone || !otp)) {
      const msg = t("otp_phone_required") || "Phone number and OTP are required.";
      setErrorMessage(msg);
      toast({ title: t("error") || "Error", description: msg, variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      const msg = t("passwords_do_not_match") || "Passwords do not match";
      setErrorMessage(msg);
      toast({ title: t("error") || "Error", description: msg, variant: "destructive" });
      return;
    }
    if (!(requirements.isLongEnough && requirements.hasUppercase && requirements.hasLowercase && requirements.hasNumber && requirements.hasSpecial)) {
      const msg = t("password_requirements_msg") || "Password must be 8+ characters with uppercase, lowercase, number, and special character";
      setErrorMessage(msg);
      toast({ title: t("weak_password") || "Weak Password", description: msg, variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const base = getApiOriginBase();
      const payload = otpMode
        ? { phone, otp, newPassword: password }
        : { token, newPassword: password };
      const res = await fetch(`${base}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setSuccess(true);
        toast({
          title: t("success") || "Success",
          description: t("password_reset_success") || "Password reset successfully!",
        });
        setTimeout(() => navigate("/login"), 3000);
      } else {
        const msg = mapError(res.status, data.error || data.message);
        setErrorMessage(msg);
        toast({ title: t("error") || "Error", description: msg, variant: "destructive" });
      }
    } catch (err) {
      const msg = mapError(null, err.message);
      setErrorMessage(msg);
      toast({ title: t("error") || "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // No token and no OTP mode — invalid link
  if (!token && !otpMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800 px-4 py-8 transition-colors duration-300">
        <Card className="max-w-md w-full shadow-xl border-0 rounded-2xl sm:rounded-3xl dark:bg-gray-800/80 dark:border-gray-700/50">
          <CardContent className="p-6 sm:p-8 text-center">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
              {t("invalid_reset_link") || "Invalid Reset Link"}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm">
              {t("invalid_reset_link_desc") || "This password reset link is invalid or has expired."}
            </p>
            <Link to="/forgot-password">
              <Button className="w-full h-11 sm:h-12 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white rounded-xl font-semibold">
                {t("request_new_link") || "Request New Link"}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800 px-4 py-8 sm:py-12 transition-colors duration-300">
      <div className="w-full max-w-md">
        <Card className="shadow-xl border-0 rounded-2xl sm:rounded-3xl overflow-hidden dark:bg-gray-800/80 dark:border-gray-700/50 backdrop-blur-sm">
          <CardHeader className="text-center py-6 sm:py-8 bg-gradient-to-r from-blue-500 to-blue-600">
            <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 rounded-2xl bg-white/20 flex items-center justify-center">
              {success ? (
                <CheckCircle className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              ) : (
                <Lock className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              )}
            </div>
            <CardTitle className="text-xl sm:text-2xl text-white font-bold">
              {success
                ? t("password_reset_title") || "Password Reset!"
                : otpMode
                  ? t("reset_with_otp") || "Reset with OTP"
                  : t("reset_password_title") || "Reset Password"}
            </CardTitle>
            <CardDescription className="text-blue-100 text-sm">
              {success
                ? t("redirecting_to_login") || "Redirecting to login..."
                : otpMode
                  ? t("enter_otp_reset") || "Enter your OTP to reset the password"
                  : t("create_new_password_msg") || "Create a new secure password"}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 sm:p-8">
            {success ? (
              <div className="text-center space-y-4">
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  {t("password_reset_success_msg") ||
                    "Your password has been reset successfully. You will be redirected to the login page."}
                </p>
                <Link to="/login">
                  <Button className="w-full h-11 sm:h-12 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white rounded-xl font-semibold">
                    {t("go_to_login") || "Go to Login"}
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {errorMessage && (
                  <div className="rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 p-3 text-sm text-amber-800 dark:text-amber-200 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {otpMode && (
                  <>
                    <div>
                      <Label htmlFor="phone" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {t("phone") || "Phone Number"}
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="mt-2 h-11 sm:h-12 border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:bg-gray-700 dark:text-white rounded-xl"
                        placeholder="+91 XXXXXXXXXX"
                        disabled={loading}
                      />
                    </div>

                    <div>
                      <Label htmlFor="otp" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {t("enter_otp") || "Enter OTP"}
                      </Label>
                      <Input
                        id="otp"
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        className="mt-2 h-11 sm:h-12 border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:bg-gray-700 dark:text-white rounded-xl text-center text-lg tracking-widest"
                        placeholder="123456"
                        maxLength={6}
                        disabled={loading}
                      />
                    </div>
                  </>
                )}

                {/* New Password */}
                <div>
                  <Label htmlFor="password" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {t("new_password_label") || "New Password"}
                  </Label>
                  <div className="relative mt-2">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 sm:h-12 border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:bg-gray-700 dark:text-white rounded-xl pr-12"
                      placeholder={t("create_password_placeholder") || "Create a new password"}
                      disabled={loading}
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

                {/* Confirm Password */}
                <div>
                  <Label htmlFor="confirmPassword" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {t("confirm_new_password_label") || "Confirm New Password"}
                  </Label>
                  <div className="relative mt-2">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-11 sm:h-12 border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:bg-gray-700 dark:text-white rounded-xl pr-12"
                      placeholder={t("confirm_password_placeholder") || "Re-enter your password"}
                      disabled={loading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-red-500 mt-1">
                      {t("passwords_do_not_match") || "Passwords do not match"}
                    </p>
                  )}
                </div>

                {/* Requirements */}
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl text-xs border border-gray-200 dark:border-gray-600">
                  <p className="font-semibold mb-2 text-gray-700 dark:text-gray-300">
                    {t("password_requirements") || "Password Requirements"}
                  </p>
                  <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                    <li className={requirements.isLongEnough ? "text-green-600 dark:text-green-400" : ""}>
                      - {t("req_min_chars") || "At least 8 characters"}
                    </li>
                    <li className={requirements.hasUppercase ? "text-green-600 dark:text-green-400" : ""}>
                      - {t("req_uppercase") || "One uppercase letter"}
                    </li>
                    <li className={requirements.hasLowercase ? "text-green-600 dark:text-green-400" : ""}>
                      - {t("req_lowercase") || "One lowercase letter"}
                    </li>
                    <li className={requirements.hasNumber ? "text-green-600 dark:text-green-400" : ""}>
                      - {t("req_number") || "One number"}
                    </li>
                    <li className={requirements.hasSpecial ? "text-green-600 dark:text-green-400" : ""}>
                      - {t("req_special") || "One special character (!@#$%^&*)"}
                    </li>
                  </ul>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 sm:h-12 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white rounded-xl text-base sm:text-lg font-semibold"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t("resetting_password") || "Resetting..."}
                    </span>
                  ) : (
                    t("reset_password_title") || "Reset Password"
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
