import React, { useState } from "react";
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
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getApiOriginBase } from "@/lib/networkConfig";
import { mapPasswordResetError } from "@/utils/passwordResetErrorMapper";

export default function ForgotPassword() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [resetLink, setResetLink] = useState("");
  const [debugInfo, setDebugInfo] = useState(null);
  const [message, setMessage] = useState("");

  const normalizePhone = (value) => String(value || "").replace(/\D/g, "");
  const isPhoneIdentifier = (value) => /^[6-9]\d{9}$/.test(normalizePhone(value));

  const mapError = (status, msg) =>
    mapPasswordResetError({ status, message: msg, t, context: "forgot" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!identifier) {
      const msg = t("enter_email_phone_username") || "Enter your email, phone, or username.";
      setMessage(msg);
      toast({ title: t("error") || "Error", description: msg, variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const base = getApiOriginBase();
      const res = await fetch(`${base}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setSent(true);
        const debug = data?.debug || null;
        setDebugInfo(debug);
        setResetLink(debug?.resetLink || "");
        const info = debug?.mock
          ? t("reset_link_preview_mode") || "Email is in local preview mode. Use the reset link shown on this page."
          : t("reset_delivery_hint") || "If an account exists, reset instructions were sent. Check spam/junk if you don't see it.";
        setMessage(info);
        toast({
          title: t("success") || "Success",
          description: debug?.mock
            ? t("reset_link_preview_mode") || "Email is in local preview mode."
            : t("reset_link_sent") || "Password reset instructions have been sent.",
        });
      } else {
        const msg = mapError(res.status, data.error || data.message);
        setMessage(msg);
        toast({ title: t("error") || "Error", description: msg, variant: "destructive" });
      }
    } catch (err) {
      const msg = mapError(null, err.message);
      setMessage(msg);
      toast({ title: t("error") || "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800 px-4 py-8 sm:py-12 transition-colors duration-300">
      <div className="w-full max-w-md space-y-4">
        {/* Back link */}
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("back_to_login") || "Back to Login"}
        </Link>

        <Card className="shadow-xl border-0 rounded-2xl sm:rounded-3xl overflow-hidden dark:bg-gray-800/80 dark:border-gray-700/50 backdrop-blur-sm">
          <CardHeader className="text-center py-6 sm:py-8 bg-gradient-to-r from-blue-500 to-blue-600">
            <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 rounded-2xl bg-white/20 flex items-center justify-center">
              {sent ? (
                <CheckCircle className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              ) : (
                <Mail className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              )}
            </div>
            <CardTitle className="text-xl sm:text-2xl text-white font-bold">
              {sent
                ? t("check_your_email") || "Check Your Email"
                : t("forgot_password") || "Forgot Password"}
            </CardTitle>
            <CardDescription className="text-blue-100 text-sm">
              {sent
                ? t("sent_reset_link_msg") || "We sent you password reset instructions"
                : t("enter_email_reset_msg") || "Enter your email, phone, or username to reset your password"}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 sm:p-8">
            {/* Status message */}
            {message && (
              <div
                className={`mb-4 rounded-xl border p-3 text-sm flex items-start gap-2 ${
                  sent && !message.toLowerCase().includes("error")
                    ? "border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200"
                    : "border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200"
                }`}
              >
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{message}</span>
              </div>
            )}

            {sent ? (
              <div className="text-center space-y-4">
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  {t("sent_link_to") || "We've sent reset instructions for"}{" "}
                  <strong className="text-gray-900 dark:text-white">{identifier}</strong>.{" "}
                  {t("check_inbox_instructions") || "Please check your inbox and follow the instructions."}
                </p>

                {isPhoneIdentifier(identifier) && (
                  <div className="rounded-xl border border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 p-3 text-left">
                    <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                      {t("reset_with_otp") || "Prefer OTP reset?"}
                    </p>
                    <Link
                      to={`/reset-password?phone=${encodeURIComponent(normalizePhone(identifier))}`}
                      className="mt-1 inline-flex items-center text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      {t("use_otp_reset") || "Use OTP to reset password"}
                    </Link>
                  </div>
                )}

                {resetLink && (
                  <div className="rounded-xl border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 p-3 text-left">
                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                      {t("dev_reset_preview") || "Local reset preview link"}
                    </p>
                    <a
                      href={resetLink}
                      className="mt-1 block break-all text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {resetLink}
                    </a>
                    <p className="mt-1 text-xs text-blue-500 dark:text-blue-400">
                      {debugInfo?.mock
                        ? t("email_provider_not_configured") || "Email provider not configured; this link is shown for local testing."
                        : `${t("email_delivery_channel") || "Delivery channel"}: ${debugInfo?.channel || "email"}`}
                    </p>
                  </div>
                )}

                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t("didnt_receive_email") || "Didn't receive the email?"}{" "}
                  {t("check_spam") || "Check your spam folder or"}
                  <button
                    onClick={() => {
                      setSent(false);
                      setDebugInfo(null);
                      setResetLink("");
                      setMessage("");
                    }}
                    className="text-blue-600 dark:text-blue-400 hover:underline ml-1 font-medium"
                  >
                    {t("try_again") || "try again"}
                  </button>
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <Label
                    htmlFor="email"
                    className="text-sm font-semibold text-gray-700 dark:text-gray-300"
                  >
                    {t("email_phone_username") || "Email / Phone / Username"}
                  </Label>
                  <Input
                    id="email"
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="mt-2 h-11 sm:h-12 border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:bg-gray-700 dark:text-white rounded-xl"
                    placeholder={t("email_phone_username_placeholder") || "Enter your email, phone, or username"}
                    disabled={loading}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 sm:h-12 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white rounded-xl text-base sm:text-lg font-semibold"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t("sending") || "Sending"}...
                    </span>
                  ) : (
                    t("send_reset_link") || "Send Reset Link"
                  )}
                </Button>
              </form>
            )}

            <div className="text-center mt-6 text-sm text-gray-600 dark:text-gray-400">
              {t("remember_password") || "Remember your password?"}{" "}
              <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                {t("sign_in") || "Sign In"}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
