import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import { AlertTriangle, Trash2, ArrowLeft } from "lucide-react";
import { navigateBack } from "@/utils/navigation";

export default function AccountDeletion() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logout } = useAuth();
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (confirmation !== "DELETE") return;
    setLoading(true);
    try {
      await api.delete("/users/account");
      toast({
        title: t("account_deleted") || "Account Deleted",
        description: t("account_deleted_desc") || "Your account has been permanently deleted.",
      });
      await logout();
      navigate("/", { replace: true });
    } catch (err) {
      toast({
        title: t("error") || "Error",
        description: err?.response?.data?.error || t("delete_failed") || "Failed to delete account.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 flex items-center justify-center">
      <Card className="w-full max-w-md shadow-xl border-0 rounded-2xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-red-500 to-rose-600 text-white text-center py-6">
          <button
            type="button"
            onClick={() => navigateBack(navigate)}
            className="absolute top-4 left-4 p-2 rounded-full hover:bg-white/20 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex justify-center mb-3">
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-white" />
            </div>
          </div>
          <CardTitle className="text-xl font-bold">
            {t("delete_account") || "Delete Account"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <p className="text-sm text-red-700 dark:text-red-300 font-medium">
              {t("delete_warning") || "This action is permanent and cannot be undone. All your data, listings, messages, and transaction history will be permanently deleted."}
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {t("type_delete") || 'Type "DELETE" to confirm'}
            </label>
            <Input
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder="DELETE"
              className="text-center font-mono tracking-widest"
            />
          </div>
          <Button
            onClick={handleDelete}
            disabled={confirmation !== "DELETE" || loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {loading
              ? t("deleting") || "Deleting..."
              : t("permanently_delete") || "Permanently Delete My Account"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
