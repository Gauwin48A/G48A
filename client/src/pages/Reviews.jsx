import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Star, ThumbsUp, MessageSquare, User, ArrowLeft } from 'lucide-react';
import api from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { PageEmptyState, PageErrorState, PageLoadingState } from '@/components/page-state/PageStateBlocks';

const Reviews = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const viewerId = user?.user_id || user?.id ? String(user?.user_id || user?.id) : '';
  const isSelf = Boolean(viewerId && userId && viewerId === String(userId));
  const isLoggedIn = Boolean(viewerId);

  const loadReviews = useCallback(async () => {
    if (!userId) {
      setError('Invalid review target.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const payload = await api.get(`/reviews/user/${userId}`);
      setReviews(Array.isArray(payload?.reviews) ? payload.reviews : []);
      setStats(payload?.stats || {});
    } catch (fetchError) {
      console.error('Failed to fetch reviews:', fetchError);
      setError('Unable to load reviews right now. Please retry.');
      setReviews([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const handleSubmitReview = async () => {
    if (!isLoggedIn) {
      navigate('/login', { state: { returnTo: `/reviews/${userId}` } });
      return;
    }

    if (!newReview.comment.trim()) {
      toast({ title: 'Comment required', description: 'Please add a short comment.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/reviews', {
        revieweeId: userId,
        rating: newReview.rating,
        comment: newReview.comment.trim()
      });

      toast({ title: 'Review submitted', description: 'Thank you for your feedback.' });
      setNewReview({ rating: 5, comment: '' });
      loadReviews();
    } catch (submitError) {
      console.error('Review submission failed:', submitError);
      toast({
        title: 'Submission failed',
        description: 'We could not post your review. Please retry.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHelpful = async (reviewId) => {
    try {
      await api.patch(`/reviews/${reviewId}/helpful`);
      setReviews((prev) => prev.map((review) => (
        review.review_id === reviewId
          ? { ...review, helpful_count: (review.helpful_count || 0) + 1 }
          : review
      )));
    } catch (helpfulError) {
      console.error('Helpful click error:', helpfulError);
      toast({
        title: 'Action failed',
        description: 'Could not register your helpful vote. Please retry.',
        variant: 'destructive'
      });
    }
  };

  const ratingDistribution = useMemo(() => stats?.distribution || {}, [stats?.distribution]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="w-full max-w-md px-4">
          <PageLoadingState
            marker="loading"
            className="bg-white dark:bg-gray-800"
            title="Loading reviews"
            description="Fetching rating history for this user."
          />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <PageErrorState
            marker="error"
            className="border-red-200 bg-red-50"
            title="Reviews unavailable"
            description={error}
            onRetry={loadReviews}
            secondaryAction={(
              <Button variant="outline" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Go back
              </Button>
            )}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-12">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 pt-8 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            className="text-white mb-4 pl-0 hover:text-blue-100 hover:bg-white/10"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5 mr-2" /> Back
          </Button>
          <div className="flex items-center gap-6">
            <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm">
              <Star className="w-12 h-12 text-yellow-400 fill-yellow-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">User Reviews</h1>
              <p className="text-blue-100 text-lg">See what buyers and sellers say about this user.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                        style={{
                          width: `${stats?.totalReviews ? ((ratingDistribution?.[rating] || 0) / stats.totalReviews) * 100 : 0}%`
                        }}
                      />
                    </div>
                    <span className="w-6 text-right text-gray-400">{ratingDistribution?.[rating] || 0}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="md:col-span-2 space-y-6">
            {!isSelf && (
              <Card className="shadow-md border-0">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Write a Review</h3>
                  {!isLoggedIn && (
                    <div className="mb-4 p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm">
                      Log in to submit your review.
                    </div>
                  )}
                  <div className="flex gap-2 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setNewReview((prev) => ({ ...prev, rating: star }))}
                        className="focus:outline-none transition-transform hover:scale-110"
                        aria-label={`Rate ${star} stars`}
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
                    onChange={(event) => setNewReview((prev) => ({ ...prev, comment: event.target.value }))}
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

            {reviews.length === 0 ? (
              <PageEmptyState
                marker="empty"
                className="bg-gray-50 border-dashed border-2 border-gray-200"
                icon={MessageSquare}
                title="No reviews yet."
                description={!isSelf ? 'Be the first to leave helpful feedback.' : 'This user has no reviews yet.'}
                action={null}
              />
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
