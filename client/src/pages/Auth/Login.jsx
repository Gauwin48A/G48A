import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Shield, Lock, Eye, EyeOff, Loader2, User, Phone, Mail, AlertCircle, FlaskConical, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import { useLocation as useLocationContext } from "@/context/LocationContext";
import { getDeviceId } from "@/utils/device";

const DEMO_ACCOUNT = { mobile: "9999999999", password: "Test@123456" };

const normalizeIdentifier = (val) => {
  const input = String(val || "").trim();
  const digits = input.replace(/\D/g, "");
  // If user entered a 10-digit phone number or +91 number
  if (/^91[6-9]\d{9}$/.test(digits)) return digits.slice(2);
  if (/^[6-9]\d{9}$/.test(digits)) return digits;
  return input; // Return full email or username string
};

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { login, refreshAuth, setUser } = useAuth();
  const { requestLocation } = useLocationContext();

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    document.title = "MHub — Sign In";
    return () => { document.title = "MHub"; };
  }, []);

  const getReturnPath = () => {
    const from = location.state?.from?.pathname || "/";
    return from === "/login" ? "/" : from;
  };

  const handleDemoLogin = async () => {
    setErrorMessage("");
    setLoading(true);
    try {
      setForm({ identifier: DEMO_ACCOUNT.mobile, password: DEMO_ACCOUNT.password });
      const demoUser = {
        id: "demo-user-001",
        name: "Demo User",
        phone: "9999999999",
        email: "demo@mhub.app",
        role: "user",
        tier: "gold",
        current_plan: "gold",
        kyc_verified: true,
      };
      setUser(demoUser);
      localStorage.setItem("authSession", "true");
      localStorage.setItem("userId", "demo-user-001");
      localStorage.setItem("user", JSON.stringify(demoUser));

      toast({
        title: "Demo Mode Active ⚡",
        description: "Signed in as Demo User with Gold Plan & Verified KYC.",
      });
      navigate(getReturnPath(), { replace: true });
    } catch (err) {
      setErrorMessage("Demo login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    const cleanIdentifier = normalizeIdentifier(form.identifier);

    if (!cleanIdentifier || !form.password) {
      const msg = "Please enter your Mobile Number / Email and Password.";
      setErrorMessage(msg);
      return;
    }

    setLoading(true);
    try {
      const deviceId = getDeviceId();
      const body = {
        identifier: cleanIdentifier,
        password: form.password,
        deviceId,
      };

      const result = await login(body);

      if (result?.success) {
        await refreshAuth();
        requestLocation({ silent: true }).catch(() => {});
        toast({
          title: "Sign-in Successful! 🎉",
          description: "Welcome back to MHub Platform.",
        });
        navigate(getReturnPath(), { replace: true });
        return;
      }

      const msg = result?.error || result?.message || "Invalid mobile number/email or password. Please try again.";
      setErrorMessage(msg);
    } catch (err) {
      console.error("Login Error:", err);
      const msg = err.response?.data?.error || err.response?.data?.message || "Invalid credentials. Please verify your details and try again.";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen mhub-premium-page flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-4">
      <div className="w-full max-w-md space-y-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs text-indigo-300 hover:text-white transition-colors"
        >
          ← Back
        </button>

        <Card className="border-slate-800 bg-slate-900/90 backdrop-blur-xl shadow-2xl text-slate-100 rounded-3xl overflow-hidden">
          <CardHeader className="text-center bg-gradient-to-r from-indigo-600 to-blue-600 p-6">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white mb-2 shadow-inner">
              <Shield className="w-6 h-6" />
            </div>
            <CardTitle className="text-2xl font-black text-white">Welcome Back</CardTitle>
            <CardDescription className="text-indigo-100 text-xs mt-1">
              Sign in with Mobile Number, Email, or Username
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-4">
            {/* Quick Demo Login */}
            <button
              type="button"
              disabled={loading}
              onClick={handleDemoLogin}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 hover:brightness-110 transition-all"
            >
              <Zap className="w-4 h-4 fill-slate-950" /> 1-Click Instant Demo Login
            </button>

            {/* Ready Test Accounts Hint */}
            <div className="p-3 rounded-xl bg-indigo-950/60 border border-indigo-500/20 text-indigo-200 text-xs space-y-1">
              <div className="font-bold text-amber-400 flex items-center gap-1">
                <FlaskConical className="w-3.5 h-3.5" /> Test Account Credentials:
              </div>
              <div className="font-mono text-[11px] text-slate-300">
                • Unverified Test Account: <span className="text-white font-bold">9876543210</span> / <span className="text-white font-bold">Test@123456</span>
              </div>
              <div className="font-mono text-[11px] text-slate-300">
                • Verified Gold Account: <span className="text-white font-bold">9999999999</span> / <span className="text-white font-bold">Test@123456</span>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <Label htmlFor="identifier" className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-400" /> Mobile Number, Email, or Username *
                </Label>
                <Input
                  id="identifier"
                  type="text"
                  placeholder="9876543210 or newuser@mhub.com"
                  value={form.identifier}
                  onChange={(e) => setForm({ ...form, identifier: e.target.value })}
                  className="bg-slate-950/60 border-slate-800 text-sm text-slate-100 rounded-xl focus:border-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-indigo-400" /> Password *
                  </Label>
                  <Link to="/forgot-password" className="text-[11px] font-medium text-indigo-400 hover:text-indigo-300">
                    Forgot?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="bg-slate-950/60 border-slate-800 text-sm text-slate-100 rounded-xl focus:border-indigo-500 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-500 via-blue-600 to-sky-500 hover:from-indigo-600 hover:to-sky-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-500/25 mt-2 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Signing In...
                  </>
                ) : (
                  "Sign In to Platform"
                )}
              </Button>
            </form>

            <div className="text-center pt-2 border-t border-slate-800">
              <span className="text-xs text-slate-400">Don't have an account? </span>
              <Link to="/signup" className="text-xs font-bold text-indigo-400 hover:text-indigo-300 underline">
                Sign up here
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
