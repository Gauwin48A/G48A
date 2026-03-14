import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { navigateBack } from "@/utils/navigation";

const PageHeader = ({
  title,
  showBack = true,
  backTo,
  rightAction,
  className = "",
  transparent = false,
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
      return;
    }
    navigateBack(navigate);
  };

  return (
    <div
      className={`
      sticky top-0 z-50 w-full
      transition-all duration-300
      ${
        transparent
          ? "bg-transparent text-white"
          : "bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/10 shadow-sm"
      }
      ${className}
    `}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {showBack ? (
            <Button
              onClick={handleBack}
              variant="ghost"
              size="icon"
              className={`
              rounded-full p-2 transition-all duration-200
              ${
                transparent
                  ? "bg-black/20 hover:bg-black/40 text-white"
                  : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
              }
            `}
              aria-label={t("go_back")}
            >
              <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
            </Button>
          ) : null}
          {title ? (
            <h1
              className={`
            font-bold text-lg md:text-xl truncate
            ${
              transparent
                ? "text-white drop-shadow-md"
                : "text-slate-900 dark:text-white"
            }
          `}
            >
              {title}
            </h1>
          ) : null}
          {rightAction ? (
            <div className="ml-auto flex items-center gap-2 flex-shrink-0">
              {rightAction}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default PageHeader;
