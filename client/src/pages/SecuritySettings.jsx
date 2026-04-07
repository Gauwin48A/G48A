import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock3,
  KeyRound,
  Lock,
  Monitor,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Trash2,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";
import {
  PageEmptyState,
  PageErrorState,
  PageLoadingState,
} from "@/components/page-state/PageStateBlocks";
import { useTranslation } from "react-i18next";

function formatDateTime(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString();
}

function maskIp(ipAddress) {
  if (!ipAddress) return "Unknown";
  const text = String(ipAddress).trim();
  if (!text.includes(".")) return text;
  const parts = text.split(".");
  if (parts.length !== 4) return text;
  return `${parts[0]}.${parts[1]}.x.x`;
}

function SessionCard({ session, isRevoking, onRevoke }) {
  return (
    <div className="mhub-premium-surface rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200 dark:text-slate-100">
            <Monitor className="h-4 w-4 text-blue-600 dark:text-blue-400 dark:text-blue-300" />
            {session.device_fingerprint || "Unknown device"}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-300">
            {session.user_agent || "Unknown user agent"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onRevoke(session.session_id)}
          disabled={isRevoking}
          className="inline-flex items-center gap-1 rounded-md border border-red-200 dark:border-red-800 px-2.5 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:cursor-not-allowed disabled:opacity-60 dark:border dark:border-red-600/40 dark:text-red-300 dark:hover:bg-red-950/20"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {isRevoking ? "Revoking..." : "Revoke"}
        </button>
      </div>

      <div className="mt-3 grid gap-1 text-xs text-slate-600 dark:text-slate-400 sm:grid-cols-2 dark:text-slate-200">
        <p className="flex items-center gap-1.5">
          <Clock3 className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 dark:text-slate-300" />
          Last active:{" "}
          {formatDateTime(session.last_activity || session.created_at)}
        </p>
        <p>Created: {formatDateTime(session.created_at)}</p>
        <p>Expires: {formatDateTime(session.expires_at)}</p>
        <p>IP: {maskIp(session.ip_address)}</p>
      </div>
    </div>
  );
}

export default function SecuritySettings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const auth = useAuth() || {};
  const isAuthenticated = Boolean(auth.isAuthenticated ?? auth.user);
  const loading = Boolean(auth.loading);

  const [twoFaAvailable, setTwoFaAvailable] = useState(true);
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState("");

  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState("");
  const [setupQrCode, setSetupQrCode] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [backupCodes, setBackupCodes] = useState([]);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  const [disableMode, setDisableMode] = useState(false);
  const [disableCode, setDisableCode] = useState("");
  const [disableLoading, setDisableLoading] = useState(false);
  const [disableError, setDisableError] = useState("");

  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState("");
  const [revokingSessionId, setRevokingSessionId] = useState("");
  const [revokeAllLoading, setRevokeAllLoading] = useState(false);

  // Password change state
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      navigate("/login", { replace: true, state: { returnTo: "/security" } });
    }
  }, [isAuthenticated, loading, navigate]);

  const loadTwoFaStatus = useCallback(async () => {
    setStatusLoading(true);
    setStatusError("");
    try {
      const data = await api.get("/auth/2fa/status", { skipActiveAppFilter: true });
      setTwoFaEnabled(Boolean(data?.enabled));
      setTwoFaAvailable(data?.available !== false);
    } catch (error) {
      setStatusError(error?.message || "Failed to load 2FA status.");
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    setSessionsError("");
    try {
      const data = await api.get("/auth/sessions?limit=25", { skipActiveAppFilter: true });
      setSessions(Array.isArray(data?.sessions) ? data.sessions : []);
    } catch (error) {
      setSessionsError(error?.message || "Failed to load active sessions.");
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated || loading) return;
    void loadTwoFaStatus();
    void loadSessions();
  }, [isAuthenticated, loading, loadSessions, loadTwoFaStatus]);

  const beginSetup = async () => {
    setSetupLoading(true);
    setSetupError("");
    setVerifyError("");
    setDisableError("");
    setStatusError("");
    try {
      const data = await api.post("/auth/2fa/setup", {});
      setSetupQrCode(data?.qrCode || "");
      setBackupCodes([]);
      setDisableMode(false);
    } catch (error) {
      setSetupError(error?.message || "Failed to start 2FA setup.");
    } finally {
      setSetupLoading(false);
    }
  };

  const verifySetup = async () => {
    if (verifyCode.length < 6) {
      toast({
        title: "Invalid code",
        description: "Enter a valid 6-digit authenticator code.",
      });
      return;
    }

    setVerifyLoading(true);
    setVerifyError("");
    setStatusError("");
    try {
      const data = await api.post("/auth/2fa/verify", { code: verifyCode });
      setTwoFaEnabled(true);
      setVerifyCode("");
      setSetupQrCode("");
      setBackupCodes(Array.isArray(data?.backupCodes) ? data.backupCodes : []);
      toast({
        title: "2FA enabled",
        description: "Two-factor authentication is now active.",
      });
      await loadTwoFaStatus();
    } catch (error) {
      setVerifyError(error?.message || "Failed to verify authenticator code.");
    } finally {
      setVerifyLoading(false);
    }
  };

  const disableTwoFa = async () => {
    if (disableCode.length < 6) {
      toast({
        title: "Invalid code",
        description: "Enter a valid 6-digit authenticator code.",
      });
      return;
    }

    setDisableLoading(true);
    setDisableError("");
    setStatusError("");
    try {
      await api.post("/auth/2fa/disable", { code: disableCode });
      setTwoFaEnabled(false);
      setDisableCode("");
      setDisableMode(false);
      setBackupCodes([]);
      toast({
        title: "2FA disabled",
        description: "Two-factor authentication has been disabled.",
      });
      await loadTwoFaStatus();
    } catch (error) {
      setDisableError(
        error?.message || "Failed to disable two-factor authentication.",
      );
    } finally {
      setDisableLoading(false);
    }
  };

  const revokeSession = async (sessionId) => {
    setRevokingSessionId(sessionId);
    setSessionsError("");
    try {
      await api.delete(`/auth/sessions/${sessionId}`);
      setSessions((previous) =>
        previous.filter((session) => session.session_id !== sessionId),
      );
      toast({
        title: "Session revoked",
        description: "The selected session was revoked.",
      });
    } catch (error) {
      setSessionsError(error?.message || "Failed to revoke session.");
    } finally {
      setRevokingSessionId("");
    }
  };

  const handleChangePassword = async () => {
    setPwError("");
    setPwSuccess("");
    if (!pwCurrent || !pwNew || !pwConfirm) {
      setPwError("All fields are required.");
      return;
    }
    if (pwNew.length < 12) {
      setPwError("New password must be at least 12 characters.");
      return;
    }
    if (pwNew !== pwConfirm) {
      setPwError("New passwords do not match.");
      return;
    }
    if (pwCurrent === pwNew) {
      setPwError("New password must be different from current password.");
      return;
    }
    setPwLoading(true);
    try {
      await api.post("/auth/change-password", {
        currentPassword: pwCurrent,
        newPassword: pwNew,
      });
      setPwSuccess("Password changed successfully.");
      setPwCurrent("");
      setPwNew("");
      setPwConfirm("");
      toast({ title: "Password changed", description: "Your password has been updated." });
    } catch (error) {
      setPwError(error?.message || "Failed to change password.");
    } finally {
      setPwLoading(false);
    }
  };

  const revokeAllSessions = async () => {
    setRevokeAllLoading(true);
    setSessionsError("");
    try {
      await api.delete("/auth/sessions");
      setSessions([]);
      toast({
        title: "All sessions revoked",
        description: "All active sessions were revoked.",
      });
    } catch (error) {
      setSessionsError(error?.message || "Failed to revoke all sessions.");
    } finally {
      setRevokeAllLoading(false);
    }
  };

  const statusBadge = useMemo(() => {
    if (!twoFaAvailable) {
      return "Unavailable";
    }
    return twoFaEnabled ? "Enabled" : "Disabled";
  }, [twoFaAvailable, twoFaEnabled]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center mhub-premium-page bg-slate-50 dark:bg-slate-950">
        <div className="w-full max-w-md px-4 page-shell page-pad">
          <PageLoadingState
            title={t("loading_security_settings")}
            description="Checking authentication and security controls."
            marker="security-settings-loading"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen mhub-premium-page bg-slate-50 px-4 py-6 md:px-8 dark:bg-slate-950">
      <div className="mx-auto max-w-5xl space-y-6 page-shell page-pad">
        <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white shadow-md dark:bg-gradient-to-r dark:text-white">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-blue-100 dark:text-blue-200">
                Security Center
              </p>
              <h1 className="mt-1 text-2xl font-bold">
                Authentication & Session Control
              </h1>
              <p className="mt-2 text-sm text-blue-100 dark:text-blue-200">
                Manage two-factor authentication and active sessions for your
                account.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                void loadTwoFaStatus();
                void loadSessions();
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/20 dark:border dark:border-white/40 dark:bg-slate-900/10 dark:hover:bg-slate-900/20"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        <section className="mhub-premium-surface rounded-2xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-slate-200 dark:text-slate-100">
                <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 dark:text-emerald-300" />
                Two-Factor Authentication
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-300">
                Status:{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-200">
                  {statusBadge}
                </span>
              </p>
            </div>
            {!twoFaEnabled ? (
              <button
                type="button"
                onClick={beginSetup}
                disabled={setupLoading || statusLoading || !twoFaAvailable}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-700/40 dark:text-white dark:hover:bg-blue-700/40"
              >
                <KeyRound className="h-4 w-4" />
                {setupLoading ? "Preparing..." : "Enable 2FA"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setDisableMode((prev) => !prev);
                  setSetupQrCode("");
                  setBackupCodes([]);
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:border dark:border-red-600/40 dark:text-red-300 dark:hover:bg-red-950/20"
              >
                <Trash2 className="h-4 w-4" />
                {disableMode ? "Cancel Disable" : "Disable 2FA"}
              </button>
            )}
          </div>

          {statusError ? (
            <div className="mt-4">
              <PageErrorState
                title={t("two_factor_status_unavailable")}
                description={statusError}
                onRetry={() => {
                  void loadTwoFaStatus();
                }}
                retryLabel="Retry 2FA status"
                marker="security-twofa-status-error"
              />
            </div>
          ) : null}

          {statusLoading ? (
            <div className="mt-4">
              <PageLoadingState
                title={t("checking_2fa_status")}
                description="Loading authenticator setup state."
                marker="security-twofa-status-loading"
              />
            </div>
          ) : null}

          {setupLoading ? (
            <div className="mt-4">
              <PageLoadingState
                title={t("preparing_authenticator_setup")}
                description="Generating QR code and setup details."
                marker="security-setup-loading"
              />
            </div>
          ) : null}

          {setupError ? (
            <div className="mt-4">
              <PageErrorState
                title={t("could_not_start_2fa_setup")}
                description={setupError}
                marker="security-setup-error"
                secondaryAction={
                  <button
                    type="button"
                    data-ux-action="security_setup_dismiss_error"
                    onClick={() => setSetupError("")}
                    className="inline-flex items-center rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-950"
                  >
                    Dismiss
                  </button>
                }
              />
            </div>
          ) : null}

          {setupQrCode ? (
            <div className="mt-5 rounded-xl border border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700/50 p-4 dark:border dark:border-slate-700 dark:bg-slate-950">
              <p className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                Step 1: Scan QR code
              </p>
              <div className="flex justify-center rounded-lg border border-slate-200 dark:border-gray-600 bg-white p-4 dark:border dark:border-slate-700 dark:bg-slate-900">
                <img
                  src={setupQrCode}
                  alt={t("two_fa_qr_code_alt")}
                  className="h-44 w-44"
                />
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
                Step 2: Verify code
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <input
                  type="text"
                  value={verifyCode}
                  onChange={(event) =>
                    setVerifyCode(
                      event.target.value.replace(/\D/g, "").slice(0, 8),
                    )
                  }
                  placeholder={t("enter_authenticator_code")}
                  className="mhub-input w-56 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0"
                />
                <button
                  type="button"
                  onClick={verifySetup}
                  disabled={verifyLoading}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-700/40 dark:text-white dark:hover:bg-emerald-700/40"
                >
                  {verifyLoading ? "Verifying..." : "Verify & Enable"}
                </button>
              </div>
            </div>
          ) : null}

          {verifyLoading ? (
            <div className="mt-4">
              <PageLoadingState
                title={t("verifying_authenticator_code")}
                description="This takes only a moment."
                marker="security-verify-loading"
              />
            </div>
          ) : null}

          {verifyError ? (
            <div className="mt-4">
              <PageErrorState
                title={t("could_not_verify_code")}
                description={verifyError}
                marker="security-verify-error"
                secondaryAction={
                  <button
                    type="button"
                    data-ux-action="security_verify_clear_error"
                    onClick={() => setVerifyError("")}
                    className="inline-flex items-center rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-950"
                  >
                    Dismiss
                  </button>
                }
              />
            </div>
          ) : null}

          {backupCodes.length > 0 ? (
            <div className="mt-5 rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4 dark:border dark:border-amber-600/40 dark:bg-amber-950/20">
              <p className="font-semibold text-amber-800 dark:text-amber-300 dark:text-amber-200">
                Backup codes (save these now)
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                {backupCodes.map((code) => (
                  <div
                    key={code}
                    className="rounded border border-amber-300 dark:border-amber-600 mhub-premium-surface px-2 py-1.5 font-mono text-slate-800 dark:text-slate-200 dark:border dark:border-amber-600/40 dark:text-slate-100"
                  >
                    {code}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {disableMode ? (
            <div className="mt-5 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 dark:border dark:border-red-600/40 dark:bg-red-950/20">
              <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                Confirm disable using authenticator code
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <input
                  type="text"
                  value={disableCode}
                  onChange={(event) =>
                    setDisableCode(
                      event.target.value.replace(/\D/g, "").slice(0, 8),
                    )
                  }
                  placeholder={t("enter_code")}
                  className="mhub-input w-56 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0"
                />
                <button
                  type="button"
                  onClick={disableTwoFa}
                  disabled={disableLoading}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-red-700/40 dark:text-white dark:hover:bg-red-700/40"
                >
                  {disableLoading ? "Disabling..." : "Disable 2FA"}
                </button>
              </div>
            </div>
          ) : null}

          {disableLoading ? (
            <div className="mt-4">
              <PageLoadingState
                title={t("disabling_two_factor_auth")}
                description="Updating account security settings."
                marker="security-disable-loading"
              />
            </div>
          ) : null}

          {disableError ? (
            <div className="mt-4">
              <PageErrorState
                title={t("could_not_disable_2fa")}
                description={disableError}
                marker="security-disable-error"
                secondaryAction={
                  <button
                    type="button"
                    data-ux-action="security_disable_clear_error"
                    onClick={() => setDisableError("")}
                    className="inline-flex items-center rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-950"
                  >
                    Dismiss
                  </button>
                }
              />
            </div>
          ) : null}
        </section>

        <section className="mhub-premium-surface rounded-2xl p-5">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-slate-200 dark:text-slate-100">
              <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400 dark:text-amber-300" />
              Change Password
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-300">
              Update your account password. You will need to enter your current password.
            </p>
          </div>

          <div className="mt-4 space-y-3 max-w-md">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 dark:text-slate-200">
                Current Password
              </label>
              <input
                type="password"
                value={pwCurrent}
                onChange={(e) => setPwCurrent(e.target.value)}
                placeholder="Enter current password"
                className="mhub-input w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0"
                autoComplete="current-password"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 dark:text-slate-200">
                New Password
              </label>
              <input
                type="password"
                value={pwNew}
                onChange={(e) => setPwNew(e.target.value)}
                placeholder="Enter new password (min 12 chars)"
                className="mhub-input w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0"
                autoComplete="new-password"
                minLength={12}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 dark:text-slate-200">
                Confirm New Password
              </label>
              <input
                type="password"
                value={pwConfirm}
                onChange={(e) => setPwConfirm(e.target.value)}
                placeholder="Confirm new password"
                className="mhub-input w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0"
                autoComplete="new-password"
              />
            </div>

            {pwError && (
              <p className="text-xs text-red-600 dark:text-red-400 dark:text-red-300">{pwError}</p>
            )}
            {pwSuccess && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 dark:text-emerald-300">{pwSuccess}</p>
            )}

            <button
              type="button"
              onClick={handleChangePassword}
              disabled={pwLoading || !pwCurrent || !pwNew || !pwConfirm}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-amber-700/40 dark:text-white dark:hover:bg-amber-700/40"
            >
              <Lock className="h-4 w-4" />
              {pwLoading ? "Changing..." : "Change Password"}
            </button>
          </div>
        </section>

        <section className="mhub-premium-surface rounded-2xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-slate-200 dark:text-slate-100">
                <Smartphone className="h-5 w-5 text-blue-600 dark:text-blue-400 dark:text-blue-300" />
                Active Sessions
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-300">
                Revoke sessions you do not recognize.
              </p>
            </div>
            <button
              type="button"
              onClick={revokeAllSessions}
              disabled={
                revokeAllLoading || sessionsLoading || sessions.length === 0
              }
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border dark:border-red-600/40 dark:text-red-300 dark:hover:bg-red-950/20"
            >
              <Trash2 className="h-4 w-4" />
              {revokeAllLoading ? "Revoking..." : "Revoke All"}
            </button>
          </div>

          {sessionsError ? (
            <div className="mt-4">
              <PageErrorState
                title={t("active_sessions_unavailable")}
                description={sessionsError}
                onRetry={() => {
                  void loadSessions();
                }}
                retryLabel="Retry sessions"
                marker="security-sessions-error"
              />
            </div>
          ) : null}

          {sessionsLoading ? (
            <div className="mt-4">
              <PageLoadingState
                title={t("loading_active_sessions")}
                description="Fetching signed-in devices."
                marker="security-sessions-loading"
              />
            </div>
          ) : sessions.length === 0 ? (
            <div className="mt-4">
              <PageEmptyState
                title={t("no_active_sessions_found")}
                description="You're currently signed in only on this device."
                marker="security-sessions-empty"
                action={
                  <button
                    type="button"
                    onClick={() => {
                      void loadSessions();
                    }}
                    className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-950"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh Sessions
                  </button>
                }
              />
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {sessions.map((session) => (
                <SessionCard
                  key={session.session_id}
                  session={session}
                  isRevoking={revokingSessionId === session.session_id}
                  onRevoke={revokeSession}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
