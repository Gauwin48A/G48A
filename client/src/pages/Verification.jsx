import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Shield,
  Upload,
  CreditCard,
  FileText,
} from "lucide-react";
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
import { useTranslation } from "react-i18next";
import AadhaarOtpVerify from "@/components/AadhaarOtpVerify";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { getAccessToken, getUserId } from "@/utils/authStorage";
import PageDensityToggle from "@/components/ui/PageDensityToggle";
import { usePageDensity } from "@/hooks/usePageDensity";
const Verification = () => {
  const navigate = useNavigate(),
    { toast } = useToast(),
    { t: translate } = useTranslation(),
    { density, setDensity } = usePageDensity("mhub_verification_density"),
    densityClass = density === "compact" ? " mhub-compact" : "",
    { user, loading: authLoading } = useAuth(),
    [statusLoading, setStatusLoading] = useState(!0),
    [submitting, setSubmitting] = useState(!1),
    [isVerified, setIsVerified] = useState(!1),
    [fetchError, setFetchError] = useState(""),
    [kycStatus, setKycStatus] = useState(""),
    [retryCount, setRetryCount] = useState(0),
    [formData, setFormData] = useState({ aadhaarNumber: "", panNumber: "" }),
    [files, setFiles] = useState({ aadhaarXml: null, aadhaarImage: null, panImage: null }),
    accessToken = getAccessToken(),
    userId = getUserId(user),
    isAuthenticated = useMemo(() => !!(user || (accessToken && userId)), [user, userId, accessToken]);
  const statusNormalized = useMemo(
    () => String(kycStatus || "").toUpperCase(),
    [kycStatus],
  );
  const verificationSteps = useMemo(
    () => [
      { key: "details", label: translate("enter_details") || "Enter details" },
      { key: "upload", label: translate("upload_documents") || "Upload documents" },
      { key: "submit", label: translate("submit_request") || "Submit request" },
      { key: "review", label: translate("under_review") || "Under review" },
      { key: "approved", label: translate("verified") || "Verified" },
    ],
    [translate],
  );
  const stepIndex = useMemo(() => {
    if (statusNormalized === "APPROVED" || statusNormalized === "VERIFIED")
      return 4;
    if (statusNormalized === "REJECTED") return 2;
    if (
      statusNormalized === "PENDING" ||
      statusNormalized === "UNDER_REVIEW" ||
      statusNormalized === "SUBMITTED"
    )
      return 3;
    if (formData.aadhaarNumber && formData.panNumber && (files.aadhaarImage || files.aadhaarXml))
      return 2;
    if (formData.aadhaarNumber || formData.panNumber) return 1;
    return 0;
  }, [statusNormalized, formData, files]);
  const progressPercent = useMemo(() => {
    const denom = Math.max(1, verificationSteps.length - 1);
    return Math.round((stepIndex / denom) * 100);
  }, [stepIndex, verificationSteps.length]);
  const statusLabel = useMemo(() => {
    if (statusNormalized === "APPROVED" || statusNormalized === "VERIFIED")
      return translate("verified") || "Verified";
    if (statusNormalized === "REJECTED")
      return translate("verification_rejected") || "Needs resubmission";
    if (
      statusNormalized === "PENDING" ||
      statusNormalized === "UNDER_REVIEW" ||
      statusNormalized === "SUBMITTED"
    )
      return translate("verification_under_review") || "Under review";
    return translate("not_submitted") || "Not submitted yet";
  }, [translate, statusNormalized]);
  const statusHint = useMemo(() => {
    if (statusNormalized === "REJECTED")
      return translate("verification_rejected_hint") || "Update details and resubmit.";
    if (statusNormalized === "PENDING" || statusNormalized === "UNDER_REVIEW")
      return translate("verification_review_hint") || "We usually respond within 24-48 hours.";
    if (statusNormalized === "APPROVED" || statusNormalized === "VERIFIED")
      return translate("verification_complete_hint") || "You now have full access.";
    return translate("verification_start_hint") || "Complete the steps below to verify.";
  }, [translate, statusNormalized]);
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setStatusLoading(!1);
      return;
    }
    let cancelled = !1;
    return (
      (async () => {
        try {
          const response = await api.get("/users/kyc/status", { skipActiveAppFilter: true }),
            data = response?.data ?? response,
            normalizedStatus = String(data?.status || "").toUpperCase();
          setKycStatus(normalizedStatus);
          cancelled ||
            (setFetchError(""),
            setIsVerified(normalizedStatus === "APPROVED" || normalizedStatus === "VERIFIED"),
            (data?.aadhaar_number || data?.pan_number) &&
              setFormData((prev) => ({
                ...prev,
                aadhaarNumber: data?.aadhaar_number || prev.aadhaarNumber,
                panNumber: data?.pan_number || prev.panNumber,
              })));
        } catch (err) {
          import.meta.env.DEV &&
            console.error("[Verification] Failed to fetch KYC status:", err),
            cancelled || setFetchError(err?.message || "Failed to load verification status.");
        } finally {
          cancelled || setStatusLoading(!1);
        }
      })(),
      () => {
        cancelled = !0;
      }
    );
  }, [authLoading, isAuthenticated, retryCount]);
  const handleInputChange = (evt) => {
      const { name, value } = evt.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
    },
    handleFileChange = (fieldName) => (evt) => {
      const file = evt.target.files?.[0];
      if (file) {
        if (fieldName === "aadhaarXml" && !file.name.endsWith(".xml")) {
          toast({
            title: translate("invalid_file"),
            description: translate("upload_valid_xml"),
            variant: "destructive",
          });
          return;
        }
        if (
          (fieldName === "aadhaarImage" || fieldName === "panImage") &&
          !file.type.startsWith("image/")
        ) {
          toast({
            title: translate("invalid_file"),
            description: translate("upload_valid_image"),
            variant: "destructive",
          });
          return;
        }
        setFiles((prev) => ({ ...prev, [fieldName]: file })),
          toast({
            title: translate("file_uploaded"),
            description:
              translate("document_uploaded") || "Document uploaded successfully",
          });
      }
    },
    handleSubmit = async () => {
      if (!isAuthenticated) {
        navigate("/login", { state: { returnTo: "/verification" } });
        return;
      }
      if (!formData.aadhaarNumber || !formData.panNumber) {
        toast({
          title: translate("incomplete_form") || "Incomplete form",
          description:
            translate("enter_aadhaar_pan") || "Aadhaar and PAN are required.",
          variant: "destructive",
        });
        return;
      }
      if (!files.aadhaarImage) {
        toast({
          title: translate("missing_document") || "Missing document",
          description:
            translate("aadhaar_image_required") ||
            "Front ID image is required for KYC.",
          variant: "destructive",
        });
        return;
      }
      setSubmitting(!0);
      try {
        const payload = new FormData();
        payload.append("aadhaar_number", formData.aadhaarNumber),
          payload.append("pan_number", formData.panNumber),
          payload.append("kyc_front", files.aadhaarImage),
          files.panImage && payload.append("kyc_back", files.panImage);
        const result = await api.post("/users/kyc/submit", payload, {
              headers: { "Content-Type": "multipart/form-data" },
            }),
          responseData = result?.data ?? result,
          newStatus = String(responseData?.status || "").toUpperCase();
        setKycStatus(newStatus);
        setIsVerified(newStatus === "APPROVED" || newStatus === "VERIFIED"),
          toast({
            title: translate("verification_submitted") || "Verification submitted",
            description:
              responseData?.message ||
              translate("verification_under_review") ||
              "Your KYC request is under review.",
          }),
          navigate("/profile");
      } catch (err) {
        toast({
          title: translate("error") || "Error",
          description: err.message || "Failed to save",
          variant: "destructive",
        });
      } finally {
        setSubmitting(!1);
      }
    };
  return authLoading || statusLoading
    ? React.createElement(
          "div",
          {
            className:
              "min-h-screen mhub-premium-page flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:bg-gradient-to-br" +
              densityClass,
          },
        React.createElement(
          "div",
          { className: "text-center dark:text-center" },
          React.createElement("div", {
            className:
              "w-16 h-16 border-4 border-sky-300 border-t-transparent rounded-full animate-spin mx-auto mb-4 dark:border-4 dark:border-slate-700 dark:border-t-transparent",
          }),
          React.createElement(
            "p",
            { className: "text-gray-300 dark:text-gray-300" },
            translate("loading") || "Loading...",
          ),
        ),
      )
    : isAuthenticated
      ? React.createElement(
          "div",
          {
            className:
              "min-h-screen mhub-premium-page bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:bg-gradient-to-br" +
              densityClass,
            style: { paddingBottom: "120px" },
          },
          React.createElement(
            "div",
            { className: "max-w-2xl mx-auto px-4 py-8" },
            React.createElement(
              "div",
              { className: "text-center mb-4 dark:text-center" },
              React.createElement(
                "div",
                {
                  className:
                    "w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-sky-300 to-blue-600 flex items-center justify-center shadow-lg dark:bg-gradient-to-br",
                },
                React.createElement(Shield, { className: "w-8 h-8 text-white dark:text-white" }),
              ),
              React.createElement(
                "h1",
                { className: "text-3xl font-bold text-white mb-1 dark:text-white" },
                translate("identity_verification") || "Identity Verification",
              ),
              React.createElement(
                "p",
                { className: "text-gray-400 dark:text-gray-300" },
                translate("aadhaar_subtitle"),
              ),
              React.createElement(
                "div",
                { className: "mt-3 flex justify-center" },
                React.createElement(PageDensityToggle, {
                  value: density,
                  onChange: setDensity,
                }),
              ),
            ),
            isVerified &&
              React.createElement(
                Card,
                {
                  className:
                    "mb-6 border border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30 dark:border dark:border-emerald-600/40 dark:bg-emerald-950/20",
                },
                React.createElement(
                  CardContent,
                  { className: "p-5 flex items-center justify-between gap-4" },
                  React.createElement(
                    "div",
                    null,
                    React.createElement(
                      "p",
                      { className: "text-sm font-semibold text-emerald-700 dark:text-emerald-300" },
                      translate("verified") || "Verified",
                    ),
                    React.createElement(
                      "p",
                      { className: "text-xs text-emerald-600 dark:text-emerald-300" },
                      translate("verification_complete_hint") ||
                        "Your verification is complete.",
                    ),
                  ),
                  React.createElement(
                    Button,
                    {
                      type: "button",
                      variant: "outline",
                      onClick: () => navigate("/profile"),
                      className: "border-emerald-300 text-emerald-700 dark:border-emerald-600/40 dark:text-emerald-300",
                    },
                    translate("view_profile") || "View profile",
                  ),
                ),
              ),
            React.createElement(
              Card,
              {
                className:
                  "mb-6 mhub-premium-surface",
              },
              React.createElement(
                CardContent,
                { className: "p-5 space-y-4" },
                React.createElement(
                  "div",
                  {
                    className:
                      "flex flex-wrap items-start justify-between gap-4",
                  },
                  React.createElement(
                    "div",
                    null,
                    React.createElement(
                      "p",
                      {
                        className:
                          "text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300",
                      },
                      translate("verification_status") || "Verification status",
                    ),
                    React.createElement(
                      "p",
                      {
                        className:
                          "text-lg font-semibold text-slate-900 dark:text-white dark:text-slate-100",
                      },
                      statusLabel,
                    ),
                    React.createElement(
                      "p",
                      { className: "text-xs text-slate-500 dark:text-slate-300" },
                      statusHint,
                    ),
                  ),
                  React.createElement(
                    "div",
                    { className: "text-right dark:text-right" },
                    React.createElement(
                      "span",
                      {
                        className: isVerified
                          ? "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-emerald-100 text-emerald-800"
                          : "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-800",
                      },
                      statusLabel,
                    ),
                  ),
                ),
                React.createElement(
                  "div",
                  {
                    className:
                      "h-2 w-full rounded-full bg-slate-200 overflow-hidden dark:bg-slate-900",
                  },
                  React.createElement("div", {
                    className: "h-full bg-blue-600 dark:bg-blue-700/40",
                    style: { width: `${progressPercent}%` },
                  }),
                ),
                React.createElement(
                  "ol",
                  { className: "grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs" },
                  verificationSteps.map((step, index) =>
                    React.createElement(
                      "li",
                      { key: step.key, className: "flex items-start gap-2" },
                      React.createElement(
                        "span",
                        {
                          className:
                            index < stepIndex
                              ? "flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold bg-emerald-500 text-white border-emerald-500"
                              : index === stepIndex
                                ? "flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold bg-blue-600 text-white border-blue-600"
                                : "flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold bg-slate-100 text-slate-500 dark:text-slate-300 border-slate-300",
                        },
                        index + 1,
                      ),
                      React.createElement(
                        "span",
                        {
                          className:
                            index < stepIndex
                              ? "text-emerald-700"
                              : index === stepIndex
                                ? "text-blue-700"
                                : "text-slate-500 dark:text-slate-300",
                        },
                        step.label,
                      ),
                    ),
                  ),
                ),
              ),
            ),
            React.createElement(
              Card,
              {
                className:
                  "mhub-premium-surface rounded-3xl overflow-hidden",
              },
              React.createElement(
                CardHeader,
                {
                  className:
                    "bg-gradient-to-r from-sky-300 to-blue-600 text-white dark:bg-gradient-to-r dark:text-white",
                },
                React.createElement(
                  CardTitle,
                  { className: "text-xl" },
                  translate("identity_verification") || "Identity Verification",
                ),
                React.createElement(
                  CardDescription,
                  { className: "text-blue-100 dark:text-blue-200" },
                  translate("enter_aadhaar_pan"),
                ),
              ),
              React.createElement(
                CardContent,
                { className: "p-5" },
                fetchError &&
                  React.createElement(
                    "div",
                    {
                      className:
                        "mb-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 p-4 flex flex-wrap items-center justify-between gap-2 dark:border dark:border-red-600/40 dark:bg-red-950/20",
                    },
                    React.createElement(
                      "p",
                      { className: "text-sm text-red-700 dark:text-red-300" },
                      fetchError,
                    ),
                    React.createElement(
                      Button,
                      {
                        type: "button",
                        variant: "outline",
                        onClick: () => setRetryCount((prev) => prev + 1),
                      },
                      "Retry",
                    ),
                  ),
                React.createElement(
                  "div",
                  { className: "space-y-3" },
                  React.createElement(
                    "div",
                    { className: "grid grid-cols-1 md:grid-cols-2 gap-3" },
                    React.createElement(
                      "div",
                      null,
                      React.createElement(
                        Label,
                        {
                          htmlFor: "aadhaarNumber",
                          className:
                            "text-sm font-semibold flex items-center space-x-2 text-slate-700 dark:text-gray-300 dark:text-slate-100",
                        },
                        React.createElement(CreditCard, { className: "w-4 h-4" }),
                        React.createElement("span", null, translate("aadhaar_number")),
                      ),
                      React.createElement(Input, {
                        id: "aadhaarNumber",
                        name: "aadhaarNumber",
                        type: "text",
                        value: formData.aadhaarNumber,
                        onChange: handleInputChange,
                        className:
                          "mt-2 h-12 border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:bg-gray-700 dark:text-white rounded-xl dark:border-2 dark:border-gray-700 dark:focus:border-blue-500/40",
                        placeholder: translate("enter_aadhaar") || "XXXX XXXX XXXX",
                        maxLength: "14",
                      }),
                      React.createElement(
                        "div",
                        { className: "mt-4" },
                        React.createElement(AadhaarOtpVerify, {
                          onVerified: () => setIsVerified(!0),
                          onError: () => setIsVerified(!1),
                        }),
                        isVerified &&
                          React.createElement(
                            "div",
                            {
                              className:
                                "text-green-600 dark:text-green-400 text-sm mt-2 dark:text-green-300",
                            },
                            translate("aadhaar_verified_success") ||
                              "Aadhaar verified successfully",
                          ),
                      ),
                    ),
                    React.createElement(
                      "div",
                      null,
                      React.createElement(
                        Label,
                        {
                          htmlFor: "panNumber",
                          className:
                            "text-sm font-semibold flex items-center space-x-2 text-slate-700 dark:text-gray-300 dark:text-slate-100",
                        },
                        React.createElement(CreditCard, { className: "w-4 h-4" }),
                        React.createElement("span", null, translate("pan_number")),
                      ),
                      React.createElement(Input, {
                        id: "panNumber",
                        name: "panNumber",
                        type: "text",
                        value: formData.panNumber,
                        onChange: (evt) =>
                          handleInputChange({
                            ...evt,
                            target: {
                              ...evt.target,
                              name: evt.target.name,
                              value: String(evt.target.value || "").toUpperCase(),
                            },
                          }),
                        className:
                          "mt-2 h-12 border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:bg-gray-700 dark:text-white rounded-xl dark:border-2 dark:border-gray-700 dark:focus:border-blue-500/40",
                        placeholder: translate("enter_pan") || "ABCDE1234F",
                        maxLength: "10",
                        style: { textTransform: "uppercase" },
                      }),
                    ),
                  ),
                  React.createElement(
                    "div",
                    { className: "space-y-4" },
                    React.createElement(
                      "div",
                      {
                        className:
                          "border-2 border-dashed rounded-xl p-6 bg-sky-50 dark:bg-[var(--surface-2)] border-sky-300 dark:border-blue-600 dark:border-2 dark:border-dashed dark:bg-slate-900 dark:border-slate-700",
                      },
                      React.createElement(
                        Label,
                        {
                          className:
                            "text-sm font-semibold flex items-center space-x-2 mb-3 text-slate-700 dark:text-gray-300 dark:text-slate-100",
                        },
                        React.createElement(FileText, { className: "w-4 h-4" }),
                        React.createElement("span", null, translate("aadhaar_xml")),
                      ),
                      React.createElement(
                        "div",
                        { className: "text-center dark:text-center" },
                        React.createElement(Upload, {
                          className:
                            "mx-auto h-12 w-12 mb-4 text-sky-300 dark:text-blue-500 dark:text-slate-100",
                        }),
                        React.createElement(Input, {
                          id: "aadhaarXml",
                          type: "file",
                          accept: ".xml",
                          onChange: handleFileChange("aadhaarXml"),
                          className: "sr-only",
                        }),
                        React.createElement(
                          Button,
                          {
                            type: "button",
                            variant: "outline",
                            onClick: () =>
                              document.getElementById("aadhaarXml")?.click(),
                          },
                          translate("choose_file"),
                        ),
                        files.aadhaarXml &&
                          React.createElement(
                            "p",
                            {
                              className:
                                "text-sm text-green-600 mt-2 font-medium dark:text-green-300",
                            },
                            files.aadhaarXml.name,
                          ),
                      ),
                    ),
                    React.createElement(
                      "div",
                      {
                        className:
                          "border-2 border-dashed rounded-xl p-6 bg-sky-50 dark:bg-[var(--surface-2)] border-sky-300 dark:border-blue-600 dark:border-2 dark:border-dashed dark:bg-slate-900 dark:border-slate-700",
                      },
                      React.createElement(
                        Label,
                        {
                          className:
                            "text-sm font-semibold flex items-center space-x-2 mb-3 text-slate-700 dark:text-gray-300 dark:text-slate-100",
                        },
                        React.createElement(FileText, { className: "w-4 h-4" }),
                        React.createElement("span", null, translate("aadhaar_image")),
                      ),
                      React.createElement(
                        "div",
                        { className: "text-center dark:text-center" },
                        React.createElement(Upload, {
                          className:
                            "mx-auto h-12 w-12 mb-4 text-sky-300 dark:text-blue-500 dark:text-slate-100",
                        }),
                        React.createElement(Input, {
                          id: "aadhaarImage",
                          type: "file",
                          accept: "image/*",
                          onChange: handleFileChange("aadhaarImage"),
                          className: "sr-only",
                        }),
                        React.createElement(
                          Button,
                          {
                            type: "button",
                            variant: "outline",
                            onClick: () =>
                              document.getElementById("aadhaarImage")?.click(),
                          },
                          translate("choose_image"),
                        ),
                        files.aadhaarImage &&
                          React.createElement(
                            "p",
                            {
                              className:
                                "text-sm text-green-600 mt-2 font-medium dark:text-green-300",
                            },
                            files.aadhaarImage.name,
                          ),
                      ),
                    ),
                    React.createElement(
                      "div",
                      {
                        className:
                          "border-2 border-dashed rounded-xl p-6 bg-sky-50 dark:bg-[var(--surface-2)] border-sky-300 dark:border-blue-600 dark:border-2 dark:border-dashed dark:bg-slate-900 dark:border-slate-700",
                      },
                      React.createElement(
                        Label,
                        {
                          className:
                            "text-sm font-semibold flex items-center space-x-2 mb-3 text-slate-700 dark:text-gray-300 dark:text-slate-100",
                        },
                        React.createElement(FileText, { className: "w-4 h-4" }),
                        React.createElement("span", null, translate("pan_image")),
                      ),
                      React.createElement(
                        "div",
                        { className: "text-center dark:text-center" },
                        React.createElement(Upload, {
                          className:
                            "mx-auto h-12 w-12 mb-4 text-sky-300 dark:text-blue-500 dark:text-slate-100",
                        }),
                        React.createElement(Input, {
                          id: "panImage",
                          type: "file",
                          accept: "image/*",
                          onChange: handleFileChange("panImage"),
                          className: "sr-only",
                        }),
                        React.createElement(
                          Button,
                          {
                            type: "button",
                            variant: "outline",
                            onClick: () =>
                              document.getElementById("panImage")?.click(),
                          },
                          translate("choose_image"),
                        ),
                        files.panImage &&
                          React.createElement(
                            "p",
                            {
                              className:
                                "text-sm text-green-600 mt-2 font-medium dark:text-green-300",
                            },
                            files.panImage.name,
                          ),
                      ),
                    ),
                  ),
                  React.createElement(
                    Button,
                    {
                      type: "button",
                      onClick: handleSubmit,
                      className:
                        "w-full py-6 text-white bg-sky-300 dark:bg-blue-600 hover:bg-blue-500 transition-colors duration-300 text-lg font-semibold rounded-xl dark:text-white dark:bg-slate-900 dark:hover:bg-blue-800/30",
                      disabled: submitting,
                    },
                    submitting
                      ? `${translate("saving") || "Saving"}...`
                      : translate("save_verification_details") || "Submit Verification",
                  ),
                ),
              ),
            ),
            React.createElement(
              "div",
              { className: "text-center text-sm mt-6 dark:text-center" },
              React.createElement(
                "span",
                { className: "text-gray-400 dark:text-gray-300" },
                translate("already_have_account"),
                " ",
              ),
              React.createElement(
                Link,
                {
                  to: "/login",
                  className:
                    "text-blue-400 hover:text-blue-300 font-medium hover:underline dark:text-blue-200 dark:hover:text-blue-200",
                },
                translate("sign_in_here"),
              ),
            ),
          ),
        )
      : React.createElement(
          "div",
          {
            className:
              "min-h-screen mhub-premium-page flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 dark:bg-gradient-to-br" +
              densityClass,
          },
          React.createElement(
            Card,
            {
              className:
                "max-w-md w-full mhub-premium-surface rounded-3xl overflow-hidden",
            },
            React.createElement(
              CardHeader,
              {
                className:
                  "text-center py-8 bg-gradient-to-r from-blue-600 to-blue-700 dark:text-center dark:bg-gradient-to-r",
              },
              React.createElement(
                "div",
                {
                  className:
                    "w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/20 flex items-center justify-center dark:bg-slate-900/20",
                },
                React.createElement(Shield, { className: "w-8 h-8 text-white dark:text-white" }),
              ),
              React.createElement(
                CardTitle,
                { className: "text-2xl text-white dark:text-white" },
                translate("identity_verification") || "Identity Verification",
              ),
              React.createElement(
                CardDescription,
                { className: "text-blue-100 dark:text-blue-200" },
                translate("aadhaar_subtitle"),
              ),
            ),
            React.createElement(
              CardContent,
              { className: "p-5 text-center dark:text-center" },
              React.createElement(
                "p",
                { className: "text-gray-600 dark:text-gray-300 mb-6 dark:text-gray-200" },
                translate("please_login_verify"),
              ),
              React.createElement(
                "div",
                { className: "flex flex-col gap-3" },
                React.createElement(
                  Link,
                  { to: "/login" },
                  React.createElement(
                    Button,
                    {
                      className:
                        "w-full bg-sky-300 hover:bg-blue-500 text-white dark:bg-slate-900 dark:hover:bg-blue-800/30 dark:text-white",
                    },
                    "Login",
                  ),
                ),
                React.createElement(
                  Link,
                  { to: "/signup" },
                  React.createElement(
                    Button,
                    { variant: "outline", className: "w-full dark:text-white" },
                    "Create Account",
                  ),
                ),
              ),
            ),
          ),
        );
};
var VerificationDefault = Verification;
export { VerificationDefault as default };

