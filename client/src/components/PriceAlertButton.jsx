import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, BellOff, Check } from 'lucide-react';
import api from '../lib/api';
import { getAccessToken } from '@/utils/authStorage';

/**
 * PriceAlertButton - Subscribe to price drop notifications
 * 
 * @param {number} postId - The post ID to subscribe to
 * @param {boolean} initialSubscribed - Initial subscription state
 */
const PriceAlertButton = ({ postId, initialSubscribed = false }) => {
    const [subscribed, setSubscribed] = useState(initialSubscribed);
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const successTimeoutRef = useRef(null);

    useEffect(() => () => clearTimeout(successTimeoutRef.current), []);

    const handleToggle = async () => {
        if (!getAccessToken()) {
            alert('Please login to set price alerts');
            return;
        }

        setLoading(true);
        try {
            if (subscribed) {
                await api.put(`/price-alerts/unsubscribe/${postId}`, {});
                setSubscribed(false);
            } else {
                await api.post('/price-alerts/subscribe', {
                    postId,
                    percentageThreshold: 10
                });
                setSubscribed(true);
                setShowSuccess(true);
                clearTimeout(successTimeoutRef.current);
                successTimeoutRef.current = setTimeout(() => setShowSuccess(false), 2000);
            }
        } catch (error) {
            if (import.meta.env.DEV) {
                console.error('Price alert error:', error);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative">
            <Button
                variant={subscribed ? "default" : "outline"}
                size="sm"
                onClick={handleToggle}
                disabled={loading}
                className={`transition-all ${subscribed
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'border-yellow-500 text-yellow-500 hover:bg-yellow-500/10'
                    }`}
            >
                {loading ? (
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
                ) : subscribed ? (
                    <Bell className="h-4 w-4 mr-1 fill-current" />
                ) : (
                    <BellOff className="h-4 w-4 mr-1" />
                )}
                {subscribed ? 'Price Alert On' : 'Get Price Alert'}
            </Button>

            {/* Success popup */}
            {showSuccess && (
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-green-600 text-white px-3 py-1 rounded-lg text-sm whitespace-nowrap shadow-lg flex items-center gap-1 animate-fade-in">
                    <Check className="h-4 w-4" />
                    You'll be notified when price drops!
                </div>
            )}
        </div>
    );
};

export default PriceAlertButton;
