import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { getApiOriginBase } from '@/lib/networkConfig';

const ForgotPassword = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      toast({ title: t('error'), description: t('enter_your_email'), variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const baseUrl = getApiOriginBase();
      const res = await fetch(`${baseUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: email }) // Works for both email and phone
      });

      const data = await res.json();

      if (res.ok) {
        setSent(true);
        toast({ title: t('success'), description: t('reset_link_sent') || "Password reset link has been sent to your email" });
      } else {
        toast({ title: t('error'), description: data.error || t('failed_send_link') || "Failed to send reset link", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: t('error'), description: t('network_error'), variant: "destructive" });
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
              {sent ? t('sent_reset_link_msg') || 'We sent you a password reset link' : t('enter_email_reset_msg') || 'Enter your email to reset your password'}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-8">
            {sent ? (
              <div className="text-center space-y-4">
                <p className="text-gray-600 dark:text-gray-300">
                  {t('sent_link_to') || "We've sent a password reset link to"} <strong>{email}</strong>.
                  {t('check_inbox_instructions') || "Please check your inbox and follow the instructions."}
                </p>
                <p className="text-sm text-gray-500">
                  {t('didnt_receive_email') || "Didn't receive the email?"} {t('check_spam') || "Check your spam folder or"}
                  <button onClick={() => setSent(false)} className="text-blue-600 hover:underline ml-1">
                    {t('try_again')}
                  </button>
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="email" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {t('email_address') || "Email Address"}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-2 h-12 border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:bg-gray-700 dark:text-white rounded-xl"
                    placeholder={t('enter_your_email')}
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

