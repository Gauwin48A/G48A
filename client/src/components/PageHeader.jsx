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
  backLabel,
  backClassName = "",
  backLabelClassName = "",
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

  const backButtonLabel = backLabel || "";

  return (
    <div
      style={{ top: "var(--top-nav-height, 0px)" }}
      className={`
      sticky z-40 w-full
      transition-all duration-300
      ${
        transparent
          ? "bg-transparent text-white"
          : "bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-gray-200/60 dark:border-white/10 shadow-sm"
      }
      ${className}
    `}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 page-shell page-pad py-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {showBack ? (
            <Button
              onClick={handleBack}
              variant="ghost"
              size="icon"
              className={`
              rounded-full ${backButtonLabel ? "px-3 py-2 gap-2" : "p-2"} transition-all duration-200 inline-flex items-center
              ${
                transparent
                  ? "!bg-black/20 hover:!bg-black/40 !text-white"
                  : "hover:!bg-slate-100 dark:hover:!bg-slate-800 !text-slate-700 dark:!text-slate-200"
              }
              ${backClassName}
            `}
              aria-label={backButtonLabel ? `${backButtonLabel}` : t("go_back")}
            >
              <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
              {backButtonLabel ? (
                <span className={`text-xs font-semibold ${backLabelClassName}`}>
                  {backButtonLabel}
                </span>
              ) : null}
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
