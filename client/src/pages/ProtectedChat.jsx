import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, MessageCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { isAuthenticated } from "@/utils/authStorage";
import { useTranslation } from "react-i18next";
import Chat from "./Chat";

export default function ProtectedChat() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const tr = (key, fallback) => t(key, { defaultValue: fallback });
  const loggedIn = useMemo(() => isAuthenticated(user), [user]);

  if (!loggedIn) {
    return (
      <div className="min-h-screen mhub-premium-page bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900/60 dark:to-slate-950 dark:bg-gradient-to-b">
        <div className="mx-auto flex w-full max-w-xl items-center justify-center px-4 pt-12 page-shell page-pad">
          <Card className="w-full border-blue-100 shadow-sm dark:border-blue-600/40">
            <CardHeader className="pb-2 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:bg-blue-950/20">
                <MessageCircle className="h-7 w-7" />
              </div>
              <CardTitle className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                {tr("please_login", "Please Login")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <p className="text-sm text-slate-600 dark:text-slate-200">
                <Lock className="mr-1 inline h-4 w-4" />
                {tr("chat_history_protected", "Chat history is protected. Login to continue.")}
              </p>
              <div className="flex flex-col gap-2">
                <Link to="/login" state={{ returnTo: "/chat" }}>
                  <Button className="w-full bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700/40 dark:text-white dark:hover:bg-blue-700/40">
                    {tr("login_to_continue", "Login to continue")}
                  </Button>
                </Link>
                <Link to="/signup" state={{ returnTo: "/chat" }}>
                  <Button variant="outline" className="w-full">
                    {tr("create_account", "Create account")}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return <Chat />;
}
