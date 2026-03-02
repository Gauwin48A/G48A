import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import axios from "../lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from 'react-i18next';
import BuyerInterestModal from "@/components/BuyerInterestModal";
import MakeOfferModal from "@/components/MakeOfferModal";
import BargainActions from "@/components/BargainActions";
import { getApiOriginBase } from '@/lib/networkConfig';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Star,
  Eye,
  Share2,
  Heart,
  Flag,
  HandHeart,
  Package,
  Tag,
  Clock,
  CheckCircle,
  Sparkles,
  ShieldCheck,
  DollarSign
} from "lucide-react";

export default function PostDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const location = useLocation();
  const [post, setPost] = useState(location.state?.post || null);
  const [loading, setLoading] = useState(!location.state?.post);
  const [loadError, setLoadError] = useState('');
  const [retryTick, setRetryTick] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const navigate = useNavigate();

  // Separate effect for tracking - fires once when post data is available
  useEffect(() => {
    const postIdToTrack = post?.post_id || post?.id || id;
    if (!postIdToTrack) return;

    const userId = localStorage.getItem('userId');
    const token = localStorage.getItem('authToken');
    if (!userId || !token) return;

    // Determine source based on referrer path
    const previousPath = document.referrer || '';
    const source = previousPath.includes('/feed') ? 'feed' : 'allposts';

    // Track this view in recently viewed history
    const baseUrl = getApiOriginBase();
    fetch(`${baseUrl}/api/recently-viewed/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      credentials: 'include',
      body: JSON.stringify({
        postId: postIdToTrack,
        userId: userId,
        source: source
      })
    })
      .then(res => res.json())
      .catch(() => { });
  }, [id]); // Only run when id changes (i.e., on page load)

  useEffect(() => {
    // Scroll to top when page loads
    window.scrollTo(0, 0);

    if (!post) {
      const fetchPost = async () => {
        try {
          setLoadError('');
          const payload = await axios.get(`/api/posts/${id}`);
          const rawPost = payload?.post || payload;
          if (!rawPost || Object.keys(rawPost).length === 0) {
            throw new Error("API returned no post data.");
          }
          const fetchedPost = {
            ...rawPost,
            images: (rawPost.images && Array.isArray(rawPost.images) ? rawPost.images : []),
            seller: rawPost.seller || {},
          };
          setPost(fetchedPost);
          setLoading(false);
        } catch (err) {
          console.error("Error fetching post data:", err);
          setLoadError(err?.message || 'Failed to load product');
          setLoading(false);
          setPost(null);
        }
      };
      fetchPost();
    }
    setCurrentImageIndex(0);
  }, [id, retryTick]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-600 dark:text-gray-300">{t('loading') || 'Loading product...'}</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-md">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <Package className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-3">{t('error') || 'Product Not Found'}</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-2">This product is no longer available or has been removed.</p>
          {loadError && (
            <p className="text-sm text-red-500 mb-4">{loadError}</p>
          )}
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setLoading(true);
                setPost(null);
                setRetryTick((value) => value + 1);
              }}
            >
              Retry
            </Button>
            <Link to="/all-posts">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Browse Products
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const nextImage = () => {
    if (!post.images || post.images.length === 0) return;
    setCurrentImageIndex((prev) => (prev + 1) % post.images.length);
  };

  const prevImage = () => {
    if (!post.images || post.images.length === 0) return;
    setCurrentImageIndex((prev) => (prev - 1 + post.images.length) % post.images.length);
  };

  const seller = post.seller || {
    name: post.author || 'Verified Seller',
    id: post.user_id || 'N/A',
    rating: '4.5',
    verified: true
  };

  const formatPrice = (price) => {
    if (!price) return '₹ N/A';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(price);
  };

  const formatDate = (date) => {
    if (!date) return 'Recently';
    try {
      return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return 'Recently'; }
  };

  const sellerVerified = Boolean(
    seller?.verified
    || seller?.isVerified
    || post?.seller_verified
    || post?.aadhaar_verified
    || post?.pan_verified
    || post?.user?.isVerified
  );
  const ratingValue = Number(seller?.rating || post?.seller_rating || 0);
  const successfulSales = Number(
    seller?.successful_sales
    || post?.successful_sales
    || post?.completed_sales
    || post?.seller_completed_sales
    || 0
  );
  const responseRateValue = Number(
    seller?.response_rate
    || post?.response_rate
    || post?.seller_response_rate
    || 0
  );
  const memberSinceRaw = seller?.member_since || post?.seller_member_since || post?.user?.created_at || null;
  const memberSince = memberSinceRaw ? formatDate(memberSinceRaw) : 'Not available';
  const averageResponseTime = seller?.response_time || post?.response_time || post?.avg_response_time || 'Not available';
  const listingId = post?.post_id || post?.id || id;

  const trustSignals = [
    {
      key: 'verification',
      label: 'Seller verification',
      value: sellerVerified ? 'Verified profile' : 'Verification pending',
      hint: sellerVerified ? 'Identity checks completed.' : 'Use in-app chat and confirm identity before payment.',
    },
    {
      key: 'rating',
      label: 'Seller rating',
      value: ratingValue > 0 ? `${ratingValue.toFixed(1)} / 5` : 'No rating yet',
      hint: 'Based on prior buyer feedback.',
    },
    {
      key: 'sales',
      label: 'Completed sales',
      value: successfulSales > 0 ? `${successfulSales}` : 'New seller',
      hint: 'Higher completed sales can indicate reliability.',
    },
    {
      key: 'response',
      label: 'Response profile',
      value: responseRateValue > 0 ? `${responseRateValue}% response rate` : String(averageResponseTime),
      hint: 'Check response time before committing to urgent deals.',
    },
    {
      key: 'member',
      label: 'Member since',
      value: memberSince,
      hint: `Listing ID: ${listingId}`,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900" style={{ paddingBottom: '180px' }}>
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full px-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsLiked(!isLiked)}
              className={`rounded-full w-10 h-10 ${isLiked ? 'text-red-500 bg-red-50 dark:bg-red-900/30' : 'text-gray-500'}`}
            >
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full w-10 h-10 text-gray-500">
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* Image Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
          <div className="relative aspect-square max-h-[400px] bg-gray-100 dark:bg-gray-700 group">
            <img
              src={post.images?.[currentImageIndex] || '/placeholder.svg'}
              alt={post.title}
              className="w-full h-full object-contain"
              onError={e => { e.target.onerror = null; e.target.src = '/placeholder.svg'; }}
            />

            {/* Badges */}
            <div className="absolute top-3 left-3 flex flex-col gap-2">
              <Badge className={`px-3 py-1 text-xs font-bold rounded-full ${post.tier?.toLowerCase() === 'premium'
                ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white'
                : post.tier?.toLowerCase() === 'silver'
                  ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
                  : 'bg-gradient-to-r from-green-400 to-emerald-500 text-white'
                }`}>
                <Sparkles className="w-3 h-3 mr-1 inline" />
                {post.tier?.toUpperCase() || 'STANDARD'}
              </Badge>
            </div>

            <div className="absolute top-3 right-3 bg-black/60 text-white px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {post.views || 0}
            </div>

            {/* Navigation */}
            {post.images && post.images.length > 1 && (
              <>
                <button onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 dark:bg-gray-800/90 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 dark:bg-gray-800/90 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight className="w-5 h-5" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {post.images.map((_, i) => (
                    <button key={i} onClick={() => setCurrentImageIndex(i)} className={`w-2 h-2 rounded-full transition-all ${i === currentImageIndex ? 'bg-blue-500 w-6' : 'bg-white/70'}`} />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Thumbnails */}
          {post.images && post.images.length > 1 && (
            <div className="p-3 border-t dark:border-gray-700 overflow-x-auto">
              <div className="flex gap-2">
                {post.images.map((img, i) => (
                  <button key={i} onClick={() => setCurrentImageIndex(i)} className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${i === currentImageIndex ? 'border-blue-500 scale-105' : 'border-transparent opacity-60'}`}>
                    <img src={img || '/placeholder.svg'} onError={e => { e.target.src = '/placeholder.svg'; }} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Product Info Card */}
        <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg rounded-2xl overflow-hidden">
          <CardContent className="p-5">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{post.title || 'Product Title'}</h1>

            <div className="flex items-baseline gap-3 mb-4">
              <span className="text-3xl font-extrabold text-green-600 dark:text-green-400">{formatPrice(post.price)}</span>
              {post.originalPrice && <span className="text-lg text-gray-400 line-through">{formatPrice(post.originalPrice)}</span>}
              {post.discount && <span className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-2 py-0.5 rounded text-sm font-semibold">{post.discount}% OFF</span>}
            </div>

            {/* Quick Info */}
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-sm font-medium">
                <Tag className="w-3.5 h-3.5" /> {post.category || 'Category'}
              </span>
              <span className="inline-flex items-center gap-1 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-full text-sm font-medium">
                <Package className="w-3.5 h-3.5" /> {post.condition || 'Good Condition'}
              </span>
              <span className="inline-flex items-center gap-1 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-3 py-1 rounded-full text-sm font-medium">
                <MapPin className="w-3.5 h-3.5" /> {post.location || 'Location'}
              </span>
            </div>

            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Clock className="w-4 h-4" /> Posted {formatDate(post.created_at || post.postedDate)}
            </div>
          </CardContent>
        </Card>

        {/* Trust Panel */}
        <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-5 h-5 text-green-500" />
              <h3 className="font-bold text-gray-900 dark:text-white">Trust & Safety</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {trustSignals.map((signal) => (
                <div key={signal.key} className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">{signal.label}</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{signal.value}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{signal.hint}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3">
              <p className="text-xs text-amber-800 dark:text-amber-300">
                Safety tip: avoid sharing sensitive details outside the app and verify the listing ID before payment handover.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Description */}
        <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg rounded-2xl">
          <CardContent className="p-5">
            <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-500" /> Description
            </h3>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              {post.description || "No description provided for this product. Contact the seller for more details."}
            </p>
          </CardContent>
        </Card>

        {/* Smart Bargain - The Defender's Quick Offer Feature */}
        <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg rounded-2xl">
          <CardContent className="p-5">
            <BargainActions
              post={post}
              currentUser={{
                userId: localStorage.getItem('userId'),
                id: localStorage.getItem('userId')
              }}
              onChatClick={() => setShowInterestModal(true)}
            />
          </CardContent>
        </Card>

        {/* Seller Card */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 border-0 shadow-lg rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14 ring-4 ring-white dark:ring-gray-600 shadow-lg">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-lg font-bold">
                  {(seller.name || 'S').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-bold text-gray-900 dark:text-white">{seller.name}</h3>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Star className="w-4 h-4 text-amber-400 fill-current" />
                  <span className="font-semibold">{seller.rating}</span>
                  <span>•</span>
                  <span>ID: {seller.id}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* MAIN CTA - I'm Interested */}
        <div className="space-y-3">
          <Button
            onClick={() => setShowInterestModal(true)}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-5 text-lg rounded-2xl shadow-xl hover:shadow-2xl transition-all"
          >
            <HandHeart className="w-6 h-6 mr-3" />
            I'm Interested - Contact Seller
          </Button>

          {/* Make Offer Button */}
          <Button
            onClick={() => setShowOfferModal(true)}
            variant="outline"
            className="w-full border-2 border-purple-500 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 font-bold py-4 text-lg rounded-2xl transition-all"
          >
            <DollarSign className="w-5 h-5 mr-2" />
            Make an Offer
          </Button>

          <p className="text-center text-xs text-gray-500 dark:text-gray-400">
            🔒 Share your contact details securely with only this seller
          </p>
        </div>

        {/* Secondary Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={() => setIsLiked(!isLiked)}
            className={`py-3 rounded-xl font-medium ${isLiked ? 'bg-red-50 border-red-200 text-red-600' : 'border-gray-200 text-gray-700 dark:border-gray-600 dark:text-gray-300'}`}
          >
            <Heart className={`w-5 h-5 mr-2 ${isLiked ? 'fill-current' : ''}`} />
            {isLiked ? 'Saved' : 'Save'}
          </Button>
          <Button variant="outline" className="py-3 rounded-xl font-medium border-gray-200 text-gray-700 dark:border-gray-600 dark:text-gray-300">
            <Share2 className="w-5 h-5 mr-2" /> Share
          </Button>
        </div>

        {/* Report */}
        <Button variant="ghost" className="w-full text-gray-400 hover:text-red-500 py-3 rounded-xl">
          <Flag className="w-4 h-4 mr-2" /> Report this listing
        </Button>

        {/* Extra spacing for bottom navbar */}
        <div className="h-8"></div>
      </div>

      {/* Buyer Interest Modal */}
      <BuyerInterestModal
        isOpen={showInterestModal}
        onClose={() => setShowInterestModal(false)}
        postId={post?.post_id || post?.id || id}
        postTitle={post?.title}
      />

      {/* Make Offer Modal */}
      <MakeOfferModal
        isOpen={showOfferModal}
        onClose={() => setShowOfferModal(false)}
        post={post}
      />
    </div>
  );
}

