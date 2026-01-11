/**
 * BargainActions Component - Smart Bargain Feature
 * The Defender's Strategy: One-tap negotiation
 * 
 * Replaces awkward "Is this available?" messaging
 * with structured offers at 10% and 20% discount
 */

import React, { useState } from 'react';
import { Button } from './ui/button';
import { MessageCircle, Zap, Check, BadgePercent, HandCoins } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const BargainActions = ({ post, currentUser, onChatClick }) => {
    const [offerSent, setOfferSent] = useState(false);
    const [sentAmount, setSentAmount] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const sendOffer = async (amount, discountPercent) => {
        if (!currentUser) {
            navigate('/login', { state: { returnTo: `/post/${post.post_id || post.id}` } });
            return;
        }

        // Don't allow offering on own posts
        if (currentUser.userId === post.user_id || currentUser.id === post.user_id) {
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(`${API_BASE}/api/offers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                credentials: 'include',
                body: JSON.stringify({
                    post_id: post.post_id || post.id,
                    seller_id: post.user_id,
                    offer_amount: amount,
                    original_price: post.price,
                    discount_percent: discountPercent,
                    message: `⚡ OFFER: I want to buy "${post.title}" for ₹${amount.toLocaleString('en-IN')}`
                })
            });

            if (response.ok) {
                setOfferSent(true);
                setSentAmount(amount);
                // Haptic feedback
                if (navigator.vibrate) navigator.vibrate(50);
            } else {
                const error = await response.json();
                alert(error.message || 'Failed to send offer');
            }
        } catch (err) {
            console.error('Offer error:', err);
            alert('Failed to send offer. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const discount10 = Math.floor(post.price * 0.9);
    const discount20 = Math.floor(post.price * 0.8);

    // Format price in Indian format
    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-IN').format(price);
    };

    // Success state
    if (offerSent) {
        return (
            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border border-green-200 dark:border-green-800 rounded-xl">
                <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-400">
                    <Check className="w-5 h-5" />
                    <span className="font-semibold">Offer Sent! ₹{formatPrice(sentAmount)}</span>
                </div>
                <p className="text-xs text-center text-green-600 mt-2">
                    विक्रेता को आपका ऑफर मिल गया। जल्द जवाब आएगा!
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

    // Is this user's own post?
    const isOwnPost = currentUser && (currentUser.userId === post.user_id || currentUser.id === post.user_id);

    if (isOwnPost) {
        return (
            <div className="text-center text-gray-500 text-sm py-2">
                This is your listing
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Zap className="w-4 h-4 text-yellow-500" />
                <span className="font-medium">Quick Bargain - एक टैप में ऑफर दें</span>
            </div>

            {/* Offer Buttons Grid */}
            <div className="grid grid-cols-2 gap-2">
                {/* 20% Off Offer */}
                <Button
                    variant="outline"
                    className="flex flex-col items-center py-4 h-auto border-2 border-orange-200 hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all"
                    onClick={() => sendOffer(discount20, 20)}
                    disabled={loading}
                >
                    <BadgePercent className="w-5 h-5 text-orange-500 mb-1" />
                    <span className="text-lg font-bold text-orange-600">₹{formatPrice(discount20)}</span>
                    <span className="text-xs text-orange-500">20% Off</span>
                </Button>

                {/* 10% Off Offer */}
                <Button
                    variant="outline"
                    className="flex flex-col items-center py-4 h-auto border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                    onClick={() => sendOffer(discount10, 10)}
                    disabled={loading}
                >
                    <HandCoins className="w-5 h-5 text-blue-500 mb-1" />
                    <span className="text-lg font-bold text-blue-600">₹{formatPrice(discount10)}</span>
                    <span className="text-xs text-blue-500">10% Off</span>
                </Button>
            </div>

            {/* Full Price / Chat Button */}
            <Button
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 py-6 text-lg font-bold"
                onClick={onChatClick}
            >
                <MessageCircle className="w-5 h-5 mr-2" />
                Chat to Negotiate
            </Button>

            {/* Original Price Reference */}
            <p className="text-xs text-center text-gray-500">
                Listed Price: <span className="font-semibold">₹{formatPrice(post.price)}</span>
            </p>
        </div>
    );
};

export default BargainActions;
