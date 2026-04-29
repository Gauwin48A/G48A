import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PageAuthGateState,
  PageErrorState,
  PageLoadingState,
} from "@/components/page-state/PageStateBlocks";
import { useTranslation } from "react-i18next";
import { hasAuthSession } from "@/utils/authStorage";

const KycVerification = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const tr = useCallback(
    (key, fallback, options = {}) => {
      const value = t(key, { defaultValue: fallback, ...options });
      if (typeof value !== "string" || !value.trim() || value === key) {
        return fallback;
      }
      return value;
    },
    [t],
  );

  const hasSession = hasAuthSession();

  const [formData, setFormData] = useState({
    aadhaar_number: "",
    pan_number: "",
    kyc_front: null,
    kyc_back: null,
  });
  const [successMessage, setSuccessMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [kycStatus, setKycStatus] = useState(null);

  const fetchStatus = useCallback(async () => {
    if (!hasSession) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError("");

    try {
      const response = await api.get("/users/kyc/status");
      setKycStatus(response || null);
    } catch (error) {
      if (import.meta.env.DEV) console.error("KYC status fetch failed", error);
      setLoadError(
        tr(
          "kyc_status_load_failed",
          "Unable to load your KYC status right now. Please retry.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, [hasSession, tr]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (event) => {
    const { name, files } = event.target;
    setFormData((prev) => ({ ...prev, [name]: files?.[0] || null }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSuccessMessage("");
    setSubmitError("");
    setIsSubmitting(true);

    const payload = new FormData();
    payload.append("aadhaar_number", formData.aadhaar_number.trim());
    payload.append("pan_number", formData.pan_number.trim().toUpperCase());
    if (formData.kyc_front) payload.append("kyc_front", formData.kyc_front);
    if (formData.kyc_back) payload.append("kyc_back", formData.kyc_back);

    try {
      const response = await api.post("/users/kyc/submit", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSuccessMessage(
        response?.message ||
          tr("kyc_documents_submitted", "Documents submitted successfully."),
      );
      setKycStatus((prev) => ({
        ...prev,
        ...(response || {}),
        status: response?.status || "PENDING",
      }));
      fetchStatus();
    } catch (error) {
      if (import.meta.env.DEV) console.error("KYC submission failed", error);
      setSubmitError(
        tr(
          "kyc_submission_failed",
          "KYC submission failed. Please verify details and retry.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const pageClassName =
    "min-h-screen mhub-premium-page nav-clearance bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900/60 dark:to-slate-950 dark:bg-gradient-to-br";

  if (!hasSession) {
    return (
      <div className={`${pageClassName} flex items-center justify-center p-4`}>
        <div className="max-w-md w-full page-shell page-pad">
          <PageAuthGateState
            marker="auth-gate"
            title={tr("login_required", "Login required")}
            description={tr(
              "kyc_login_required",
              "Please log in to start KYC verification.",
            )}
            primaryAction={
              <Button
                onClick={() =>
                  navigate("/login", { state: { returnTo: "/kyc" } })
                }
              >
                {tr("go_to_login", "Go to Login")}
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`${pageClassName} flex items-center justify-center p-4`}>
        <div className="max-w-md w-full page-shell page-pad">
          <PageLoadingState
            marker="loading"
            title={tr("kyc_loading_title", "Loading KYC status...")}
            description={tr(
              "kyc_loading_desc",
              "Checking your latest verification status.",
            )}
          />
        </div>
      </div>
    );
  }

  if (loadError && !kycStatus) {
    return (
      <div className={`${pageClassName} flex items-center justify-center p-4`}>
        <div className="max-w-md w-full page-shell page-pad">
          <PageErrorState
            marker="error"
            className="border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10 dark:border-red-600/40 dark:bg-red-950/20"
            title={tr("kyc_status_unavailable", "KYC status unavailable")}
            description={loadError}
            onRetry={fetchStatus}
            secondaryAction={
              <Button variant="outline" onClick={() => navigate("/profile")}>
                {tr("back_to_profile", "Back to profile")}
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  if (kycStatus?.status === "VERIFIED") {
    return (
      <div className={`${pageClassName} flex items-center justify-center p-4`}>
        <Card className="max-w-lg w-full border-green-200 bg-green-50 dark:border-emerald-400/30 dark:bg-emerald-500/10 page-shell page-pad dark:border-green-600/40 dark:bg-green-950/20">
          <CardContent className="pt-8 text-center space-y-4">
            <h2 className="text-xl sm:text-3xl font-bold text-green-800 dark:text-green-200">
              {tr("kyc_verified_title", "KYC Verified")}
            </h2>
            <p className="text-green-700 dark:text-green-300">
              {tr(
                "kyc_verified_desc",
                "Your identity has been verified and your trust badge is active.",
              )}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                className="bg-green-600 hover:bg-green-700 text-white dark:bg-green-700/40 dark:hover:bg-green-700/40 dark:text-white"
                onClick={() => navigate("/profile")}
              >
                {tr("view_profile", "View Profile")}
              </Button>
              <Button variant="outline" onClick={() => navigate("/dashboard")}
              >
                {tr("open_dashboard", "Open Dashboard")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (kycStatus?.status === "PENDING") {
    return (
      <div className={`${pageClassName} flex items-center justify-center p-4`}>
        <Card className="max-w-lg w-full border-amber-200 bg-amber-50 dark:border-amber-400/30 dark:bg-amber-500/10 page-shell page-pad dark:border-amber-600/40 dark:bg-amber-950/20">
          <CardContent className="pt-8 text-center space-y-4">
            <h2 className="text-xl sm:text-3xl font-bold text-amber-800 dark:text-amber-200">
              {tr("kyc_pending_title", "Verification in progress")}
            </h2>
            <p className="text-amber-700 dark:text-amber-300">
              {tr(
                "kyc_pending_desc",
                "We are reviewing your documents. Most requests are reviewed within 24 hours.",
              )}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                className="bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-700/40 dark:hover:bg-amber-700/40 dark:text-white"
                onClick={fetchStatus}
              >
                {tr("refresh_status", "Refresh status")}
              </Button>
              <Button variant="outline" onClick={() => navigate("/profile")}>
                {tr("back_to_profile", "Back to profile")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`${pageClassName} py-8 px-4`}>
      <div className="max-w-[640px] mx-auto">
        <Card className="mb-6 border-slate-200/80 bg-white/80 backdrop-blur dark:border-slate-700 dark:bg-slate-900/60">
          <CardHeader>
            <CardTitle>
              {tr("kyc_identity_title", "Identity Verification (KYC)")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 dark:text-gray-200">
              {tr(
                "kyc_identity_desc",
                "Submit your Aadhaar and PAN details with clear front/back ID images to activate verified trust markers.",
              )}
            </p>
            {loadError && (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200 dark:border-red-600/40 dark:bg-red-950/20 dark:text-red-300">
                {loadError}
              </div>
            )}
            {kycStatus?.rejection_reason && (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200 dark:border-red-600/40 dark:bg-red-950/20 dark:text-red-300">
                {tr("kyc_rejected_prefix", "Previous request rejected:")}{" "}
                {kycStatus.rejection_reason}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white/90 backdrop-blur dark:border-slate-700 dark:bg-slate-900/70">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="aadhaar_number">
                  {tr("aadhaar_number", "Aadhaar Number")}
                </Label>
                <Input
                  id="aadhaar_number"
                  type="text"
                  name="aadhaar_number"
                  value={formData.aadhaar_number}
                  onChange={handleInputChange}
                  placeholder={tr(
                    "aadhaar_number_placeholder",
                    "12-digit Aadhaar number",
                  )}
                  pattern="\\d{12}"
                  required
                />
              </div>
              <div>
                <Label htmlFor="pan_number">
                  {tr("pan_number", "PAN Number")}
                </Label>
                <Input
                  id="pan_number"
                  type="text"
                  name="pan_number"
                  value={formData.pan_number}
                  onChange={handleInputChange}
                  placeholder={tr("pan_placeholder", "ABCDE1234F")}
                  pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
                  required
                />
              </div>
              <div>
                <Label htmlFor="kyc_front">
                  {tr("kyc_id_front", "ID Proof (Front)")}
                </Label>
                <Input
                  id="kyc_front"
                  type="file"
                  name="kyc_front"
                  onChange={handleFileChange}
                  accept="image/*,.pdf"
                  required
                />
              </div>
              <div>
                <Label htmlFor="kyc_back">
                  {tr("kyc_id_back", "ID Proof (Back)")}
                </Label>
                <Input
                  id="kyc_back"
                  type="file"
                  name="kyc_back"
                  onChange={handleFileChange}
                  accept="image/*,.pdf"
                  required
                />
              </div>
              {submitError && (
                <p className="text-sm text-red-600 dark:text-red-300">
                  {submitError}
                </p>
              )}
              {successMessage && (
                <p className="text-sm text-green-600 dark:text-green-300">
                  {successMessage}
                </p>
              )}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700/40 dark:hover:bg-blue-700/40 dark:text-white"
                >
                  {isSubmitting
                    ? tr("submitting", "Submitting...")
                    : tr("submit_documents", "Submit Documents")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={fetchStatus}
                >
                  {tr("refresh_status", "Refresh status")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default KycVerification;
