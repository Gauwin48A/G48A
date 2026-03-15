import React, { useState, useEffect, useCallback, memo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Coins, ArrowDown, ArrowUp, History, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getApiOriginBase } from "@/lib/networkConfig";

const API_BASE = (() => {
  const base = String(getApiOriginBase()).replace(/\/+$/, "");
  return base.endsWith("/api") ? base : `${base}/api`;
})();

function getAuthHeaders() {
  const token = localStorage.getItem("authToken") || localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const TYPE_LABELS = {
  welcome_bonus: "Welcome Bonus",
  post: "New Listing",
  sale: "Sale Completed",
  purchase: "Purchase",
  referral_l1: "Referral L1",
  referral_l2: "Referral L2",
  referral_l3: "Referral L3",
  redeem_boost: "Redeemed Boost",
  redeem_featured: "Redeemed Featured",
  redeem_spotlight: "Redeemed Spotlight",
};

function formatDate(date) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const TransactionRow = memo(function TransactionRow({ tx }) {
  const isEarn = tx.amount > 0;
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded-full ${isEarn ? "bg-green-100" : "bg-red-100"}`}>
          {isEarn ? (
            <ArrowDown className="h-3 w-3 text-green-600" />
          ) : (
            <ArrowUp className="h-3 w-3 text-red-600" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium">
            {TYPE_LABELS[tx.type] || tx.type}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {formatDate(tx.created_at)}
          </p>
        </div>
      </div>
      <span className={`text-sm font-bold ${isEarn ? "text-green-600" : "text-red-600"}`}>
        {isEarn ? "+" : ""}{tx.amount}
      </span>
    </div>
  );
});

export default function CoinBalance({ compact = false }) {
  const { user } = useAuth();
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  const loadBalance = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/coins/balance`, {
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance ?? 0);
      }
    } catch {
      // Fail silently
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/coins/history?limit=10`, {
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
      }
    } catch {
      // Fail silently
    }
  }, []);

  useEffect(() => {
    loadBalance();
  }, [loadBalance]);

  useEffect(() => {
    if (showHistory) loadHistory();
  }, [showHistory, loadHistory]);

  if (loading) {
    return compact ? null : (
      <Card>
        <CardContent className="p-4 flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <Coins className="h-4 w-4 text-amber-500" />
        <span className="text-sm font-bold">{balance ?? 0}</span>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Coins className="h-5 w-5 text-amber-500" />
          Coin Balance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-center py-3">
          <p className="text-3xl font-bold text-amber-600">{balance ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-1">Available Coins</p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-green-50 rounded-lg p-2">
            <p className="font-medium">+1</p>
            <p className="text-muted-foreground">per listing</p>
          </div>
          <div className="bg-green-50 rounded-lg p-2">
            <p className="font-medium">+3</p>
            <p className="text-muted-foreground">per sale</p>
          </div>
          <div className="bg-green-50 rounded-lg p-2">
            <p className="font-medium">+2</p>
            <p className="text-muted-foreground">referral L1</p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs"
          onClick={() => setShowHistory(!showHistory)}
        >
          <History className="h-3 w-3 mr-1" />
          {showHistory ? "Hide" : "Show"} History
        </Button>

        {showHistory && transactions.length > 0 && (
          <div className="max-h-60 overflow-y-auto">
            {transactions.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} />
            ))}
          </div>
        )}

        {showHistory && transactions.length === 0 && (
          <p className="text-center text-xs text-muted-foreground py-2">
            No transactions yet
          </p>
        )}
      </CardContent>
    </Card>
  );
}
