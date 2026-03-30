import React, { useState, useCallback } from "react";
import { Button } from "./ui/button";
import {
  MessageCircle,
  Zap,
  Check,
  BadgePercent,
  HandCoins,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getApiOriginBase } from "@/lib/networkConfig";

const API_BASE = getApiOriginBase();

const BargainActions = React.memo(({ post, currentUser, onChatClick }) => {
  const [offerSent, setOfferSent] = useState(false);
  const [sentAmount, setSentAmount] = useState(null);
  const [sending, setSending] = useState(false);
  const navigate = useNavigate();
  const parsePriceValue = (value) => {
    if (value === null || value === undefined || value === "") return 0;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    const cleaned = String(value).replace(/[^\d.-]/g, "");
    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const basePrice = parsePriceValue(post?.price);

  const sendOffer = useCallback(
    async (amount, discountPercent) => {
      if (!currentUser) {
        navigate("/login", {
          state: { returnTo: `/post/${post.post_id || post.id}` },
        });
        return;
      }

      if (
        currentUser.userId === post.user_id ||
        currentUser.id === post.user_id
      ) {
        return;
      }

      setSending(true);

      try {
        const token =
          localStorage.getItem("authToken") ||
          localStorage.getItem("token");

        const response = await fetch(`${API_BASE}/api/offers`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: "include",
          body: JSON.stringify({
            post_id: post.post_id || post.id,
            seller_id: post.user_id,
            offer_amount: amount,
            original_price: basePrice,
            discount_percent: discountPercent,
            message: `\u26A1 OFFER: I want to buy "${post.title}" for \u20B9${amount.toLocaleString("en-IN")}`,
          }),
        });

        if (response.ok) {
          setOfferSent(true);
          setSentAmount(amount);
          navigator.vibrate && navigator.vibrate(50);
        } else {
          const data = await response.json();
          alert(data.message || "Failed to send offer");
        }
      } catch (err) {
        console.error("Offer error:", err);
        alert("Failed to send offer. Please try again.");
      } finally {
        setSending(false);
      }
    },
    [currentUser, post, navigate, basePrice]
  );

  const price20Off = Math.floor(basePrice * 0.8);
  const price10Off = Math.floor(basePrice * 0.9);

  const formatINR = (amount) =>
    Number.isFinite(amount)
      ? new Intl.NumberFormat("en-IN").format(amount)
      : "--";

  const handleOffer20 = useCallback(() => {
    sendOffer(price20Off, 20);
  }, [sendOffer, price20Off]);

  const handleOffer10 = useCallback(() => {
    sendOffer(price10Off, 10);
  }, [sendOffer, price10Off]);

  if (offerSent) {
    return (
      <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border border-green-200 dark:border-green-800 rounded-xl">
        <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-400">
          <Check className="w-5 h-5" />
          <span className="font-semibold">
            Offer Sent! {"\u20B9"}
            {formatINR(sentAmount)}
          </span>
        </div>
        <p className="text-xs text-center text-green-600 mt-2">
          Your offer was delivered. The seller will respond soon.
        </p>
        <Button
          variant="outline"
          className="w-full mt-3 border-green-300"
          onClick={onChatClick}
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          Chat with Seller
        </Button>
      </div>
    );
  }

  if (
    currentUser &&
    (currentUser.userId === post.user_id || currentUser.id === post.user_id)
  ) {
    return (
      <div className="text-center text-gray-500 text-sm py-2">
        This is your listing
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <Zap className="w-4 h-4 text-yellow-500" />
        <span className="font-medium">
          Quick Bargain - one-tap offers
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          className="flex flex-col items-center justify-center gap-1.5 py-4 h-auto min-h-[120px] border-2 border-orange-200 hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all"
          onClick={handleOffer20}
          disabled={sending}
        >
          <BadgePercent className="w-5 h-5 text-orange-500" />
          <span className="text-lg font-bold text-orange-600 leading-none tabular-nums">
            {"\u20B9"}
            {formatINR(price20Off)}
          </span>
          <span className="text-[11px] uppercase tracking-wide text-orange-500">20% off</span>
        </Button>

        <Button
          variant="outline"
          className="flex flex-col items-center justify-center gap-1.5 py-4 h-auto min-h-[120px] border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
          onClick={handleOffer10}
          disabled={sending}
        >
          <HandCoins className="w-5 h-5 text-blue-500" />
          <span className="text-lg font-bold text-blue-600 leading-none tabular-nums">
            {"\u20B9"}
            {formatINR(price10Off)}
          </span>
          <span className="text-[11px] uppercase tracking-wide text-blue-500">10% off</span>
        </Button>
      </div>

      <Button
        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 py-6 text-lg font-bold"
        onClick={onChatClick}
      >
        <MessageCircle className="w-5 h-5 mr-2" />
        Chat to Negotiate
      </Button>

      <p className="text-xs text-center text-gray-500">
        Listed Price:{" "}
        <span className="font-semibold">
          {"\u20B9"}
          {formatINR(basePrice)}
        </span>
      </p>
    </div>
  );
});

BargainActions.displayName = "BargainActions";

export default BargainActions;
