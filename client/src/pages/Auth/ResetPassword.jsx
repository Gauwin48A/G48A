import React, { useMemo, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate, useSearchParams, useParams } from "react-router-dom";
import { Lock, CheckCircle, Eye, EyeOff, AlertCircle } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { getApiOriginBase } from '@/lib/networkConfig';

const ResetPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { token: pathToken } = useParams();
  const queryToken = searchParams.get('token');
  const token = pathToken || queryToken;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [apiHint, setApiHint] = useState('');

  const passwordChecks = useMemo(() => ({
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[!@#$%^&*]/.test(password),
    isLongEnough: password.length >= 8
  }), [password]);

  const resolveResetErrorMessage = (status, rawMessage) => {
    const message = String(rawMessage || '').toLowerCase();
    if (status === 429 || message.includes('too many')) {
      return 'Too many reset attempts detected. Please wait before retrying.';
    }
    if (status === 400 && (message.includes('invalid or expired reset link') || message.includes('token'))) {
      return 'This reset link is invalid or expired. Request a new one from Forgot Password.';
    }
    if (message.includes('weak') || message.includes('password')) {
      return 'Password does not meet security requirements. Review the checklist below.';
    }
    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      return 'Reset service is temporarily unavailable. Please retry shortly.';
    }
    return rawMessage || t('failed_reset_password') || 'Failed to reset password';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiHint('');

    if (!token) {
      const msg = t('invalid_reset_link');
      setApiHint(msg);
      toast({ title: t('error'), description: msg, variant: "destructive" });
      return;
    }

    if (!password || !confirmPassword) {
      const msg = t('fill_all_fields') || "Please fill in all fields";
      setApiHint(msg);
      toast({ title: t('error'), description: msg, variant: "destructive" });
      return;
    }

    if (password !== confirmPassword) {
      const msg = t('passwords_do_not_match') || "Passwords do not match";
      setApiHint(msg);
      toast({ title: t('error'), description: msg, variant: "destructive" });
      return;
    }

    const isStrongPassword = passwordChecks.isLongEnough
      && passwordChecks.hasUppercase
      && passwordChecks.hasLowercase
      && passwordChecks.hasNumber
      && passwordChecks.hasSpecial;

    if (!isStrongPassword) {
      const msg = t('password_requirements_msg') || "Password must be 8+ characters with uppercase, lowercase, number, and special character";
      setApiHint(msg);
      toast({
        title: t('weak_password') || "Weak Password",
        description: msg,
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const baseUrl = getApiOriginBase();
      const res = await fetch(`${baseUrl}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password })
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setSuccess(true);
        toast({ title: t('success'), description: t('password_reset_success') || "Password reset successfully!" });
        setTimeout(() => navigate('/login'), 3000);
      } else {
        const resolvedMessage = resolveResetErrorMessage(res.status, data.error || data.message);
        setApiHint(resolvedMessage);
        toast({ title: t('error'), description: resolvedMessage, variant: "destructive" });
      }
    } catch (err) {
      const resolvedMessage = resolveResetErrorMessage(null, err.message || t('network_error'));
      setApiHint(resolvedMessage);
      toast({ title: t('error'), description: resolvedMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] p-4">
        <Card className="max-w-md w-full shadow-2xl border-0 rounded-3xl bg-white dark:bg-gray-800">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">{t('invalid_reset_link')}</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">{t('invalid_reset_link_desc')}</p>
            <Link to="/forgot-password">
              <Button className="w-full bg-[#96C2DB] hover:bg-blue-500 text-white">{t('request_new_link')}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] p-4">
      <Card className="max-w-md w-full shadow-2xl border-0 rounded-3xl overflow-hidden bg-white dark:bg-gray-800">
        <CardHeader className="text-center py-8 bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/20 flex items-center justify-center">
            {success ? <CheckCircle className="w-8 h-8 text-white" /> : <Lock className="w-8 h-8 text-white" />}
          </div>
          <CardTitle className="text-2xl text-white">
            {success ? t('password_reset_title') || 'Password Reset!' : t('reset_password_title')}
          </CardTitle>
          <CardDescription className="text-blue-100">
            {success ? t('redirecting_to_login') || 'Redirecting to login...' : t('create_new_password_msg') || 'Create a new secure password'}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-8">
          {success ? (
            <div className="text-center space-y-4">
              <p className="text-gray-600 dark:text-gray-300">
                {t('password_reset_success_msg') || "Your password has been reset successfully. You will be redirected to the login page."}
              </p>
              <Link to="/login">
                <Button className="w-full bg-[#96C2DB] hover:bg-blue-500 text-white">{t('go_to_login')}</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {apiHint && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{apiHint}</span>
                </div>
              )}

              <div>
                <Label htmlFor="password" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {t('new_password_label')}
                </Label>
                <div className="relative mt-2">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:bg-gray-700 dark:text-white rounded-xl pr-12"
                    placeholder={t('create_password_placeholder')}
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {t('confirm_new_password_label')}
                </Label>
                <div className="relative mt-2">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-12 border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:bg-gray-700 dark:text-white rounded-xl pr-12"
                    placeholder={t('confirm_password_placeholder')}
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">{t('passwords_do_not_match') || "Passwords do not match"}</p>
                )}
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl text-xs">
                <p className="font-semibold mb-2 text-gray-700 dark:text-gray-300">{t('password_requirements')}</p>
                <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                  <li className={passwordChecks.isLongEnough ? 'text-green-600' : ''}>- {t('req_min_chars')}</li>
                  <li className={passwordChecks.hasUppercase ? 'text-green-600' : ''}>- {t('req_uppercase')}</li>
                  <li className={passwordChecks.hasLowercase ? 'text-green-600' : ''}>- {t('req_lowercase')}</li>
                  <li className={passwordChecks.hasNumber ? 'text-green-600' : ''}>- {t('req_number')}</li>
                  <li className={passwordChecks.hasSpecial ? 'text-green-600' : ''}>- {t('req_special')}</li>
                </ul>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full py-6 text-lg bg-[#96C2DB] hover:bg-blue-500 text-white rounded-xl"
              >
                {loading ? t('resetting_password') || 'Resetting...' : t('reset_password_title')}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
