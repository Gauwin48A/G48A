import React, { useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FaLock, FaUserPlus, FaSignInAlt } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const LoginPromptModal = React.memo(({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const returnTo = `${location.pathname}${location.search}`;
  const isFeedRoute =
    location.pathname === "/feed" ||
    location.pathname === "/my-feed" ||
    location.pathname.startsWith("/feed/");
  const promptMessage = isFeedRoute
    ? t("feed_login_prompt_message") ||
      "Sign in to keep reading community updates, save posts, and share your own news."
    : t("login_prompt_message") ||
      "Sign in to view all posts, create listings, and access the full marketplace experience.";
  const unlockedFeatures = isFeedRoute
    ? [
        t("feed_unlock_full_feed") || "Read the full community feed",
        t("feed_unlock_like_save") || "Like and save useful posts",
        t("feed_unlock_share_updates") || "Share your own updates",
        t("feed_unlock_manage_posts") || "Manage your published posts",
      ]
    : [
        t("view_all_posts") || "View unlimited posts",
        t("create_listings") || "Create and sell listings",
        t("save_favorites") || "Save favorites & wishlist",
        t("earn_rewards") || "Earn rewards & referrals",
      ];
  const guestMessage = isFeedRoute
    ? t("feed_guest_continue") || "Or keep previewing a limited feed as guest"
    : t("guest_continue") || "Or continue browsing as guest (limited access)";

  const handleLogin = useCallback(() => {
    navigate("/login", { state: { returnTo } });
  }, [navigate, returnTo]);

  const handleSignup = useCallback(() => {
    navigate("/signup", { state: { returnTo } });
  }, [navigate, returnTo]);

  useEffect(() => {
    if (!isOpen || typeof document === "undefined") return undefined;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-prompt-title"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative mhub-premium-surface rounded-3xl shadow-2xl p-6 md:p-8 w-[95%] max-w-md mx-auto animate-fadeIn border border-gray-200 dark:border-gray-700">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
          <FaLock className="text-white text-3xl" />
        </div>

        <h2
          id="login-prompt-title"
          className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-3"
        >
          {t("login_to_continue") || "Login to Continue"}
        </h2>

        <p className="text-center text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
          {promptMessage}
        </p>

        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-6">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t("unlock_features") || "Unlock these features:"}
          </p>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            {unlockedFeatures.map((feature) => (
              <li key={feature}>{"\u2713"} {feature}</li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            onClick={handleLogin}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2"
          >
            <FaSignInAlt /> {t("login") || "Login"}
          </Button>
          <Button
            onClick={handleSignup}
            variant="outline"
            className="w-full border-2 border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-bold py-4 rounded-xl flex items-center justify-center gap-2"
          >
            <FaUserPlus /> {t("create_account") || "Create Account"}
          </Button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full text-center text-xs text-gray-500 dark:text-gray-400 mt-4 hover:text-gray-700 dark:hover:text-gray-300 underline underline-offset-2 transition-colors cursor-pointer"
        >
          {guestMessage}
        </button>
      </div>
    </div>
  );
});

LoginPromptModal.displayName = "LoginPromptModal";

export default LoginPromptModal;
