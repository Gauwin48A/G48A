import React from "react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowRight,
  Award,
  Calendar,
  CheckCircle2,
  Circle,
  Copy as CopyIcon,
  Crown,
  Gift,
  Share2,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import { getInitials } from "@/lib/userDisplay";

function SkeletonBlock({ className }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-xl bg-slate-200/80 dark:bg-slate-700/60 ${className}`}
    />
  );
}

function ListSkeleton({ rows = 4 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="rounded-xl border border-slate-200/80 dark:border-slate-700/60 px-3 py-3"
        >
          <SkeletonBlock className="h-4 w-40" />
          <SkeletonBlock className="mt-2 h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

function CardSkeleton({ rows = 3 }) {
  return (
    <Card className="bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl">
      <CardContent className="space-y-3 pt-6">
        <SkeletonBlock className="h-5 w-40" />
        {Array.from({ length: rows }).map((_, index) => (
          <SkeletonBlock key={index} className="h-16 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}

function renderDynamicIcon(Icon, className, Fallback = Sparkles) {
  const Component = typeof Icon === "function" ? Icon : Fallback;
  return <Component className={className} />;
}

export function RewardsHero({
  rewardsUser,
  rankGradients,
  displayCoins,
  coinDelta,
  xpProgressPercent,
  xpRemaining,
  referralGoal,
  referralReward,
  referralDisplay,
  referralProgressPercent,
  milestoneEligible,
  milestoneClaimed,
  onClaimMilestone,
  shareDisabled,
  onShareWhatsApp,
  onShareTelegram,
  onCopyReferralLink,
  onShareSms,
  tr,
}) {
  const rankGradient =
    rankGradients[rewardsUser?.rank] || "from-blue-500 to-indigo-600";

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-sky-500 via-blue-500 to-violet-400 opacity-95" />
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fillRule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fillOpacity=\'0.1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        }}
      />
      <div className="relative max-w-6xl mx-auto px-4 py-2 sm:px-6 sm:py-3">
        <div className="mb-3 text-center md:text-left">
          <p className="text-[11px] uppercase tracking-[0.15em] text-white/75 mb-1">
            {tr("rewards_program", "Rewards Program")}
          </p>
          <h1 className="text-xl md:text-2xl font-bold text-white">
            {tr("rewards_title", "Rewards & Referrals")}
          </h1>
          <p className="text-sm sm:text-base text-white/85 mt-1">
            {tr(
              "rewards_subtitle",
              "Track progress, earn points, and unlock perks for every milestone.",
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="rewards-hero-card rounded-2xl p-3 text-white page-fade-in page-fade-in-delay-1">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-10 w-10 ring-2 ring-white/40 shadow-lg">
                  <AvatarFallback
                    className={`text-lg font-bold text-white bg-gradient-to-br ${rankGradient}`}
                  >
                    {getInitials(rewardsUser?.name, "U")}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-md">
                  <Crown className="w-4 h-4 text-yellow-500" />
                </div>
              </div>

              <div className="min-w-0">
                <h2
                  className="text-sm font-semibold truncate"
                  title={rewardsUser?.name || tr("user", "User")}
                >
                  {rewardsUser?.name || tr("user", "User")}
                </h2>
                <div className="flex flex-wrap gap-2 mt-1">
                  <Badge
                    className={`bg-gradient-to-r ${rankGradient} text-white border-0`}
                  >
                    <Trophy className="w-3 h-3 mr-1" />
                    {rewardsUser?.rank}
                  </Badge>
                  <Badge className="bg-white/20 text-white border-0">
                    {tr("level", "Level")} {rewardsUser?.level}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-white/70">
                <span>{tr("level_progress", "Level progress")}</span>
                <span>
                  {rewardsUser?.xpCurrent} / {rewardsUser?.xpRequired} XP
                </span>
              </div>
              <div
                className="mt-2 h-2 rounded-full bg-white/20 overflow-hidden"
                role="progressbar"
                aria-label={tr("level_progress", "Level progress")}
                aria-valuenow={xpProgressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full bg-gradient-to-r from-yellow-300 to-orange-400 rounded-full transition-[width] duration-700 ease-out"
                  style={{ width: `${xpProgressPercent}%` }}
                />
              </div>
              <p className="text-xs text-white/60 mt-2">
                {xpRemaining === 0
                  ? tr("rewards_levelup_ready", "Level-up ready")
                  : tr("rewards_xp_remaining", `${xpRemaining} XP remaining`, {
                      count: xpRemaining,
                    })}
              </p>
            </div>

            <div className="mt-2 text-[11px] text-white/70 flex items-center gap-2">
              <Share2 className="w-3.5 h-3.5" />
              {tr("invite_friends_hint", "Invite friends to boost your coins.")}
            </div>
          </div>

          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="relative overflow-hidden rounded-2xl bg-white/95 dark:bg-slate-900/80 text-slate-900 dark:text-slate-100 p-3 shadow-xl border border-amber-100/60 dark:border-amber-900/30">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                  {tr("coin_balance", "Coin Balance")}
                </p>
              </div>
              <div className="flex items-end gap-1 mt-0.5">
                <span className="coin-display coin-big-number text-3xl font-black text-amber-600 dark:text-amber-400 leading-none">
                  {displayCoins}
                </span>
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-300 pb-0.5">
                  {tr("coins", "coins")}
                </span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 overflow-hidden">
                <div
                  className="h-full progress-bar-gold rounded-full transition-[width] duration-700 ease-out"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round((Number(displayCoins || 0) / 500) * 100),
                    )}%`,
                  }}
                />
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-400 mt-1">
                {tr("coin_balance_hint", "Earn coins to unlock rewards")}
              </p>
              {coinDelta?.amount ? (
                <p
                  className={`mt-2 text-[10px] font-semibold ${
                    coinDelta.amount > 0
                      ? "text-emerald-600 dark:text-emerald-300"
                      : "text-rose-600 dark:text-rose-300"
                  }`}
                >
                  {coinDelta.amount > 0 ? "+" : ""}
                  {coinDelta.amount} {tr("coins", "Coins")}
                </p>
              ) : null}
            </div>

            <div className="rounded-2xl bg-white/90 dark:bg-slate-900/70 text-slate-900 dark:text-slate-100 p-3 shadow-lg">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-300">
                {tr("referral_goal", "Invite {{count}} friends -> Get {{reward}} coins", {
                  count: referralGoal,
                  reward: referralReward,
                })}
              </p>
              <div className="mt-2 flex items-center justify-between text-sm font-semibold text-slate-800 dark:text-slate-200">
                <span>
                  {tr("progress", "Progress")}: {referralDisplay}/{referralGoal}
                </span>
                <span className="text-emerald-600 dark:text-emerald-300">
                  +{referralReward} {tr("coins", "coins")}
                </span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full transition-[width] duration-700 ease-out"
                  style={{ width: `${referralProgressPercent}%` }}
                />
              </div>
              {milestoneEligible ? (
                <Button
                  type="button"
                  size="sm"
                  className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={onClaimMilestone}
                >
                  {tr("claim_reward", "Claim reward")}
                </Button>
              ) : null}
              {milestoneClaimed ? (
                <Badge className="mt-3 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                  {tr("reward_claimed", "Reward claimed")}
                </Badge>
              ) : null}
            </div>

            <div className="rounded-2xl bg-white/90 dark:bg-slate-900/70 text-slate-900 dark:text-slate-100 p-3 shadow-lg">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-300 mb-2">
                {tr("quick_share", "Quick share")}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={shareDisabled}
                  className="h-9 rounded-xl text-xs"
                  onClick={onShareWhatsApp}
                >
                  {tr("share_whatsapp", "WhatsApp")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={shareDisabled}
                  className="h-9 rounded-xl text-xs"
                  onClick={onShareTelegram}
                >
                  {tr("share_telegram", "Telegram")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={shareDisabled}
                  className="col-span-2 h-9 rounded-xl text-xs"
                  onClick={onCopyReferralLink}
                >
                  {tr("copy_link", "Copy Link")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={shareDisabled}
                  className="col-span-2 h-9 rounded-xl text-xs"
                  onClick={onShareSms}
                >
                  SMS
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RewardsOverview({
  rewardsUser,
  displayCoins,
  nextRewardTarget,
  nextRewardLabel,
  nextRewardProgress,
  nextRewardRemaining,
  onShareReferral,
  onOpenRedeem,
  primaryStats,
  secondaryStats,
  showMoreStats,
  onToggleMoreStats,
  xpProgressPercent,
  xpRemaining,
  maxStreak,
  nextStreakTarget,
  streakProgress,
  milestoneUnlockedCount,
  milestones,
  nextMilestone,
  onboardingSteps,
  primaryActionLabel,
  onPrimaryAction,
  onOpenEarnPlan,
  tr,
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <Card
          id="rewards-summary"
          className="bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl scroll-mt-24"
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              {tr("my_rewards", "My rewards")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                  {tr("coin_balance", "Coin balance")}
                </p>
                <div className="flex items-end gap-2 mt-1">
                  <span className="coin-display coin-big-number text-5xl sm:text-6xl font-black leading-none text-amber-600 dark:text-amber-400">
                    {displayCoins}
                  </span>
                  <span className="text-lg font-semibold text-slate-400 pb-1">
                    {tr("coins", "coins")}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
                  {tr("level", "Level")} {rewardsUser?.level ?? "-"}
                </Badge>
                <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                  {rewardsUser?.rank || tr("unknown", "Unknown")}
                </Badge>
              </div>
            </div>

            <div className="rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/70 dark:bg-indigo-900/20 p-4">
              <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-200">
                {tr("next_reward", "Next reward")}
              </p>
              <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">
                {nextRewardTarget} {tr("coins", "coins")} {"->"} {nextRewardLabel}
              </p>
              <div className="mt-3 h-2.5 rounded-full bg-indigo-100/90 dark:bg-slate-800/70 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-[width] duration-700 ease-out"
                  style={{ width: `${nextRewardProgress}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-indigo-700 dark:text-indigo-200">
                <span>
                  {nextRewardRemaining > 0
                    ? tr("coins_to_unlock", "{{count}} coins to unlock", {
                        count: nextRewardRemaining,
                      })
                    : tr("ready_to_redeem", "Ready to redeem")}
                </span>
                <span className="font-semibold">{nextRewardProgress}%</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={onShareReferral}
              >
                <Share2 className="w-4 h-4 mr-2" />
                {tr("invite_friends", "Invite friends")}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-slate-200 text-slate-700 dark:border-slate-600 dark:text-slate-200"
                onClick={onOpenRedeem}
              >
                {tr("redeem_coins", "Redeem coins")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-50/80 dark:bg-gray-800/80 border-0 shadow-xl rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              {tr("rewards_summary", "Rewards summary")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {primaryStats.map((stat) => {
                const ringStyle = {
                  background: `conic-gradient(${stat.ringColor} ${stat.progress}%, rgba(226,232,240,0.9) ${stat.progress}% 100%)`,
                };

                return (
                  <div
                    key={stat.key}
                    className="rewards-stat-card rounded-2xl border border-slate-100 dark:border-slate-700 p-5 shadow-md bg-white dark:bg-slate-900/50"
                    style={{
                      "--card-accent": `linear-gradient(90deg, ${stat.ringColor}, ${stat.ringColor}99)`,
                      background: `linear-gradient(135deg, ${stat.ringColor}12, #ffffff 55%)`,
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-400">
                          {stat.label}
                        </p>
                        <p className="text-3xl font-black coin-big-number text-slate-900 dark:text-white mt-0.5">
                          {stat.value}
                        </p>
                      </div>
                      <div className="h-14 w-14 rounded-full p-[3px] shadow-md" style={ringStyle}>
                        <div className="h-full w-full rounded-full bg-white dark:bg-slate-800 flex items-center justify-center">
                          {renderDynamicIcon(
                            stat.icon,
                            "w-5 h-5 text-slate-700 dark:text-slate-200",
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700/60 overflow-hidden">
                      <div
                        className="h-full progress-bar-animated rounded-full transition-[width] duration-1000 ease-out"
                        style={{ width: `${stat.progress}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-400 mt-1.5">
                      {tr("progress_pct", "{{count}}% complete", {
                        count: stat.progress,
                      })}
                    </p>
                  </div>
                );
              })}
            </div>

            {secondaryStats.length ? (
              <div
                className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${
                  showMoreStats ? "" : "hidden"
                }`}
              >
                {secondaryStats.map((stat) => (
                  <div
                    key={stat.key}
                    className="rounded-xl bg-slate-50 dark:bg-slate-900/30 p-3 text-center"
                  >
                    <div
                      className={`mx-auto mb-2 h-9 w-9 rounded-lg bg-gradient-to-br ${stat.accent} flex items-center justify-center`}
                    >
                      {renderDynamicIcon(stat.icon, "w-4 h-4 text-white")}
                    </div>
                    <p className="text-lg font-bold text-slate-800 dark:text-white">
                      {stat.value}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-300">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}

            {secondaryStats.length ? (
              <Button
                type="button"
                variant="ghost"
                className="w-full text-xs text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-200"
                onClick={onToggleMoreStats}
              >
                {showMoreStats
                  ? tr("show_less_stats", "Show fewer stats")
                  : tr("show_more_stats", "Show more stats")}
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <Card
          id="rewards-progress"
          className="bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl scroll-mt-24"
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-600" />
              {tr("progress_overview", "Achievements")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-900/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {tr("xp_progress", "XP Progress")}
                </span>
                <span className="text-sm text-slate-600 dark:text-slate-300">
                  {rewardsUser?.xpCurrent} / {rewardsUser?.xpRequired}
                </span>
              </div>
              <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden shadow-inner">
                <div
                  className="h-full progress-bar-gold rounded-full transition-[width] duration-700 ease-out"
                  style={{ width: `${xpProgressPercent}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-300 mt-2">
                {xpRemaining === 0
                  ? tr("rewards_levelup_ready", "Level-up ready")
                  : tr("rewards_xp_remaining", `${xpRemaining} XP remaining`, {
                      count: xpRemaining,
                    })}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-300">
                {tr(
                  "xp_explainer",
                  "Earn XP by completing challenges, sales, and referrals.",
                )}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-300">
                  {tr("streak_progress", "Streak progress")}
                </span>
                <span className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
                  {maxStreak} / {nextStreakTarget} {tr("days", "days")}
                </span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-[width] duration-700 ease-out"
                  style={{ width: `${streakProgress}%` }}
                />
              </div>
            </div>

            <div
              id="rewards-benefits-overview"
              className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-white/60 dark:bg-slate-900/10"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {tr("milestones", "Milestones")}
                </span>
                <span className="text-sm text-slate-600 dark:text-slate-300 font-semibold">
                  {milestoneUnlockedCount}/{milestones.length}
                </span>
              </div>
              {nextMilestone ? (
                <p className="text-xs text-slate-500 dark:text-slate-300">
                  {tr("next_milestone", "Next milestone")}: {nextMilestone.title}
                </p>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-300">
                  {tr("all_milestones_unlocked", "All milestones unlocked")}
                </p>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-900/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {tr("progress_tracker", "Progress Tracker")}
                </span>
                <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
                  {onboardingSteps.filter((step) => step.done).length}/
                  {onboardingSteps.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {onboardingSteps.map((step) => (
                  <div key={step.key} className="flex items-start gap-2">
                    {step.done ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-400 mt-0.5" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {step.label}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-300">
                        {step.hint}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button
              type="button"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
              onClick={onPrimaryAction}
            >
              {primaryActionLabel}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={onOpenEarnPlan}
            >
              {tr("see_earn_plan", "See earn plan")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function RewardsEarn({
  earnPlaybook,
  engagementReady,
  engagementLoading,
  engagementErrorMessage,
  dailyCheckInStatus,
  dailyCheckInRewards,
  currentCheckInDay,
  hasCheckedInToday,
  dailyCheckInLoading,
  onDailyCheckIn,
  spinStatus,
  spinLoading,
  onSpin,
  scratchStatus,
  scratchLoading,
  onScratch,
  visibleChallenges,
  dailyChallenges,
  showAllChallenges,
  onToggleChallenges,
  tr,
}) {
  return (
    <div className="space-y-4">
      <Card
        id="rewards-earn"
        className="bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl scroll-mt-24"
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600" />
            {tr("earn_more_coins", "Earn More Coins")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {earnPlaybook.map((item) => {
            const progress = item.target
              ? Math.min(100, Math.round((item.current / item.target) * 100))
              : 0;

            return (
              <div
                key={item.key}
                className="earn-playbook-card rounded-xl border border-slate-200/80 dark:border-slate-700/70 bg-white dark:bg-slate-900/40 p-4 shadow-sm"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-md">
                      {renderDynamicIcon(item.icon, "w-5 h-5")}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-white">
                        {item.label}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-300">
                        +{item.reward} {tr("coins", "coins")}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    onClick={item.onClick}
                  >
                    {item.cta}
                  </Button>
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-300">
                    <span>
                      {tr("progress", "Progress")}: {item.current}/{item.target}
                    </span>
                    <span>{progress}%</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-slate-100 dark:bg-slate-700/70 overflow-hidden">
                    <div
                      className="h-full progress-bar-animated rounded-full transition-[width] duration-700 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {engagementReady ? (
        <Card className="bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl min-h-[260px] transition-none transform-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              {tr("daily_checkin_reward", "Daily check-in reward")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {tr(
                "daily_checkin_desc",
                "Check in daily to stack rewards and streak bonuses.",
              )}
            </p>
            {engagementLoading ? (
              <p className="text-xs text-slate-400">{tr("loading", "Loading...")}</p>
            ) : null}
            {engagementErrorMessage ? (
              <p className="text-xs text-rose-500">{engagementErrorMessage}</p>
            ) : null}
            {dailyCheckInStatus?.nextReward && !hasCheckedInToday ? (
              <p className="text-xs text-emerald-600">
                {tr("next_reward", "Next reward")}: +{dailyCheckInStatus.nextReward}{" "}
                {tr("coins", "coins")}
              </p>
            ) : null}
            <div className="grid grid-cols-7 gap-2">
              {dailyCheckInRewards.map((reward) => {
                const isCompleted = currentCheckInDay > reward.day;
                const isToday = currentCheckInDay === reward.day;

                return (
                  <div
                    key={reward.day}
                    className={`checkin-day rounded-xl border-2 p-2 text-center flex flex-col items-center gap-0.5 ${
                      isCompleted
                        ? "border-emerald-400 bg-gradient-to-b from-emerald-50 to-emerald-100 dark:border-emerald-700 dark:from-emerald-900/30 dark:to-emerald-900/20 shadow-sm"
                        : isToday
                          ? "today border-indigo-400 bg-gradient-to-b from-indigo-50 to-indigo-100 dark:border-indigo-600 dark:from-indigo-900/30 dark:to-indigo-900/20 shadow-md"
                          : "border-slate-200/70 bg-white dark:border-slate-700 dark:bg-slate-900/30"
                    }`}
                    data-coins={`+${reward.coins}`}
                  >
                    <span
                      className={`text-[9px] font-bold uppercase ${
                        isCompleted
                          ? "text-emerald-600 dark:text-emerald-400"
                          : isToday
                            ? "text-indigo-600 dark:text-indigo-300"
                            : "text-slate-400"
                      }`}
                    >
                      {tr("day", "D")}
                      {reward.day}
                    </span>
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-300" />
                    ) : isToday ? (
                      <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-300" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-300 dark:text-slate-500" />
                    )}
                    <p
                      className={`text-[9px] font-black ${
                        isCompleted
                          ? "text-emerald-700 dark:text-emerald-300"
                          : isToday
                            ? "text-indigo-700 dark:text-indigo-300"
                            : "text-slate-400"
                      }`}
                    >
                      +{reward.coins}
                    </p>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-300">
              <span>
                {tr("current_day", "Current day")}: {currentCheckInDay}/7
              </span>
              <span>{Math.min(100, Math.round((currentCheckInDay / 7) * 100))}%</span>
            </div>
            <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-500 transition-[width] duration-700 ease-out"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round((currentCheckInDay / 7) * 100),
                  )}%`,
                }}
              />
            </div>
            <Button
              type="button"
              disabled={hasCheckedInToday || dailyCheckInLoading}
              className={
                hasCheckedInToday || dailyCheckInLoading
                  ? "bg-slate-200 text-slate-500 cursor-not-allowed dark:bg-slate-700 dark:text-slate-300"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }
              onClick={onDailyCheckIn}
            >
              {hasCheckedInToday
                ? tr("checked_in", "Checked in today")
                : dailyCheckInLoading
                  ? tr("claiming", "Claiming...")
                  : tr("claim_today_reward", "Claim today reward")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <CardSkeleton rows={4} />
      )}

      {engagementReady ? (
        <Card className="bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              {tr("killer_features", "Killer features")}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/70 dark:bg-indigo-900/20 p-4">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-200 font-semibold">
                <Sparkles className="w-4 h-4" />
                {tr("spin_wheel", "Spin wheel")}
              </div>
              <p className="text-xs text-indigo-700 dark:text-indigo-200 mt-1">
                {spinStatus?.hasSpunToday
                  ? tr("spin_already", "You already spun today.")
                  : tr("spin_wheel_desc", "Spin daily and win coins.")}
              </p>
              <Button
                type="button"
                size="sm"
                disabled={spinStatus?.hasSpunToday || spinLoading}
                className={
                  spinStatus?.hasSpunToday || spinLoading
                    ? "mt-3 bg-slate-200 text-slate-500 cursor-not-allowed dark:bg-slate-700 dark:text-slate-300"
                    : "mt-3 bg-indigo-600 hover:bg-indigo-700 text-white"
                }
                onClick={onSpin}
              >
                {spinStatus?.hasSpunToday
                  ? tr("spin_done", "Spun today")
                  : spinLoading
                    ? tr("spinning", "Spinning...")
                    : tr("spin_now", "Spin now")}
              </Button>
            </div>

            <div className="rounded-2xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/70 dark:bg-amber-900/20 p-4">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-200 font-semibold">
                <Star className="w-4 h-4" />
                {tr("scratch_card", "Scratch card")}
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-200 mt-1">
                {tr(
                  "scratch_card_desc",
                  "Scratch after a referral to win 10-100 coins.",
                )}
              </p>
              {scratchStatus ? (
                <p className="text-[11px] text-amber-600 dark:text-amber-200 mt-1">
                  {scratchStatus.available
                    ? tr("scratch_available", "Available: {{count}}", {
                        count: scratchStatus.available,
                      })
                    : tr("scratch_none", "No scratch cards available")}
                </p>
              ) : null}
              <Button
                type="button"
                size="sm"
                disabled={
                  scratchLoading ||
                  (scratchStatus && Number(scratchStatus.available || 0) === 0)
                }
                className={
                  scratchLoading ||
                  (scratchStatus && Number(scratchStatus.available || 0) === 0)
                    ? "mt-3 bg-slate-200 text-slate-500 cursor-not-allowed dark:bg-slate-700 dark:text-slate-300"
                    : "mt-3 bg-amber-600 hover:bg-amber-700 text-white"
                }
                onClick={onScratch}
              >
                {scratchLoading
                  ? tr("scratching", "Scratching...")
                  : tr("scratch_now", "Scratch now")}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <CardSkeleton rows={2} />
      )}

      <Card
        id="rewards-challenges"
        className="bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl scroll-mt-24"
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600" />
            {tr("daily_challenges", "Today's Challenges")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {visibleChallenges.map((challenge, index) => (
            <div
              key={challenge.key || `${challenge.title}-${index}`}
              className={`rounded-2xl border p-4 transition-colors ${
                challenge.completed
                  ? "border-green-200 bg-green-50/80 dark:border-green-900/40 dark:bg-green-900/20"
                  : "border-slate-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800/60"
              }`}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      challenge.completed
                        ? "bg-green-500"
                        : "bg-gray-300 dark:bg-slate-600"
                    }`}
                  >
                    {challenge.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    ) : (
                      <span className="text-gray-500 dark:text-slate-300">
                        {index + 1}
                      </span>
                    )}
                  </div>

                  <div>
                    <p
                      className={`text-sm font-semibold ${
                        challenge.completed
                          ? "line-through text-gray-400 dark:text-slate-300"
                          : "text-slate-700 dark:text-slate-100"
                      }`}
                    >
                      {challenge.title}
                    </p>
                    {challenge.desc ? (
                      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-300">
                        {challenge.desc}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  <Badge
                    className={
                      challenge.completed
                        ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200"
                        : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200"
                    }
                  >
                    {challenge.rewardLabel
                      ? challenge.rewardLabel
                      : `+${challenge.reward} ${tr("coins", "Coins")}`}
                  </Badge>
                  {challenge.completed ? (
                    <Badge className="bg-white text-green-700 border border-green-200 dark:bg-slate-900 dark:text-green-200 dark:border-green-800">
                      {tr("completed", "Completed")}
                    </Badge>
                  ) : challenge.onClick ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-indigo-200 text-indigo-700 dark:border-indigo-700 dark:text-indigo-200"
                      onClick={challenge.onClick}
                    >
                      {challenge.cta || tr("view", "View")}
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}

          {dailyChallenges.length > 3 ? (
            <Button
              type="button"
              variant="ghost"
              className="w-full text-xs text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-200"
              onClick={onToggleChallenges}
            >
              {showAllChallenges
                ? tr("show_less_challenges", "Show fewer challenges")
                : tr("show_all_challenges", "View all challenges")}
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

export function RewardsMilestones({
  levelBenefits,
  currentLevel,
  milestones,
  onOpenAllLevels,
  tr,
}) {
  return (
    <div className="space-y-4">
      <Card
        id="rewards-benefits"
        className="bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl scroll-mt-24"
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-indigo-600" />
            {tr("level_benefits", "Level benefits")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {levelBenefits.map((benefit) => {
              const isCurrent = benefit.level === currentLevel;

              return (
                <div
                  key={benefit.key}
                  className={`rewards-stat-card rounded-2xl border-2 p-4 transition-all ${
                    isCurrent
                      ? "border-indigo-400 bg-gradient-to-br from-indigo-50 to-blue-50 dark:border-indigo-700 dark:from-indigo-900/30 dark:to-blue-900/20 shadow-lg shadow-indigo-100 dark:shadow-indigo-900/20"
                      : "border-slate-200/70 bg-white dark:border-slate-700 dark:bg-slate-900/40"
                  }`}
                  style={{
                    "--card-accent": isCurrent
                      ? "linear-gradient(90deg, #6366f1, #3b82f6)"
                      : "linear-gradient(90deg, #cbd5e1, #e2e8f0)",
                  }}
                >
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {benefit.title}
                  </p>
                  <div className="mt-2 space-y-1">
                    {benefit.perks.map((perk, index) => (
                      <div
                        key={`${benefit.key}-${index}`}
                        className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        {perk}
                      </div>
                    ))}
                  </div>
                  {isCurrent ? (
                    <Badge className="mt-3 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
                      {tr("current_level", "Current level")}
                    </Badge>
                  ) : null}
                </div>
              );
            })}
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full border-slate-200 text-slate-700 dark:border-slate-600 dark:text-slate-200"
            onClick={onOpenAllLevels}
          >
            {tr("see_all_levels", "See all levels")}
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            {tr("milestones_achievements", "Milestones & Achievements")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {milestones.map((milestone, index) => {
              const progressMax = Math.max(1, Number(milestone.progressMax || 1));
              const progressValue = Math.max(
                0,
                Math.min(progressMax, Number(milestone.progressValue || 0)),
              );
              const progress = Math.min(
                100,
                Math.round((progressValue / progressMax) * 100),
              );

              return (
                <div
                  key={milestone.key || `${milestone.title}-${index}`}
                  className={`milestone-badge ${milestone.unlocked ? "unlocked" : "locked"} rounded-2xl p-4 relative overflow-hidden ${
                    milestone.unlocked
                      ? "bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-900/20 dark:via-yellow-900/15 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800/40 shadow-sm"
                      : "bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/40"
                  }`}
                >
                  {milestone.unlocked ? <div className="badge-glow" /> : null}
                  <div className="flex items-start justify-between gap-3">
                    <div className="badge-icon text-2xl">{milestone.icon}</div>
                    {milestone.unlocked ? (
                      <div className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5">
                        <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
                          {tr("unlocked", "Unlocked")}
                        </span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center rounded-full bg-slate-200/60 dark:bg-slate-700/40 px-2 py-0.5">
                        <span className="text-[9px] text-slate-400 uppercase tracking-wide">
                          {tr("locked", "Locked")}
                        </span>
                      </div>
                    )}
                  </div>
                  <p
                    className={`mt-3 text-sm font-bold leading-tight ${
                      milestone.unlocked
                        ? "text-amber-700 dark:text-amber-300"
                        : "text-slate-700 dark:text-slate-100"
                    }`}
                  >
                    {milestone.title}
                  </p>
                  {milestone.desc ? (
                    <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-300">
                      {milestone.desc}
                    </p>
                  ) : null}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-300">
                      <span>{tr("progress", "Progress")}</span>
                      <span>
                        {progressValue}/{progressMax}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 rounded-full bg-white/70 dark:bg-slate-900/50 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-[width] duration-700 ease-out ${
                          milestone.unlocked
                            ? "bg-gradient-to-r from-emerald-500 to-green-500"
                            : "bg-gradient-to-r from-indigo-500 to-purple-500"
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  {milestone.meta ? (
                    <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-300">
                      {milestone.meta}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function RewardsRedeem({
  redeemOptions,
  availableCoins,
  redeemProcessing,
  onOpenRedeemDialog,
  onOpenEarn,
  tr,
}) {
  return (
    <Card
      id="rewards-redeem"
      className="bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl scroll-mt-24"
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="w-5 h-5 text-indigo-600" />
          {tr("redeem_rewards", "Redeem coins")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {tr(
            "redeem_desc",
            "Use coins to unlock boosts, badges, and top placement for your listings.",
          )}
        </p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {redeemOptions.map((option) => {
            const affordable = availableCoins >= option.cost;
            const coinsNeeded = Math.max(0, option.cost - availableCoins);
            const progress = Math.min(
              100,
              Math.round((availableCoins / option.cost) * 100),
            );
            const progressClass = affordable
              ? "from-emerald-500 to-green-500"
              : progress >= 60
                ? "from-amber-400 to-yellow-500"
                : "from-rose-400 to-orange-500";

            return (
              <div
                key={option.key}
                className={`rounded-2xl border p-4 shadow-sm ${
                  affordable
                    ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-900/20"
                    : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/40"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`h-10 w-10 rounded-xl bg-gradient-to-br ${option.accent} flex items-center justify-center text-white shadow-sm`}
                    >
                      {renderDynamicIcon(option.icon, "w-5 h-5")}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {option.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-300">
                        {option.desc}
                      </p>
                    </div>
                  </div>

                  <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
                    {option.cost} {tr("coins", "coins")}
                  </Badge>
                </div>

                <div className="mt-3">
                  <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${progressClass} rounded-full transition-[width] duration-700 ease-out`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span
                      className={
                        affordable
                          ? "text-emerald-600"
                          : "text-slate-500 dark:text-slate-300"
                      }
                    >
                      {affordable
                        ? tr("ready_to_redeem", "Ready to redeem")
                        : tr("need_more_coins", "Need {{count}} more coins", {
                            count: coinsNeeded,
                          })}
                    </span>
                    <span className="text-slate-400 dark:text-slate-300">
                      {progress}%
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Button
                    type="button"
                    disabled={!affordable || redeemProcessing === option.key}
                    className={
                      affordable
                        ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                        : "bg-slate-200 text-slate-500 cursor-not-allowed"
                    }
                    onClick={
                      affordable ? () => onOpenRedeemDialog(option) : onOpenEarn
                    }
                  >
                    {affordable
                      ? redeemProcessing === option.key
                        ? tr("redeeming", "Redeeming...")
                        : option.cta
                      : tr("keep_earning", "Keep earning")}
                  </Button>
                  {!affordable ? (
                    <Button type="button" variant="ghost" className="text-xs" onClick={onOpenEarn}>
                      {tr("earn_more", "Earn more")}
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            to="/tier-selection"
            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            {tr("redeem_now", "Redeem now")}
          </Link>
          <Link
            to="/tier-selection"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800/60"
          >
            {tr("view_benefits", "View benefits")}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export function RewardsActivity({
  visitStreak,
  postStreak,
  streakProgress,
  nextStreakTarget,
  chainEarnedPoints,
  chainPotentialPoints,
  activityReady,
  rewardLogItems,
  filteredRewardLogItems,
  historyFilter,
  onChangeHistoryFilter,
  onOpenEarn,
  onShareReferral,
  tr,
  tFunc,
}) {
  const filters = [
    { key: "all", label: tr("history_filter_all", "All") },
    { key: "earned", label: tr("history_filter_earned", "Earned") },
    { key: "spent", label: tr("history_filter_spent", "Spent") },
    { key: "referral", label: tr("history_filter_referral", "Referral") },
    { key: "daily", label: tr("history_filter_daily", "Daily") },
  ];

  return (
    <div className="space-y-4">
      <Card
        id="rewards-activity"
        className="bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl scroll-mt-24"
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            {tr("streaks_and_chain_rewards", "Streaks & Chain Rewards")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-900/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {tr("visit_streak", "Visit streak")}
              </span>
              <span className="text-sm text-slate-600 dark:text-slate-300">
                {visitStreak} {tr("days", "days")}
              </span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {tr("post_streak", "Post streak")}
              </span>
              <span className="text-sm text-slate-600 dark:text-slate-300">
                {postStreak} {tr("days", "days")}
              </span>
            </div>
            <div
              className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden"
              role="progressbar"
              aria-label={tr("streak_progress", "Streak progress")}
              aria-valuenow={streakProgress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-[width] duration-700 ease-out"
                style={{ width: `${streakProgress}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-300 mt-2">
              {tFunc("next_streak_milestone", {
                count: nextStreakTarget,
              }) || `Next streak milestone: ${nextStreakTarget} days`}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-white/60 dark:bg-slate-900/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {tr("chain_rewards_earned", "Chain rewards earned")}
              </span>
              <span className="text-sm text-emerald-600 font-semibold">
                +{chainEarnedPoints} {tFunc("coins")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {tr("chain_rewards_potential", "Potential chain rewards")}
              </span>
              <span className="text-sm text-slate-600 dark:text-slate-300 font-semibold">
                +{chainPotentialPoints} {tFunc("coins")}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-indigo-600" />
            {tr("recent_rewards", "Recent rewards")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!activityReady ? (
            <ListSkeleton rows={5} />
          ) : rewardLogItems.length ? (
            <>
              <div className="mb-3 flex flex-wrap gap-2">
                {filters.map((filter) => (
                  <Button
                    key={filter.key}
                    type="button"
                    size="sm"
                    variant={historyFilter === filter.key ? "default" : "outline"}
                    className="rounded-full text-xs"
                    onClick={() => onChangeHistoryFilter(filter.key)}
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>

              <div className="space-y-2">
                {filteredRewardLogItems.length ? (
                  filteredRewardLogItems.map((item, index) => (
                    <div
                      key={`${item.action || "reward"}-${index}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {item.description || item.action || tFunc("reward_log_action")}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-300">
                          {item.created_at
                            ? new Date(item.created_at).toLocaleString()
                            : ""}
                        </p>
                      </div>
                      <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
                        {`${item.points >= 0 ? "+" : ""}${item.points} ${tr("coins", "Coins")}`}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-300">
                    {tr(
                      "reward_log_filter_empty",
                      "No reward activity matches this filter.",
                    )}
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 p-4 text-center bg-slate-50/80 dark:bg-slate-900/30">
              <div className="mx-auto mb-2 h-10 w-10 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-200 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {tr("reward_log_empty", "No reward activity yet.")}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-300 mt-1">
                {tr(
                  "reward_log_empty_desc",
                  "Complete a challenge or referral to see your first reward.",
                )}
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <Button
                  type="button"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                  onClick={onOpenEarn}
                >
                  {tr("earn_coins", "Earn coins")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="text-xs"
                  onClick={onShareReferral}
                >
                  {tr("share_referral", "Share referral")}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function RewardsReferrals({
  referralCode,
  referralShareDisplay,
  referralGoal,
  referralReward,
  shareDisabled,
  onCopyReferralCode,
  onCopyReferralLink,
  onShareWhatsApp,
  onShareTelegram,
  onShareSms,
  dailySecretCode,
  secretCountdown,
  onCopySecretCode,
  referralSteps,
  onShareReferral,
  referralChain,
  directReferrals,
  indirectReferrals,
  onBrowseListings,
  tr,
  tFunc,
}) {
  const getReferralDepth = (referral, fallbackDepth = 1) => {
    const rawDepth = Number(referral?.depth ?? referral?.level);
    if (Number.isFinite(rawDepth) && rawDepth > 0) {
      return rawDepth;
    }
    if (referral?.type === "indirect") {
      return Math.max(2, fallbackDepth);
    }
    if (referral?.type === "direct") {
      return 1;
    }
    return fallbackDepth;
  };

  const isQualifiedReferral = (referral) => {
    const qualifiedCount = Number(
      referral?.qualifiedTrades ??
        referral?.qualifiedTradesCount ??
        referral?.verifiedTrades ??
        referral?.successfulTrades ??
        0,
    );
    const status = String(referral?.status || "").toLowerCase();
    return (
      referral?.qualified === true ||
      referral?.isQualified === true ||
      qualifiedCount > 0 ||
      status === "qualified"
    );
  };

  return (
    <div className="space-y-4">
      <Card
        id="rewards-referrals"
        className="bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl scroll-mt-24"
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-indigo-600" />
            {tr("your_referral_link", "Your referral link")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 px-4 py-3">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-300">
                {tr("referral_link", "Referral link")}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100 break-all">
                {referralShareDisplay || tr("not_available", "Not available")}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
                  {tr(
                    "referral_milestone_badge",
                    "Milestone: {{count}} invites -> {{reward}} coins",
                    { count: referralGoal, reward: referralReward },
                  )}
                </Badge>
              </div>
            </div>

            <div className="rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/80 dark:bg-indigo-900/20 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-200">
                    {tr("your_referral_code", "Your Referral Code")}
                  </p>
                  <p className="referral-code-box mt-2 text-xl font-black text-indigo-700 dark:text-indigo-200">
                    {referralCode || tr("not_available", "Not available")}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!referralCode}
                  className="border-indigo-200 text-indigo-700 dark:border-indigo-700 dark:text-indigo-200"
                  onClick={onCopyReferralCode}
                >
                  <CopyIcon className="w-4 h-4 mr-1" />
                  {tr("copy", "Copy")}
                </Button>
              </div>
              <p className="mt-2 text-xs text-indigo-700/90 dark:text-indigo-200/80">
                {tr(
                  "referral_code_share_hint",
                  "Easy to share in chats, calls, and offline invites.",
                )}
              </p>
            </div>
          </div>

          <div
            id="rewards-referral-share-actions"
            className="flex flex-wrap gap-2 scroll-mt-24"
          >
            <Button
              variant="outline"
              size="sm"
              disabled={shareDisabled}
              className="border-slate-200 text-slate-700 dark:border-slate-600 dark:text-slate-200"
              onClick={onCopyReferralLink}
            >
              <CopyIcon className="w-4 h-4 mr-1" />
              {tr("copy", "Copy")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={shareDisabled}
              className="border-emerald-200 text-emerald-700 dark:border-emerald-600/60 dark:text-emerald-200"
              onClick={onShareWhatsApp}
            >
              {tr("share_whatsapp", "WhatsApp")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={shareDisabled}
              className="border-sky-200 text-sky-700 dark:border-sky-600/60 dark:text-sky-200"
              onClick={onShareTelegram}
            >
              {tr("share_telegram", "Telegram")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={shareDisabled}
              className="border-indigo-200 text-indigo-700 dark:border-indigo-600/60 dark:text-indigo-200"
              onClick={onShareSms}
            >
              SMS
            </Button>
          </div>

          {dailySecretCode ? (
            <div className="rounded-xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/80 dark:bg-amber-900/20 px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-200">
                  {tr("daily_secret_code", "Daily secret code")}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-amber-700 border-amber-200 bg-white/90 hover:bg-white rounded-full px-3 dark:text-amber-200 dark:border-amber-700/60 dark:bg-amber-900/30 dark:hover:bg-amber-900/40"
                  onClick={onCopySecretCode}
                >
                  <CopyIcon className="w-4 h-4 mr-1" />
                  {tr("copy", "Copy")}
                </Button>
              </div>
              <p className="referral-code-box mt-2 text-xl font-black text-amber-700 dark:text-amber-200">
                {dailySecretCode}
              </p>
              <div className="mt-1 flex items-center gap-2 text-amber-600/90 dark:text-amber-200/80">
                <Calendar className="w-4 h-4" />
                <span className="text-xs">
                  {secretCountdown
                    ? `${tr("expires_in", "Expires in")} ${secretCountdown}`
                    : tr("expires_in_12h_30m", "Expires soon")}
                </span>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            {tr("referral_playbook", "Referral Playbook")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {referralSteps.map((step, index) => (
            <div
              key={step.key}
              className="flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2"
            >
              <div className="relative flex flex-col items-center self-stretch">
                <Badge className="bg-indigo-600 text-white mt-0.5">{index + 1}</Badge>
                {index < referralSteps.length - 1 ? (
                  <span className="absolute top-8 bottom-3 w-px bg-gradient-to-b from-indigo-200 via-slate-200 to-transparent dark:from-indigo-600/40 dark:via-slate-700 dark:to-transparent" />
                ) : null}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {step.title}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-300">
                  {step.detail}
                </p>
              </div>
            </div>
          ))}

          <Button type="button" variant="outline" className="w-full" onClick={onShareReferral}>
            <Share2 className="w-4 h-4 mr-2" />
            {tr("share_referral_to_start", "Share referral to start")}
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            {tFunc("your_referrals")} ({referralChain.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {referralChain.length === 0 ? (
            <div className="text-center py-6">
              <div className="text-6xl mb-4">[]</div>
              <p className="text-gray-500 dark:text-slate-300 mb-4">
                {tFunc("no_referrals_yet")}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button
                  onClick={onShareReferral}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  {tFunc("share_your_code")}
                </Button>
                <Button type="button" variant="outline" onClick={onBrowseListings}>
                  {tr("browse_listings", "Browse Listings")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-900/20 p-4">
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-200 mb-2">
                  {tr("direct_referrals", "Direct referrals")} ({directReferrals.length})
                </p>
                {directReferrals.length ? (
                  <div className="grid gap-2">
                    {directReferrals.map((referral, index) => (
                      <div
                        key={referral.id || index}
                        className="rounded-xl border border-emerald-200/80 bg-white/80 dark:border-emerald-800/40 dark:bg-slate-900/40 px-3 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                                {getInitials(referral.name, "U")}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                                {referral.name || tr("user", "User")}
                              </p>
                              <p className="text-xs text-emerald-700 dark:text-emerald-200">
                                {tr("level", "Level")} {getReferralDepth(referral, 1)}
                              </p>
                            </div>
                          </div>
                          {isQualifiedReferral(referral) ? (
                            <Badge className="shrink-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                              {tr("qualified", "Qualified")}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-emerald-700 dark:text-emerald-200">
                    {tr("no_direct_referrals", "No direct referrals yet")}
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/60 dark:border-blue-900/40 dark:bg-blue-900/20 p-4">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-200 mb-2">
                  {tr("indirect_referrals", "Indirect referrals")} ({indirectReferrals.length})
                </p>
                {indirectReferrals.length ? (
                  <div className="grid gap-2">
                    {indirectReferrals.map((referral, index) => (
                      <div
                        key={referral.id || index}
                        className="rounded-xl border border-blue-200/80 bg-white/80 dark:border-blue-800/40 dark:bg-slate-900/40 px-3 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                                {getInitials(referral.name, "U")}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                                {referral.name || tr("user", "User")}
                              </p>
                              <p className="text-xs text-blue-700 dark:text-blue-200">
                                {tr("level", "Level")} {getReferralDepth(referral, 2)}
                              </p>
                            </div>
                          </div>
                          {isQualifiedReferral(referral) ? (
                            <Badge className="shrink-0 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                              {tr("qualified", "Qualified")}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-blue-700 dark:text-blue-200">
                    {tr("no_indirect_referrals", "No indirect referrals")}
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function RewardsLeaderboard({
  leaderboardCountdown,
  nextLeaderboardPayout,
  lastLeaderboardPayout,
  currentReferralRank,
  referralLeaderboard,
  leaderboardReady,
  publicWall,
  leaderboardHistory,
  tr,
  tFunc,
}) {
  return (
    <div className="space-y-4">
      <Card
        id="rewards-weekly-leaderboard"
        className="bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl scroll-mt-24"
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            {tr("weekly_leaderboard", "Weekly Leaderboard")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
              {tr("next_payout", "Next payout")}:{" "}
              {leaderboardCountdown
                ? leaderboardCountdown
                : nextLeaderboardPayout
                  ? new Date(nextLeaderboardPayout).toLocaleString()
                  : tr("unknown", "Unknown")}
            </Badge>
            {lastLeaderboardPayout ? (
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                {tr("last_payout", "Last payout")}:{" "}
                {new Date(lastLeaderboardPayout).toLocaleDateString()}
              </Badge>
            ) : null}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-300">
            {tr(
              "leaderboard_payout_notice",
              "Payouts are processed weekly via background jobs. If jobs are paused, payouts may be delayed.",
            )}
          </p>
        </CardContent>
      </Card>

      {!leaderboardReady ? (
        <div className="space-y-4">
          <CardSkeleton rows={4} />
          <div className="grid grid-cols-1 gap-4">
            <CardSkeleton rows={3} />
            <CardSkeleton rows={3} />
          </div>
        </div>
      ) : (
        <>
          <Card className="bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-indigo-600" />
                {tr("top_referrers_week", "Top referrers this week")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {currentReferralRank ? (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-3 dark:border-indigo-900/40 dark:bg-indigo-900/20">
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-200">
                    {tr("your_position", "Your position")}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-2xl font-black text-slate-900 dark:text-slate-50">
                        #{currentReferralRank.rank || tr("unknown", "Unknown")}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {tr(
                          "your_referral_rank_summary",
                          "{{count}} referrals this period",
                          {
                            count:
                              currentReferralRank.referral_count ??
                              currentReferralRank.referralCount ??
                              0,
                          },
                        )}
                      </p>
                    </div>
                    <Badge className="bg-white text-indigo-700 border border-indigo-200 dark:bg-slate-900 dark:text-indigo-200 dark:border-indigo-800">
                      {tr("weekly_snapshot", "Weekly snapshot")}
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 p-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-300">
                  {tr(
                    "share_referral_to_start",
                    "Share referral to start climbing this leaderboard.",
                  )}
                </div>
              )}

              {referralLeaderboard.length ? (
                <div className="space-y-2">
                  {referralLeaderboard.slice(0, 3).map((entry, index) => (
                    <div
                      key={entry.user_id || entry.id || index}
                      className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <Badge className="bg-indigo-50 text-indigo-600">
                          #{index + 1}
                        </Badge>
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {entry.full_name || entry.username || tr("user", "User")}
                        </span>
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-300">
                        {entry.referral_count ?? entry.referralCount ?? 0}{" "}
                        {tr("referrals", "referrals")}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-300">
                  {tr("no_leaderboard_data", "No leaderboard data yet.")}
                </p>
              )}

              <p className="text-xs text-slate-500 dark:text-slate-300">
                {tr("leaderboard_period", "Updated weekly.")}
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4">
            <Card className="bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-indigo-600" />
                  {tr("top_sellers", "Top Sellers")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {publicWall.topSellers?.length ? (
                  <div className="space-y-2">
                    {publicWall.topSellers.map((seller, index) => (
                      <div
                        key={seller.id || index}
                        className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <Badge className="bg-indigo-50 text-indigo-600">
                            {seller.rank || `#${index + 1}`}
                          </Badge>
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {seller.name || tr("user", "User")}
                          </span>
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-300">
                          {tr("sales", "Sales")}: {seller.sales ?? 0}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-300">
                    {tr("no_leaderboard_data", "No leaderboard data yet.")}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-emerald-600" />
                  {tr("top_buyers", "Top Buyers")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {publicWall.topBuyers?.length ? (
                  <div className="space-y-2">
                    {publicWall.topBuyers.map((buyer, index) => (
                      <div
                        key={buyer.id || index}
                        className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <Badge className="bg-emerald-50 text-emerald-600">
                            {buyer.rank || `#${index + 1}`}
                          </Badge>
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {buyer.name || tr("user", "User")}
                          </span>
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-300">
                          {tr("purchases", "Purchases")}: {buyer.purchases ?? 0}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-300">
                    {tr("no_leaderboard_data", "No leaderboard data yet.")}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <Card className="bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-600" />
            {tr("payout_history", "Payout history")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {leaderboardHistory.length ? (
            <div className="space-y-2">
              {leaderboardHistory.map((entry, index) => (
                <div
                  key={`${entry.action || "payout"}-${index}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {entry.description ||
                        (entry.action === "leaderboard_top_seller"
                          ? tr("top_seller_reward", "Top seller reward")
                          : tr("top_buyer_reward", "Top buyer reward"))}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-300">
                      {entry.created_at
                        ? new Date(entry.created_at).toLocaleString()
                        : ""}
                    </p>
                  </div>
                  <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
                    +{entry.points ?? 0} {tFunc("coins")}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-300">
              {tr("no_payout_history", "No leaderboard payouts yet.")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

