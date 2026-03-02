import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Shield, Copy, Edit, Phone, Mail, MapPin, Calendar, Camera,
  User, Settings, Bell, Lock, CreditCard, Star, CheckCircle,
  ChevronRight, Sparkles, Award, TrendingUp, LayoutDashboard, Rss, XCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import '../i18n';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../components/LanguageSelector';
import { getChannelByUser } from '../lib/api';
import api from '@/services/api'; // Import central API service
import { useAuth } from '@/context/AuthContext';
import { getAccessToken, getUserId, isAuthenticated } from '@/utils/authStorage';
import { fetchCategoriesCached } from '@/services/categoriesService';
import { hasUserSnapshotChanged, mergeProfileIntoAuthUser } from '@/lib/profileSync';
import { PageEmptyState, PageErrorState, PageLoadingState } from '@/components/page-state/PageStateBlocks';

const Profile = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { user: authUser, setUser: setAuthUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [editErrors, setEditErrors] = useState({});
  const [preferences, setPreferences] = useState({ location: '', minPrice: '', maxPrice: '', categories: [] });
  const [availableCategories, setAvailableCategories] = useState([]);
  const [editPrefMode, setEditPrefMode] = useState(false);
  const [channel, setChannel] = useState(null);
  const [activeTab, setActiveTab] = useState('personal');
  const [userStats, setUserStats] = useState({ postCount: 0, rank: 'Bronze', memberDays: 0 });
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState('');
  const [preferencesLoading, setPreferencesLoading] = useState(true);
  const [preferencesError, setPreferencesError] = useState('');
  const [contactsSyncLoading, setContactsSyncLoading] = useState(false);
  const [contactsSyncError, setContactsSyncError] = useState('');
  const profileRequestIdRef = useRef(0);
  const authUserRef = useRef(authUser);
  const resolveUserId = useCallback((userData) => {
    const candidate = userData?.id ?? userData?.user_id ?? null;
    if (candidate === null || candidate === undefined || candidate === '') {
      return null;
    }
    return String(candidate);
  }, []);
  const resolvedUserId = getUserId(authUser);
  const isLoggedIn = useMemo(() => isAuthenticated(authUser), [authUser, resolvedUserId]);

  useEffect(() => {
    authUserRef.current = authUser;
  }, [authUser]);

  const loadProfile = useCallback(async () => {
    const requestId = profileRequestIdRef.current + 1;
    profileRequestIdRef.current = requestId;
    const cached = localStorage.getItem('userProfile');
    if (cached) {
      try {
        setUser(JSON.parse(cached));
      } catch (e) {
        // Ignore invalid cache and refetch profile from backend.
      }
    }

    setLoading(true);
    setError(null);

    // Auth check using centralized helper (supports legacy keys).
    const token = getAccessToken();
    if (!token) {
      if (requestId === profileRequestIdRef.current) {
        setError('You must be logged in to view your profile.');
        setLoading(false);
      }
      return;
    }

    try {
      // Axios interceptor returns data directly.
      const data = await api.get('/profile');
      if (requestId !== profileRequestIdRef.current) return;
      if (data && typeof data === 'object' && !data.error) {
        const resolvedUserId = resolveUserId(data);
        if (resolvedUserId) {
          localStorage.setItem('userId', resolvedUserId);
        }
        const mergedUser = mergeProfileIntoAuthUser(authUserRef.current, data, resolveUserId);

        localStorage.setItem('userProfile', JSON.stringify(data));
        localStorage.setItem('user', JSON.stringify(mergedUser));
        setUser(mergedUser);
        if (hasUserSnapshotChanged(authUserRef.current, mergedUser)) {
          setAuthUser(mergedUser);
        }
        setEditData({
          full_name: data.full_name || data.name || '',
          phone: data.phone || '',
          address: data.address || '',
          avatar_url: data.avatar_url || '',
          bio: data.bio || ''
        });
      }
    } catch (err) {
      if (requestId !== profileRequestIdRef.current) return;
      console.error("Profile fetch error:", err);
      const status = err?.status || err?.response?.status;
      if (status === 401 || status === 403) {
        setUser(null);
        setError(null);
        navigate('/login', { replace: true, state: { returnTo: '/profile' } });
        return;
      }
      // Interceptor handles 401 redirect, so just show error if it persists.
      if (status >= 500) {
        setError('Profile is temporarily unavailable. Please retry in a moment.');
      } else {
        setError('We could not load your profile right now. Please retry.');
      }
    } finally {
      if (requestId === profileRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [navigate, resolveUserId, setAuthUser]);

  useEffect(() => {
    if (authLoading) {
      return undefined;
    }

    if (!isLoggedIn) {
      setLoading(false);
      setError(null);
      setUser(null);
      return undefined;
    }

    loadProfile();

    return () => {
      profileRequestIdRef.current += 1;
    };
  }, [authLoading, isLoggedIn, loadProfile]);

  const loadCategoryOptions = useCallback(async ({ force = false, guard = () => true } = {}) => {
    setCategoriesLoading(true);
    setCategoriesError('');
    try {
      const data = await fetchCategoriesCached({ force });
      if (!guard()) return;
      setAvailableCategories(Array.isArray(data) ? data : []);
    } catch {
      if (!guard()) return;
      setAvailableCategories([]);
      setCategoriesError('Category preferences are temporarily unavailable. Please retry.');
    } finally {
      if (guard()) {
        setCategoriesLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let active = true;
    loadCategoryOptions({ guard: () => active });
    return () => {
      active = false;
    };
  }, [loadCategoryOptions]);

  const loadPreferencePanel = useCallback(async ({ guard = () => true } = {}) => {
    const userId = resolveUserId(user);
    if (!userId) {
      if (guard()) {
        setPreferencesLoading(false);
        setPreferencesError('');
        setChannel(null);
      }
      return;
    }

    if (guard()) {
      setPreferencesLoading(true);
      setPreferencesError('');
    }

    const [preferencesResult, channelResult, postsResult, rewardsResult] = await Promise.allSettled([
      api.get('/profile/preferences'),
      getChannelByUser(userId),
      api.get(`/posts/mine?userId=${userId}&limit=1&page=1`),
      api.get(`/rewards/user/${userId}`)
    ]);

    if (!guard()) return;

    if (preferencesResult.status === 'fulfilled' && preferencesResult.value) {
      const preferencesData = preferencesResult.value;
      setPreferences({
        location: preferencesData.location || '',
        minPrice: preferencesData.minPrice || '',
        maxPrice: preferencesData.maxPrice || '',
        categories: preferencesData.categories || []
      });
    } else {
      setPreferencesError('Recommendation preferences are temporarily unavailable. Please retry.');
    }

    if (channelResult.status === 'fulfilled') {
      setChannel(channelResult.value || null);
    } else {
      setChannel(null);
    }

    const postsData = postsResult.status === 'fulfilled'
      ? postsResult.value
      : { total: 0, posts: [] };
    const rewardsData = rewardsResult.status === 'fulfilled'
      ? rewardsResult.value
      : { tier: 'Bronze' };

    const postCount = postsData?.total || (Array.isArray(postsData?.posts) ? postsData.posts.length : 0);
    const rank = rewardsData?.tier || 'Bronze';
    const memberDays = user?.created_at
      ? Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    setUserStats({ postCount, rank, memberDays });
    setPreferencesLoading(false);
  }, [resolveUserId, user]);

  useEffect(() => {
    let active = true;
    loadPreferencePanel({ guard: () => active });
    return () => {
      active = false;
    };
  }, [loadPreferencePanel]);

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({ ...prev, [name]: value }));
  };

  const handlePrefChange = (e) => {
    const { name, value } = e.target;
    setPreferences(prev => ({ ...prev, [name]: value }));
  };

  const handleRetryPreferencePanel = () => {
    loadPreferencePanel();
    loadCategoryOptions({ force: true });
  };

  const handleContactsSync = useCallback(async () => {
    const profileUserId = user?.user_id || user?.id;
    if (!profileUserId) {
      setContactsSyncError('Profile data is unavailable. Reload your profile and try again.');
      return;
    }

    setContactsSyncLoading(true);
    setContactsSyncError('');
    toast({ title: 'Syncing Contacts...', description: 'Please allow access if prompted.' });

    try {
      const { syncNativeContacts } = await import('../services/mobileContacts');
      const result = await syncNativeContacts(profileUserId);
      if (result?.skipped) {
        if (result.reason === 'web-platform') {
          setContactsSyncError('Contact sync is available in the native app.');
          return;
        }
        if (result.reason === 'permission-denied') {
          setContactsSyncError('Contacts permission is required to continue.');
          return;
        }
        setContactsSyncError('No syncable contacts were found. Please retry later.');
        return;
      }

      toast({ title: 'Sync Complete', description: 'Your contacts have been processed.' });
    } catch (syncError) {
      console.error('[Profile] Contact sync failed:', syncError);
      setContactsSyncError('Unable to sync contacts right now. Please retry.');
    } finally {
      setContactsSyncLoading(false);
    }
  }, [toast, user?.id, user?.user_id]);

  const validateEdit = () => {
    const errors = {};
    if (!editData.full_name || editData.full_name.length < 2) errors.full_name = 'Name must be at least 2 characters';
    if (editData.phone && !/^[6-9][0-9]{9}$/.test(editData.phone)) errors.phone = 'Invalid phone number';
    return errors;
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const errors = validateEdit();
    setEditErrors(errors);
    if (Object.keys(errors).length > 0) return;
    try {
      const updated = await api.post('/profile/update', { ...editData });

      setUser((prev) => {
        const nextUser = { ...prev, ...updated };
        localStorage.setItem('userProfile', JSON.stringify(nextUser));
        localStorage.setItem('user', JSON.stringify(nextUser));
        setAuthUser(nextUser);
        return nextUser;
      });
      setEditMode(false);
      toast({ title: 'Profile updated successfully!' });

    } catch (err) {
      setEditErrors({ form: err.message || 'Update failed' });
    }
  };

  const handlePrefSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = await api.post('/profile/preferences/update', { ...preferences });

      // Update local state with the saved preferences from the response
      setPreferences({
        location: data.location || '',
        minPrice: data.min_price || data.minPrice || '',
        maxPrice: data.max_price || data.maxPrice || '',
        categories: data.categories || []
      });
      setEditPrefMode(false);
      toast({ title: 'Preferences saved!', description: 'Your recommendations will now be personalized.' });

    } catch (err) {
      toast({ title: 'Error saving preferences', description: err.message, variant: 'destructive' });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-100">
        <div className="w-full max-w-md px-4">
          <PageLoadingState
            title={t('loading') || 'Loading...'}
            description={t('profile_auth_loading_desc') || 'Checking your account session.'}
            marker="loading"
          />
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    // ... (Login prompt UI same as before)
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700" style={{ paddingBottom: '120px' }}>
        {/* ... */}

        <div className="pt-16 pb-12 px-6 text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-2xl">
            <User className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">{t('profile') || 'Profile'}</h1>
          <p className="text-white/80 text-lg max-w-md mx-auto">
            {t('profile_desc') || 'Manage your account, preferences, and settings'}
          </p>
        </div>

        {/* Login/Signup Cards - Styled like MyRecommendations/MyPosts */}
        <div className="max-w-lg mx-auto px-6 space-y-4">
          <Link
            to="/login?returnTo=%2Fprofile"
            className="block bg-white rounded-2xl p-6 shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg">
                <CheckCircle className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900">{t('login') || 'Login'}</h3>
                <p className="text-gray-500 text-sm">{t('login_desc') || 'Already have an account? Sign in here'}</p>
              </div>
              <ChevronRight className="w-6 h-6 text-gray-400" />
            </div>
          </Link>

          <Link
            to="/signup?returnTo=%2Fprofile"
            className="block bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-xl hover:shadow-2xl hover:bg-white/20 hover:scale-[1.02] transition-all duration-300"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center shadow-lg">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white">{t('signup') || 'Create Account'}</h3>
                <p className="text-white/70 text-sm">{t('signup_desc') || 'New user? Join us in just a few steps'}</p>
              </div>
              <ChevronRight className="w-6 h-6 text-white/60" />
            </div>
          </Link>
        </div>

        {/* Features Grid */}
        <div className="max-w-lg mx-auto px-6 mt-10">
          <p className="text-center text-white/60 text-sm mb-6">{t('features') || 'Features you unlock with an account'}</p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: Star, label: 'Wishlist' },
              { icon: Bell, label: 'Alerts' },
              { icon: Settings, label: 'Settings' }
            ].map((item, i) => (
              <div key={i} className="bg-white/10 rounded-xl p-4 text-center">
                <item.icon className="w-6 h-6 mx-auto mb-2 text-white/80" />
                <p className="text-white/80 text-xs font-medium">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-100">
        <div className="w-full max-w-md px-4">
          <PageLoadingState
            title={t('loading_profile') || 'Loading profile...'}
            description={t('profile_loading_desc') || 'Fetching your profile details.'}
            marker="loading"
          />
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-100">
        <div className="w-full max-w-md px-4">
          <PageErrorState
            title={t('profile_not_found') || 'Profile not found'}
            description={error || (t('profile_unavailable_desc') || 'We could not load your profile right now. Please retry.')}
            onRetry={loadProfile}
            retryLabel={t('retry') || 'Retry'}
            marker="error"
          />
        </div>
      </div>
    );
  }

  const profileData = user;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900" style={{ paddingBottom: '180px' }}>
      {/* Premium Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />

        <div className="relative max-w-4xl mx-auto px-4 py-12 sm:px-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Avatar with Upload */}
            <div className="relative group">
              <Avatar className="h-28 w-28 ring-4 ring-white/30 shadow-xl">
                {profileData.avatar_url ? (
                  <AvatarImage src={profileData.avatar_url} />
                ) : (
                  <AvatarFallback className="text-3xl font-bold text-white bg-gradient-to-br from-blue-500 to-indigo-600">
                    {profileData.name?.split(' ').map(n => n[0]).join('') || profileData.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                  </AvatarFallback>
                )}
              </Avatar>
              <input
                type="file"
                id="avatar-upload"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const formData = new FormData();
                  formData.append('avatar', file);
                  try {
                    const data = await api.post('/profile/upload-avatar', formData, {
                      headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    if (data?.avatar_url) {
                      setUser((prev) => {
                        const nextUser = { ...prev, avatar_url: data.avatar_url };
                        localStorage.setItem('userProfile', JSON.stringify(nextUser));
                        localStorage.setItem('user', JSON.stringify(nextUser));
                        setAuthUser(nextUser);
                        return nextUser;
                      });
                      toast({ title: 'Profile picture updated!' });
                    } else {
                      toast({ title: 'Upload failed', variant: 'destructive' });
                    }
                  } catch (err) {
                    toast({ title: 'Upload error', variant: 'destructive' });
                  }
                }}
              />
              <button
                onClick={() => document.getElementById('avatar-upload')?.click()}
                className="absolute bottom-0 right-0 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition group-hover:bg-blue-50"
              >
                <Camera className="w-5 h-5 text-blue-600" />
              </button>
            </div>

            {/* User Info */}
            <div className="text-center md:text-left flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">{profileData.name || profileData.full_name}</h1>
              <p className="text-white/80 mb-3">{profileData.email}</p>
              <div className="flex flex-wrap justify-center md:justify-start gap-2">
                <Badge className="bg-white/20 text-white border-0">
                  <Shield className="w-3 h-3 mr-1" /> {profileData.verified ? t('verified') || 'Verified' : t('unverified')}
                </Badge>
                <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0">
                  <Star className="w-3 h-3 mr-1" /> {t(profileData.role?.toLowerCase()) || profileData.role || t('member')}
                </Badge>
                {channel && (
                  <Badge className="bg-purple-500 text-white border-0">
                    <Sparkles className="w-3 h-3 mr-1" /> {t('channel_owner')}
                  </Badge>
                )}
              </div>
            </div>

            {/* Edit Button & Sale Actions */}
            <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-0">
              <Button
                onClick={() => navigate('/saledone')}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-lg"
              >
                <CheckCircle className="w-4 h-4 mr-2" /> {t('btn_sale_done') || 'Sale Done'}
              </Button>
              <Button
                onClick={() => navigate('/saleundone')}
                variant="destructive"
                className="bg-rose-500 hover:bg-rose-600 text-white font-bold shadow-lg"
              >
                <XCircle className="w-4 h-4 mr-2" /> {t('btn_sale_undone') || 'Sale Undone'}
              </Button>
              <Button onClick={() => setEditMode(true)} className="bg-white text-indigo-600 hover:bg-white/90 font-bold shadow-lg">
                <Edit className="w-4 h-4 mr-2" /> {t('edit_profile')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="max-w-4xl mx-auto px-4 -mt-8 mb-8 relative z-10">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="bg-white dark:bg-gray-800 border-0 shadow-xl">
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-6 h-6 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{userStats.postCount}</p>
              <p className="text-xs text-gray-500">{t('posts_count')}</p>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-gray-800 border-0 shadow-xl">
            <CardContent className="p-4 text-center">
              <Award className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{userStats.rank}</p>
              <p className="text-xs text-gray-500">{t('rank')}</p>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-gray-800 border-0 shadow-xl">
            <CardContent className="p-4 text-center">
              <Calendar className="w-6 h-6 mx-auto mb-2 text-blue-500" />
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{userStats.memberDays}</p>
              <p className="text-xs text-gray-500">{t('days')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions - My Home & My Feed */}
        <div className="grid grid-cols-2 gap-4">
          <Button
            onClick={() => navigate('/my-home')}
            className="h-auto py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg rounded-xl flex items-center justify-center gap-3 transition-transform hover:scale-[1.02]"
          >
            <LayoutDashboard className="w-6 h-6" />
            <div className="text-left">
              <p className="font-bold text-lg">{t('my_home')}</p>
              <p className="text-xs text-blue-100 font-normal">{t('access_dashboard')}</p>
            </div>
          </Button>

          <Button
            onClick={() => navigate('/my-feed')}
            className="h-auto py-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg rounded-xl flex items-center justify-center gap-3 transition-transform hover:scale-[1.02]"
          >
            <Rss className="w-6 h-6" />
            <div className="text-left">
              <p className="font-bold text-lg">{t('my_feed')}</p>
              <p className="text-xs text-indigo-100 font-normal">{t('view_feed')}</p>
            </div>
          </Button>

          <Button
            onClick={() => navigate(`/reviews/${user?.user_id}`)}
            className="h-auto py-4 bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white shadow-lg rounded-xl flex items-center justify-center gap-3 transition-transform hover:scale-[1.02]"
          >
            <Star className="w-6 h-6" />
            <div className="text-left">
              <p className="font-bold text-lg">My Reviews</p>
              <p className="text-xs text-yellow-100 font-normal">View reputation</p>
            </div>
          </Button>

          <Button
            onClick={() => navigate('/offers')}
            className="h-auto py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg rounded-xl flex items-center justify-center gap-3 transition-transform hover:scale-[1.02]"
          >
            <CreditCard className="w-6 h-6" />
            <div className="text-left">
              <p className="font-bold text-lg">My Offers</p>
              <p className="text-xs text-green-100 font-normal">Manage deals</p>
            </div>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 pb-12">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full flex bg-white dark:bg-gray-800 rounded-2xl p-1 shadow-lg mb-6">
            <TabsTrigger value="personal" className="flex-1 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white py-3 font-semibold">
              <User className="w-4 h-4 mr-2" /> {t('personal')}
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex-1 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white py-3 font-semibold">
              <Settings className="w-4 h-4 mr-2" /> {t('preferences')}
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex-1 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white py-3 font-semibold">
              <Lock className="w-4 h-4 mr-2" /> {t('settings')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal">
            <Card className="bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" /> {t('personal_information') || 'Personal Information'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {editMode ? (
                  <form onSubmit={handleEditSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="full_name">{t('full_name') || 'Full Name'}</Label>
                      <Input id="full_name" name="full_name" value={editData.full_name} onChange={handleEditChange} className="mt-1" />
                      {editErrors.full_name && <p className="text-red-500 text-sm mt-1">{editErrors.full_name}</p>}
                    </div>
                    <div>
                      <Label htmlFor="phone">{t('phone') || 'Phone'}</Label>
                      <Input id="phone" name="phone" value={editData.phone} onChange={handleEditChange} className="mt-1" />
                      {editErrors.phone && <p className="text-red-500 text-sm mt-1">{editErrors.phone}</p>}
                    </div>
                    <div>
                      <Label htmlFor="address">{t('address') || 'Address'}</Label>
                      <Input id="address" name="address" value={editData.address} onChange={handleEditChange} className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="bio">{t('bio') || 'Bio'}</Label>
                      <Input id="bio" name="bio" value={editData.bio} onChange={handleEditChange} className="mt-1" placeholder={t('about_yourself') || 'Tell us about yourself...'} />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <Button type="submit" className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600">{t('save_changes') || 'Save Changes'}</Button>
                      <Button type="button" variant="outline" onClick={() => setEditMode(false)}>{t('cancel') || 'Cancel'}</Button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                      <div className="flex items-center gap-3 mb-2">
                        <User className="w-5 h-5 text-blue-500" />
                        <span className="text-sm text-gray-500">{t('full_name') || 'Full Name'}</span>
                      </div>
                      <p className="font-semibold text-gray-800 dark:text-white">{profileData.name || profileData.full_name || '-'}</p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                      <div className="flex items-center gap-3 mb-2">
                        <Mail className="w-5 h-5 text-blue-500" />
                        <span className="text-sm text-gray-500">{t('email') || 'Email'}</span>
                      </div>
                      <p className="font-semibold text-gray-800 dark:text-white">{profileData.email || '-'}</p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                      <div className="flex items-center gap-3 mb-2">
                        <Phone className="w-5 h-5 text-blue-500" />
                        <span className="text-sm text-gray-500">{t('phone') || 'Phone'}</span>
                      </div>
                      <p className="font-semibold text-gray-800 dark:text-white">{profileData.phone || '-'}</p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                      <div className="flex items-center gap-3 mb-2">
                        <MapPin className="w-5 h-5 text-blue-500" />
                        <span className="text-sm text-gray-500">{t('address') || 'Address'}</span>
                      </div>
                      <p className="font-semibold text-gray-800 dark:text-white">{profileData.address || '-'}</p>
                    </div>
                  </div>
                )}

                {/* User ID Display - For SaleDone */}
                <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('your_user_id')}</p>
                        <p className="font-bold text-indigo-700 dark:text-indigo-300 font-mono text-lg">
                          {profileData.user_id || user?.user_id || '-'}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const userId = profileData.user_id || user?.user_id;
                        if (userId) {
                          navigator.clipboard.writeText(String(userId));
                          toast({ title: "📋 Copied!", description: "User ID copied to clipboard" });
                        }
                      }}
                      className="border-indigo-300 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-900/30"
                    >
                      <Copy className="w-4 h-4 mr-1" /> {t('copy') || 'Copy'}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">💡 {t('use_id_for_forms')}</p>
                </div>

                {/* Verification Status */}
                <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-green-800 dark:text-green-300">{t('verification_status')}</p>
                        <p className="text-sm text-green-600 dark:text-green-400">{profileData.verified ? (t('account_verified') || 'Your account is verified') : (t('verify_for_features') || 'Verify your account for more features')}</p>
                      </div>
                    </div>
                    {!profileData.verified && (
                      <Button size="sm" className="bg-green-600 hover:bg-green-700">{t('verify_now')}</Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences">
            <Card className="bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-600" /> {t('recommendation_preferences') || 'Recommendation Preferences'}
                </CardTitle>
                <Button size="sm" variant="outline" onClick={() => setEditPrefMode(!editPrefMode)}>
                  {editPrefMode ? (t('cancel') || 'Cancel') : (t('edit') || 'Edit')}
                </Button>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 mb-6">{t('preferences_desc') || 'These preferences are used to show personalized recommendations on your feed.'}</p>

                {preferencesLoading ? (
                  <PageLoadingState
                    title="Loading recommendation preferences"
                    description="Fetching your current preference settings."
                    marker="profile-preferences-loading"
                  />
                ) : preferencesError ? (
                  <PageErrorState
                    title="Recommendation preferences unavailable"
                    description={preferencesError}
                    onRetry={handleRetryPreferencePanel}
                    retryLabel="Retry"
                    marker="profile-preferences-error"
                    secondaryAction={(
                      <Button
                        variant="outline"
                        data-ux-action="profile_preferences_clear_error"
                        onClick={() => setPreferencesError('')}
                      >
                        Continue anyway
                      </Button>
                    )}
                  />
                ) : editPrefMode ? (
                  <form onSubmit={handlePrefSubmit} className="space-y-4">
                    <div>
                      <Label>{t('preferred_location') || 'Preferred Location'}</Label>
                      <select name="location" value={preferences.location} onChange={handlePrefChange} className="w-full mt-1 p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600">
                        <option value="">{t('any_location') || 'Any Location'}</option>
                        <option value="Delhi">Delhi</option>
                        <option value="Mumbai">Mumbai</option>
                        <option value="Bangalore">Bangalore</option>
                        <option value="Chennai">Chennai</option>
                        <option value="Kolkata">Kolkata</option>
                        <option value="Hyderabad">Hyderabad</option>
                      </select>
                    </div>
                    <div>
                      <Label>{t('preferred_categories') || 'Preferred Categories'}</Label>
                      <p className="text-sm text-gray-500 mb-2">{t('select_categories_desc') || 'Select categories to see in For You page'}</p>
                      {categoriesLoading ? (
                        <PageLoadingState
                          title="Loading categories"
                          description="Getting category options for personalization."
                          marker="profile-categories-loading"
                        />
                      ) : categoriesError ? (
                        <PageErrorState
                          title="Category options unavailable"
                          description={categoriesError}
                          onRetry={() => loadCategoryOptions({ force: true })}
                          retryLabel="Retry"
                          marker="profile-categories-error"
                          secondaryAction={(
                            <Button
                              variant="outline"
                              data-ux-action="profile_categories_retry"
                              onClick={() => loadCategoryOptions({ force: true })}
                            >
                              Retry categories
                            </Button>
                          )}
                        />
                      ) : availableCategories.length === 0 ? (
                        <PageEmptyState
                          title="No categories available"
                          description="Try again in a moment to load category options."
                          marker="profile-categories-empty"
                          action={(
                            <Button
                              variant="outline"
                              data-ux-action="profile_categories_retry"
                              onClick={() => loadCategoryOptions({ force: true })}
                            >
                              Retry categories
                            </Button>
                          )}
                        />
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {availableCategories.map(cat => (
                            <label
                              key={cat.category_id || cat.name}
                              className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${preferences.categories?.includes(cat.name) ? 'bg-blue-100 border-blue-500 dark:bg-blue-900/30 dark:border-blue-400' : 'bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600 hover:border-blue-300'}`}
                            >
                              <input
                                type="checkbox"
                                checked={preferences.categories?.includes(cat.name) || false}
                                onChange={(e) => {
                                  const catName = cat.name;
                                  setPreferences(prev => ({
                                    ...prev,
                                    categories: e.target.checked
                                      ? [...(prev.categories || []), catName]
                                      : (prev.categories || []).filter(c => c !== catName)
                                  }));
                                }}
                                className="w-4 h-4 text-blue-600"
                              />
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{cat.name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>{t('min_price') || 'Min Price'} (₹)</Label>
                        <Input name="minPrice" type="number" value={preferences.minPrice} onChange={handlePrefChange} className="mt-1" placeholder="0" />
                      </div>
                      <div>
                        <Label>{t('max_price') || 'Max Price'} (₹)</Label>
                        <Input name="maxPrice" type="number" value={preferences.maxPrice} onChange={handlePrefChange} className="mt-1" placeholder="100000" />
                      </div>
                    </div>
                    <Button type="submit" className="w-full bg-gradient-to-r from-blue-500 to-indigo-600">{t('save_preferences') || 'Save Preferences'}</Button>
                  </form>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-center">
                        <MapPin className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                        <p className="text-sm text-gray-500">{t('location') || 'Location'}</p>
                        <p className="font-bold text-gray-800 dark:text-white">{preferences.location || (t('any') || 'Any')}</p>
                      </div>
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl text-center">
                        <p className="text-sm text-gray-500 mb-1">{t('min_price') || 'Min Price'}</p>
                        <p className="font-bold text-gray-800 dark:text-white text-xl">₹{preferences.minPrice || '0'}</p>
                      </div>
                      <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-center">
                        <p className="text-sm text-gray-500 mb-1">{t('max_price') || 'Max Price'}</p>
                        <p className="font-bold text-gray-800 dark:text-white text-xl">₹{preferences.maxPrice || '∞'}</p>
                      </div>
                    </div>

                    {/* Display selected categories */}
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                      <p className="text-sm text-gray-500 mb-2">{t('preferred_categories') || 'Preferred Categories'}</p>
                      {preferences.categories && preferences.categories.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {preferences.categories.map(cat => (
                            <Badge key={cat} className="bg-indigo-100 text-indigo-700 dark:bg-indigo-800 dark:text-indigo-200 border-0 px-3 py-1">
                              {cat}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-400 italic">{t('no_categories_selected') || 'No categories selected - showing all'}</p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-blue-600" /> {t('account_settings') || 'Account Settings'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Find Friends (Native Contacts Sync) */}
                {contactsSyncLoading && (
                  <PageLoadingState
                    title="Syncing contacts"
                    description="Checking permissions and syncing your contacts."
                    marker="profile-settings-contacts-loading"
                  />
                )}

                {contactsSyncError && (
                  <PageErrorState
                    title="Contact sync unavailable"
                    description={contactsSyncError}
                    onRetry={handleContactsSync}
                    retryLabel="Retry sync"
                    marker="profile-settings-contacts-error"
                    secondaryAction={(
                      <Button
                        variant="outline"
                        data-ux-action="profile_contacts_sync_dismiss_error"
                        onClick={() => setContactsSyncError('')}
                      >
                        Dismiss
                      </Button>
                    )}
                  />
                )}

                <button
                  type="button"
                  data-ux-action="profile_contacts_sync_start"
                  onClick={handleContactsSync}
                  disabled={contactsSyncLoading}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition disabled:opacity-60 disabled:cursor-not-allowed text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <User className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-white">{t('find_friends') || 'Find Friends'}</p>
                      <p className="text-sm text-gray-500">{t('sync_contacts_desc') || 'Sync contacts to connect with friends'}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>

                {[
                  { icon: Shield, labelKey: 'security_settings', descKey: 'two_factor_auth', action: 'Setup', link: '/security' },
                  { icon: Bell, labelKey: 'notifications', descKey: 'manage_push_notifications', action: 'Configure' },
                  { icon: Lock, labelKey: 'privacy_security', descKey: 'password_login_settings', action: 'Manage' },
                  { icon: CreditCard, labelKey: 'payment_methods', descKey: 'add_remove_payment_options', action: 'Update' },
                ].map((item, i) => (
                  <div
                    key={i}
                    onClick={() => item.link && navigate(item.link)}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <item.icon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 dark:text-white">{t(item.labelKey) || item.labelKey}</p>
                        <p className="text-sm text-gray-500">{t(item.descKey) || item.descKey}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                ))}

                {/* Language Selector */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-white">{t('language') || 'Language'}</p>
                      <p className="text-sm text-gray-500">{t('choose_language') || 'Choose your preferred language'}</p>
                    </div>
                    <LanguageSelector />
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="mt-8 p-4 border-2 border-red-200 dark:border-red-800 rounded-xl">
                  <p className="font-semibold text-red-600 mb-2">{t('danger_zone') || 'Danger Zone'}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">{t('delete_account_desc') || 'Delete your account permanently'}</p>
                    <Button variant="destructive" size="sm">{t('delete_account') || 'Delete Account'}</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Profile;
