import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useCmsPage } from "@/hooks/useCmsPage";

const NotFound = () => {
  const { t } = useTranslation();
  const { data: cmsContent } = useCmsPage("not-found");
  const title = cmsContent?.title || t("page_not_found", "Page Not Found");
  const description =
    cmsContent?.description ||
    t("page_not_found") ||
    "The page you're looking for doesn't exist.";
  const buttonLabel = cmsContent?.buttonLabel || t("home");

  return (
    <div className="min-h-screen mhub-premium-page bg-white flex flex-col items-center justify-center p-8 transition-colors duration-300 dark:bg-slate-900">
      <h1 className="text-6xl font-bold text-blue-600 dark:text-blue-400 mb-4 dark:text-blue-300">
        404
      </h1>
      <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2 dark:text-gray-100">
        {title}
      </h2>
      <p className="text-gray-600 dark:text-gray-300 mb-6 dark:text-gray-200">
        {description}
      </p>
      <Link to="/">
        <Button className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700/40 dark:hover:bg-blue-700/40 dark:text-white">
          {buttonLabel}
        </Button>
      </Link>
    </div>
  );
};

export default NotFound;
