import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { getApiOriginBase } from '@/lib/networkConfig';

const ForgotPassword = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [resetPreviewLink, setResetPreviewLink] = useState('');
  const [deliveryDebug, setDeliveryDebug] = useState(null);
  const [apiHint, setApiHint] = useState('');

  const resolveForgotPasswordErrorMessage = (status, rawMessage) => {
    const message = String(rawMessage || '').toLowerCase();
    if (status === 429 || message.includes('too many') || message.includes('rate limit')) {
      return 'Too many reset requests detected. Please wait a few minutes before retrying.';
    }
    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      return 'Reset service is temporarily unreachable. Please retry shortly.';
    }
    if (status >= 500 || message.includes('server')) {
      return 'Reset service is temporarily unavailable. Please retry in a few minutes.';
    }
    if (message.includes('invalid') || message.includes('required')) {
      return 'Please enter a valid email, phone number, or username.';
    }
    return rawMessage || t('failed_send_link') || "Failed to send reset link";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiHint('');

    if (!identifier) {
      const message = t('enter_email_phone_username') || "Enter your email, phone, or username.";
      setApiHint(message);
      toast({
        title: t('error'),
        description: message,
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const baseUrl = getApiOriginBase();
      const res = await fetch(`${baseUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier })
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setSent(true);
        const debugInfo = data?.debug || null;
        setDeliveryDebug(debugInfo);
        setResetPreviewLink(debugInfo?.resetLink || '');
        const deliveryHint = debugInfo?.mock
          ? (t('reset_link_preview_mode') || "Email is in local preview mode. Use the reset link shown on this page.")
          : (t('reset_delivery_hint') || "If an account exists, reset instructions were sent. Check spam/junk if you don't see it.");
        setApiHint(deliveryHint);
        toast({
          title: t('success'),
          description: debugInfo?.mock
            ? (t('reset_link_preview_mode') || "Email is in local preview mode. Use the reset link shown on this page.")
            : (t('reset_link_sent') || "Password reset instructions have been sent.")
        });
      } else {
        const resolvedMessage = resolveForgotPasswordErrorMessage(res.status, data.error || data.message);
        setApiHint(resolvedMessage);
        toast({ title: t('error'), description: resolvedMessage, variant: "destructive" });
      }
    } catch (err) {
      const resolvedMessage = resolveForgotPasswordErrorMessage(null, err.message || t('network_error'));
      setApiHint(resolvedMessage);
      toast({ title: t('error'), description: resolvedMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] p-4">
      <div className="max-w-md w-full">
        <Link to="/login" className="flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>{t('back_to_login')}</span>
        </Link>

        <Card className="shadow-2xl border-0 rounded-3xl overflow-hidden bg-white dark:bg-gray-800">
          <CardHeader className="text-center py-8 bg-gradient-to-r from-blue-600 to-blue-700">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/20 flex items-center justify-center">
              {sent ? <CheckCircle className="w-8 h-8 text-white" /> : <Mail className="w-8 h-8 text-white" />}
            </div>
            <CardTitle className="text-2xl text-white">
              {sent ? t('check_your_email') || 'Check Your Email' : t('forgot_password')}
            </CardTitle>
            <CardDescription className="text-blue-100">
              {sent ? t('sent_reset_link_msg') || 'We sent you password reset instructions' : t('enter_email_reset_msg') || 'Enter your email, phone, or username to reset your password'}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-8">
            {apiHint && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{apiHint}</span>
              </div>
            )}
            {sent ? (
              <div className="text-center space-y-4">
                <p className="text-gray-600 dark:text-gray-300">
                  {t('sent_link_to') || "We've sent reset instructions for"} <strong>{identifier}</strong>.
                  {t('check_inbox_instructions') || "Please check your inbox and follow the instructions."}
                </p>
                {resetPreviewLink && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-left">
                    <p className="text-xs font-semibold text-blue-700">
                      {t('dev_reset_preview') || "Local reset preview link"}
                    </p>
                    <a
                      href={resetPreviewLink}
                      className="mt-1 block break-all text-sm text-blue-700 hover:underline"
                    >
                      {resetPreviewLink}
                    </a>
                    <p className="mt-1 text-xs text-blue-600">
                      {deliveryDebug?.mock
                        ? (t('email_provider_not_configured') || "Email provider not configured; this link is shown for local testing.")
                        : (t('email_delivery_channel') || "Delivery channel") + `: ${deliveryDebug?.channel || 'email'}`}
                    </p>
                  </div>
                )}
                <p className="text-sm text-gray-500">
                  {t('didnt_receive_email') || "Didn't receive the email?"} {t('check_spam') || "Check your spam folder or"}
                  <button onClick={() => {
                    setSent(false);
                    setDeliveryDebug(null);
                    setResetPreviewLink('');
                    setApiHint('');
                  }} className="text-blue-600 hover:underline ml-1">
                    {t('try_again')}
                  </button>
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="email" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {t('email_phone_username') || "Email / Phone / Username"}
                  </Label>
                  <Input
                    id="email"
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="mt-2 h-12 border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:bg-gray-700 dark:text-white rounded-xl"
                    placeholder={t('email_phone_username_placeholder') || "Enter your email, phone, or username"}
                    disabled={loading}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full py-6 text-lg bg-[#96C2DB] hover:bg-blue-500 text-white rounded-xl"
                >
                  {loading ? t('sending') + "..." : t('send_reset_link') || 'Send Reset Link'}
                </Button>
              </form>
            )}

            <div className="text-center mt-6 text-sm text-gray-600 dark:text-gray-400">
              {t('remember_password') || "Remember your password?"}{' '}
              <Link to="/login" className="text-blue-600 hover:underline font-medium">
                {t('sign_in')}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;

