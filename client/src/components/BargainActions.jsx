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
            original_price: post.price,
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
    [currentUser, post, navigate]
  );

  const price20Off = Math.floor(post.price * 0.8);
  const price10Off = Math.floor(post.price * 0.9);

  const formatINR = (amount) =>
    new Intl.NumberFormat("en-IN").format(amount);

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
          {"\u0935\u093F\u0915\u094D\u0930\u0947\u0924\u093E \u0915\u094B \u0906\u092A\u0915\u093E \u0911\u092B\u0930 \u092E\u093F\u0932 \u0917\u092F\u093E\u0964 \u091C\u0932\u094D\u0926 \u091C\u0935\u093E\u092C \u0906\u090F\u0917\u093E!"}
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
          Quick Bargain - {"\u090F\u0915 \u091F\u0948\u092A \u092E\u0947\u0902 \u0911\u092B\u0930 \u0926\u0947\u0902"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          className="flex flex-col items-center py-4 h-auto border-2 border-orange-200 hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all"
          onClick={handleOffer20}
          disabled={sending}
        >
          <BadgePercent className="w-5 h-5 text-orange-500 mb-1" />
          <span className="text-lg font-bold text-orange-600">
            {"\u20B9"}
            {formatINR(price20Off)}
          </span>
          <span className="text-xs text-orange-500">20% Off</span>
        </Button>

        <Button
          variant="outline"
          className="flex flex-col items-center py-4 h-auto border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
          onClick={handleOffer10}
          disabled={sending}
        >
          <HandCoins className="w-5 h-5 text-blue-500 mb-1" />
          <span className="text-lg font-bold text-blue-600">
            {"\u20B9"}
            {formatINR(price10Off)}
          </span>
          <span className="text-xs text-blue-500">10% Off</span>
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
          {formatINR(post.price)}
        </span>
      </p>
    </div>
  );
});

BargainActions.displayName = "BargainActions";

export default BargainActions;
