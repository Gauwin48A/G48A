import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Star, ThumbsUp, MessageSquare, User, ArrowLeft } from "lucide-react";
import api from '../lib/api';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '../context/AuthContext';

const Reviews = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();

    const [reviews, setReviews] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isSelf = user?.user_id === userId || user?.id === userId;

    useEffect(() => {
        fetchReviews();
    }, [userId]);

    const fetchReviews = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/api/reviews/user/${userId}`);
            if (res.data) {
                setReviews(res.data.reviews || []);
                setStats(res.data.stats || {});
            }
        } catch (error) {
            console.error("Failed to fetch reviews:", error);
            toast({ title: "Error", description: "Failed to load reviews", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitReview = async () => {
        if (!newReview.comment.trim()) {
            toast({ title: "Comment required", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            await api.post('/api/reviews', {
                revieweeId: userId,
                rating: newReview.rating,
                comment: newReview.comment
            });

            toast({ title: "Review submitted!", description: "Thank you for your feedback." });
            setNewReview({ rating: 5, comment: '' });
            fetchReviews(); // Refresh list
        } catch (error) {
            toast({
                title: "Submission failed",
                description: error.response?.data?.error || "Could not submit review",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleHelpful = async (reviewId) => {
        try {
            await api.patch(`/api/reviews/${reviewId}/helpful`);
            // Optimistic update
            setReviews(prev => prev.map(r =>
                r.review_id === reviewId ? { ...r, helpful_count: (r.helpful_count || 0) + 1 } : r
            ));
        } catch (error) {
            console.error("Helpful click error:", error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-12">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 pt-8 pb-16 px-4">
                <div className="max-w-4xl mx-auto">
                    <Button variant="ghost" className="text-white mb-4 pl-0 hover:text-blue-100 hover:bg-white/10" onClick={() => navigate(-1)}>
                        <ArrowLeft className="w-5 h-5 mr-2" /> Back
                    </Button>
                    <div className="flex items-center gap-6">
                        <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm">
                            <Star className="w-12 h-12 text-yellow-400 fill-yellow-400" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2">User Reviews</h1>
                            <p className="text-blue-100 text-lg">See what others are saying regarding this user</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 -mt-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* Stats Card */}
                    <Card className="md:col-span-1 shadow-xl border-0 h-fit">
                        <CardHeader>
                            <CardTitle>Rating Overview</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center">
                            <div className="text-5xl font-bold text-gray-800 dark:text-white mb-2">
                                {stats?.averageRating || '0.0'}
                            </div>
                            <div className="flex justify-center gap-1 mb-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                        key={star}
                                        className={`w-5 h-5 ${star <= Math.round(stats?.averageRating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                                    />
                                ))}
                            </div>
                            <p className="text-gray-500 mb-6">{stats?.totalReviews || 0} total reviews</p>

                            <div className="space-y-2">
                                {[5, 4, 3, 2, 1].map((rating) => (
                                    <div key={rating} className="flex items-center gap-2 text-sm">
                                        <span className="w-3">{rating}</span>
                                        <Star className="w-3 h-3 text-gray-400" />
                                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-yellow-400 rounded-full"
                                                style={{ width: `${stats?.totalReviews ? ((stats.distribution?.[rating] || 0) / stats.totalReviews) * 100 : 0}%` }}
                                            ></div>
                                        </div>
                                        <span className="w-6 text-right text-gray-400">{stats?.distribution?.[rating] || 0}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Reviews List */}
                    <div className="md:col-span-2 space-y-6">

                        {/* Write Review Form */}
                        {!isSelf && (
                            <Card className="shadow-md border-0">
                                <CardContent className="p-6">
                                    <h3 className="text-lg font-semibold mb-4">Write a Review</h3>
                                    <div className="flex gap-2 mb-4">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                onClick={() => setNewReview(prev => ({ ...prev, rating: star }))}
                                                className="focus:outline-none transition-transform hover:scale-110"
                                            >
                                                <Star
                                                    className={`w-8 h-8 ${star <= newReview.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                    <Textarea
                                        placeholder="Share your experience dealing with this user..."
                                        value={newReview.comment}
                                        onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                                        className="mb-4"
                                    />
                                    <Button
                                        onClick={handleSubmitReview}
                                        disabled={isSubmitting}
                                        className="w-full bg-blue-600 hover:bg-blue-700"
                                    >
                                        {isSubmitting ? 'Submitting...' : 'Post Review'}
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        {/* List */}
                        {reviews.length === 0 ? (
                            <Card className="bg-gray-50 border-dashed border-2 border-gray-200 p-8 text-center text-gray-500">
                                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                No reviews yet. Be the first to review!
                            </Card>
                        ) : (
                            reviews.map((review) => (
                                <Card key={review.review_id} className="shadow-sm hover:shadow-md transition-shadow">
                                    <CardContent className="p-6">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <Avatar>
                                                    <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
                                                    {review.reviewer_avatar && <AvatarImage src={review.reviewer_avatar} />}
                                                </Avatar>
                                                <div>
                                                    <p className="font-semibold">{review.reviewer_name || 'Anonymous'}</p>
                                                    <p className="text-xs text-gray-500">{new Date(review.created_at).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <div className="flex">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <Star
                                                        key={star}
                                                        className={`w-4 h-4 ${star <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`}
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
                                            {review.comment}
                                        </p>

                                        <div className="flex items-center gap-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleHelpful(review.review_id)}
                                                className="text-gray-500 hover:text-blue-600"
                                            >
                                                <ThumbsUp className="w-4 h-4 mr-2" />
                                                Helpful ({review.helpful_count || 0})
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
};

export default Reviews;
