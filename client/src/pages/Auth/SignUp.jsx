import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Eye, EyeOff, User, Mail, Phone, Lock, Gift,
  CheckCircle, ArrowRight, Sparkles, Shield, Users
} from "lucide-react";
import { registerUser } from "@/lib/auth";
import { useTranslation } from 'react-i18next';

const SignUp = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();

  // Get referral code from URL if present
  const urlParams = new URLSearchParams(location.search);
  const refCode = urlParams.get('ref') || '';

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
    referralCode: refCode,
    agreeToTerms: false
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Real-time validation states
  const [validations, setValidations] = useState({
    fullName: null,
    email: null,
    phoneNumber: null,
    password: null,
    confirmPassword: null
  });

  // Validate field in real-time
  const validateField = (name, value) => {
    switch (name) {
      case 'fullName':
        return value.length >= 2 ? 'valid' : value.length > 0 ? 'invalid' : null;
      case 'email':
        const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
        return emailRegex.test(value) ? 'valid' : value.length > 0 ? 'invalid' : null;
      case 'phoneNumber':
        const phoneRegex = /^[6-9]\d{9}$/;
        return phoneRegex.test(value) ? 'valid' : value.length > 0 ? 'invalid' : null;
      case 'password':
        const hasLength = value.length >= 8;
        const hasUpper = /[A-Z]/.test(value);
        const hasLower = /[a-z]/.test(value);
        const hasNumber = /[0-9]/.test(value);
        return hasLength && hasUpper && hasLower && hasNumber ? 'valid' : value.length > 0 ? 'invalid' : null;
      case 'confirmPassword':
        return value === formData.password && value.length > 0 ? 'valid' : value.length > 0 ? 'invalid' : null;
      default:
        return null;
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setValidations(prev => ({ ...prev, [name]: validateField(name, value) }));
  };

  // Password strength calculation
  const getPasswordStrength = () => {
    const password = formData.password;
    if (!password) return { score: 0, label: '', color: '' };

    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

    if (score <= 2) return { score: 1, label: 'Weak', color: 'bg-red-500' };
    if (score <= 4) return { score: 2, label: 'Medium', color: 'bg-yellow-500' };
    return { score: 3, label: 'Strong', color: 'bg-green-500' };
  };

  const canProceedStep1 = () => {
    return formData.fullName.length >= 2 &&
      formData.phoneNumber.length === 10 &&
      formData.email.includes('@') &&
      formData.password.length >= 8 &&
      formData.password === formData.confirmPassword;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.agreeToTerms) {
      toast({
        title: "Please accept terms",
        description: "You must agree to the terms and conditions to continue.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const userData = {
        name: formData.fullName,
        phone: formData.phoneNumber,
        email: formData.email,
        password: formData.password,
        referral_code: formData.referralCode || undefined
      };

      await registerUser(userData);

      setShowSuccess(true);

      setTimeout(() => {
        toast({
          title: "Welcome to MHub! 🎉",
          description: "Your account has been created successfully.",
        });
        navigate("/login");
      }, 2000);

    } catch (err) {
      toast({
        title: "Signup Failed",
        description: err.errors ? err.errors.join(", ") : (err.error || "Something went wrong. Please try again."),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Success animation component
  if (showSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500">
        <div className="text-center animate-fadeIn">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center animate-bounce">
            <CheckCircle className="w-14 h-14 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">{t('account_created')}</h2>
          <p className="text-white/80">{t('redirecting_login')}</p>
        </div>
      </div>
    );
  }

  const ValidationIcon = ({ status }) => {
    if (status === 'valid') return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (status === 'invalid') return <div className="w-5 h-5 rounded-full border-2 border-red-400" />;
    return null;
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-8 px-4 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-purple-500/30 rotate-3 hover:rotate-0 transition-transform">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {t('create_account')}
          </h1>
          <p className="text-gray-400">
            {t('join_thousands') || "Join thousands of verified buyers & sellers"}
          </p>
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center gap-2 mb-6">
          <div className={`w-3 h-3 rounded-full transition-all duration-300 ${step >= 1 ? 'bg-purple-500 scale-110' : 'bg-gray-600'}`} />
          <div className={`w-3 h-3 rounded-full transition-all duration-300 ${step >= 2 ? 'bg-purple-500 scale-110' : 'bg-gray-600'}`} />
        </div>

        {/* Main Card */}
        <Card className="bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl rounded-3xl overflow-hidden">
          <CardContent className="p-6 sm:p-8">
            <form onSubmit={handleSubmit}>
              {/* Step 1: Basic Info */}
              {step === 1 && (
                <div className="space-y-5 animate-fadeIn">
                  {/* Full Name */}
                  <div className="relative">
                    <Label className="text-white/80 text-sm font-medium mb-2 flex items-center gap-2">
                      <User className="w-4 h-4" /> {t('full_name_label')}
                    </Label>
                    <div className="relative">
                      <Input
                        name="fullName"
                        type="text"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        onFocus={() => setFocusedField('fullName')}
                        onBlur={() => setFocusedField(null)}
                        className={`h-12 bg-white/10 border-white/20 text-white placeholder:text-gray-400 rounded-xl pr-10 focus:border-purple-500 focus:ring-purple-500/20 transition-all ${focusedField === 'fullName' ? 'border-purple-500 ring-2 ring-purple-500/20' : ''}`}
                        placeholder={t('enter_full_name')}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <ValidationIcon status={validations.fullName} />
                      </div>
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div className="relative">
                    <Label className="text-white/80 text-sm font-medium mb-2 flex items-center gap-2">
                      <Phone className="w-4 h-4" /> {t('phone')}
                    </Label>
                    <div className="relative flex">
                      <span className="inline-flex items-center px-3 bg-white/5 border border-r-0 border-white/20 rounded-l-xl text-gray-400 text-sm">
                        +91
                      </span>
                      <Input
                        name="phoneNumber"
                        type="tel"
                        maxLength={10}
                        value={formData.phoneNumber}
                        onChange={handleInputChange}
                        onFocus={() => setFocusedField('phoneNumber')}
                        onBlur={() => setFocusedField(null)}
                        className={`h-12 bg-white/10 border-white/20 text-white placeholder:text-gray-400 rounded-l-none rounded-r-xl pr-10 focus:border-purple-500 focus:ring-purple-500/20 transition-all ${focusedField === 'phoneNumber' ? 'border-purple-500 ring-2 ring-purple-500/20' : ''}`}
                        placeholder="9876543210"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <ValidationIcon status={validations.phoneNumber} />
                      </div>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="relative">
                    <Label className="text-white/80 text-sm font-medium mb-2 flex items-center gap-2">
                      <Mail className="w-4 h-4" /> {t('email')}
                    </Label>
                    <div className="relative">
                      <Input
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        onFocus={() => setFocusedField('email')}
                        onBlur={() => setFocusedField(null)}
                        className={`h-12 bg-white/10 border-white/20 text-white placeholder:text-gray-400 rounded-xl pr-10 focus:border-purple-500 focus:ring-purple-500/20 transition-all ${focusedField === 'email' ? 'border-purple-500 ring-2 ring-purple-500/20' : ''}`}
                        placeholder={t('email_placeholder')}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <ValidationIcon status={validations.email} />
                      </div>
                    </div>
                  </div>

                  {/* Password */}
                  <div className="relative">
                    <Label className="text-white/80 text-sm font-medium mb-2 flex items-center gap-2">
                      <Lock className="w-4 h-4" /> {t('password')}
                    </Label>
                    <div className="relative">
                      <Input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={handleInputChange}
                        onFocus={() => setFocusedField('password')}
                        onBlur={() => setFocusedField(null)}
                        className={`h-12 bg-white/10 border-white/20 text-white placeholder:text-gray-400 rounded-xl pr-20 focus:border-purple-500 focus:ring-purple-500/20 transition-all ${focusedField === 'password' ? 'border-purple-500 ring-2 ring-purple-500/20' : ''}`}
                        placeholder={t('create_password_placeholder')}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-gray-400 hover:text-white transition"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {/* Password Strength */}
                    {formData.password && (
                      <div className="mt-2">
                        <div className="flex gap-1 mb-1">
                          {[1, 2, 3].map((level) => (
                            <div
                              key={level}
                              className={`h-1 flex-1 rounded-full transition-all ${getPasswordStrength().score >= level ? getPasswordStrength().color : 'bg-gray-600'}`}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-gray-400">
                          {t('password_strength') || "Password strength"}: <span className={`font-medium ${getPasswordStrength().score === 3 ? 'text-green-400' : getPasswordStrength().score === 2 ? 'text-yellow-400' : 'text-red-400'}`}>{getPasswordStrength().label}</span>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="relative">
                    <Label className="text-white/80 text-sm font-medium mb-2 flex items-center gap-2">
                      <Lock className="w-4 h-4" /> {t('confirm_new_password_label')}
                    </Label>
                    <div className="relative">
                      <Input
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        onFocus={() => setFocusedField('confirmPassword')}
                        onBlur={() => setFocusedField(null)}
                        className={`h-12 bg-white/10 border-white/20 text-white placeholder:text-gray-400 rounded-xl pr-20 focus:border-purple-500 focus:ring-purple-500/20 transition-all ${focusedField === 'confirmPassword' ? 'border-purple-500 ring-2 ring-purple-500/20' : ''}`}
                        placeholder={t('confirm_password_placeholder')}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="text-gray-400 hover:text-white transition"
                        >
                          {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                        <ValidationIcon status={validations.confirmPassword} />
                      </div>
                    </div>
                  </div>

                  {/* Next Button */}
                  <Button
                    type="button"
                    onClick={() => setStep(2)}
                    disabled={!canProceedStep1()}
                    className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    {t('continue')} <ArrowRight className="w-5 h-5" />
                  </Button>
                </div>
              )}

              {/* Step 2: Referral & Terms */}
              {step === 2 && (
                <div className="space-y-5 animate-fadeIn">
                  {/* Referral Code */}
                  <div className="relative">
                    <Label className="text-white/80 text-sm font-medium mb-2 flex items-center gap-2">
                      <Gift className="w-4 h-4" /> {t('referral_code_label')} <span className="text-gray-500 text-xs">{t('optional_label')}</span>
                    </Label>
                    <Input
                      name="referralCode"
                      type="text"
                      value={formData.referralCode}
                      onChange={handleInputChange}
                      className="h-12 bg-white/10 border-white/20 text-white placeholder:text-gray-400 rounded-xl focus:border-purple-500 focus:ring-purple-500/20 uppercase"
                      placeholder={t('enter_referral_code')}
                      maxLength={8}
                    />
                    {formData.referralCode && (
                      <p className="text-xs text-purple-400 mt-1">{t('signup_bonus_msg')}</p>
                    )}
                  </div>

                  {/* Benefits Card */}
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-purple-400" /> {t('what_you_get')}
                    </h3>
                    <ul className="space-y-2 text-sm text-gray-300">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        {t('buy_sell_securely') || "Buy & sell products securely"}
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        {t('earn_rewards') || "Earn rewards & referral coins"}
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        {t('personalized_recommendations') || "Get personalized recommendations"}
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        {t('optional_kyc') || "Optional KYC for verified badge"}
                      </li>
                    </ul>
                  </div>

                  {/* Terms Checkbox */}
                  <div className="flex items-start gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
                    <Checkbox
                      id="agreeToTerms"
                      checked={formData.agreeToTerms}
                      onCheckedChange={(checked) =>
                        setFormData(prev => ({ ...prev, agreeToTerms: checked }))
                      }
                      className="mt-0.5 border-white/30 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                    />
                    <Label htmlFor="agreeToTerms" className="text-sm text-gray-300 leading-relaxed cursor-pointer">
                      {t('agree_to_terms_prefix') || "I agree to the "}{' '}
                      <Link to="/terms" className="text-purple-400 hover:text-purple-300 underline">
                        {t('terms_of_service')}
                      </Link>{' '}
                      {t('and')}{' '}
                      <Link to="/privacy" className="text-purple-400 hover:text-purple-300 underline">
                        {t('privacy_policy')}
                      </Link>
                    </Label>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="flex-1 h-12 bg-transparent border-white/20 text-white hover:bg-white/10 rounded-xl"
                    >
                      {t('back')}
                    </Button>
                    <Button
                      type="submit"
                      disabled={isLoading || !formData.agreeToTerms}
                      className="flex-1 h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/25 disabled:opacity-50 transition-all"
                    >
                      {isLoading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        t('create_account')
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-transparent px-3 text-gray-500">{t('continue_with')}</span>
              </div>
            </div>

            {/* Social Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-12 bg-white/5 border-white/20 text-white hover:bg-white/10 rounded-xl flex items-center justify-center gap-2"
                onClick={() => toast({ title: "Coming Soon", description: "Google login will be available soon!" })}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-12 bg-white/5 border-white/20 text-white hover:bg-white/10 rounded-xl flex items-center justify-center gap-2"
                onClick={() => toast({ title: t('coming_soon'), description: t('phone_otp_coming_soon') })}
              >
                <Phone className="w-5 h-5" />
                {t('phone_otp')}
              </Button>
            </div>

            {/* Login Link */}
            <p className="text-center text-sm text-gray-400 mt-6">
              {t('already_have_account') || "Already have an account?"}{' '}
              <Link to="/login" className="text-purple-400 hover:text-purple-300 font-medium">
                {t('sign_in')}
              </Link>
            </p>
          </CardContent>
        </Card>

        {/* Trust Badges */}
        <div className="flex justify-center gap-6 mt-6 text-gray-500 text-xs">
          <div className="flex items-center gap-1">
            <Shield className="w-4 h-4" />
            <span>{t('secure_signup')}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{t('users_count_signup')}</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle className="w-4 h-4" />
            <span>{t('verified_signup')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
