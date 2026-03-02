import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    DollarSign, Check, X, MessageCircle, Clock,
    ArrowLeft, TrendingDown, RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useToast } from '@/hooks/use-toast';
import TransactionStepper from '@/components/TransactionStepper';

import { useTranslation } from 'react-i18next';

const Offers = () => {
  const { t } = useTranslation();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [role, setRole] = useState('seller'); // 'seller' or 'buyer'
    const [counterPrice, setCounterPrice] = useState({});
    const [actionOfferId, setActionOfferId] = useState(null);
    const requestIdRef = useRef(0);
    const negotiationSteps = [
        { key: 'offer', label: 'Offer Submitted', hint: 'Buyer proposes price' },
        { key: 'review', label: 'Seller Review', hint: 'Accept, reject, or counter' },
        { key: 'payment', label: 'Payment', hint: 'Buyer pays after acceptance' },
        { key: 'verify', label: 'Verification', hint: 'Both parties confirm completion' },
        { key: 'closed', label: 'Transaction Closed', hint: 'Sale done or reopened' }
    ];

    const fetchOffers = useCallback(async () => {
        const requestId = ++requestIdRef.current;
        setLoading(true);
        setError('');
        try {
            const response = await api.get('/api/offers', {
                params: { role }
            });
            if (requestId !== requestIdRef.current) {
                return;
            }
            const payload = response?.data ?? response;
            setOffers(Array.isArray(payload?.offers) ? payload.offers : []);
        } catch (error) {
            if (import.meta.env.DEV) {
                console.error('Failed to fetch offers:', error);
            }
            if (requestId === requestIdRef.current) {
                setOffers([]);
                setError(error?.message || 'Failed to load offers');
            }
        } finally {
            if (requestId === requestIdRef.current) {
                setLoading(false);
            }
        }
    }, [role]);

    useEffect(() => {
        fetchOffers();
        return () => {
            requestIdRef.current += 1;
        };
    }, [fetchOffers]);

    const respondToOffer = async (offerId, action, price = null) => {
        if (actionOfferId) return;
        setActionOfferId(offerId);
        try {
            await api.patch(`/api/offers/${offerId}`, {
                action,
                counterPrice: price
            });

            toast({
                title: `Offer ${action === 'accept' ? 'Accepted' : action === 'reject' ? 'Rejected' : 'Countered'}`,
                description: action === 'accept' ? 'Congratulations on your sale!' : 'The buyer has been notified.'
            });

            fetchOffers();
        } catch (error) {
            if (import.meta.env.DEV) {
                console.error('Failed to process offer:', error);
            }
            toast({
                title: 'Error',
                description: 'Failed to process offer',
                variant: 'destructive'
            });
        } finally {
            setActionOfferId(null);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'accepted': return 'bg-green-100 text-green-800';
            case 'rejected': return 'bg-red-100 text-red-800';
            case 'countered': return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const calculateDiscount = (offered, original) => {
        const offeredValue = Number(offered);
        const originalValue = Number(original);
        if (!Number.isFinite(offeredValue) || !Number.isFinite(originalValue) || originalValue <= 0) {
            return 0;
        }
        return Math.round(((originalValue - offeredValue) / originalValue) * 100);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-8">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center gap-4 mb-4">
                        <Button variant="ghost" size="icon" className="text-white" onClick={() => navigate(-1)}>
                            <ArrowLeft className="w-6 h-6" />
                        </Button>
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                                <DollarSign className="w-8 h-8" /> Price Negotiations
                            </h1>
                            <p className="text-green-100 mt-1">Manage your offers and counter-offers</p>
                        </div>
                    </div>

                    {/* Role Toggle */}
                    <div className="flex gap-2 bg-white/10 p-1 rounded-xl w-fit">
                        <Button
                            variant={role === 'seller' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setRole('seller')}
                            className={role === 'seller' ? '' : 'text-white hover:bg-white/20'}
                        >
                            Received Offers
                        </Button>
                        <Button
                            variant={role === 'buyer' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setRole('buyer')}
                            className={role === 'buyer' ? '' : 'text-white hover:bg-white/20'}
                        >
                            My Offers
                        </Button>
                    </div>
                </div>
            </div>
            <div className="max-w-4xl mx-auto px-4 -mt-2">
                <TransactionStepper steps={negotiationSteps} currentStep={1} className="bg-white dark:bg-gray-900" />
            </div>

            <div className="max-w-4xl mx-auto px-4 py-6">
                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                    </div>
                ) : error ? (
                    <Card className="border-0 shadow-lg">
                        <CardContent className="py-10 text-center">
                            <h3 className="text-xl font-semibold text-red-600 mb-2">Unable to load offers</h3>
                            <p className="text-gray-500 mb-4">{error}</p>
                            <div className="flex flex-wrap gap-2 justify-center">
                                <Button className="bg-green-600 hover:bg-green-700" onClick={fetchOffers}>
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Retry
                                </Button>
                                <Button variant="outline" onClick={() => navigate('/all-posts')}>
                                    Browse posts
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : offers.length === 0 ? (
                    <Card className="border-0 shadow-lg">
                        <CardContent className="text-center py-12">
                            <DollarSign className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                            <h3 className="text-xl font-semibold text-gray-600">No offers yet</h3>
                            <p className="text-gray-500 mt-2">
                                {role === 'seller' ? 'You haven\'t received any offers yet' : 'You haven\'t made any offers yet'}
                            </p>
                            <div className="flex flex-wrap justify-center gap-2 mt-4">
                                <Button variant="outline" onClick={fetchOffers}>
                                    Refresh
                                </Button>
                                <Button className="bg-green-600 hover:bg-green-700" onClick={() => navigate('/all-posts')}>
                                    Browse listings
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {offers.map((offer) => (
                            <Card key={offer.offer_id} className="border-0 shadow-lg overflow-hidden">
                                <CardContent className="p-6">
                                    <div className="flex items-start gap-4">
                                        {/* Post Info */}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Badge className={getStatusColor(offer.status)}>
                                                    {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
                                                </Badge>
                                                <span className="text-sm text-gray-500">
                                                    <Clock className="w-4 h-4 inline mr-1" />
                                                    {new Date(offer.created_at).toLocaleDateString()}
                                                </span>
                                            </div>

                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                                                {offer.post_title}
                                            </h3>

                                            <p className="text-sm text-gray-500 mb-3">
                                                {role === 'seller' ? `From: ${offer.buyer_name || offer.buyer_username}` : `To: ${offer.seller_name || offer.seller_username}`}
                                            </p>

                                            {/* Prices */}
                                            <div className="flex items-center gap-6 mb-3">
                                                <div>
                                                    <p className="text-sm text-gray-500">Original Price</p>
                                                    <p className="text-lg font-bold text-gray-400 line-through">₹{offer.original_price?.toLocaleString()}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-500">Offered Price</p>
                                                    <p className="text-xl font-bold text-green-600">₹{offer.offered_price?.toLocaleString()}</p>
                                                </div>
                                                <Badge variant="outline" className="text-red-500 border-red-200">
                                                    <TrendingDown className="w-3 h-3 mr-1" />
                                                    {calculateDiscount(offer.offered_price, offer.original_price)}% off
                                                </Badge>
                                            </div>

                                            {offer.message && (
                                                <p className="text-sm text-gray-600 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                                                    <MessageCircle className="w-4 h-4 inline mr-2" />
                                                    "{offer.message}"
                                                </p>
                                            )}

                                            {offer.counter_price && (
                                                <p className="text-sm mt-2 text-blue-600 font-semibold">
                                                    Counter offer: ₹{offer.counter_price?.toLocaleString()}
                                                </p>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        {role === 'seller' && offer.status === 'pending' && (
                                            <div className="flex flex-col gap-2">
                                                <Button
                                                    size="sm"
                                                    className="bg-green-600 hover:bg-green-700"
                                                    disabled={actionOfferId === offer.offer_id}
                                                    onClick={() => respondToOffer(offer.offer_id, 'accept')}
                                                >
                                                    <Check className="w-4 h-4 mr-1" /> Accept
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    disabled={actionOfferId === offer.offer_id}
                                                    onClick={() => respondToOffer(offer.offer_id, 'reject')}
                                                >
                                                    <X className="w-4 h-4 mr-1" /> Reject
                                                </Button>
                                                <div className="flex gap-1">
                                                    <Input
                                                        type="number"
                                                        placeholder="Counter"
                                                        className="w-24 text-sm"
                                                        value={counterPrice[offer.offer_id] || ''}
                                                        onChange={(e) => setCounterPrice({ ...counterPrice, [offer.offer_id]: e.target.value })}
                                                    />
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        disabled={!counterPrice[offer.offer_id] || actionOfferId === offer.offer_id}
                                                        onClick={() => respondToOffer(offer.offer_id, 'counter', counterPrice[offer.offer_id])}
                                                    >
                                                        Send
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Offers;
