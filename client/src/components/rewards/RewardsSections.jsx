import React from "react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTrustBadgeClass, isComplaintRiskState } from "@/hooks/useTrustScore";
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
  X,
  Zap,
} from "lucide-react";
import api from "../../lib/api";
import UpsellBanner from "@/components/UpsellBanner";
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
    <Card className="mhub-premium-surface border-0 shadow-xl rounded-2xl">
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
  membershipPlanLabel,
  membershipPlanBadgeClass,
  isBasicPlan = false,
  trustScore,
  trustLabel,
  trustLevel,
  riskState,
  underReview,
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
  const planBadgeClass = isBasicPlan
    ? `bg-gradient-to-r ${rankGradient} text-white border-0 shadow-sm`
    : membershipPlanBadgeClass || "bg-white/20 text-white border-0";
  const planLabel =
    membershipPlanLabel || tr("basic_plan", "Basic");
  const normalizedTrustScore = Number.isFinite(Number(trustScore))
    ? Math.round(Number(trustScore))
    : null;
  const resolvedTrustLevel =
    String(trustLevel || "").trim().toLowerCase() ||
    (normalizedTrustScore !== null
      ? normalizedTrustScore >= 70
        ? "verified"
        : normalizedTrustScore >= 40
          ? "new"
          : "risky"
      : "");
  const resolvedTrustLabel =
    String(trustLabel || "").trim() ||
    (normalizedTrustScore !== null
      ? normalizedTrustScore >= 70
        ? tr("verified_seller", "Verified Seller")
        : normalizedTrustScore >= 40
          ? tr("new_seller", "New Seller")
          : tr("risky_seller", "Risky Seller")
      : "");
  const trustBadgeClass = resolvedTrustLevel
    ? getTrustBadgeClass(resolvedTrustLevel)
    : "";
  const isFrozen = riskState?.status === "frozen";
  const showUnderReview =
    !isFrozen &&
    (underReview != null ? Boolean(underReview) : isComplaintRiskState(riskState));

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
      <div className="relative max-w-[640px] mx-auto px-4 py-2 sm:px-6 sm:py-3">
        <div className="mb-2 max-w-2xl text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70 mb-1">
            {tr("rewards_program", "Your rewards")}
          </p>
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white">
            {tr("rewards_title", "Rewards & Referrals")}
          </h2>
          <p className="text-sm sm:text-base text-white/80 mt-1">
            {tr(
              "rewards_subtitle",
              "Track progress, earn points, and unlock perks for every milestone.",
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)] items-start gap-3">
          <div className="rewards-hero-card rounded-2xl p-3 text-white page-fade-in page-fade-in-delay-1">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="h-10 w-10 ring-2 ring-white/40 shadow-lg">
                  <AvatarFallback
                    className={`text-lg font-bold text-white bg-gradient-to-br ${rankGradient}`}
                  >
                    {getInitials(rewardsUser?.name, "U")}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-800 rounded-full p-1 shadow-md">
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
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <Badge
                    className={`bg-gradient-to-r ${rankGradient} text-white border-0 text-xs px-2 py-1 leading-none`}
                    title={`${tr("rewards_rank", "Rewards rank")}: ${
                      rewardsUser?.rank || tr("unknown", "Unknown")
                    }`}
                  >
                    <Trophy className="w-4 h-4 mr-1" />
                    {tr("rank", "Rank")}: {rewardsUser?.rank || tr("unknown", "Unknown")}
                  </Badge>
                  <Badge className="bg-white/15 text-white border-0 text-xs px-2 py-1 leading-none">
                    {tr("level", "Level")} {rewardsUser?.level ?? "-"}
                  </Badge>
                  <Badge
                    className={`${planBadgeClass} border-0 text-xs px-2 py-1 leading-none`}
                    title={`${tr("membership_plan", "Membership plan")}: ${planLabel}`}
                  >
                    <Sparkles className="w-4 h-4 mr-1" />
                    {planLabel}
                  </Badge>
                  {resolvedTrustLabel ? (
                    <Badge
                      className={`text-xs px-2 py-1 leading-none ${trustBadgeClass}`}
                      title={
                        normalizedTrustScore != null
                          ? `${resolvedTrustLabel} · ${normalizedTrustScore}`
                          : resolvedTrustLabel
                      }
                    >
                      {resolvedTrustLabel}
                      {normalizedTrustScore != null ? ` · ${normalizedTrustScore}` : ""}
                    </Badge>
                  ) : null}
                  {isFrozen ? (
                    <Badge className="text-xs px-2 py-1 leading-none bg-rose-600 text-white border-0">
                      {tr("account_frozen", "Account Frozen")}
                    </Badge>
                  ) : showUnderReview ? (
                    <Badge className="text-xs px-2 py-1 leading-none bg-amber-500 text-white border-0">
                      {tr("seller_under_review", "Under Review")}
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-white/70">
                  {tr(
                    "rewards_rank_plan_note",
                    "Rewards rank is based on activity and is separate from your membership plan.",
                  )}
                </p>
              </div>
            </div>

            <div className="mt-1.5">
              <div className="flex items-center justify-between text-xs text-white/70">
                <span>{tr("level_progress", "Level progress")}</span>
                <span>
                  {rewardsUser?.xpCurrent} / {rewardsUser?.xpRequired} XP
                </span>
              </div>
              <div
                className="mt-1.5 h-2 rounded-full bg-white/20 overflow-hidden"
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
              <p className="text-xs text-white/60 mt-1.5">
                {xpRemaining === 0
                  ? tr("rewards_levelup_ready", "Level-up ready")
                  : tr("rewards_xp_remaining", `${xpRemaining} XP remaining`, {
                      count: xpRemaining,
                    })}
              </p>
            </div>

            <div className="mt-1.5 text-xs text-white/70 flex items-center gap-2">
              <Share2 className="w-3.5 h-3.5" />
              {tr("invite_friends_hint", "Invite friends to boost your coins.")}
            </div>
          </div>

          <div className="rewards-hero-stats-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 items-stretch gap-2">
            <div
              className="rewards-stat-card relative overflow-hidden rounded-2xl bg-white/95 dark:bg-slate-900/80 text-slate-900 dark:text-slate-100 p-3 shadow-lg border border-amber-100/70 dark:border-amber-900/30"
              style={{ "--card-accent": "linear-gradient(90deg, #f59e0b, #fbbf24)" }}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
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
              <p className="text-xs text-slate-400 dark:text-slate-400 mt-1">
                {tr("coin_balance_hint", "Earn coins to unlock rewards")}
              </p>
              {coinDelta?.amount ? (
                <p
                  className={`mt-2 text-xs font-semibold ${
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

            <div
              className="rewards-stat-card rounded-2xl bg-white/90 dark:bg-slate-900/70 text-slate-900 dark:text-slate-100 p-3 shadow-lg border border-slate-100/70 dark:border-slate-800"
              style={{ "--card-accent": "linear-gradient(90deg, #10b981, #34d399)" }}
            >
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-300 leading-tight">
                {tr("referral_goal", "Invite {{count}} friends to earn {{reward}} coins", {
                  count: referralGoal,
                  reward: referralReward,
                })}
              </p>
              <div className="mt-1.5 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200">
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

            <div
              className="rewards-stat-card rounded-2xl bg-white/90 dark:bg-slate-900/70 text-slate-900 dark:text-slate-100 p-3 shadow-lg border border-slate-100/70 dark:border-slate-800"
              style={{ "--card-accent": "linear-gradient(90deg, #60a5fa, #a78bfa)" }}
            >
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-300 mb-2">
                {tr("quick_share", "Quick share")}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={shareDisabled}
                  size="sm"
                  className="h-8 rounded-full text-xs font-semibold bg-white/80 hover:bg-white text-slate-700 border border-slate-200/80 dark:bg-slate-900/60 dark:text-slate-100 dark:border-slate-700"
                  onClick={onShareWhatsApp}
                >
                  {tr("share_whatsapp", "WhatsApp")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={shareDisabled}
                  size="sm"
                  className="h-8 rounded-full text-xs font-semibold bg-white/80 hover:bg-white text-slate-700 border border-slate-200/80 dark:bg-slate-900/60 dark:text-slate-100 dark:border-slate-700"
                  onClick={onShareTelegram}
                >
                  {tr("share_telegram", "Telegram")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={shareDisabled}
                  size="sm"
                  className="h-8 rounded-full text-xs font-semibold bg-white/80 hover:bg-white text-slate-700 border border-slate-200/80 dark:bg-slate-900/60 dark:text-slate-100 dark:border-slate-700"
                  onClick={onCopyReferralLink}
                >
                  {tr("copy_link", "Copy Link")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={shareDisabled}
                  size="sm"
                  className="h-8 rounded-full text-xs font-semibold bg-white/80 hover:bg-white text-slate-700 border border-slate-200/80 dark:bg-slate-900/60 dark:text-slate-100 dark:border-slate-700"
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

export function RewardsImpactDashboard({
  displayCoins,
  coinDelta,
  nextRewardLabel,
  nextRewardProgress,
  nextRewardRemaining,
  engagementReady,
  hasCheckedInToday,
  currentCheckInDay,
  dailyCheckInLoading,
  onDailyCheckIn,
  spinStatus,
  spinLoading,
  onSpin,
  scratchStatus,
  scratchLoading,
  onScratch,
  referralCode,
  shareDisabled,
  onCopyReferralCode,
  onCopyReferralLink,
  onShareWhatsApp,
  onShareTelegram,
  onShareSms,
  referralGoal,
  referralReward,
  referralDisplay,
  referralProgressPercent,
  milestoneEligible,
  milestoneClaimed,
  onClaimMilestone,
  onOpenRedeem,
  tr,
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {/* Coin Balance */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5 shadow-lg dark:border-amber-900/40 dark:from-amber-950/40 dark:via-slate-900 dark:to-slate-900">
        <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-amber-300/20 blur-2xl dark:bg-amber-500/10" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-sm">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-600 dark:text-amber-300">
              {tr("coin_balance", "Coin Balance")}
            </p>
          </div>
          <div className="flex items-end gap-2">
            <span className="coin-display coin-big-number text-4xl sm:text-5xl font-black leading-none text-amber-600 dark:text-amber-300">
              {displayCoins}
            </span>
            <span className="pb-1 text-sm font-semibold text-slate-400 dark:text-slate-300">
              {tr("coins", "coins")}
            </span>
          </div>
          {coinDelta?.amount ? (
            <p
              className={`mt-1.5 text-xs font-bold ${
                coinDelta.amount > 0
                  ? "text-emerald-600 dark:text-emerald-300"
                  : "text-rose-600 dark:text-rose-300"
              }`}
            >
              {coinDelta.amount > 0 ? "+" : ""}
              {coinDelta.amount} {tr("coins", "coins")}
            </p>
          ) : null}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-300 mb-1.5">
              <span>
                {tr("next_reward", "Next reward")}: {nextRewardLabel}
              </span>
              <span>{nextRewardProgress}%</span>
            </div>
            <div className="h-2 rounded-full bg-amber-100 dark:bg-amber-900/30 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-[width] duration-700 ease-out"
                style={{ width: `${nextRewardProgress}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-400">
              {nextRewardRemaining > 0
                ? tr("coins_to_unlock", "{{count}} coins to unlock", {
                    count: nextRewardRemaining,
                  })
                : tr("ready_to_redeem", "Ready to redeem")}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenRedeem}
            className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-600/10 hover:bg-amber-600/20 text-amber-700 dark:text-amber-300 text-xs font-semibold px-3 py-2 transition-colors"
          >
            <Star className="w-3.5 h-3.5" />
            {tr("redeem_coins", "Redeem coins")}
          </button>
        </div>
      </div>

      {/* Daily Actions */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-200/70 bg-gradient-to-br from-indigo-50 via-white to-sky-50 p-5 shadow-lg dark:border-indigo-900/40 dark:from-indigo-950/40 dark:via-slate-900 dark:to-slate-900">
        <div className="absolute right-0 bottom-0 h-24 w-24 rounded-full bg-indigo-300/20 blur-2xl dark:bg-indigo-500/10" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-sm">
              <Calendar className="w-4 h-4 text-white" />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-300">
              {tr("daily_actions", "Daily Actions")}
            </p>
          </div>
          {engagementReady ? (
            <>
              <div className="flex items-center gap-1.5 mb-3">
                {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                  const isCompleted = currentCheckInDay > day;
                  const isToday = currentCheckInDay === day;
                  return (
                    <div
                      key={day}
                      className={`flex-1 h-2 rounded-full transition-colors ${
                        isCompleted
                          ? "bg-emerald-500"
                          : isToday
                            ? "bg-indigo-500 animate-pulse"
                            : "bg-slate-200 dark:bg-slate-700"
                      }`}
                      title={`${tr("day", "Day")} ${day}`}
                    />
                  );
                })}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-300 mb-3">
                {tr("day", "Day")} {currentCheckInDay}/7 &middot;{" "}
                {hasCheckedInToday
                  ? tr("checked_in_today", "Checked in today")
                  : tr("claim_today", "Claim today's reward")}
              </p>
              <Button
                type="button"
                size="sm"
                disabled={hasCheckedInToday || dailyCheckInLoading}
                className={`w-full mb-3 ${
                  hasCheckedInToday || dailyCheckInLoading
                    ? "bg-slate-200 text-slate-500 cursor-not-allowed dark:bg-slate-700 dark:text-slate-300"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                }`}
                onClick={onDailyCheckIn}
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                {hasCheckedInToday
                  ? tr("checked_in", "Checked in")
                  : dailyCheckInLoading
                    ? tr("claiming", "Claiming...")
                    : tr("daily_checkin", "Daily check-in")}
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={spinStatus?.hasSpunToday || spinLoading}
                  className={`text-xs ${
                    spinStatus?.hasSpunToday || spinLoading
                      ? "opacity-50 cursor-not-allowed"
                      : "border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-200"
                  }`}
                  onClick={onSpin}
                >
                  <Sparkles className="w-4 h-4 mr-1" />
                  {spinStatus?.hasSpunToday
                    ? tr("spin_done", "Spun")
                    : tr("spin_now", "Spin")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={
                    scratchLoading ||
                    (scratchStatus &&
                      Number(scratchStatus.available || 0) === 0)
                  }
                  className={`text-xs ${
                    scratchLoading ||
                    (scratchStatus &&
                      Number(scratchStatus.available || 0) === 0)
                      ? "opacity-50 cursor-not-allowed"
                      : "border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-200"
                  }`}
                  onClick={onScratch}
                >
                  <Star className="w-4 h-4 mr-1" />
                  {tr("scratch_now", "Scratch")}
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <SkeletonBlock className="h-3 w-full" />
              <SkeletonBlock className="h-8 w-full" />
              <div className="grid grid-cols-2 gap-2">
                <SkeletonBlock className="h-8 w-full" />
                <SkeletonBlock className="h-8 w-full" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Referral Hub */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-5 shadow-lg dark:border-emerald-900/40 dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-900">
        <div className="absolute left-0 bottom-0 h-24 w-24 rounded-full bg-emerald-300/20 blur-2xl dark:bg-emerald-500/10" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center shadow-sm">
              <Users className="w-4 h-4 text-white" />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-300">
              {tr("referral_hub", "Referral Hub")}
            </p>
          </div>
          <div className="rounded-xl bg-white/80 dark:bg-slate-800/60 border border-emerald-100 dark:border-emerald-900/30 px-3 py-2 mb-3">
            <p className="text-xs text-slate-500 dark:text-slate-300">
              {tr("your_code", "Your code")}
            </p>
            <div className="flex items-center justify-between gap-2">
              <span className="text-lg font-black text-emerald-700 dark:text-emerald-200 tracking-wider">
                {referralCode || "---"}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={!referralCode}
                className="h-7 px-2 text-emerald-700 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                onClick={onCopyReferralCode}
              >
                <CopyIcon className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-1.5 mb-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={shareDisabled}
              className="h-8 text-xs font-semibold px-1 border-slate-200 dark:border-slate-600"
              onClick={onShareWhatsApp}
            >
              WA
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={shareDisabled}
              className="h-8 text-xs font-semibold px-1 border-slate-200 dark:border-slate-600"
              onClick={onShareTelegram}
            >
              TG
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={shareDisabled}
              className="h-8 text-xs font-semibold px-1 border-slate-200 dark:border-slate-600"
              onClick={onCopyReferralLink}
            >
              <CopyIcon className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={shareDisabled}
              className="h-8 text-xs font-semibold px-1 border-slate-200 dark:border-slate-600"
              onClick={onShareSms}
            >
              SMS
            </Button>
          </div>
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-300 mb-1">
              <span>
                {referralDisplay}/{referralGoal} {tr("invited", "invited")}
              </span>
              <span className="text-emerald-600 dark:text-emerald-300 font-semibold">
                +{referralReward} {tr("coins", "coins")}
              </span>
            </div>
            <div className="h-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full transition-[width] duration-700 ease-out"
                style={{ width: `${referralProgressPercent}%` }}
              />
            </div>
          </div>
          {milestoneEligible ? (
            <Button
              type="button"
              size="sm"
              className="w-full mt-3 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={onClaimMilestone}
            >
              {tr("claim_reward", "Claim reward")}
            </Button>
          ) : milestoneClaimed ? (
            <Badge className="mt-3 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
              {tr("reward_claimed", "Reward claimed")}
            </Badge>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function RewardsOverview({
  rewardsUser,
  membershipPlanLabel,
  membershipPlanBadgeClass,
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
  const completedOnboardingSteps = onboardingSteps?.filter((step) => step.done).length ?? 0;
  const onboardingProgressPercent = onboardingSteps.length
    ? Math.min(
        100,
        Math.round((completedOnboardingSteps / onboardingSteps.length) * 100),
      )
    : 0;
  const nextMilestoneProgressMax = Math.max(
    1,
    Number(nextMilestone?.progressMax || 1),
  );
  const nextMilestoneProgressValue = Math.max(
    0,
    Math.min(nextMilestoneProgressMax, Number(nextMilestone?.progressValue || 0)),
  );
  const nextMilestoneProgressPercent = nextMilestone
    ? Math.min(
        100,
        Math.round((nextMilestoneProgressValue / nextMilestoneProgressMax) * 100),
      )
    : 100;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <UpsellBanner trigger="rewards" className="shadow-lg" />

        <Card
          id="rewards-summary"
          className="rewards-overview-summary mhub-premium-surface border-0 shadow-xl rounded-2xl scroll-mt-24"
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              {tr("my_rewards", "My rewards")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <div className="rewards-overview-coin-card relative overflow-hidden rounded-[28px] border border-amber-100/80 bg-gradient-to-br from-amber-50 via-white to-amber-100/50 p-5 shadow-sm dark:border-amber-900/40 dark:from-amber-900/20 dark:via-slate-900 dark:to-slate-900">
                <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-amber-300/20 blur-3xl dark:bg-amber-500/10" />
                <div className="relative space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-600 dark:text-amber-300">
                        {tr("coin_balance", "Coin balance")}
                      </p>
                      <div className="mt-2 flex items-end gap-2">
                        <span className="coin-display coin-big-number text-5xl font-black leading-none text-amber-600 dark:text-amber-300 sm:text-6xl">
                          {displayCoins}
                        </span>
                        <span className="pb-1 text-base font-semibold text-slate-400 dark:text-slate-300">
                          {tr("coins", "coins")}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
                        {tr("coin_balance_hint", "Earn coins to unlock rewards")}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge className="w-fit rounded-full bg-white/80 text-slate-700 shadow-sm dark:bg-slate-900/80 dark:text-slate-100">
                        {tr("rewards_rank", "Rewards rank")}:{" "}
                        {rewardsUser?.rank || tr("unknown", "Unknown")}
                      </Badge>
                      {membershipPlanLabel ? (
                        <Badge
                          className={`w-fit rounded-full ${membershipPlanBadgeClass} shadow-sm`}
                        >
                          {tr("membership_plan", "Membership plan")}: {membershipPlanLabel}
                        </Badge>
                      ) : null}
                    </div>
                  </div>

                  <div className="rewards-overview-stats-grid grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm dark:border-slate-700/70 dark:bg-slate-950/40">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-300">
                        {tr("level", "Level")}
                      </p>
                      <p className="mt-1 text-xl font-black text-slate-900 dark:text-white">
                        {rewardsUser?.level ?? "-"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm dark:border-slate-700/70 dark:bg-slate-950/40">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-300">
                        {tr("rewards_rank", "Rewards rank")}
                      </p>
                      <p className="mt-1 text-xl font-black text-slate-900 dark:text-white">
                        {rewardsUser?.rank || tr("unknown", "Unknown")}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm dark:border-slate-700/70 dark:bg-slate-950/40">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-300">
                        {tr("membership_plan", "Membership plan")}
                      </p>
                      <p className="mt-1 text-xl font-black text-slate-900 dark:text-white">
                        {membershipPlanLabel || tr("basic_plan", "Basic")}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm dark:border-slate-700/70 dark:bg-slate-950/40">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-300">
                        {tr("milestones", "Milestones")}
                      </p>
                      <p className="mt-1 text-xl font-black text-slate-900 dark:text-white">
                        {milestoneUnlockedCount}
                        <span className="ml-1 text-sm font-semibold text-slate-400 dark:text-slate-300">
                          / {milestones.length}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <div className="rounded-2xl border border-indigo-100/80 bg-indigo-50/80 p-4 shadow-sm dark:border-indigo-900/40 dark:bg-indigo-900/20">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-300">
                    {tr("xp_progress", "XP Progress")}
                  </p>
                  <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                    {rewardsUser?.xpCurrent}
                    <span className="ml-1 text-sm font-semibold text-slate-400 dark:text-slate-300">
                      / {rewardsUser?.xpRequired} XP
                    </span>
                  </p>
                  <div className="mt-3 h-2 rounded-full bg-indigo-100/90 dark:bg-slate-800/80 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-[width] duration-700 ease-out"
                      style={{ width: `${xpProgressPercent}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-300">
                    {xpRemaining === 0
                      ? tr("rewards_levelup_ready", "Level-up ready")
                      : tr("rewards_xp_remaining", `${xpRemaining} XP remaining`, {
                          count: xpRemaining,
                        })}
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-100/80 bg-emerald-50/80 p-4 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-900/20">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-300">
                        {tr("next_reward", "Next reward")}
                      </p>
                      <p className="mt-2 text-base font-bold text-slate-900 dark:text-white">
                        {nextRewardTarget} {tr("coins", "coins")} {"->"} {nextRewardLabel}
                      </p>
                    </div>
                    <Badge className="w-fit bg-white/80 text-emerald-700 shadow-sm dark:bg-slate-900/80 dark:text-emerald-200">
                      {nextRewardProgress}%
                    </Badge>
                  </div>
                  <div className="mt-3 h-2.5 rounded-full bg-emerald-100/90 dark:bg-slate-800/80 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full transition-[width] duration-700 ease-out"
                      style={{ width: `${nextRewardProgress}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-300">
                    {nextRewardRemaining > 0
                      ? tr("coins_to_unlock", "{{count}} coins to unlock", {
                          count: nextRewardRemaining,
                        })
                      : tr("ready_to_redeem", "Ready to redeem")}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">
                    {tr("rewards_summary", "Rewards summary")}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
                      {tr("level", "Level")} {rewardsUser?.level ?? "-"}
                    </Badge>
                    <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                      {milestoneUnlockedCount}/{milestones.length} {tr("unlocked", "Unlocked")}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm text-slate-500 dark:text-slate-300">
                    {tr(
                      "xp_explainer",
                      "Earn XP by completing challenges, sales, and referrals.",
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white sm:w-auto"
                onClick={onShareReferral}
              >
                <Share2 className="w-4 h-4 mr-2" />
                {tr("invite_friends", "Invite friends")}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full border-slate-200 text-slate-700 dark:border-slate-600 dark:text-slate-200 sm:w-auto"
                onClick={onOpenRedeem}
              >
                {tr("redeem_coins", "Redeem coins")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rewards-summary-stats mhub-premium-surface border-0 shadow-xl rounded-2xl">
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
                  background: `conic-gradient(${stat.ringColor} ${stat.progress}%, var(--border) ${stat.progress}% 100%)`,
                };

                return (
                  <div
                    key={stat.key}
                    className="rewards-stat-card rounded-2xl border border-slate-100 dark:border-slate-700 p-5 shadow-md bg-white dark:bg-slate-900/50"
                    style={{
                      "--card-accent": `linear-gradient(90deg, ${stat.ringColor}, ${stat.ringColor}99)`,
                      background: `linear-gradient(135deg, ${stat.ringColor}12, var(--card) 55%)`,
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-400">
                          {stat.label}
                        </p>
                        <p className="text-xl sm:text-3xl font-black coin-big-number text-slate-900 dark:text-white mt-0.5">
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
                    <p className="text-xs text-slate-400 dark:text-slate-400 mt-1.5">
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
          className="mhub-premium-surface border-0 shadow-xl rounded-2xl scroll-mt-24"
        >
          <CardHeader className="space-y-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-indigo-600" />
                  {tr("progress_tracker", "Progress Tracker")}
                </CardTitle>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
                  {tr(
                    "xp_explainer",
                    "Earn XP by completing challenges, sales, and referrals.",
                  )}
                </p>
              </div>
              <Badge className="w-fit bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
                {milestoneUnlockedCount}/{milestones.length} {tr("unlocked", "Unlocked")}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rewards-progress-grid grid grid-cols-1 gap-3 xl:grid-cols-3">
              <div className="rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50 via-white to-amber-100/60 p-4 shadow-sm dark:border-amber-900/40 dark:from-amber-900/20 dark:via-slate-900 dark:to-slate-900">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-600 dark:text-amber-300">
                      {tr("xp_progress", "XP Progress")}
                    </p>
                    <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                      {rewardsUser?.xpCurrent}
                      <span className="ml-1 text-sm font-semibold text-slate-400 dark:text-slate-300">
                        / {rewardsUser?.xpRequired} XP
                      </span>
                    </p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-300">
                    <Sparkles className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-4 h-3 rounded-full bg-white/80 dark:bg-slate-800 overflow-hidden shadow-inner">
                  <div
                    className="h-full progress-bar-gold rounded-full transition-[width] duration-700 ease-out"
                    style={{ width: `${xpProgressPercent}%` }}
                  />
                </div>
                <p className="mt-3 text-xs font-medium text-slate-600 dark:text-slate-200">
                  {xpRemaining === 0
                    ? tr("rewards_levelup_ready", "Level-up ready")
                    : tr("rewards_xp_remaining", `${xpRemaining} XP remaining`, {
                        count: xpRemaining,
                      })}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
                  {tr(
                    "level_progress",
                    "Level progress",
                  )}
                </p>
              </div>

              <div className="rounded-2xl border border-indigo-200/70 bg-gradient-to-br from-indigo-50 via-white to-sky-100/60 p-4 shadow-sm dark:border-indigo-900/40 dark:from-indigo-900/20 dark:via-slate-900 dark:to-slate-900">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-300">
                      {tr("streak_progress", "Streak progress")}
                    </p>
                    <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                      {maxStreak}
                      <span className="ml-1 text-sm font-semibold text-slate-400 dark:text-slate-300">
                        / {nextStreakTarget} {tr("days", "days")}
                      </span>
                    </p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-4 h-3 rounded-full bg-white/80 dark:bg-slate-800 overflow-hidden shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-[width] duration-700 ease-out"
                    style={{ width: `${streakProgress}%` }}
                  />
                </div>
                <p className="mt-3 text-xs font-medium text-slate-600 dark:text-slate-200">
                  {tr("visit_streak", "Visit streak")}: {maxStreak} {tr("days", "days")}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
                  {tr("next_streak_milestone", "Next streak milestone: {{count}} days", {
                    count: nextStreakTarget,
                  })}
                </p>
              </div>

              <div
                id="rewards-benefits-overview"
                className="rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-teal-100/60 p-4 shadow-sm dark:border-emerald-900/40 dark:from-emerald-900/20 dark:via-slate-900 dark:to-slate-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-300">
                      {tr("upcoming_milestone", "Upcoming Milestone")}
                    </p>
                    <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                      {nextMilestone
                        ? nextMilestone.title
                        : tr("all_milestones_unlocked", "All milestones unlocked")}
                    </p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                    <Trophy className="h-5 w-5" />
                  </div>
                </div>
                {nextMilestone?.desc ? (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-300">
                    {nextMilestone.desc}
                  </p>
                ) : null}
                <div className="mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-300">
                  <span>{tr("progress", "Progress")}</span>
                  <span>
                    {nextMilestone
                      ? `${nextMilestoneProgressValue}/${nextMilestoneProgressMax}`
                      : `${milestones.length}/${milestones.length}`}
                  </span>
                </div>
                <div className="mt-2 h-3 rounded-full bg-white/80 dark:bg-slate-800 overflow-hidden shadow-inner">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-500 transition-[width] duration-700 ease-out"
                    style={{ width: `${nextMilestoneProgressPercent}%` }}
                  />
                </div>
                <p className="mt-3 text-xs font-medium text-slate-600 dark:text-slate-200">
                  {milestoneUnlockedCount}/{milestones.length} {tr("milestones", "Milestones")}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-900/30">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {tr("next_steps", "Next steps")}
                  </span>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
                    {tr(
                      "next_steps_hint",
                      "Finish these actions to unlock stronger rewards faster.",
                    )}
                  </p>
                </div>
                <Badge className="w-fit bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
                  {completedOnboardingSteps}/{onboardingSteps.length}
                </Badge>
              </div>
              <div className="mt-4 h-2 rounded-full bg-slate-200 dark:bg-slate-700/70 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-[width] duration-700 ease-out"
                  style={{ width: `${onboardingProgressPercent}%` }}
                />
              </div>
              <div className="mt-4 space-y-3">
                {onboardingSteps.map((step, index) => (
                  <div
                    key={step.key}
                    className={`flex items-start gap-3 rounded-xl border p-3 ${
                      step.done
                        ? "border-emerald-100 bg-emerald-50/70 dark:border-emerald-900/40 dark:bg-emerald-900/10"
                        : "border-slate-200 bg-white/80 dark:border-slate-700 dark:bg-slate-900/40"
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        step.done
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                          : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {step.done ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <span className="text-xs font-bold">{index + 1}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                          {step.label}
                        </p>
                        <Badge
                          className={
                            step.done
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                          }
                        >
                          {step.done
                            ? tr("completed", "Completed")
                            : tr("progress", "Progress")}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
                        {step.hint}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
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
            </div>
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
        className="mhub-premium-surface border-0 shadow-xl rounded-2xl scroll-mt-24"
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
        <Card className="mhub-premium-surface border-0 shadow-xl rounded-2xl min-h-[260px] transition-none transform-none">
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
            <div className="min-h-[18px]">
              {engagementLoading ? (
                <p className="text-xs text-slate-400">{tr("loading", "Loading...")}</p>
              ) : engagementErrorMessage ? (
                <p className="text-xs text-rose-500">{engagementErrorMessage}</p>
              ) : hasCheckedInToday ? (
                <p className="text-xs text-emerald-600">
                  {tr("checked_in_today", "Checked in today")}
                </p>
              ) : dailyCheckInStatus?.nextReward && !hasCheckedInToday ? (
                <p className="text-xs text-emerald-600">
                  {tr("next_reward", "Next reward")}: +{dailyCheckInStatus.nextReward}{" "}
                  {tr("coins", "coins")}
                </p>
              ) : (
                <span className="text-xs text-transparent">.</span>
              )}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {dailyCheckInRewards.map((reward) => {
                const isCompleted = currentCheckInDay > reward.day;
                const isToday = currentCheckInDay === reward.day;

                return (
                  <div
                    key={reward.day}
                    className={`checkin-day rounded-xl border-2 p-2 text-center flex flex-col items-center gap-1 ${
                      isCompleted
                        ? "border-emerald-400 bg-gradient-to-b from-emerald-50 to-emerald-100 dark:border-emerald-700 dark:from-emerald-900/30 dark:to-emerald-900/20 shadow-sm"
                        : isToday
                          ? "today border-indigo-400 bg-gradient-to-b from-indigo-50 to-indigo-100 dark:border-indigo-600 dark:from-indigo-900/30 dark:to-indigo-900/20 shadow-md"
                          : "border-slate-200/70 bg-white dark:border-slate-700 dark:bg-slate-900/30"
                    }`}
                  >
                    <span
                      className={`text-xs font-bold uppercase ${
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
                      className={`text-xs font-black ${
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
        <Card className="mhub-premium-surface border-0 shadow-xl rounded-2xl">
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
                <p className="text-xs text-amber-600 dark:text-amber-200 mt-1">
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
        className="mhub-premium-surface border-0 shadow-xl rounded-2xl scroll-mt-24"
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
        className="mhub-premium-surface border-0 shadow-xl rounded-2xl scroll-mt-24"
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
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
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

      <Card id="rewards-milestones" className="mhub-premium-surface border-0 shadow-xl rounded-2xl">
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
                  className={`milestone-badge rewards-stat-card ${milestone.unlocked ? "unlocked" : "locked"} rounded-2xl p-4 relative overflow-hidden ${
                    milestone.unlocked
                      ? "bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-900/20 dark:via-yellow-900/15 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800/40 shadow-sm"
                      : "bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/40"
                  }`}
                  style={{
                    "--card-accent": milestone.unlocked
                      ? "linear-gradient(90deg, #10b981, #34d399)"
                      : "linear-gradient(90deg, #cbd5e1, #e2e8f0)",
                  }}
                >
                  {milestone.unlocked ? <div className="badge-glow" /> : null}
                  <div className="flex items-start justify-between gap-3">
                    <div className="badge-icon text-2xl">{milestone.icon}</div>
                    {milestone.unlocked ? (
                      <div className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5">
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
                          {tr("unlocked", "Unlocked")}
                        </span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center rounded-full bg-slate-200/60 dark:bg-slate-700/40 px-2 py-0.5">
                        <span className="text-xs text-slate-400 uppercase tracking-wide">
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
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-300">
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
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-300">
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
  const readyToRedeemCount = redeemOptions.filter(
    (option) => availableCoins >= option.cost,
  ).length;

  return (
    <Card
      id="rewards-redeem"
      className="mhub-premium-surface border-0 shadow-xl rounded-2xl scroll-mt-24"
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

        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-sky-50 p-4 dark:border-indigo-900/40 dark:from-indigo-900/20 dark:via-slate-900 dark:to-slate-900">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-300">
                {tr("available_coins", "Available coins")}
              </p>
              <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                {availableCoins}
                <span className="ml-1 text-sm font-semibold text-slate-400 dark:text-slate-300">
                  {tr("coins", "coins")}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className="w-fit bg-white/80 text-indigo-700 shadow-sm dark:bg-slate-900/80 dark:text-indigo-200">
                {tr("redeem_rewards", "Redeem coins")}
              </Badge>
              <Badge className="w-fit bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                {readyToRedeemCount} {tr("ready_to_redeem", "Ready to redeem")}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {redeemOptions.map((option) => {
            const affordable = availableCoins >= option.cost;
            const coinsNeeded = Math.max(0, option.cost - availableCoins);
            const progress = option.cost
              ? Math.min(100, Math.round((availableCoins / option.cost) * 100))
              : 100;
            const progressClass = affordable
              ? "from-emerald-500 to-green-500"
              : progress >= 60
                ? "from-amber-400 to-yellow-500"
                : "from-rose-400 to-orange-500";

            return (
              <div
                key={option.key}
                className={`group relative flex h-full flex-col overflow-hidden rounded-3xl border p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
                  affordable
                    ? "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-100/60 dark:border-emerald-900/40 dark:from-emerald-900/20 dark:via-slate-900 dark:to-slate-900"
                    : "border-slate-200 bg-gradient-to-br from-white via-white to-slate-50 dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900"
                }`}
              >
                <div
                  className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${option.accent}`}
                />
                {option.promoLabel ? (
                  <div className="absolute right-4 top-4">
                    <Badge className="rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                      {option.promoLabel}
                    </Badge>
                  </div>
                ) : null}

                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <div
                      className={`mt-1 h-11 w-11 rounded-2xl bg-gradient-to-br ${option.accent} flex items-center justify-center text-white shadow-sm`}
                    >
                      {renderDynamicIcon(option.icon, "w-5 h-5")}
                    </div>
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-slate-800 dark:text-slate-100">
                        {option.title}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-300">
                        {option.desc}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 rounded-2xl bg-white/80 px-3 py-2 text-right shadow-sm dark:bg-slate-950/40">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-300">
                      {tr("cost", "Cost")}
                    </p>
                    <p className="mt-1 text-2xl font-black text-amber-600 dark:text-amber-300">
                      {option.cost}
                    </p>
                    <p className="text-xs font-semibold text-slate-400 dark:text-slate-300">
                      {tr("coins", "coins")}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {option.helperLabel ? (
                    <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {option.helperLabel}
                    </Badge>
                  ) : null}
                  <Badge
                    className={
                      affordable
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200"
                    }
                    >
                      {affordable
                        ? tr("ready_to_redeem", "Ready to redeem")
                        : tr("keep_earning", "Keep earning")}
                    </Badge>
                  <Badge className="bg-white/80 text-slate-600 dark:bg-slate-950/40 dark:text-slate-200">
                    {progress}% {tr("progress", "Progress")}
                  </Badge>
                </div>

                <div className="mt-4 rounded-2xl bg-white/80 p-3 dark:bg-slate-950/40">
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
                          ? "font-semibold text-emerald-600"
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

                <div className="mt-auto pt-4 flex flex-col gap-2">
                  <Button
                    type="button"
                    disabled={!affordable || redeemProcessing === option.key}
                    className={
                      affordable
                        ? "w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                        : "w-full bg-slate-200 text-slate-500 cursor-not-allowed dark:bg-slate-800 dark:text-slate-300"
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
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full text-xs"
                      onClick={onOpenEarn}
                    >
                      {tr("earn_more", "Earn more")}
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={onOpenEarn}
          >
            {tr("see_earn_plan", "See earn plan")}
          </Button>
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
        className="mhub-premium-surface border-0 shadow-xl rounded-2xl scroll-mt-24"
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

      <Card className="mhub-premium-surface border-0 shadow-xl rounded-2xl">
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
  referralTree,
  chainRules,
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

  const renderReferralNode = (node, depth = 0) => {
    if (!node) return null;
    const children = Array.isArray(node.children) ? node.children : [];
    const isRoot = node.type === "root" || depth === 0;
    const displayName = node.name || tr("user", "User");
    const coins = Number(node.coins || 0);
    const joinDate = node.joinDate || "";

    return (
      <div
        key={`${node.id || displayName}-${depth}`}
        className={`referral-tree-node space-y-2 ${isRoot ? "" : "pl-6"}`}
        style={{ marginLeft: depth ? depth * 6 : 0 }}
      >
        {!isRoot ? (
          <>
            <span className="referral-tree-connector" aria-hidden="true" />
            <span className="referral-tree-dot" aria-hidden="true" />
          </>
        ) : null}
        <div
          className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-3 py-2 ${
            isRoot
              ? "border-indigo-200/80 bg-indigo-50/70 dark:border-indigo-800/40 dark:bg-indigo-900/20"
              : "border-slate-200/70 bg-white/80 dark:border-slate-700/60 dark:bg-slate-900/40"
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-8 w-8">
              <AvatarFallback
                className={`${
                  isRoot
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                }`}
              >
                {getInitials(displayName, "U")}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                {isRoot ? tr("you", "You") : displayName}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-300">
                {isRoot
                  ? tr("referral_root", "Referral root")
                  : tr("level", "Level")}{" "}
                {isRoot ? "" : node.depth || depth}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-300">
            {Number.isFinite(coins) && coins > 0 ? (
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                +{coins} {tr("coins", "coins")}
              </Badge>
            ) : null}
            {joinDate ? (
              <span className="text-xs">
                {tr("joined", "Joined")} {joinDate}
              </span>
            ) : null}
          </div>
        </div>

        {children.length ? (
          <div className="ml-2 border-l border-slate-200/70 dark:border-slate-700/60 pl-3 space-y-2">
            {children.map((child) => renderReferralNode(child, depth + 1))}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Card
        id="rewards-referrals"
        className="mhub-premium-surface border-0 shadow-xl rounded-2xl scroll-mt-24"
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

      <Card className="mhub-premium-surface border-0 shadow-xl rounded-2xl">
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

      <Card className="mhub-premium-surface border-0 shadow-xl rounded-2xl">
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
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-emerald-700/80 dark:text-emerald-200/80">
                          {referral.joinDate ? (
                            <span>
                              {tr("joined", "Joined")} {referral.joinDate}
                            </span>
                          ) : null}
                          {Number.isFinite(Number(referral.coins)) ? (
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                              +{referral.coins} {tr("coins", "coins")}
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
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-blue-700/80 dark:text-blue-200/80">
                          {referral.joinDate ? (
                            <span>
                              {tr("joined", "Joined")} {referral.joinDate}
                            </span>
                          ) : null}
                          {Number.isFinite(Number(referral.coins)) ? (
                            <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                              +{referral.coins} {tr("coins", "coins")}
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

      <Card className="mhub-premium-surface border-0 shadow-xl rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            {tr("referral_tree", "Referral tree")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {referralTree ? (
            <div className="space-y-3">{renderReferralNode(referralTree)}</div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-300">
              {tr("referral_tree_empty", "Referral tree is not available yet.")}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="mhub-premium-surface border-0 shadow-xl rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600" />
            {tr("referral_rewards_ladder", "Referral rewards ladder")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {Array.isArray(chainRules) && chainRules.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {chainRules.map((rule) => (
                <div
                  key={`rule-${rule.level}`}
                  className="rewards-stat-card rounded-2xl border border-slate-200/70 bg-slate-50/80 dark:border-slate-700/60 dark:bg-slate-900/40 p-3"
                  style={{
                    "--card-accent": "linear-gradient(90deg, #6366f1, #22d3ee)",
                  }}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                    {tr("level", "Level")} {rule.level}
                  </p>
                  <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                    +{rule.points}
                    <span className="ml-1 text-xs font-semibold text-slate-400 dark:text-slate-300">
                      {tr("coins", "coins")}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
                    {tr(
                      "referral_reward_depth",
                      "Earned from depth {{count}} referrals",
                      { count: rule.level },
                    )}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-300">
              {tr("referral_rules_unavailable", "Referral reward rules are unavailable.")}
            </p>
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
        className="mhub-premium-surface border-0 shadow-xl rounded-2xl scroll-mt-24"
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
          <Card className="mhub-premium-surface border-0 shadow-xl rounded-2xl">
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
                      <p className="text-lg sm:text-2xl font-black text-slate-900 dark:text-slate-50">
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
                <div className="flex flex-col gap-4">
                  {/* Graphical Podium for Top 3 */}
                  <div className="flex items-end justify-center gap-2 pt-6 pb-2 px-1 bg-gradient-to-t from-slate-50/50 to-transparent dark:from-slate-950/10 rounded-2xl border border-slate-100 dark:border-slate-800">
                    {/* #2 Column (Left) */}
                    {referralLeaderboard[1] ? (
                      <div className="flex flex-col items-center flex-1 max-w-[100px] group">
                        <div className="relative mb-2">
                          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold flex items-center justify-center text-xs ring-2 ring-slate-400 select-none shadow-md">
                            {getInitials(referralLeaderboard[1].full_name || referralLeaderboard[1].username || "U")}
                          </div>
                          <Badge className="absolute -bottom-1 -right-1 bg-slate-400 text-white border-none w-5 h-5 flex items-center justify-center p-0 text-[10px] font-black rounded-full shadow">
                            2
                          </Badge>
                        </div>
                        <div className="w-full bg-gradient-to-t from-slate-200/80 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-t-xl border border-b-0 border-slate-200 dark:border-slate-700 pt-3 pb-2 px-1 flex flex-col items-center justify-center shadow-[0_-4px_10px_rgba(0,0,0,0.03)] h-20 sm:h-24">
                          <span className="text-[10px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 truncate w-full text-center px-1">
                            {referralLeaderboard[1].full_name || referralLeaderboard[1].username || tr("user", "User")}
                          </span>
                          <span className="text-[9px] sm:text-[10px] font-black text-slate-500 dark:text-slate-400 mt-0.5">
                            {referralLeaderboard[1].referral_count ?? referralLeaderboard[1].referralCount ?? 0}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 max-w-[100px] h-20 sm:h-24" />
                    )}

                    {/* #1 Column (Center) */}
                    {referralLeaderboard[0] ? (
                      <div className="flex flex-col items-center flex-1 max-w-[110px] z-10 group">
                        <div className="relative mb-1 flex flex-col items-center">
                          <Crown className="w-4 h-4 text-yellow-500 fill-current animate-bounce duration-1000 mb-0.5" />
                          <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-yellow-400 text-yellow-950 font-black flex items-center justify-center text-sm ring-4 ring-yellow-400/30 select-none shadow-lg">
                            {getInitials(referralLeaderboard[0].full_name || referralLeaderboard[0].username || "U")}
                          </div>
                          <Badge className="absolute bottom-0 bg-yellow-500 text-yellow-950 border-none w-5 h-5 flex items-center justify-center p-0 text-[10px] font-black rounded-full shadow">
                            1
                          </Badge>
                        </div>
                        <div className="w-full bg-gradient-to-t from-yellow-100/80 to-yellow-50 dark:from-yellow-950/20 dark:to-yellow-900/10 rounded-t-xl border border-b-0 border-yellow-300 dark:border-yellow-800/60 pt-4 pb-3 px-1 flex flex-col items-center justify-center shadow-[0_-6px_15px_rgba(0,0,0,0.06)] h-28 sm:h-32">
                          <span className="text-[11px] sm:text-xs font-black text-yellow-850 dark:text-yellow-400 truncate w-full text-center px-1">
                            {referralLeaderboard[0].full_name || referralLeaderboard[0].username || tr("user", "User")}
                          </span>
                          <span className="text-[10px] sm:text-[11px] font-black text-yellow-600 dark:text-yellow-500 mt-0.5">
                            {referralLeaderboard[0].referral_count ?? referralLeaderboard[0].referralCount ?? 0}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 max-w-[110px] h-28 sm:h-32" />
                    )}

                    {/* #3 Column (Right) */}
                    {referralLeaderboard[2] ? (
                      <div className="flex flex-col items-center flex-1 max-w-[100px] group">
                        <div className="relative mb-2">
                          <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-full bg-amber-600/10 text-amber-800 dark:text-amber-300 font-bold flex items-center justify-center text-xs ring-2 ring-amber-600/20 select-none shadow-md">
                            {getInitials(referralLeaderboard[2].full_name || referralLeaderboard[2].username || "U")}
                          </div>
                          <Badge className="absolute -bottom-1 -right-1 bg-amber-700 text-white border-none w-5 h-5 flex items-center justify-center p-0 text-[10px] font-black rounded-full shadow">
                            3
                          </Badge>
                        </div>
                        <div className="w-full bg-gradient-to-t from-amber-100/30 to-amber-50/10 dark:from-amber-950/10 dark:to-amber-900/5 rounded-t-xl border border-b-0 border-amber-200 dark:border-amber-900/40 pt-3 pb-2 px-1 flex flex-col items-center justify-center shadow-[0_-4px_10px_rgba(0,0,0,0.03)] h-16 sm:h-20">
                          <span className="text-[10px] sm:text-xs font-bold text-amber-850 dark:text-amber-300 truncate w-full text-center px-1">
                            {referralLeaderboard[2].full_name || referralLeaderboard[2].username || tr("user", "User")}
                          </span>
                          <span className="text-[9px] sm:text-[10px] font-black text-amber-700 dark:text-amber-400 mt-0.5">
                            {referralLeaderboard[2].referral_count ?? referralLeaderboard[2].referralCount ?? 0}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 max-w-[100px] h-16 sm:h-20" />
                    )}
                  </div>

                  {/* Positions 4 and below */}
                  {referralLeaderboard.length > 3 && (
                    <div className="space-y-2">
                      {referralLeaderboard.slice(3).map((entry, index) => (
                        <div
                          key={entry.user_id || entry.id || index}
                          className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-900 px-3 py-2 transition-all"
                        >
                          <div className="flex items-center gap-2">
                            <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 font-bold">
                              #{index + 4}
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
                  )}
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
            <Card className="mhub-premium-surface border-0 shadow-xl rounded-2xl">
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

            <Card className="mhub-premium-surface border-0 shadow-xl rounded-2xl">
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

      <Card className="mhub-premium-surface border-0 shadow-xl rounded-2xl">
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

// Confetti helper
function triggerConfetti(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return () => {};
  const ctx = canvas.getContext("2d");
  
  const resizeCanvas = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  let particles = [];
  const colors = ["#f59e0b", "#3b82f6", "#10b981", "#ec4899", "#8b5cf6", "#ef4444"];
  for (let i = 0; i < 80; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      r: Math.random() * 4 + 3,
      d: Math.random() * canvas.height,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.random() * 10 - 5,
      tiltAngleIncremental: Math.random() * 0.07 + 0.02,
      tiltAngle: 0
    });
  }

  let animationId;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let active = false;
    particles.forEach((p) => {
      p.tiltAngle += p.tiltAngleIncremental;
      p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
      p.x += Math.sin(p.tiltAngle);
      p.tilt = Math.sin(p.tiltAngle - p.r / 2) * 5;
      if (p.y <= canvas.height) active = true;
      ctx.beginPath();
      ctx.lineWidth = p.r;
      ctx.strokeStyle = p.color;
      ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
      ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
      ctx.stroke();
    });
    if (active) {
      animationId = requestAnimationFrame(draw);
    }
  }
  draw();
  return () => {
    window.removeEventListener("resize", resizeCanvas);
    if (animationId) cancelAnimationFrame(animationId);
  };
}

export function InteractiveSpinWheelModal({ isOpen, onClose, onWin, tr }) {
  const [isSpinning, setIsSpinning] = React.useState(false);
  const [spinLoading, setSpinLoading] = React.useState(false);
  const [reward, setReward] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [rotation, setRotation] = React.useState(0);
  const [showWinScreen, setShowWinScreen] = React.useState(false);
  const confettiCleanupRef = React.useRef(null);

  const segments = [5, 10, 20, 30, 50, 100];

  const handleStartSpin = async () => {
    if (isSpinning || spinLoading) return;
    setSpinLoading(true);
    setError(null);
    try {
      const res = await api.post("/coins/spin");
      const prize = res?.reward ?? 0;
      const newBalance = res?.newBalance ?? 0;
      
      const prizeIndex = segments.indexOf(prize);
      const targetIdx = prizeIndex >= 0 ? prizeIndex : 0;
      
      // Calculate stopping angle
      const rotations = 6;
      const anglePerSegment = 360 / segments.length;
      const targetAngle = 360 - (targetIdx * anglePerSegment + anglePerSegment / 2);
      const finalRotation = 360 * rotations + targetAngle;
      
      setReward(prize);
      setIsSpinning(true);
      setSpinLoading(false);
      setRotation(finalRotation);

      setTimeout(() => {
        setIsSpinning(false);
        setShowWinScreen(true);
        onWin(newBalance, prize);
        
        // Start confetti
        setTimeout(() => {
          confettiCleanupRef.current = triggerConfetti("spin-confetti-canvas");
        }, 100);
      }, 4100);

    } catch (err) {
      setSpinLoading(false);
      setError(err?.response?.data?.error || tr("spin_failed", "Spin failed. Please try again."));
    }
  };

  const handleClose = () => {
    if (isSpinning) return;
    if (confettiCleanupRef.current) {
      confettiCleanupRef.current();
      confettiCleanupRef.current = null;
    }
    setIsSpinning(false);
    setShowWinScreen(false);
    setReward(null);
    setRotation(0);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <canvas id="spin-confetti-canvas" className="fixed inset-0 pointer-events-none z-50 w-full h-full" />
      
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
        {!isSpinning && (
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {!showWinScreen ? (
          <div className="flex flex-col items-center">
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
              {tr("daily_spin_wheel", "Daily Spin Wheel")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              {tr("spin_wheel_tagline", "Try your luck to win free coins daily!")}
            </p>

            {/* Pointer indicator */}
            <div className="relative w-64 h-64 flex items-center justify-center mb-6">
              <div className="absolute -top-3 z-20 text-indigo-600 dark:text-indigo-400 animate-bounce">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 21l-8-14h16z" />
                </svg>
              </div>

              {/* Wheel graphics */}
              <div
                className="w-full h-full rounded-full border-4 border-slate-900 dark:border-slate-800 overflow-hidden shadow-xl relative"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: isSpinning ? "transform 4s cubic-bezier(0.15, 0.85, 0.3, 1)" : "none",
                }}
              >
                {/* Visual Segments using SVG */}
                <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
                  {segments.map((val, idx) => {
                    const angle = 60;
                    const startAngle = idx * angle;
                    const endAngle = startAngle + angle;
                    const radStart = (startAngle * Math.PI) / 180;
                    const radEnd = (endAngle * Math.PI) / 180;
                    const x1 = 100 + 100 * Math.cos(radStart);
                    const y1 = 100 + 100 * Math.sin(radStart);
                    const x2 = 100 + 100 * Math.cos(radEnd);
                    const y2 = 100 + 100 * Math.sin(radEnd);
                    
                    const d = `M 100 100 L ${x1} ${y1} A 100 100 0 0 1 ${x2} ${y2} Z`;
                    const colors = [
                      "#6366f1", // indigo-500
                      "#10b981", // emerald-500
                      "#f59e0b", // amber-500
                      "#a855f7", // purple-500
                      "#f43f5e", // rose-500
                      "#0ea5e9"  // sky-500
                    ];
                    
                    const textAngle = startAngle + angle / 2;
                    const radText = (textAngle * Math.PI) / 180;
                    const tx = 100 + 60 * Math.cos(radText);
                    const ty = 100 + 60 * Math.sin(radText);

                    return (
                      <g key={idx}>
                        <path d={d} fill={colors[idx]} stroke="#1e293b" strokeWidth="1" />
                        <text
                          x={tx}
                          y={ty}
                          fill="white"
                          fontSize="12"
                          fontWeight="bold"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          transform={`rotate(${textAngle + 90}, ${tx}, ${ty})`}
                        >
                          {val}
                        </text>
                      </g>
                    );
                  })}
                </svg>

                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900 border-2 border-white dark:border-slate-700 shadow" />
              </div>

              <button
                disabled={isSpinning || spinLoading}
                onClick={handleStartSpin}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-16 h-16 rounded-full bg-slate-900 text-white font-black text-xs border-4 border-white hover:scale-105 active:scale-95 transition-transform disabled:opacity-85 shadow-lg flex items-center justify-center uppercase tracking-wider dark:border-slate-700"
              >
                {spinLoading ? "..." : tr("spin", "SPIN")}
              </button>
            </div>

            {error && (
              <p className="text-xs text-rose-500 font-medium mt-2 mb-2 bg-rose-50 dark:bg-rose-950/20 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/30">
                {error}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center py-4">
            <div className="w-20 h-20 bg-amber-100 dark:bg-amber-950/40 rounded-full flex items-center justify-center mb-4 border border-amber-200 dark:border-amber-900/30 shadow-lg animate-bounce">
              <Trophy className="w-10 h-10 text-amber-500" />
            </div>
            <h4 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
              {tr("congrats", "Congratulations!")}
            </h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              {tr("spin_wheel_win_msg", "You won {{count}} coins from the daily spin!", { count: reward })}
            </p>
            <Button
              onClick={handleClose}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-12 rounded-xl shadow-lg shadow-indigo-500/20"
            >
              {tr("claim_rewards", "Claim Reward")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function ScratchCardModal({ isOpen, onClose, onWin, tr }) {
  const [scratchLoading, setScratchLoading] = React.useState(false);
  const [reward, setReward] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [showWinScreen, setShowWinScreen] = React.useState(false);
  const [canvasCleared, setCanvasCleared] = React.useState(false);
  const [apiResolved, setApiResolved] = React.useState(false);
  const canvasRef = React.useRef(null);
  const confettiCleanupRef = React.useRef(null);
  const stateRef = React.useRef({ isDrawing: false, rewardVal: null, resolved: false, loading: false });

  React.useEffect(() => {
    if (!isOpen) return;
    
    setReward(null);
    setError(null);
    setShowWinScreen(false);
    setCanvasCleared(false);
    setApiResolved(false);
    stateRef.current = { isDrawing: false, rewardVal: null, resolved: false, loading: false };

    const fetchScratchReward = async () => {
      stateRef.current.loading = true;
      setScratchLoading(true);
      try {
        const res = await api.post("/coins/scratch");
        const prize = res?.reward ?? 0;
        const newBalance = res?.newBalance ?? 0;
        
        setReward(prize);
        setApiResolved(true);
        setScratchLoading(false);
        stateRef.current.rewardVal = prize;
        stateRef.current.resolved = true;
        stateRef.current.loading = false;
        stateRef.current.newBalance = newBalance;
      } catch (err) {
        setScratchLoading(false);
        stateRef.current.loading = false;
        setError(err?.response?.data?.error || tr("scratch_failed", "Failed to load scratch card."));
      }
    };
    
    fetchScratchReward();
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen || scratchLoading || error || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = "#cbd5e1";
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 4;
    for (let i = 0; i < width; i += 20) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 20, height);
      ctx.stroke();
    }

    ctx.fillStyle = "#1e293b";
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(tr("scratch_here", "SCRATCH HERE"), width / 2, height / 2);

    const startScratch = (e) => {
      if (!stateRef.current.resolved) return;
      stateRef.current.isDrawing = true;
      scratch(e);
    };

    const stopScratch = () => {
      stateRef.current.isDrawing = false;
      checkScratchPercentage();
    };

    const scratch = (e) => {
      if (!stateRef.current.isDrawing || !canvasRef.current) return;
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const rect = canvas.getBoundingClientRect();
      
      const clientX = e.clientX || (e.touches && e.touches[0].clientX);
      const clientY = e.clientY || (e.touches && e.touches[0].clientY);
      
      if (!clientX || !clientY) return;

      const x = clientX - rect.left;
      const y = clientY - rect.top;

      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(x, y, 22, 0, Math.PI * 2);
      ctx.fill();
    };

    const checkScratchPercentage = () => {
      if (!canvasRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imgData.data;
      let cleared = 0;
      
      for (let i = 3; i < pixels.length; i += 16) {
        if (pixels[i] === 0) cleared++;
      }
      
      const totalSamples = pixels.length / 16;
      const percent = cleared / totalSamples;

      if (percent > 0.45 && !stateRef.current.clearedTriggered) {
        stateRef.current.clearedTriggered = true;
        setCanvasCleared(true);
        
        setTimeout(() => {
          setShowWinScreen(true);
          onWin(stateRef.current.newBalance, stateRef.current.rewardVal);
          
          setTimeout(() => {
            confettiCleanupRef.current = triggerConfetti("scratch-confetti-canvas");
          }, 100);
        }, 300);
      }
    };

    canvas.addEventListener("mousedown", startScratch);
    canvas.addEventListener("mousemove", scratch);
    canvas.addEventListener("mouseup", stopScratch);
    canvas.addEventListener("mouseleave", stopScratch);

    canvas.addEventListener("touchstart", startScratch);
    canvas.addEventListener("touchmove", scratch);
    canvas.addEventListener("touchend", stopScratch);

    return () => {
      canvas.removeEventListener("mousedown", startScratch);
      canvas.removeEventListener("mousemove", scratch);
      canvas.removeEventListener("mouseup", stopScratch);
      canvas.removeEventListener("mouseleave", stopScratch);
      canvas.removeEventListener("touchstart", startScratch);
      canvas.removeEventListener("touchmove", scratch);
      canvas.removeEventListener("touchend", stopScratch);
    };
  }, [isOpen, scratchLoading, error]);

  const handleClose = () => {
    if (confettiCleanupRef.current) {
      confettiCleanupRef.current();
      confettiCleanupRef.current = null;
    }
    setShowWinScreen(false);
    setCanvasCleared(false);
    setReward(null);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <canvas id="scratch-confetti-canvas" className="fixed inset-0 pointer-events-none z-50 w-full h-full" />

      <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-xs w-full p-6 text-center border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {!showWinScreen ? (
          <div className="flex flex-col items-center">
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
              <Gift className="w-5 h-5 text-indigo-500" />
              {tr("scratch_card", "Scratch Card")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              {tr("scratch_desc", "Scratch card to reveal your reward amount!")}
            </p>

            <div className="relative w-64 h-64 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner bg-slate-50 dark:bg-slate-950/60 flex items-center justify-center select-none">
              {apiResolved && (
                <div className="flex flex-col items-center animate-pulse">
                  <div className="w-16 h-16 bg-amber-100 dark:bg-amber-950/40 rounded-full flex items-center justify-center mb-2">
                    <Trophy className="w-8 h-8 text-amber-500" />
                  </div>
                  <span className="text-3xl font-black text-amber-600 dark:text-amber-400">
                    +{reward}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                    {tr("coins", "coins")}
                  </span>
                </div>
              )}

              {scratchLoading && (
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2" />
                  <span className="text-xs text-slate-400 font-semibold">{tr("loading", "Loading...")}</span>
                </div>
              )}

              {!scratchLoading && !error && (
                <canvas
                  ref={canvasRef}
                  width="256"
                  height="256"
                  className={`absolute inset-0 w-full h-full cursor-crosshair transition-opacity duration-500 ${canvasCleared ? "opacity-0 pointer-events-none" : "opacity-100"}`}
                />
              )}
            </div>

            {error && (
              <p className="text-xs text-rose-500 font-medium mt-3 bg-rose-50 dark:bg-rose-950/20 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/30">
                {error}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center py-4">
            <div className="w-20 h-20 bg-amber-100 dark:bg-amber-950/40 rounded-full flex items-center justify-center mb-4 border border-amber-200 dark:border-amber-900/30 shadow-lg animate-bounce">
              <Trophy className="w-10 h-10 text-amber-500" />
            </div>
            <h4 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
              {tr("congrats", "Congratulations!")}
            </h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              {tr("scratch_win_msg", "You won {{count}} coins from the scratch card!", { count: reward })}
            </p>
            <Button
              onClick={handleClose}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-12 rounded-xl shadow-lg shadow-indigo-500/20"
            >
              {tr("claim_rewards", "Claim Reward")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
