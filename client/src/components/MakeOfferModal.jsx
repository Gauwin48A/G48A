import React, { useState } from 'react';
import { X, DollarSign, Percent, Send, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { useTranslation } from 'react-i18next';

/**
 * Make Offer Modal Component
 * 
 * Allows buyers to submit price offers for posts.
 */
const MakeOfferModal = ({ isOpen, onClose, post, onSubmit }) => {
    const { t } = useTranslation();
    const [offerPrice, setOfferPrice] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    if (!isOpen || !post) return null;

    const originalPrice = parseFloat(post.price) || 0;
    const discount = offerPrice ? ((originalPrice - parseFloat(offerPrice)) / originalPrice * 100).toFixed(0) : 0;

    const suggestedOffers = [
        { label: '10% off', price: Math.round(originalPrice * 0.9) },
        { label: '15% off', price: Math.round(originalPrice * 0.85) },
        { label: '20% off', price: Math.round(originalPrice * 0.8) },
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const offer = parseFloat(offerPrice);
        if (!offer || offer <= 0) {
            setError('Please enter a valid offer amount');
            setLoading(false);
            return;
        }

        if (offer >= originalPrice) {
            setError('Offer must be less than the original price');
            setLoading(false);
            return;
        }

        if (offer < originalPrice * 0.5) {
            setError('Offer must be at least 50% of the original price');
            setLoading(false);
            return;
        }

        try {
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
            const token = localStorage.getItem('authToken');

            const res = await fetch(`${baseUrl}/api/offers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    post_id: post.post_id || post.id,
                    offered_price: offer,
                    message: message
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to submit offer');
            }

            setSuccess(true);
            if (onSubmit) onSubmit(data);

            // Auto close after success
            setTimeout(() => {
                onClose();
                setSuccess(false);
                setOfferPrice('');
                setMessage('');
            }, 2000);

        } catch (err) {
            setError(err.message || 'Failed to submit offer');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <DollarSign className="w-5 h-5" />
                        Make an Offer
                    </h2>
                    <button onClick={onClose} className="text-white/80 hover:text-white p-1">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {success ? (
                    <div className="p-8 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            Offer Submitted!
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400">
                            The seller will be notified of your offer.
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-6">
                        {/* Post Info */}
                        <div className="flex items-center gap-3 mb-6 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                                {post.images?.[0] ? (
                                    <img src={post.images[0]} alt="" className="w-full h-full object-cover rounded-lg" />
                                ) : (
                                    <span className="text-gray-400 text-xs">No Image</span>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                                    {post.title}
                                </h3>
                                <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                                    ₹{originalPrice.toLocaleString()}
                                </p>
                            </div>
                        </div>

                        {/* Quick Offers */}
                        <div className="mb-4">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                                Quick Offers
                            </label>
                            <div className="flex gap-2">
                                {suggestedOffers.map((offer) => (
                                    <button
                                        key={offer.label}
                                        type="button"
                                        onClick={() => setOfferPrice(offer.price.toString())}
                                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border-2 transition ${offerPrice === offer.price.toString()
                                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                                            : 'border-gray-200 dark:border-gray-600 hover:border-purple-300'
                                            }`}
                                    >
                                        {offer.label}
                                        <div className="text-xs text-gray-500 dark:text-gray-400">₹{offer.price.toLocaleString()}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Custom Offer Input */}
                        <div className="mb-4">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                                Your Offer
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                                <Input
                                    type="number"
                                    value={offerPrice}
                                    onChange={(e) => setOfferPrice(e.target.value)}
                                    placeholder="Enter your offer"
                                    className="pl-8 text-lg font-semibold"
                                    min="1"
                                    max={originalPrice - 1}
                                />
                                {offerPrice && discount > 0 && (
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 px-2 py-0.5 rounded text-sm font-medium flex items-center gap-1">
                                        <Percent className="w-3 h-3" />
                                        {discount}% off
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Message */}
                        <div className="mb-4">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                                Message (Optional)
                            </label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Add a message for the seller..."
                                className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm resize-none"
                                rows={2}
                            />
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                {error}
                            </div>
                        )}

                        {/* Submit */}
                        <Button
                            type="submit"
                            disabled={loading || !offerPrice}
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Submit Offer
                                </>
                            )}
                        </Button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default MakeOfferModal;

