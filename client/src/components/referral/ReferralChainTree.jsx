import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { getUserId } from "@/utils/authStorage";
import {
  Users,
  UserPlus,
  Gift,
  TrendingUp,
  Loader2,
  Copy,
  Check,
  Clock,
  CheckCircle2,
  ShieldCheck,
  Search,
} from "lucide-react";

const LEVEL_BADGES = {
  1: "bg-blue-600 text-white",
  2: "bg-emerald-600 text-white",
  3: "bg-amber-600 text-white",
  4: "bg-purple-600 text-white",
  5: "bg-rose-600 text-white",
};

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
      className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

function ReferralItemRow({ item }) {
  const levelClass = LEVEL_BADGES[item.depth] || "bg-gray-600 text-white";
  const joinDate = item.joinDate
    ? new Date(item.joinDate).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/40 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-sm`}
        >
          {(item.name || "U").charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {item.name}
            </span>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${levelClass}`}>
              L{item.depth}
            </span>
            <StatusBadge status={item.status} />
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
            {item.parentName && item.depth > 1 && (
              <span>Invited by <strong className="text-gray-700 dark:text-gray-300">{item.parentName}</strong></span>
            )}
            {joinDate && <span>Joined {joinDate}</span>}
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1.5 rounded-lg border border-amber-200/60 dark:border-amber-900/40">
        <Gift className="h-3.5 w-3.5" />
        +{item.coins} coins
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
  const [statusMap, setStatusMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState("direct"); // "direct" | "indirect"
  const [searchQuery, setSearchQuery] = useState("");

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

      const newStatusMap = {};
      if (Array.isArray(chainStatus?.referrals)) {
        for (const r of chainStatus.referrals) {
          if (r.userId) {
            newStatusMap[r.userId] = r;
          }
        }
      }
      setStatusMap(newStatusMap);

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

  const handleCopyCode = () => {
    const textToCopy = referralCode || shareUrl;
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Flatten referrals into direct vs indirect arrays
  const { directList, indirectList } = useMemo(() => {
    const direct = [];
    const indirect = [];

    function walk(node, depth, parentName = "") {
      if (!node) return;
      if (depth >= 1) {
        const status = statusMap[node.id] || {};
        const item = {
          id: node.id || Math.random().toString(),
          name: node.name || "User",
          depth,
          parentId: node.parentId,
          parentName,
          joinDate: node.joinDate,
          status: status.status || "pending",
          coins: depth === 1 ? 100 : depth === 2 ? 40 : depth === 3 ? 20 : depth === 4 ? 10 : 5,
        };
        if (depth === 1) {
          direct.push(item);
        } else {
          indirect.push(item);
        }
      }
      if (node.children && Array.isArray(node.children)) {
        node.children.forEach((child) => walk(child, depth + 1, node.name || "You"));
      }
    }

    if (treeData) {
      walk(treeData, 0);
    }
    return { directList: direct, indirectList: indirect };
  }, [treeData, statusMap]);

  const activeList = activeSubTab === "direct" ? directList : indirectList;
  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return activeList;
    const q = searchQuery.toLowerCase();
    return activeList.filter((item) =>
      item.name.toLowerCase().includes(q) || item.parentName?.toLowerCase().includes(q)
    );
  }, [activeList, searchQuery]);

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
      {/* Referral Code & Copy Card */}
      {referralCode && (
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-blue-200">
                {tr("your_referral_code", "Your Referral Code")}
              </p>
              <h3 className="text-2xl font-black font-mono tracking-wider mt-1 text-white">
                {referralCode}
              </h3>
              <p className="text-xs text-blue-100 mt-1">
                Share code to earn up to 100 bonus coins for every active referral!
              </p>
            </div>
            <button
              onClick={handleCopyCode}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-indigo-700 hover:bg-blue-50 rounded-xl text-sm font-bold shadow-md transition-all self-start sm:self-auto"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-600" /> Copied Code
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 text-indigo-600" /> Copy Code
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Network Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 border border-blue-100 dark:border-blue-800">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">
            <UserPlus className="h-3.5 w-3.5" /> Direct Referrals
          </div>
          <p className="text-xl font-black text-blue-700 dark:text-blue-300">{stats?.directCount || 0}</p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 border border-emerald-100 dark:border-emerald-800">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
            <Users className="h-3.5 w-3.5" /> Total Network
          </div>
          <p className="text-xl font-black text-emerald-700 dark:text-emerald-300">{stats?.totalCount || 0}</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 border border-amber-100 dark:border-amber-800">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">
            <Gift className="h-3.5 w-3.5" /> Direct Earned
          </div>
          <p className="text-xl font-black text-amber-700 dark:text-amber-300">{stats?.directEarnings || 0} coins</p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 border border-purple-100 dark:border-purple-800">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400 mb-1">
            <TrendingUp className="h-3.5 w-3.5" /> Chain Earned
          </div>
          <p className="text-xl font-black text-purple-700 dark:text-purple-300">{stats?.indirectEarnings || 0} coins</p>
        </div>
      </div>

      {/* 2-Tab Sub-Navigation: Direct vs Indirect */}
      <div className="bg-white dark:bg-gray-900/40 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl self-start">
            <button
              onClick={() => setActiveSubTab("direct")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === "direct"
                  ? "bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
              }`}
            >
              Direct Referrals ({directList.length})
            </button>
            <button
              onClick={() => setActiveSubTab("indirect")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === "indirect"
                  ? "bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
              }`}
            >
              Indirect Referrals ({indirectList.length})
            </button>
          </div>

          {activeList.length > 5 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search referral..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-48"
              />
            </div>
          )}
        </div>

        {/* List of Referrals */}
        {filteredList.length > 0 ? (
          <div className="space-y-2">
            {filteredList.map((item, idx) => (
              <ReferralItemRow key={item.id || idx} item={item} />
            ))}
          </div>
        ) : (
          <div className="text-center py-10 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/20">
            <UserPlus className="h-10 w-10 mx-auto text-gray-400 mb-2" />
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">
              {activeSubTab === "direct"
                ? "No direct referrals yet"
                : "No indirect referrals in your chain yet"}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Share your referral code to start building your network!
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
