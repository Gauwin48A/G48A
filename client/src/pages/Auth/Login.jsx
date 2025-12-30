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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, Link } from "react-router-dom";
import { Shield, Mail, Phone, Eye, EyeOff } from "lucide-react";
import { loginUser } from "@/lib/auth";
import { captureLocation } from "@/services/locationService";
import { useTranslation } from 'react-i18next';
import PasswordStrengthIndicator from "@/components/PasswordStrengthIndicator";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [emailLogin, setEmailLogin] = useState({ email: "", password: "" });
  const [phoneLogin, setPhoneLogin] = useState({ phone: "", otp: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Utility: After login, fetch and store user profile for profile page
  const fetchAndStoreUserProfile = async (token) => {
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      const res = await fetch(`${baseUrl}/api/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });
      if (res.ok) {
        const user = await res.json();
        localStorage.setItem('userProfile', JSON.stringify(user));
      }
    } catch (e) { /* ignore */ }
  };

  // ------------------ EMAIL LOGIN ------------------ //
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    // Frontend validation
    const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
    if (!emailLogin.email || !emailRegex.test(emailLogin.email)) {
      toast({
        title: t('invalid_email'),
        description: t('invalid_email_desc'),
        variant: "destructive",
      });
      return;
    }
    if (!emailLogin.password || emailLogin.password.length < 6) {
      toast({
        title: "Invalid Password",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }
    const testEmails = ['test@test.com', 'admin@admin.com', 'user@user.com'];
    if (testEmails.includes(emailLogin.email.toLowerCase())) {
      toast({
        title: "Test Email Not Allowed",
        description: "Test/dummy emails are not allowed for login.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    try {
      const data = await loginUser({
        email: emailLogin.email,
        password: emailLogin.password,
      });
      // Save to correct localStorage keys that rest of app uses
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("userId", data.userId);
      await fetchAndStoreUserProfile(data.token);

      // Capture fresh location after login
      console.log("[Login] Capturing location after successful email login...");
      captureLocation(data.userId).catch(err =>
        console.warn("[Login] Location capture failed (non-blocking):", err)
      );

      toast({
        title: t('login_successful') + " 🎉",
        description: t('welcome_back') + " to MobileVerify!",
      });
      navigate("/all-posts");
    } catch (err) {
      toast({
        title: t('login_failed') + " ❌",
        description: err.errors?.join(", ") || err.error || t('login_failed'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ------------------ PHONE OTP LOGIN ------------------ //
  const handleSendOTP = async () => {
    // Phone validation
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneLogin.phone || !phoneRegex.test(phoneLogin.phone)) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid 10-digit phone number starting with 6-9.",
        variant: "destructive",
      });
      return;
    }
    if (/^1234567890$|^9999999999$/.test(phoneLogin.phone)) {
      toast({
        title: "Test Phone Not Allowed",
        description: "Test/dummy phone numbers are not allowed for login.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch("http://localhost:5000/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneLogin.phone }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast({
          title: "Error",
          description: data.error || "Failed to send OTP",
          variant: "destructive",
        });
        return;
      }
      setOtpSent(true);
      toast({
        title: "OTP Sent",
        description: "Check your phone for the verification code",
      });
    } catch (err) {
      toast({
        title: "Network Error",
        description: "Could not send OTP",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneLogin = async (e) => {
    e.preventDefault();
    // OTP validation
    const otpRegex = /^\d{4,8}$/;
    if (!phoneLogin.otp || !otpRegex.test(phoneLogin.otp)) {
      toast({
        title: "Invalid OTP",
        description: "Please enter a valid OTP (4-8 digits).",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch("http://localhost:5000/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phoneLogin.phone,
          otp: phoneLogin.otp,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast({
          title: "OTP Verification Failed",
          description: data.error || "Invalid OTP",
          variant: "destructive",
        });
        return;
      }
      localStorage.setItem("token", data.token);
      await fetchAndStoreUserProfile(data.token);

      // Capture fresh location after login
      console.log("[Login] Capturing location after successful phone login...");
      captureLocation(data.userId).catch(err =>
        console.warn("[Login] Location capture failed (non-blocking):", err)
      );

      toast({
        title: "Login Successful 🎉",
        description: "Welcome back to MobileVerify!",
      });
      navigate("/all-posts");
    } catch (err) {
      toast({
        title: "Network Error",
        description: "Could not verify OTP",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-sky-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Shield className="h-8 w-8 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t('welcome_back')}
          </h2>
          <p className="text-gray-600 dark:text-gray-300">{t('sign_in_to_account')}</p>
        </div>

        <Card className="shadow-2xl border-0 rounded-3xl overflow-hidden dark:bg-gray-800">
          <CardHeader className="bg-gradient-to-r from-sky-500 to-blue-600 text-white text-center py-8">
            <CardTitle className="text-2xl font-bold">{t('sign_in')}</CardTitle>
            <CardDescription className="text-sky-100">
              {t('choose_login_method')}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-8">
            <Tabs defaultValue="email" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
                <TabsTrigger
                  value="email"
                  className="rounded-lg flex items-center space-x-2 dark:data-[state=active]:bg-gray-600 dark:text-gray-200"
                >
                  <Mail className="w-4 h-4" />
                  <span>{t('email')}</span>
                </TabsTrigger>
                <TabsTrigger
                  value="phone"
                  className="rounded-lg flex items-center space-x-2 dark:data-[state=active]:bg-gray-600 dark:text-gray-200"
                >
                  <Phone className="w-4 h-4" />
                  <span>{t('phone')}</span>
                </TabsTrigger>
              </TabsList>

              {/* Email Login */}
              <TabsContent value="email">
                <form onSubmit={handleEmailLogin} className="space-y-6">
                  <div>
                    <Label htmlFor="email" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {t('email')}
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={emailLogin.email}
                      onChange={(e) =>
                        setEmailLogin((prev) => ({ ...prev, email: e.target.value }))
                      }
                      className="mt-2 h-12 border-2 border-gray-200 dark:border-gray-600 focus:border-sky-500 dark:bg-gray-700 dark:text-white rounded-xl"
                      placeholder="name@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {t('password')}
                    </Label>
                    <div className="relative mt-2">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        required
                        value={emailLogin.password}
                        onChange={(e) =>
                          setEmailLogin((prev) => ({ ...prev, password: e.target.value }))
                        }
                        className="h-12 border-2 border-gray-200 dark:border-gray-600 focus:border-sky-500 dark:bg-gray-700 dark:text-white rounded-xl pr-12"
                        placeholder="••••••••"
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

                  {/* Signup link */}
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('dont_have_account')}{" "}
                    <span
                      className="text-blue-600 dark:text-blue-400 cursor-pointer hover:underline"
                      onClick={() => navigate("/signup")}
                    >
                      {t('sign_up_here')}
                    </span>
                  </p>

                  {/* Forgot Password link */}
                  <div className="text-right">
                    <Link
                      to="/forgot-password"
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Forgot Password?
                    </Link>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 bg-gradient-to-r from-sky-500 to-blue-600 rounded-xl text-lg font-semibold"
                  >
                    {isLoading ? t('logging_in') : t('sign_in')}
                  </Button>
                </form>
              </TabsContent>

              {/* Phone OTP Login */}
              <TabsContent value="phone">
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="phone" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {t('phone')}
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      required
                      value={phoneLogin.phone}
                      onChange={(e) =>
                        setPhoneLogin((prev) => ({ ...prev, phone: e.target.value }))
                      }
                      className="mt-2 h-12 border-2 border-gray-200 dark:border-gray-600 focus:border-sky-500 dark:bg-gray-700 dark:text-white rounded-xl"
                      placeholder={t('phone_placeholder') || "+91 XXXXXXXXXX"}
                    />
                  </div>

                  {/* Signup link under phone input */}
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('dont_have_account')}{" "}
                    <span
                      className="text-blue-600 dark:text-blue-400 cursor-pointer hover:underline"
                      onClick={() => navigate("/signup")}
                    >
                      {t('sign_up_here')}
                    </span>
                  </p>

                  {!otpSent ? (
                    <Button
                      onClick={handleSendOTP}
                      disabled={isLoading}
                      className="w-full h-12 bg-gradient-to-r from-sky-500 to-blue-600 rounded-xl text-lg font-semibold"
                    >
                      {isLoading ? t('loading') : t('send_otp')}
                    </Button>
                  ) : (
                    <form onSubmit={handlePhoneLogin} className="space-y-6">
                      <div>
                        <Label htmlFor="otp" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          {t('enter_otp')}
                        </Label>
                        <Input
                          id="otp"
                          type="text"
                          required
                          value={phoneLogin.otp}
                          onChange={(e) =>
                            setPhoneLogin((prev) => ({ ...prev, otp: e.target.value }))
                          }
                          className="mt-2 h-12 border-2 border-gray-200 dark:border-gray-600 focus:border-sky-500 dark:bg-gray-700 dark:text-white rounded-xl text-center text-lg tracking-widest"
                          placeholder={t('otp_placeholder') || "123456"}
                          maxLength={6}
                        />
                      </div>
                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-12 bg-gradient-to-r from-sky-500 to-blue-600 rounded-xl text-lg font-semibold"
                      >
                        {isLoading ? t('logging_in') : t('verify_sign_in')}
                      </Button>
                    </form>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
