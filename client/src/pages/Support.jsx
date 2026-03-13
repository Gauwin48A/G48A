import React, { useCallback, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Coins,
  HeartPulse,
  Lock,
  ShieldCheck,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { getUserId, isAuthenticated } from "@/utils/authStorage";
import {
  claimDailyCoins,
  getCoinsWallet,
  unlockPremiumModule,
  getWalletTransactions,
} from "@/lib/coinsWallet";

const DISEASE_ARTICLES = [
  {
    id: "article-1",
    titleKey: "support_article_1_title",
    titleFallback: "Early Signs of Respiratory Infection in Poultry",
    summaryKey: "support_article_1_summary",
    summaryFallback:
      "How to detect coughing, nasal discharge, and reduced activity before severe spread starts.",
    tagKey: "support_tag_respiratory",
    tagFallback: "Respiratory",
    readTimeMinutes: 5,
  },
  {
    id: "article-2",
    titleKey: "support_article_2_title",
    titleFallback: "Heat Stress Checklist for Summer Poultry Care",
    summaryKey: "support_article_2_summary",
    summaryFallback:
      "Simple hydration, shade, and timing protocol to reduce mortality in peak temperatures.",
    tagKey: "support_tag_seasonal_care",
    tagFallback: "Seasonal Care",
    readTimeMinutes: 4,
  },
  {
    id: "article-3",
    titleKey: "support_article_3_title",
    titleFallback: "Biosecurity Routine for Small Farms",
    summaryKey: "support_article_3_summary",
    summaryFallback:
      "Daily gate, feed, and footwear hygiene steps that lower disease entry risk.",
    tagKey: "support_tag_biosecurity",
    tagFallback: "Biosecurity",
    readTimeMinutes: 6,
  },
  {
    id: "article-4",
    titleKey: "support_article_4_title",
    titleFallback: "Vaccination Calendar by Age Group",
    summaryKey: "support_article_4_summary",
    summaryFallback:
      "Structured vaccine timeline for chicks, growers, and adult birds.",
    tagKey: "support_tag_vaccination",
    tagFallback: "Vaccination",
    readTimeMinutes: 7,
  },
  {
    id: "article-5",
    titleKey: "support_article_5_title",
    titleFallback: "Feed Conversion Warning Signals",
    summaryKey: "support_article_5_summary",
    summaryFallback:
      "What poor weight gain and feed wastage indicate about health and nutrition.",
    tagKey: "support_tag_nutrition",
    tagFallback: "Nutrition",
    readTimeMinutes: 4,
  },
  {
    id: "article-6",
    titleKey: "support_article_6_title",
    titleFallback: "When to Isolate a Bird Immediately",
    summaryKey: "support_article_6_summary",
    summaryFallback:
      "Practical isolation triggers to prevent cluster infections in shared flocks.",
    tagKey: "support_tag_emergency",
    tagFallback: "Emergency",
    readTimeMinutes: 3,
  },
  {
    id: "article-7",
    titleKey: "support_article_7_title",
    titleFallback: "Egg Quality Issues and Root-Cause Guide",
    summaryKey: "support_article_7_summary",
    summaryFallback:
      "Shell cracks, pale yolk, and irregular egg size troubleshooting checklist.",
    tagKey: "support_tag_egg_production",
    tagFallback: "Egg Production",
    readTimeMinutes: 5,
  },
  {
    id: "article-8",
    titleKey: "support_article_8_title",
    titleFallback: "Safe Deworming Schedule",
    summaryKey: "support_article_8_summary",
    summaryFallback:
      "A preventive deworming cadence with signs of overuse and resistance.",
    tagKey: "support_tag_preventive_care",
    tagFallback: "Preventive Care",
    readTimeMinutes: 5,
  },
  {
    id: "article-9",
    titleKey: "support_article_9_title",
    titleFallback: "Post-Rain Disease Risk Mitigation",
    summaryKey: "support_article_9_summary",
    summaryFallback:
      "Quick drying, litter rotation, and sanitation steps after high-moisture days.",
    tagKey: "support_tag_environment",
    tagFallback: "Environment",
    readTimeMinutes: 4,
  },
  {
    id: "article-10",
    titleKey: "support_article_10_title",
    titleFallback: "Emergency First 60 Minutes Protocol",
    summaryKey: "support_article_10_summary",
    summaryFallback:
      "Immediate stabilization flow for sudden flock symptoms before vet escalation.",
    tagKey: "support_tag_critical_response",
    tagFallback: "Critical Response",
    readTimeMinutes: 6,
  },
  {
    id: "article-11",
    titleKey: "support_article_11_title",
    titleFallback: "Handling New Bird Quarantine",
    summaryKey: "support_article_11_summary",
    summaryFallback:
      "14-day onboarding routine to protect existing birds from external infection vectors.",
    tagKey: "support_tag_quarantine",
    tagFallback: "Quarantine",
    readTimeMinutes: 5,
  },
  {
    id: "article-12",
    titleKey: "support_article_12_title",
    titleFallback: "Medication Storage Do's and Don'ts",
    summaryKey: "support_article_12_summary",
    summaryFallback:
      "Storage temperature, expiry tracking, and contamination prevention basics.",
    tagKey: "support_tag_medication_safety",
    tagFallback: "Medication Safety",
    readTimeMinutes: 4,
  },
];

const PREMIUM_MODULES = [
  {
    id: "premium-disease-assistant",
    titleKey: "support_module_disease_assistant_title",
    titleFallback: "Disease Assistant",
    descriptionKey: "support_module_disease_assistant_desc",
    descriptionFallback:
      "Condition-based triage path with likely disease clusters and next-step actions.",
    cost: 40,
  },
  {
    id: "premium-medication-planner",
    titleKey: "support_module_medication_planner_title",
    titleFallback: "Medication Planner",
    descriptionKey: "support_module_medication_planner_desc",
    descriptionFallback:
      "Create dosage reminder schedules and complete treatment timelines.",
    cost: 55,
  },
  {
    id: "premium-care-protocols",
    titleKey: "support_module_care_protocols_title",
    titleFallback: "Care Protocol Library",
    descriptionKey: "support_module_care_protocols_desc",
    descriptionFallback:
      "Printable SOP packs for hygiene, quarantine, and emergency response.",
    cost: 70,
  },
];

const ARTICLE_BATCH_SIZE = 6;

export default function Support() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const tr = (key, fallback, options = {}) =>
    t(key, { defaultValue: fallback, ...options });
  const [visibleArticles, setVisibleArticles] = useState(ARTICLE_BATCH_SIZE);
  const [walletVersion, setWalletVersion] = useState(0);
  const [bannerMessage, setBannerMessage] = useState("");
  const [activeUnlockId, setActiveUnlockId] = useState("");

  const loggedIn = useMemo(() => isAuthenticated(user), [user]);
  const userId = useMemo(() => getUserId(user), [user]);
  const wallet = useMemo(
    () => (loggedIn ? getCoinsWallet(userId) : null),
    [loggedIn, userId, walletVersion],
  );
  const transactions = useMemo(
    () => (loggedIn ? getWalletTransactions(userId, 6) : []),
    [loggedIn, userId, walletVersion],
  );

  const visibleLibraryItems = DISEASE_ARTICLES.slice(0, visibleArticles);
  const hasMoreArticles = visibleArticles < DISEASE_ARTICLES.length;

  const requireLogin = useCallback(() => {
    navigate("/login", { state: { returnTo: "/support" } });
  }, [navigate]);

  const getModuleTitle = useCallback(
    (moduleId) => {
      const module = PREMIUM_MODULES.find((entry) => entry.id === moduleId);
      if (!module) {
        return moduleId;
      }
      return t(module.titleKey) || module.titleFallback;
    },
    [t],
  );

  const getTransactionReasonLabel = useCallback(
    (reason) => {
      const rawReason = String(reason || "").trim();
      if (!rawReason) {
        return tr("support_wallet_activity", "Wallet activity");
      }
      if (rawReason === "Welcome bonus") {
        return tr("support_txn_welcome_bonus", "Welcome bonus");
      }
      if (rawReason === "Daily reward") {
        return tr("support_txn_daily_reward", "Daily reward");
      }
      if (rawReason.startsWith("Unlocked module:")) {
        const moduleId = rawReason.split(":")[1]?.trim();
        return (
          t("support_txn_module_unlocked", {
            module: getModuleTitle(moduleId),
          }) || `Unlocked module: ${getModuleTitle(moduleId)}`
        );
      }
      return rawReason;
    },
    [getModuleTitle, t],
  );

  const resolveMessage = useCallback(
    (message) => {
      if (!message) return "";
      if (typeof message === "string") return message;
      const params = message.params
        ? Object.fromEntries(
            Object.entries(message.params).map(([key, value]) => {
              if (
                value &&
                typeof value === "object" &&
                ("key" in value || "fallback" in value)
              ) {
                return [key, resolveMessage(value)];
              }
              return [key, value];
            }),
          )
        : undefined;
      const translated = message.key ? t(message.key, params) : "";
      if (
        typeof translated === "string" &&
        translated &&
        translated !== message.key
      ) {
        return translated;
      }
      return message.fallback || "";
    },
    [t],
  );

  const resolvedBanner = resolveMessage(bannerMessage);

  const handleClaimDaily = () => {
    if (!loggedIn) {
      requireLogin();
      return;
    }

    const result = claimDailyCoins(userId, 20);
    setWalletVersion((value) => value + 1);

    if (result.success) {
      const amountMatch = String(result.message || "").match(/\+(\d+)/);
      const amount = Number(amountMatch?.[1]) || 20;
      setBannerMessage({
        key: "support_daily_claim_success",
        fallback: `+${amount} coins added to your wallet.`,
        params: { amount },
      });
      return;
    }

    setBannerMessage({
      key: "support_daily_claimed",
      fallback: "Daily reward already claimed. Come back tomorrow.",
    });
  };

  const handleUnlockModule = (module) => {
    if (!loggedIn) {
      requireLogin();
      return;
    }

    setActiveUnlockId(module.id);
    const result = unlockPremiumModule(userId, module.id, module.cost);
    setWalletVersion((value) => value + 1);

    if (result.success && result.alreadyUnlocked) {
      setBannerMessage({
        key: "support_module_already_unlocked",
        fallback: "Module already unlocked.",
      });
      setActiveUnlockId("");
      return;
    }

    if (result.success) {
      setBannerMessage({
        key: "support_module_unlocked_success",
        fallback: "Module unlocked successfully.",
        params: {
          module: {
            key: module.titleKey,
            fallback: module.titleFallback,
          },
        },
      });
      setActiveUnlockId("");
      return;
    }

    const message = String(result?.message || "").toLowerCase();
    if (message.includes("not enough")) {
      setBannerMessage({
        key: "support_not_enough_coins",
        fallback: "Not enough coins in wallet.",
      });
    } else if (message.includes("invalid")) {
      setBannerMessage({
        key: "support_invalid_module",
        fallback: "Invalid module.",
      });
    } else {
      setBannerMessage({
        key: "support_unlock_failed",
        fallback: "Could not unlock module right now.",
      });
    }

    setActiveUnlockId("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950">
      <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 md:px-6 md:pt-8">
        <div className="mb-6 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-white shadow-lg md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold md:text-3xl">
                {tr("support_page_title", "Medication & Support")}
              </h1>
              <p className="mt-1 text-sm text-blue-100 md:text-base">
                {tr(
                  "support_page_subtitle",
                  "Disease Library + premium support modules unlocked using coins.",
                )}
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4" />
              {tr("support_safe_workflow", "Safe, structured support workflow")}
            </div>
          </div>
        </div>

        {resolvedBanner ? (
          <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
            {resolvedBanner}
          </div>
        ) : null}

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <Card className="border-blue-100 dark:border-gray-700 md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Coins className="h-5 w-5 text-amber-500" />
                {tr("support_wallet_title", "Coins Wallet")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!loggedIn ? (
                <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50/60 p-4 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
                  <p className="font-semibold">
                    {tr("login_to_continue", "Login to continue")}
                  </p>
                  <p className="mt-1">
                    {tr(
                      "support_wallet_login_desc",
                      "Your coins wallet is available after login. Premium modules unlock using wallet credits.",
                    )}
                  </p>
                  <Button
                    type="button"
                    className="mt-3 bg-blue-600 text-white hover:bg-blue-700"
                    onClick={requireLogin}
                  >
                    {tr("login_to_continue", "Login to continue")}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/25 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                        {tr("support_available_balance", "Available Balance")}
                      </p>
                      <p className="text-2xl font-bold text-amber-900 dark:text-amber-200">
                        {(wallet?.balance ?? 0).toLocaleString(
                          i18n.resolvedLanguage || i18n.language || "en",
                        )}{" "}
                        {tr("coins", "coins")}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-amber-300 bg-white text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:bg-transparent dark:text-amber-200"
                      onClick={handleClaimDaily}
                    >
                      {tr("support_claim_daily", "Claim Daily +20", {
                        amount: 20,
                      })}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {tr("support_recent_transactions", "Recent Transactions")}
                    </p>
                    {transactions.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {tr(
                          "support_no_wallet_activity",
                          "No wallet activity yet.",
                        )}
                      </p>
                    ) : (
                      transactions.map((entry) => (
                        <div
                          key={`${entry.createdAt}-${entry.reason}`}
                          className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 text-sm dark:border-gray-700"
                        >
                          <div>
                            <p className="font-medium text-gray-800 dark:text-gray-200">
                              {getTransactionReasonLabel(entry.reason)}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(entry.createdAt).toLocaleString(
                                i18n.resolvedLanguage || i18n.language || "en",
                              )}
                            </p>
                          </div>
                          <span
                            className={
                              entry.type === "credit"
                                ? "font-semibold text-emerald-600"
                                : "font-semibold text-rose-600"
                            }
                          >
                            {entry.type === "credit" ? "+" : "-"}
                            {entry.amount}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-blue-100 dark:border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-blue-600" />
                {tr("support_premium_access_title", "Premium Access")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <p>
                {tr(
                  "support_premium_access_desc_1",
                  "Premium modules are locked by default and can be unlocked with credits from your wallet.",
                )}
              </p>
              <p>
                {tr(
                  "support_premium_access_desc_2",
                  "New users get a welcome wallet, then can claim daily credits and spend on modules they need.",
                )}
              </p>
              <div className="rounded-lg border border-dashed border-blue-200 bg-blue-50 px-3 py-2 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
                {tr("login_to_continue", "Login to continue")}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <HeartPulse className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {tr("support_premium_modules_title", "Premium Modules")}
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {PREMIUM_MODULES.map((module) => {
              const unlocked = Boolean(wallet?.unlockedModules?.[module.id]);
              const canUnlock = (wallet?.balance ?? 0) >= module.cost;

              return (
                <Card
                  key={module.id}
                  className="border-blue-100 dark:border-gray-700"
                >
                  <CardHeader className="space-y-2 pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base">
                        {t(module.titleKey) || module.titleFallback}
                      </CardTitle>
                      {unlocked ? (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                          {tr("support_unlocked", "Unlocked")}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-blue-200">
                          {module.cost} {tr("coins", "coins")}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {t(module.descriptionKey) || module.descriptionFallback}
                    </p>
                  </CardHeader>
                  <CardContent>
                    {!loggedIn ? (
                      <div className="space-y-3 rounded-xl border border-dashed border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/30">
                        <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                          <Lock className="mr-1 inline h-4 w-4" />
                          {tr("login_to_continue", "Login to continue")}
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          className="w-full bg-blue-600 text-white hover:bg-blue-700"
                          onClick={requireLogin}
                        >
                          {tr("login_to_continue", "Login to continue")}
                        </Button>
                      </div>
                    ) : unlocked ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        disabled
                      >
                        <ShieldCheck className="mr-1 h-4 w-4" />
                        {tr(
                          "support_module_unlocked_button",
                          "Module unlocked",
                        )}
                      </Button>
                    ) : (
                      <div className="space-y-2">
                        <Button
                          type="button"
                          className="w-full bg-blue-600 text-white hover:bg-blue-700"
                          onClick={() => handleUnlockModule(module)}
                          disabled={activeUnlockId === module.id || !canUnlock}
                        >
                          {t("support_unlock_for", {
                            cost: module.cost,
                          }) || `Unlock for ${module.cost} coins`}
                        </Button>
                        {!canUnlock ? (
                          <p className="text-xs text-rose-600 dark:text-rose-400">
                            {tr(
                              "support_not_enough_coins_hint",
                              "Not enough coins. Claim daily coins to continue.",
                            )}
                          </p>
                        ) : null}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <div className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {tr("support_disease_library_title", "Disease Library")}
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {visibleLibraryItems.map((article) => (
              <Card
                key={article.id}
                className="border-blue-100 dark:border-gray-700"
              >
                <CardHeader className="space-y-2 pb-2">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant="outline"
                      className="border-blue-200 text-blue-700"
                    >
                      {t(article.tagKey) || article.tagFallback}
                    </Badge>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {t("support_min_read", {
                        minutes: article.readTimeMinutes,
                      }) || `${article.readTimeMinutes} min read`}
                    </span>
                  </div>
                  <CardTitle className="text-base">
                    {t(article.titleKey) || article.titleFallback}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {t(article.summaryKey) || article.summaryFallback}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {hasMoreArticles ? (
            <div className="mt-5 flex justify-center">
              <Button
                type="button"
                variant="outline"
                className="border-blue-200 text-blue-700 hover:bg-blue-50"
                onClick={() =>
                  setVisibleArticles((count) =>
                    Math.min(
                      count + ARTICLE_BATCH_SIZE,
                      DISEASE_ARTICLES.length,
                    ),
                  )
                }
              >
                {tr("support_load_more_articles", "Load more articles")}
              </Button>
            </div>
          ) : null}
        </div>

        <Card className="border-blue-100 dark:border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              {tr("support_legal_policies", "Legal Policies")}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 md:grid-cols-2">
            <Link
              to="/t&c"
              className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              {tr("terms_conditions", "Terms & Conditions")}
              <ChevronRight className="h-4 w-4" />
            </Link>
            <Link
              to="/privacy-policy"
              className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              {tr("privacy_policy", "Privacy Policy")}
              <ChevronRight className="h-4 w-4" />
            </Link>
            <Link
              to="/refund-policy"
              className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              {tr("refund_policy", "Refund Policy")}
              <ChevronRight className="h-4 w-4" />
            </Link>
            <Link
              to="/support-ticket-policy"
              className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              {tr("support_ticket_policy", "Support Ticket Policy")}
              <ChevronRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
