import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { getUserId } from "@/utils/authStorage";
import {
  Users,
  ChevronDown,
  ChevronRight,
  Gift,
  Crown,
  UserPlus,
  TrendingUp,
  Loader2,
  Copy,
  Check,
  Share2,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  ReferralChainTree – visual referral network for logged-in user    */
/* ------------------------------------------------------------------ */

const LEVEL_COLORS = [
  "from-blue-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-purple-500 to-fuchsia-600",
  "from-rose-500 to-pink-600",
];

const LEVEL_BG_COLORS = [
  "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700",
  "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700",
  "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700",
  "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700",
  "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-700",
];

const LEVEL_TEXT = [
  "text-blue-700 dark:text-blue-300",
  "text-emerald-700 dark:text-emerald-300",
  "text-amber-700 dark:text-amber-300",
  "text-purple-700 dark:text-purple-300",
  "text-rose-700 dark:text-rose-300",
];

const STATUS_CONFIG = {
  rewarded: {
    icon: CheckCircle2,
    label: "Rewarded",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
  },
  qualified: {
    icon: ShieldCheck,
    label: "Qualified",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-900/30",
  },
  pending: {
    icon: Clock,
    label: "Pending",
    color: "text-gray-500 dark:text-gray-400",
    bg: "bg-gray-100 dark:bg-gray-800/50",
  },
};

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = config.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${config.bg} ${config.color}`}
    >
      <Icon className="h-2.5 w-2.5" />
      {config.label}
    </span>
  );
}

function TreeNode({ node, depth = 0, isLast = false, statusMap = {} }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;
  const colorIdx = Math.min(depth, LEVEL_COLORS.length - 1);
  const joinDate = node.joinDate
    ? new Date(node.joinDate).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";
  const nodeStatus = statusMap[node.id];

  return (
    <div className="relative">
      {/* Connector line */}
      {depth > 0 && (
        <div className="absolute left-5 -top-3 w-px h-3 bg-gray-300 dark:bg-gray-600" />
      )}

      <div
        className={`flex items-start gap-3 py-2 px-3 rounded-xl border transition-all duration-200 mb-2 ${LEVEL_BG_COLORS[colorIdx]} hover:shadow-md cursor-pointer`}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {/* Expand/collapse */}
        <div className="mt-1 flex-shrink-0 w-5">
          {hasChildren ? (
            expanded ? (
              <ChevronDown className={`h-4 w-4 ${LEVEL_TEXT[colorIdx]}`} />
            ) : (
              <ChevronRight className={`h-4 w-4 ${LEVEL_TEXT[colorIdx]}`} />
            )
          ) : (
            <div className="w-4 h-4" />
          )}
        </div>

        {/* Avatar */}
        <div
          className={`flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br ${LEVEL_COLORS[colorIdx]} flex items-center justify-center text-white text-sm font-bold shadow-sm`}
        >
          {depth === 0 ? (
            <Crown className="h-5 w-5" />
          ) : (
            (node.name || "U").charAt(0).toUpperCase()
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-sm font-semibold ${depth === 0 ? "text-gray-900 dark:text-white" : LEVEL_TEXT[colorIdx]}`}
            >
              {depth === 0 ? "You" : node.name || "User"}
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r ${LEVEL_COLORS[colorIdx]} text-white`}
            >
              L{depth}
            </span>
            {depth > 0 && nodeStatus && <StatusBadge status={nodeStatus.status} />}
            {hasChildren && (
              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                {node.children.length} referral{node.children.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          {depth > 0 && (
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {joinDate && (
                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                  Joined {joinDate}
                </p>
              )}
              {nodeStatus && (nodeStatus.postCount > 0 || nodeStatus.transactionCount > 0) && (
                <p className="text-[10px] text-gray-400 dark:text-gray-500">
                  {nodeStatus.transactionCount > 0
                    ? `${nodeStatus.transactionCount} txn`
                    : `${nodeStatus.postCount} posts`}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Reward indicator */}
        {depth > 0 && depth <= 5 && (
          <div className="flex-shrink-0 flex items-center gap-1 text-[10px] font-semibold text-yellow-600 dark:text-yellow-400">
            <Gift className="h-3 w-3" />
            {depth === 1 ? "+100" : depth === 2 ? "+40" : depth === 3 ? "+20" : depth === 4 ? "+10" : "+5"}
          </div>
        )}
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div className="ml-8 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
          {node.children.map((child, idx) => (
            <TreeNode
              key={child.id || idx}
              node={child}
              depth={depth + 1}
              isLast={idx === node.children.length - 1}
              statusMap={statusMap}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ChainStats({ stats, statusSummary }) {
  const items = [
    {
      icon: UserPlus,
      label: "Direct Referrals",
      value: stats.directCount || 0,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      icon: Users,
      label: "Total Network",
      value: stats.totalCount || 0,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
    },
    {
      icon: Gift,
      label: "Direct Earned",
      value: `${stats.directEarnings || 0} coins`,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-900/20",
    },
    {
      icon: TrendingUp,
      label: "Chain Earned",
      value: `${stats.indirectEarnings || 0} coins`,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-900/20",
    },
  ];

  return (
    <div className="space-y-3 mb-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {items.map((item) => (
          <div
            key={item.label}
            className={`${item.bg} rounded-xl p-3 border border-gray-200 dark:border-gray-700`}
          >
            <div className="flex items-center gap-2 mb-1">
              <item.icon className={`h-4 w-4 ${item.color}`} />
              <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {item.label}
              </span>
            </div>
            <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Referral validation status breakdown */}
      {statusSummary && statusSummary.total > 0 && (
        <div className="flex items-center gap-4 bg-white dark:bg-gray-900/40 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
          <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Validation Status:
          </span>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {statusSummary.rewarded} Rewarded
            </span>
            <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              {statusSummary.qualified} Qualified
            </span>
            <span className="flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
              <Clock className="h-3.5 w-3.5" />
              {statusSummary.pending} Pending
            </span>
          </div>
          {/* Progress bar */}
          <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
            {statusSummary.rewarded > 0 && (
              <div
                className="h-full bg-emerald-500"
                style={{ width: `${(statusSummary.rewarded / statusSummary.total) * 100}%` }}
              />
            )}
            {statusSummary.qualified > 0 && (
              <div
                className="h-full bg-amber-500"
                style={{ width: `${(statusSummary.qualified / statusSummary.total) * 100}%` }}
              />
            )}
            {statusSummary.pending > 0 && (
              <div
                className="h-full bg-gray-400"
                style={{ width: `${(statusSummary.pending / statusSummary.total) * 100}%` }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RewardRulesCard() {
  const rules = [
    { level: 1, label: "Direct Referral", reward: 100, desc: "Your referred user completes a transaction or creates 2+ verified listings" },
    { level: 2, label: "2nd Level", reward: 40, desc: "Your referral's referral becomes an active user" },
    { level: 3, label: "3rd Level", reward: 20, desc: "3rd-generation referral generates real activity" },
    { level: 4, label: "4th Level", reward: 10, desc: "4th-generation referral becomes active" },
    { level: 5, label: "5th Level", reward: 5, desc: "5th-generation referral becomes active" },
  ];

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-xl p-4 border border-indigo-100 dark:border-indigo-800 mb-6">
      <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-200 mb-2 flex items-center gap-2">
        <Gift className="h-4 w-4" />
        How Referral Rewards Work
      </h3>
      <p className="text-[10px] text-indigo-600 dark:text-indigo-400 mb-3">
        Coins are rewarded only for <strong>valid referrals</strong> — referred users must be verified and
        have real activity (completed transaction or 2+ listings). No rewards for invite-only signups.
      </p>
      <div className="space-y-2">
        {rules.map((rule) => (
          <div
            key={rule.level}
            className="flex items-center gap-3 bg-white/60 dark:bg-gray-800/40 rounded-lg px-3 py-2"
          >
            <span
              className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r ${LEVEL_COLORS[rule.level - 1]} text-white`}
            >
              L{rule.level}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                {rule.label}
              </p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">{rule.desc}</p>
            </div>
            <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400">
              +{rule.reward} 🪙
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
        <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-amber-700 dark:text-amber-300">
          <strong>Pending</strong> referrals haven't met activity requirements yet.
          <strong> Qualified</strong> referrals are eligible — coins are distributed automatically.
        </p>
      </div>
      <div className="mt-2 flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <ShieldCheck className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-blue-700 dark:text-blue-300">
          <strong>Safety Caps:</strong> Max 500 coins/day · 5,000/month · 50,000 lifetime from referrals.
          This prevents abuse while still generously rewarding active referrers.
        </p>
      </div>
    </div>
  );
}

export default function ReferralChainTree() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const tr = (key, fallback) => t(key, { defaultValue: fallback });

  const [treeData, setTreeData] = useState(null);
  const [stats, setStats] = useState(null);
  const [statusSummary, setStatusSummary] = useState(null);
  const [statusMap, setStatusMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const userId = getUserId(user);

  const fetchTree = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const [treeRes, refRes, chainStatusRes] = await Promise.all([
        api.get("/referral/tree"),
        api.get("/referral"),
        api.get("/referral/chain-status").catch(() => ({ data: { referrals: [], summary: null } })),
      ]);
      const tree = treeRes?.data ?? treeRes;
      const ref = refRes?.data ?? refRes;
      const chainStatus = chainStatusRes?.data ?? chainStatusRes;

      setTreeData(tree?.tree || tree);

      // Build statusMap keyed by userId
      const newStatusMap = {};
      if (Array.isArray(chainStatus?.referrals)) {
        for (const r of chainStatus.referrals) {
          if (r.userId) {
            newStatusMap[r.userId] = r;
          }
        }
      }
      setStatusMap(newStatusMap);
      setStatusSummary(chainStatus?.summary || null);

      setStats({
        directCount: Number(ref?.referral_count || tree?.directCount || 0),
        totalCount: tree?.total || countNodes(tree?.tree || tree),
        directEarnings: Number(ref?.direct_earnings || 0),
        indirectEarnings: Number(ref?.indirect_earnings || 0),
      });
    } catch (err) {
      setError(err?.message || "Failed to load referral network");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  const referralCode = user?.referral_code || user?.referralCode || "";
  const shareUrl = referralCode
    ? `${window.location.origin}/signup?ref=${referralCode}`
    : "";

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
          Loading your referral network...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
        <button
          onClick={fetchTree}
          className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Share CTA */}
      {referralCode && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-4 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Share2 className="h-4 w-4" />
                {tr("grow_network", "Grow Your Network")}
              </h3>
              <p className="text-xs opacity-80 mt-1">
                {tr("share_earn", "Share your referral code and earn up to 100 coins for every active user in your chain!")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-white/20 px-3 py-1.5 rounded-lg font-mono">
                {referralCode}
              </code>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" /> Copy
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      {stats && <ChainStats stats={stats} statusSummary={statusSummary} />}

      {/* Reward Rules */}
      <RewardRulesCard />

      {/* Tree */}
      <div>
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          {tr("your_referral_network", "Your Referral Network")}
        </h3>

        {treeData && (treeData.children?.length > 0 || treeData.id) ? (
          <div className="bg-white dark:bg-gray-900/40 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <TreeNode node={treeData} depth={0} statusMap={statusMap} />
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-dashed border-gray-300 dark:border-gray-600">
            <UserPlus className="h-10 w-10 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
              {tr("no_referrals_yet", "No referrals yet")}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {tr("share_start", "Share your code to build your referral network!")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function countNodes(node) {
  if (!node) return 0;
  let count = node.children ? node.children.length : 0;
  if (node.children) {
    for (const child of node.children) {
      count += countNodes(child);
    }
  }
  return count;
}
