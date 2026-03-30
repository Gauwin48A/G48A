import React, { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Download, Power, ShieldAlert } from "lucide-react";
import api from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

const DELETE_CONFIRMATION_TEXT = "DELETE MY ACCOUNT";
const DEACTIVATE_CONFIRMATION_TEXT = "DEACTIVATE MY ACCOUNT";

export default function AccountDataActions({ className = "" }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deactivateBusy, setDeactivateBusy] = useState(false);
  const [deactivatePassword, setDeactivatePassword] = useState("");
  const [deactivateConfirmation, setDeactivateConfirmation] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const isAuthenticated = Boolean(user);
  const canDeactivate =
    deactivatePassword.trim().length > 0 &&
    deactivateConfirmation.trim() === DEACTIVATE_CONFIRMATION_TEXT;
  const canDelete =
    deletePassword.trim().length > 0 &&
    deleteConfirmation.trim() === DELETE_CONFIRMATION_TEXT;

  const handleExport = useCallback(async () => {
    if (!isAuthenticated) {
      navigate("/login", { state: { returnTo: "/profile?tab=settings" } });
      return;
    }
    if (exporting) return;
    setExporting(true);
    try {
      const payload = await api.get("/gdpr/export");
      const filename = `mhub-data-export-${payload?.userId || "user"}-${Date.now()}.json`;
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast({
        title: "Export ready",
        description: "Your data export has been downloaded.",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description:
          error?.message || "We could not export your data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  }, [exporting, isAuthenticated, navigate, toast]);

  const handleDeactivate = useCallback(async () => {
    if (!isAuthenticated) {
      navigate("/login", { state: { returnTo: "/profile?tab=settings" } });
      return;
    }
    if (!canDeactivate || deactivateBusy) return;
    setDeactivateBusy(true);
    try {
      await api.post("/gdpr/deactivate", {
        password: deactivatePassword,
        confirmation: deactivateConfirmation.trim(),
      });
      toast({
        title: "Account deactivated",
        description: "Your account has been disabled. Contact support to reactivate.",
      });
      setDeactivateOpen(false);
      setDeactivatePassword("");
      setDeactivateConfirmation("");
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      toast({
        title: "Deactivation failed",
        description:
          error?.message ||
          "We could not deactivate your account. Please verify your password and try again.",
        variant: "destructive",
      });
    } finally {
      setDeactivateBusy(false);
    }
  }, [
    canDeactivate,
    deactivateBusy,
    deactivateConfirmation,
    deactivatePassword,
    isAuthenticated,
    logout,
    navigate,
    toast,
  ]);

  const handleDelete = useCallback(async () => {
    if (!isAuthenticated) {
      navigate("/login", { state: { returnTo: "/profile?tab=settings" } });
      return;
    }
    if (!canDelete || deleteBusy) return;
    setDeleteBusy(true);
    try {
      await api.delete("/gdpr/delete", {
        data: {
          password: deletePassword,
          confirmation: deleteConfirmation.trim(),
        },
      });
      toast({
        title: "Account deleted",
        description: "Your account and data have been permanently removed.",
      });
      setDeleteOpen(false);
      setDeletePassword("");
      setDeleteConfirmation("");
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      toast({
        title: "Deletion failed",
        description:
          error?.message ||
          "We could not delete your account. Please check your password and try again.",
        variant: "destructive",
      });
    } finally {
      setDeleteBusy(false);
    }
  }, [
    canDelete,
    deleteBusy,
    deleteConfirmation,
    deletePassword,
    isAuthenticated,
    logout,
    navigate,
    toast,
  ]);

  const deactivateHint = useMemo(
    () =>
      deactivateConfirmation.trim() === ""
        ? `Type "${DEACTIVATE_CONFIRMATION_TEXT}" to confirm.`
        : deactivateConfirmation.trim() !== DEACTIVATE_CONFIRMATION_TEXT
          ? "Confirmation phrase does not match."
          : "Confirmation phrase matched.",
    [deactivateConfirmation],
  );

  const deleteHint = useMemo(
    () =>
      deleteConfirmation.trim() === ""
        ? `Type "${DELETE_CONFIRMATION_TEXT}" to confirm.`
        : deleteConfirmation.trim() !== DELETE_CONFIRMATION_TEXT
          ? "Confirmation phrase does not match."
          : "Confirmation phrase matched.",
    [deleteConfirmation],
  );

  return (
    <div className={`space-y-4 ${className}`.trim()}>
      <div className="rounded-2xl profile-panel border-slate-200/70 dark:border-slate-600/40 p-4 shadow-sm dark:border-slate-700/70">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-900/40 dark:text-slate-200 dark:bg-slate-950">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-100">
              Download your data
            </p>
            <p className="text-xs text-slate-600/90 dark:text-slate-300/90">
              Export a JSON copy of your profile, posts, transactions, and
              notifications.
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-300">
            This may take a few seconds to prepare.
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleExport}
            disabled={exporting}
            className="rounded-full"
          >
            {exporting ? "Preparing..." : "Download"}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl profile-panel border-amber-200/60 dark:border-amber-500/30 p-4 shadow-sm dark:border-amber-600/60">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-200 dark:bg-amber-950/20">
            <Power className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-amber-700 dark:text-amber-200">
              Deactivate account
            </p>
            <p className="text-xs text-amber-600/90 dark:text-amber-200/80">
              Temporarily disable your account without deleting your data.
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-amber-700/80 dark:text-amber-200/70">
            You can contact support to reactivate.
          </p>
          <AlertDialog
            open={deactivateOpen}
            onOpenChange={(next) => {
              setDeactivateOpen(next);
              if (!next) {
                setDeactivatePassword("");
                setDeactivateConfirmation("");
              }
            }}
          >
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-full border-amber-300 text-amber-700 hover:bg-amber-50"
              >
                Deactivate
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Deactivate account</AlertDialogTitle>
                <AlertDialogDescription>
                  This will disable your account and sign you out. Your data is
                  preserved, and support can reactivate your account later.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="deactivate-password">Password</Label>
                  <Input
                    id="deactivate-password"
                    type="password"
                    value={deactivatePassword}
                    onChange={(event) =>
                      setDeactivatePassword(event.target.value)
                    }
                    placeholder="Enter your password"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="deactivate-confirmation">
                    Type "{DEACTIVATE_CONFIRMATION_TEXT}"
                  </Label>
                  <Input
                    id="deactivate-confirmation"
                    value={deactivateConfirmation}
                    onChange={(event) =>
                      setDeactivateConfirmation(event.target.value)
                    }
                    placeholder={DEACTIVATE_CONFIRMATION_TEXT}
                  />
                  <p
                    className={`text-xs ${
                      deactivateConfirmation.trim() === ""
                        ? "text-slate-500 dark:text-slate-300"
                        : deactivateConfirmation.trim() ===
                            DEACTIVATE_CONFIRMATION_TEXT
                          ? "text-emerald-600 dark:text-emerald-300"
                          : "text-rose-600 dark:text-rose-300"
                    }`}
                  >
                    {deactivateHint}
                  </p>
                </div>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(event) => {
                    event.preventDefault();
                    handleDeactivate();
                  }}
                  disabled={!canDeactivate || deactivateBusy}
                  className="bg-amber-500 hover:bg-amber-600"
                >
                  {deactivateBusy ? "Deactivating..." : "Deactivate"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="rounded-2xl profile-panel border-rose-200/60 dark:border-rose-500/30 p-4 shadow-sm dark:border-rose-600/60">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-200 dark:bg-rose-950/20 dark:text-rose-300">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-rose-700 dark:text-rose-200 dark:text-rose-300">
              Danger Zone
            </p>
            <p className="text-xs text-rose-600/90 dark:text-rose-200/80 dark:text-rose-300/90">
              Delete your account permanently.
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-rose-600/80 dark:text-rose-200/70 dark:text-rose-300/80">
            This action cannot be undone.
          </p>
          <AlertDialog
            open={deleteOpen}
            onOpenChange={(next) => {
              setDeleteOpen(next);
              if (!next) {
                setDeletePassword("");
                setDeleteConfirmation("");
              }
            }}
          >
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="rounded-full"
              >
                Delete Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete account</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove your account and all associated
                  data. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="delete-password">Password</Label>
                  <Input
                    id="delete-password"
                    type="password"
                    value={deletePassword}
                    onChange={(event) => setDeletePassword(event.target.value)}
                    placeholder="Enter your password"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="delete-confirmation">
                    Type "{DELETE_CONFIRMATION_TEXT}"
                  </Label>
                  <Input
                    id="delete-confirmation"
                    value={deleteConfirmation}
                    onChange={(event) =>
                      setDeleteConfirmation(event.target.value)
                    }
                    placeholder={DELETE_CONFIRMATION_TEXT}
                  />
                  <p
                    className={`text-xs ${
                      deleteConfirmation.trim() === ""
                        ? "text-slate-500 dark:text-slate-300"
                        : deleteConfirmation.trim() === DELETE_CONFIRMATION_TEXT
                          ? "text-emerald-600 dark:text-emerald-300"
                          : "text-rose-600 dark:text-rose-300"
                    }`}
                  >
                    {deleteHint}
                  </p>
                </div>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(event) => {
                    event.preventDefault();
                    handleDelete();
                  }}
                  disabled={!canDelete || deleteBusy}
                  className="bg-rose-600 hover:bg-rose-700"
                >
                  {deleteBusy ? "Deleting..." : "Delete Account"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
