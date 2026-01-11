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
import { getDeviceId } from '@/utils/device';
import { captureLocation as getCurrentLocation } from '@/services/locationService';
import { useTranslation } from "react-i18next";
import api from "@/services/api";

const Login = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // State for Inputs
  const [emailLogin, setEmailLogin] = useState({ email: "", password: "" });
  const [phoneLogin, setPhoneLogin] = useState({ phone: "", otp: "" });

  // State for OTP/Risk Logic
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  // Helper: Login API Call
  const loginUser = async (payload) => {
    // api.post returns response.data directly due to interceptor in services/api.js 
    // BUT wait, standard axios returns object. 
    // Let's check services/api.js interceptor. 
    // Usually it returns response.data. 
    // If not, we handle it.
    // Safe bet: api.post returns the data (intercepted).
    return api.post('/auth/login', payload);
  };

  // Helper: Fetch Profile
  const fetchAndStoreUserProfile = async (token) => {
    try {
      const user = await api.get('/users/profile/me');
      localStorage.setItem('user', JSON.stringify(user));
    } catch (e) {
      console.error("Failed to fetch profile", e);
    }
  };

  // ------------------ EMAIL LOGIN ------------------ //
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!emailLogin.email || !emailLogin.password) {
      toast({
        title: t('validation_error') || "Validation Error",
        description: t('email_password_required') || "Email and password are required",
        variant: "destructive",
      });
      return;
    }

    // OTP validation if visible
    if (showOtpInput && (!otpValue || otpValue.length < 4)) {
      toast({
        title: "OTP Required",
        description: "Please enter the code sent to your email.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // 1. Get Device Fingerprint
      const deviceId = getDeviceId();

      // 2. Get Location (Best effort)
      let location = { lat: null, lng: null };
      try {
        location = await getCurrentLocation();
      } catch (err) {
        console.warn("Location fetch failed for login:", err);
      }

      const payload = {
        email: emailLogin.email,
        password: emailLogin.password,
        deviceId: deviceId,
        lat: location?.latitude || null,
        lng: location?.longitude || null,
      };

      // Add OTP if in challenge mode
      if (showOtpInput) {
        payload.otp = otpValue;
      }

      const data = await loginUser(payload);

      // Success Handling
      if (data && data.token) {
        localStorage.setItem("token", data.token);
        if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);

        await fetchAndStoreUserProfile(data.token);

        toast({
          title: t('login_successful') + " 🎉" || "Login Successful 🎉",
          description: t('welcome_back_msg') || "Welcome back!",
        });
        navigate("/all-posts");
      }

    } catch (err) {
      console.error("Login Error:", err);

      // Handle 202 Challenge specifically (Risk Engine)
      // Note: If using axios, err.response holds the server response
      if (err.response && err.response.status === 202 && err.response.data.requireOtp) {
        setShowOtpInput(true);
        toast({
          title: "Security Check",
          description: err.response.data.message || "Unusual activity detected.",
        });
        return; // Stop here, let user enter OTP
      }

      const errorMessage = err.response?.data?.error || err.message || t('login_failed') || "Login failed";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ------------------ PHONE OTP LOGIN (Legacy/Alternative) ------------------ //
  const handleSendOTP = async () => {
    // Phone validation
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneLogin.phone || !phoneRegex.test(phoneLogin.phone)) {
      toast({
        title: t('invalid_phone_number') || "Invalid Phone Number",
        description: t('invalid_phone_desc') || "Please enter a valid 10-digit phone number starting with 6-9.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/auth/send-otp', { phone: phoneLogin.phone });
      setOtpSent(true);
      toast({
        title: t('otp_sent') || "OTP Sent",
        description: t('check_phone_otp') || "Check your phone for the verification code",
      });
    } catch (err) {
      toast({
        title: t('network_error') || "Error",
        description: err.response?.data?.error || t('could_not_send_otp') || "Could not send OTP",
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
        title: t('invalid_otp') || "Invalid OTP",
        description: t('otp_valid_desc') || "Please enter a valid OTP.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    try {
      const data = await api.post('/auth/verify-otp', {
        phone: phoneLogin.phone,
        otp: phoneLogin.otp,
      });

      localStorage.setItem("token", data.token);
      await fetchAndStoreUserProfile(data.token);

      // Capture fresh location after login
      getCurrentLocation(data.userId).catch(() => { });

      toast({
        title: t('login_successful') + " 🎉" || "Login Successful 🎉",
        description: t('welcome_back_msg') || "Welcome back!",
      });
      navigate("/all-posts");
    } catch (err) {
      toast({
        title: t('network_error') || "Error",
        description: err.response?.data?.error || t('could_not_verify_otp') || "Could not verify OTP",
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
            {t('welcome_back') || "Welcome Back"}
          </h2>
          <p className="text-gray-600 dark:text-gray-300">{t('sign_in_to_account') || "Sign in to your account"}</p>
        </div>

        <Card className="shadow-2xl border-0 rounded-3xl overflow-hidden dark:bg-gray-800">
          <CardHeader className="bg-gradient-to-r from-sky-500 to-blue-600 text-white text-center py-8">
            <CardTitle className="text-2xl font-bold">{t('sign_in') || "Sign In"}</CardTitle>
            <CardDescription className="text-sky-100">
              {t('choose_login_method') || "Choose your preferred login method"}
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
                  <span>{t('email') || "Email"}</span>
                </TabsTrigger>
                <TabsTrigger
                  value="phone"
                  className="rounded-lg flex items-center space-x-2 dark:data-[state=active]:bg-gray-600 dark:text-gray-200"
                >
                  <Phone className="w-4 h-4" />
                  <span>{t('phone') || "Phone"}</span>
                </TabsTrigger>
              </TabsList>

              {/* Email Login */}
              <TabsContent value="email">
                <form onSubmit={handleEmailLogin} className="space-y-6">
                  <div>
                    <Label htmlFor="email" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {t('email') || "Email"}
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
                      placeholder={t('email_placeholder') || "Enter your email"}
                    />
                  </div>
                  <div>
                    <Label htmlFor="password" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {t('password') || "Password"}
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
                        placeholder={t('password_placeholder') || "Enter your password"}
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

                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('dont_have_account') || "Don't have an account?"}{" "}
                    <span
                      className="text-blue-600 dark:text-blue-400 cursor-pointer hover:underline"
                      onClick={() => navigate("/signup")}
                    >
                      {t('sign_up_here') || "Sign up here"}
                    </span>
                  </p>

                  <div className="text-right">
                    <Link
                      to="/forgot-password"
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {t('forgot_password') || "Forgot Password?"}
                    </Link>
                  </div>

                  {showOtpInput && (
                    <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                      <Label htmlFor="challenge-otp" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {t('security_code') || "Security Code"}
                      </Label>
                      <Input
                        id="challenge-otp"
                        type="text"
                        value={otpValue}
                        onChange={(e) => setOtpValue(e.target.value)}
                        className="mt-2 h-12 border-2 border-orange-300 focus:border-orange-500 dark:bg-gray-700 dark:text-white rounded-xl text-center text-lg tracking-widest bg-orange-50"
                        placeholder="• • • • • •"
                        maxLength={6}
                        autoFocus
                      />
                      <p className="text-xs text-orange-600 mt-1">
                        {t('enter_code_sent_email') || "Enter the code sent to your email to continue."}
                      </p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full h-12 rounded-xl text-lg font-semibold ${showOtpInput ? 'bg-orange-500 hover:bg-orange-600' : 'bg-gradient-to-r from-sky-500 to-blue-600'}`}
                  >
                    {isLoading ? t('verifying') || "Verifying..." : (showOtpInput ? t('verify_login') || "Verify Login" : t('sign_in') || "Sign In")}
                  </Button>
                </form>
              </TabsContent>

              {/* Phone OTP Login */}
              <TabsContent value="phone">
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="phone" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {t('phone') || "Phone Number"}
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

                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('dont_have_account') || "Don't have an account?"}{" "}
                    <span
                      className="text-blue-600 dark:text-blue-400 cursor-pointer hover:underline"
                      onClick={() => navigate("/signup")}
                    >
                      {t('sign_up_here') || "Sign up here"}
                    </span>
                  </p>

                  {!otpSent ? (
                    <Button
                      onClick={handleSendOTP}
                      disabled={isLoading}
                      className="w-full h-12 bg-gradient-to-r from-sky-500 to-blue-600 rounded-xl text-lg font-semibold"
                    >
                      {isLoading ? t('loading') || "Loading..." : t('send_otp') || "Send OTP"}
                    </Button>
                  ) : (
                    <form onSubmit={handlePhoneLogin} className="space-y-6">
                      <div>
                        <Label htmlFor="otp" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          {t('enter_otp') || "Enter OTP"}
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
                        {isLoading ? t('logging_in') || "Logging In..." : t('verify_sign_in') || "Verify & Sign In"}
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
