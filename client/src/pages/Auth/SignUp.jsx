import React, { useEffect, useMemo, useState } from "react";
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
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Shield,
  Lock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowRight,
  User,
  Phone,
  Mail,
  Gift,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { purgeLegacyTokens } from "@/utils/authStorage";

const normalizeMobile = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (/^91[6-9]\d{9}$/.test(digits)) return digits.slice(2);
  return digits;
};
const isValidMobile = (value) => /^[6-9]\d{9}$/.test(normalizeMobile(value));

export default function SignUp() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { refreshAuth, setUser } = useAuth();
  const [searchParams] = useSearchParams();

  const [form, setForm] = useState({
    name: "",
    mobile: "",
    email: "",
    password: "",
    confirmPassword: "",
    referralCode: "",
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const referralParam = useMemo(() => {
    const raw =
      searchParams.get("ref") ||
      searchParams.get("referral") ||
      searchParams.get("referralCode") ||
      searchParams.get("code") ||
      "";
    return String(raw || "").trim();
  }, [searchParams]);

  useEffect(() => {
    if (!referralParam) return;
    setForm((prev) =>
      prev.referralCode
        ? prev
        : { ...prev, referralCode: referralParam },
    );
  }, [referralParam]);

  const mobileStatus = useMemo(() => {
    if (!form.mobile) return null;
    return isValidMobile(form.mobile) ? "valid" : "invalid";
  }, [form.mobile]);

  const passwordStrength = useMemo(() => {
    const pw = form.password;
    if (!pw) return { score: 0, label: "", color: "" };
    let score = 0;
    if (pw.length >= 8) score += 1;
    if (pw.length >= 12) score += 1;
    if (/[A-Z]/.test(pw)) score += 1;
    if (/[a-z]/.test(pw)) score += 1;
    if (/\d/.test(pw)) score += 1;
    if (/[^A-Za-z0-9]/.test(pw)) score += 1;

    if (score <= 2) return { score: 1, label: t("weak") || "Weak", color: "bg-red-500" };
    if (score <= 4) return { score: 2, label: t("medium") || "Medium", color: "bg-yellow-500" };
    return { score: 3, label: t("strong") || "Strong", color: "bg-green-500" };
  }, [form.password, t]);

  const applyAuthResponse = async (response) => {
    const hasAuthSignal = Boolean(response?.token || response?.user);
    if (hasAuthSignal) {
      purgeLegacyTokens();
      localStorage.setItem("authSession", "true");
    }
    if (response?.user) {
      setUser(response.user);
    } else if (hasAuthSignal) {
      await refreshAuth();
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    const mobileDigits = normalizeMobile(form.mobile);

    if (!form.name.trim()) {
      const msg = "Please enter your full name.";
      setErrorMessage(msg);
      return;
    }

    if (!isValidMobile(mobileDigits)) {
      const msg = "Enter a valid 10-digit Indian mobile number.";
      setErrorMessage(msg);
      return;
    }

    if (!form.password || form.password.length < 6) {
      const msg = "Password must be at least 6 characters long.";
      setErrorMessage(msg);
      return;
    }

    if (form.password !== form.confirmPassword) {
      const msg = "Passwords do not match.";
      setErrorMessage(msg);
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/auth/signup", {
        name: form.name.trim(),
        phone: mobileDigits,
        email: form.email.trim() || undefined,
        password: form.password,
        referralCode: form.referralCode.trim() || undefined,
      });

      await applyAuthResponse(response);

      toast({
        title: "Account Created Successfully! 🎉",
        description: "Next step: Select your subscription plan to unlock full platform features.",
      });

      // Redirect to Tier Selection as Step 2 of onboarding
      navigate("/tier-selection");
    } catch (err) {
      console.error("Signup failed", err);
      const msg = err.response?.data?.error || err.response?.data?.message || "Registration failed. Please try again.";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen mhub-premium-page bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-slate-800 bg-slate-900/90 backdrop-blur-xl shadow-2xl text-slate-100 rounded-3xl overflow-hidden">
        <CardHeader className="text-center bg-gradient-to-r from-indigo-600 to-blue-600 p-6">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white mb-2 shadow-inner">
            <Sparkles className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-black text-white">Create Account</CardTitle>
          <CardDescription className="text-indigo-100 text-xs mt-1">
            Step 1 of 3: Fast & Secure Account Setup
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleRegisterSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-400" /> Full Name *
              </Label>
              <Input
                type="text"
                placeholder="e.g. Rahul Sharma"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-slate-950/60 border-slate-800 text-sm text-slate-100 rounded-xl focus:border-indigo-500"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-indigo-400" /> Mobile Number *
              </Label>
              <div className="relative">
                <Input
                  type="tel"
                  maxLength={10}
                  placeholder="9876543210"
                  value={form.mobile}
                  onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                  className="bg-slate-950/60 border-slate-800 text-sm text-slate-100 rounded-xl focus:border-indigo-500 pr-8"
                  required
                />
                {mobileStatus === "valid" && (
                  <CheckCircle className="w-4 h-4 text-emerald-400 absolute right-3 top-3" />
                )}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-indigo-400" /> Email Address (Optional)
              </Label>
              <Input
                type="email"
                placeholder="rahul@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="bg-slate-950/60 border-slate-800 text-sm text-slate-100 rounded-xl focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-indigo-400" /> Password *
                </Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="bg-slate-950/60 border-slate-800 text-sm text-slate-100 rounded-xl focus:border-indigo-500"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-300 font-semibold">Confirm *</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  className="bg-slate-950/60 border-slate-800 text-sm text-slate-100 rounded-xl focus:border-indigo-500"
                  required
                />
              </div>
            </div>

            {form.password && (
              <div className="flex items-center gap-2 pt-1">
                <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full transition-all ${passwordStrength.color}`} style={{ width: `${(passwordStrength.score / 3) * 100}%` }} />
                </div>
                <span className="text-[10px] text-slate-400 font-medium">{passwordStrength.label}</span>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
                <Gift className="w-3.5 h-3.5 text-indigo-400" /> Referral Code (Optional)
              </Label>
              <Input
                type="text"
                placeholder="e.g. MHUB100"
                value={form.referralCode}
                onChange={(e) => setForm({ ...form, referralCode: e.target.value })}
                className="bg-slate-950/60 border-slate-800 text-sm text-slate-100 rounded-xl uppercase"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-500 via-blue-600 to-sky-500 hover:from-indigo-600 hover:to-sky-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-500/25 mt-4 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Creating Account...
                </>
              ) : (
                <>
                  Continue to Plan Selection <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          <div className="text-center pt-2 border-t border-slate-800">
            <span className="text-xs text-slate-400">Already have an account? </span>
            <Link to="/login" className="text-xs font-bold text-indigo-400 hover:text-indigo-300 underline">
              Sign in here
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
