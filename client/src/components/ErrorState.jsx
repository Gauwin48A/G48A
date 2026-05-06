import React from "react";
import { AlertCircle, WifiOff, ServerCrash, RefreshCw, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

const ERROR_CONFIGS = {
    network: {
        icon: WifiOff,
        iconClass: "text-amber-500",
        bgClass: "bg-amber-500/10",
        gradientClass: "from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20",
    },
    server: {
        icon: ServerCrash,
        iconClass: "text-red-500",
        bgClass: "bg-red-500/10",
        gradientClass: "from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20",
    },
    notFound: {
        icon: AlertCircle,
        iconClass: "text-gray-500",
        bgClass: "bg-gray-500/10",
        gradientClass: "from-gray-50 to-slate-50 dark:from-gray-950/20 dark:to-slate-950/20",
    },
    generic: {
        icon: AlertCircle,
        iconClass: "text-violet-500",
        bgClass: "bg-violet-500/10",
        gradientClass: "from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20",
    },
    empty: {
        icon: AlertCircle,
        iconClass: "text-emerald-500",
        bgClass: "bg-emerald-500/10",
        gradientClass: "from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20",
    },
};

const ErrorState = ({
    type = 'generic',
    message,
    onRetry,
    showHome = true
}) => {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const titles = {
        network: t('error.network_title', 'Connection Lost'),
        server: t('error.server_title', 'Server Error'),
        notFound: t('error.notfound_title', 'Not Found'),
        generic: t('error.generic_title', 'Oops!'),
        empty: t('error.empty_title', 'No Results'),
    };

    const descriptions = {
        network: t('error.network_desc', 'Please check your internet connection and try again.'),
        server: t('error.server_desc', 'Something went wrong on our end. We\'re working on it!'),
        notFound: t('error.notfound_desc', 'The item you\'re looking for doesn\'t exist or was removed.'),
        generic: message || t('error.generic_desc', 'Something went wrong. Please try again.'),
        empty: t('error.empty_desc', 'No items found matching your criteria.'),
    };

    const config = ERROR_CONFIGS[type] || ERROR_CONFIGS.generic;
    const IconComponent = config.icon;

    return (
        <div className={`flex flex-col items-center justify-center py-16 px-6 text-center bg-gradient-to-b ${config.gradientClass} rounded-2xl mx-4 my-6 content-enter`}>
            <div className={`w-20 h-20 rounded-full ${config.bgClass} flex items-center justify-center mb-5 shadow-lg`}>
                <IconComponent className={`w-10 h-10 ${config.iconClass}`} strokeWidth={1.5} />
            </div>
            <h2 className="text-heading font-display mb-2">{titles[type] || titles.generic}</h2>
            <p className="text-body text-muted-foreground max-w-xs mb-6">{descriptions[type] || descriptions.generic}</p>

            <div className="flex gap-3">
                {onRetry && (
                    <Button className="min-h-[48px] px-5 gap-2 rounded-xl shadow-sm" onClick={onRetry}>
                        <RefreshCw size={18} />
                        {t('error.retry', 'Try Again')}
                    </Button>
                )}
                {showHome && (
                    <Button variant="outline" className="min-h-[48px] px-5 gap-2 rounded-xl" onClick={() => navigate('/')}>
                        <Home size={18} />
                        {t('error.home', 'Go Home')}
                    </Button>
                )}
            </div>
        </div>
    );
};

export default ErrorState;
