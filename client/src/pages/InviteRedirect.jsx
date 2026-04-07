import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useCmsPage } from "@/hooks/useCmsPage";

export default function InviteRedirect() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: cmsContent } = useCmsPage("invite-redirect");
  const title = cmsContent?.title || t("redirecting", "Redirecting...");
  const description =
    cmsContent?.description ||
    t("invite_redirect_desc", "Taking you to sign up with your referral.");
  const buttonLabel = cmsContent?.buttonLabel || t("continue", "Continue");

  useEffect(() => {
    if (code) {
      navigate(`/signup?ref=${encodeURIComponent(code)}`, { replace: true });
    } else {
      navigate("/signup", { replace: true });
    }
  }, [code, navigate]);

  return (
    <div className="min-h-screen mhub-premium-page flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900/60 dark:to-slate-950 px-4 dark:bg-gradient-to-br">
      <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-lg text-center dark:border-slate-700 dark:bg-slate-900/70 dark:border dark:bg-slate-900 dark:text-center">
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
          {title}
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
          {description}
        </p>
        <Button
          type="button"
          className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-700/40 dark:hover:bg-indigo-700/40 dark:text-white"
          onClick={() =>
            navigate(
              code ? `/signup?ref=${encodeURIComponent(code)}` : "/signup",
              { replace: true },
            )
          }
        >
          {buttonLabel}
        </Button>
      </div>
    </div>
  );
}
