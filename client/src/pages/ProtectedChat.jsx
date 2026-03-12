import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, MessageCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { isAuthenticated } from "@/utils/authStorage";
import Chat from "./Chat";

export default function ProtectedChat() {
  const { user } = useAuth();
  const loggedIn = useMemo(() => isAuthenticated(user), [user]);

  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950">
        <div className="mx-auto flex w-full max-w-xl items-center justify-center px-4 pb-24 pt-12">
          <Card className="w-full border-blue-100 shadow-sm dark:border-gray-700">
            <CardHeader className="pb-2 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                <MessageCircle className="h-7 w-7" />
              </div>
              <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Please Login
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                <Lock className="mr-1 inline h-4 w-4" />
                Chat history is protected. Login to continue.
              </p>
              <div className="flex flex-col gap-2">
                <Link to="/login" state={{ returnTo: "/chat" }}>
                  <Button className="w-full bg-blue-600 text-white hover:bg-blue-700">
                    Login to continue
                  </Button>
                </Link>
                <Link to="/signup" state={{ returnTo: "/chat" }}>
                  <Button variant="outline" className="w-full">
                    Create account
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

