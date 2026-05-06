import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useCmsPage } from "@/hooks/useCmsPage";
import { Home, Search, AlertTriangle } from "lucide-react";

const NotFound = () => {
  const { t } = useTranslation();
  const { data: cmsContent } = useCmsPage("not-found");
  const title = cmsContent?.title || t("page_not_found", "Page Not Found");
  const description =
    cmsContent?.description ||
    t("page_not_found_description", "The page you're looking for doesn't exist or has been moved.");
  const buttonLabel = cmsContent?.buttonLabel || t("home");

  return (
    <div className="min-h-screen mhub-premium-page bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col items-center justify-center px-6 py-12">
      {/* Branded illustration */}
      <div className="relative mb-6">
        <div className="w-28 h-28 rounded-[2rem] bg-gradient-to-br from-blue-100 via-blue-50 to-indigo-100 dark:from-blue-900/40 dark:via-slate-800/60 dark:to-indigo-900/40 flex items-center justify-center shadow-xl">
          <AlertTriangle className="w-12 h-12 text-blue-500 dark:text-blue-400" />
        </div>
        <div className="absolute -top-2 -right-2 w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-lg border border-slate-100 dark:border-slate-700">
          <span className="text-lg font-bold text-blue-600 dark:text-blue-400">?</span>
        </div>
      </div>

      <h1 className="text-5xl font-bold text-blue-600 dark:text-blue-400 mb-2 font-display tracking-tight">
        404
      </h1>
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2 text-center">
        {title}
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 text-center max-w-xs">
        {description}
      </p>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Link to="/">
          <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-sm font-semibold">
            <Home className="w-4 h-4 mr-2" />
            {buttonLabel}
          </Button>
        </Link>
        <Link to="/all-posts">
          <Button variant="outline" className="w-full h-12 text-sm font-semibold border-slate-300 dark:border-slate-600">
            <Search className="w-4 h-4 mr-2" />
            Browse Products
          </Button>
        </Link>
      </div>

      {/* Quick links */}
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        {[
          { label: "Feed", to: "/feed" },
          { label: "Dashboard", to: "/dashboard" },
          { label: "Help", to: "/complaints" },
        ].map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline px-2 py-1"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default NotFound;
