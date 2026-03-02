import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { translatePosts } from '@/utils/translateContent';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
    Eye,
    Heart,
    Edit,
    Trash2,
    Plus,
    ShoppingBag,
    Package,
    CheckCircle2,
    MapPin,
    XCircle,
    MoreVertical,
    Share2,
    ArrowLeft,
    Search,
    CheckSquare,
    Square,
    Sparkles,
    ChevronRight,
    Copy,
    AlertTriangle,
    RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/context/AuthContext';
import { getAccessToken, getUserId } from '@/utils/authStorage';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import api from '@/services/api'; // Import central API service
import { getApiOriginBase } from '@/lib/networkConfig';

const MyHome = () => {
    // ... (state remains same)
    const [activeTab, setActiveTab] = useState('active');
    const [selectedPosts, setSelectedPosts] = useState(new Set());
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showSaleUndoneDialog, setShowSaleUndoneDialog] = useState(false);
    const [selectedPostForDelete, setSelectedPostForDelete] = useState(null);
    const [postsMovedToUndone, setPostsMovedToUndone] = useState(new Set());
    const [posts, setPosts] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [retryNonce, setRetryNonce] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;
    const [searchTerm, setSearchTerm] = useState("");
    const sortKey = "postedDate";
    const sortOrder = "desc";
    const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
    const [selectAll, setSelectAll] = useState(false);
    const navigate = useNavigate();
    const { toast } = useToast();
    const { t, i18n } = useTranslation();
    const { user: authUser } = useAuth();
    const currentLang = i18n.language || 'en';
    const resolvedUserId = getUserId(authUser);
    const authToken = getAccessToken();
    const isLoggedIn = Boolean(resolvedUserId && authToken);

    // Helper to get full image URL
    const baseUrl = getApiOriginBase();
    const getImageUrl = (img) => {
        if (!img) return '/placeholder.svg';
        if (img.startsWith('/uploads/')) return baseUrl + img;
        if (img.startsWith('http')) return img;
        return '/placeholder.svg';
    };

    // Fetch ALL posts for this user (no status filter) to get correct stats
    useEffect(() => {
        let cancelled = false;

        const fetchPosts = async () => {
            setLoading(true);
            const userId = resolvedUserId;
            const token = authToken;
            if (!userId || !token) {
                if (!cancelled) {
                    setError('You must be logged in to view your posts.');
                    setLoading(false);
                }
                return;
            }

            try {
                const data = await api.get(`/posts/mine?userId=${userId}`);
                const rawPosts = Array.isArray(data?.posts) ? data.posts : Array.isArray(data) ? data : [];

                let nextPosts = rawPosts;
                if (currentLang !== 'en' && rawPosts.length > 0) {
                    try {
                        nextPosts = await translatePosts(rawPosts, currentLang);
                    } catch {
                        nextPosts = rawPosts;
                    }
                }

                if (!cancelled) {
                    setPosts(nextPosts);
                    setError('');
                }
            } catch (err) {
                console.error("Fetch posts error:", err);
                if (!cancelled) {
                    setPosts([]);
                    const status = Number(err?.status || err?.response?.status || 0);
                    if (status === 401 || status === 403) {
                        setError('Your session expired. Please sign in again.');
                    } else {
                        setError('Could not load your listings. Please retry.');
                    }
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        fetchPosts();
        return () => {
            cancelled = true;
        };
    }, [authToken, currentLang, resolvedUserId, retryNonce]);

    const retryFetchPosts = useCallback(() => {
        setRetryNonce((value) => value + 1);
    }, []);

    const allPosts = useMemo(() => (Array.isArray(posts) ? posts : []), [posts]);
    const boughtPosts = useMemo(
        () => allPosts.filter((post) => String(post?.ownership || '').toLowerCase() === 'bought'),
        [allPosts]
    );
    const ownPosts = useMemo(
        () => allPosts.filter((post) => String(post?.ownership || 'own').toLowerCase() !== 'bought'),
        [allPosts]
    );
    const soldPosts = useMemo(() => ownPosts.filter((post) => post.status === 'sold'), [ownPosts]);
    const activePosts = useMemo(() => ownPosts.filter((post) => post.status === 'active'), [ownPosts]);

    const visiblePosts = useMemo(() => {
        const tabFilteredPosts = activeTab === 'all'
            ? allPosts
            : activeTab === 'active'
                ? activePosts
                : activeTab === 'sold'
                    ? soldPosts
                    : activeTab === 'bought'
                        ? boughtPosts
                        : allPosts;

        const normalizedSearchTerm = searchTerm.trim().toLowerCase();
        const searchedPosts = normalizedSearchTerm
            ? tabFilteredPosts.filter((post) =>
                post.title?.toLowerCase().includes(normalizedSearchTerm) ||
                post.location?.toLowerCase().includes(normalizedSearchTerm)
            )
            : tabFilteredPosts;

        const getSortValue = (post) => {
            if (sortKey === 'postedDate') {
                return new Date(post.postedDate || post.created_at || 0).getTime();
            }

            const rawValue = post?.[sortKey] ?? post?.created_at ?? 0;
            return typeof rawValue === 'string' ? rawValue.toLowerCase() : rawValue;
        };

        return [...searchedPosts].sort((a, b) => {
            const aValue = getSortValue(a);
            const bValue = getSortValue(b);

            if (aValue === bValue) return 0;
            if (sortOrder === 'asc') {
                return aValue > bValue ? 1 : -1;
            }
            return aValue < bValue ? 1 : -1;
        });
    }, [activeTab, activePosts, allPosts, boughtPosts, searchTerm, soldPosts, sortKey, sortOrder]);

    const totalPages = useMemo(
        () => Math.max(1, Math.ceil(visiblePosts.length / pageSize)),
        [visiblePosts.length, pageSize]
    );

    useEffect(() => {
        setCurrentPage((prevPage) => Math.min(Math.max(prevPage, 1), totalPages));
    }, [totalPages]);

    const paginatedPosts = useMemo(
        () => visiblePosts.slice((currentPage - 1) * pageSize, currentPage * pageSize),
        [visiblePosts, currentPage, pageSize]
    );

    const handleSaleDone = () => navigate('/saledone');

    const isEditAvailable = (postedTime) => {
        const now = new Date();
        const diffInMinutes = (now - new Date(postedTime)) / (1000 * 60);
        return diffInMinutes <= 5;
    };

    const handleViewPost = (post) => navigate(`/post/${post.postId || post.post_id || post.id}`);

    const handleEditPost = (post) => {
        if (!isEditAvailable(post.created_at || post.postedTime)) {
            toast({ title: "Edit Not Available", description: "Posts can only be edited within 5 minutes of publishing", variant: "destructive" });
            return;
        }
        toast({ title: "Edit Post", description: `Opening editor for post` });
        navigate(`/edit-post/${post.postId || post.post_id || post.id}`);
    };

    const handleSharePost = (post) => {
        const shareUrl = `${window.location.origin}/post/${post.postId || post.post_id || post.id}`;
        navigator.clipboard.writeText(shareUrl).then(() => {
            toast({ title: "Link Copied", description: "Post link copied to clipboard" });
        }).catch(() => {
            toast({ title: "Share Failed", description: "Unable to copy link", variant: "destructive" });
        });
    };

    const confirmDeletePost = (postId) => {
        setSelectedPostForDelete(postId);
        setShowDeleteDialog(true);
    };

    const handleDeletePost = async () => {
        if (selectedPostForDelete) {
            try {
                // Use api.delete
                await api.delete(`/posts/${selectedPostForDelete}`);

                setPosts(posts => posts.filter(post => (post.postId || post.post_id || post.id) !== selectedPostForDelete));
                toast({ title: "Post Deleted", description: "Post has been deleted successfully" });
            } catch (error) {
                console.error('Delete error:', error);
                toast({ title: "Delete Failed", description: error.message || "Could not delete the post.", variant: "destructive" });
            } finally {
                setSelectedPostForDelete(null);
                setShowDeleteDialog(false);
            }
        }
    };

    const handleSaleUndone = () => {
        const newMovedPosts = new Set([...postsMovedToUndone, ...selectedPosts]);
        setPostsMovedToUndone(newMovedPosts);
        toast({ title: "Posts Moved", description: `${selectedPosts.size} posts moved to Sale Undone` });
        setSelectedPosts(new Set());
        setShowSaleUndoneDialog(false);
        navigate('/saleundone');
    };

    const togglePostSelection = (postId) => {
        if (postsMovedToUndone.has(postId)) {
            toast({ title: "Cannot Select", description: "This post has already been moved to Sale Undone", variant: "destructive" });
            return;
        }
        const newSelected = new Set(selectedPosts);
        if (newSelected.has(postId)) newSelected.delete(postId);
        else newSelected.add(postId);
        setSelectedPosts(newSelected);
    };

    const toggleSelectAll = () => {
        if (selectAll) {
            setSelectedPosts(new Set());
        } else {
            const activePostIds = activePosts.map((post) => post.postId || post.post_id || post.id);
            setSelectedPosts(new Set(activePostIds));
        }
        setSelectAll(!selectAll);
    };

    const handleBulkDelete = async () => {
        if (selectedPosts.size === 0) {
            toast({ title: "No Posts Selected", description: "Please select posts to delete", variant: "destructive" });
            return;
        }

        try {
            const selectedIds = Array.from(selectedPosts);
            const deleteResults = await Promise.allSettled(
                selectedIds.map((postId) =>
                    api.delete(`/posts/${postId}`).then(() => postId)
                )
            );

            const successfulIds = deleteResults
                .filter((result) => result.status === 'fulfilled')
                .map((result) => result.value);
            const failedCount = deleteResults.length - successfulIds.length;

            if (successfulIds.length > 0) {
                const successfulSet = new Set(successfulIds);
                setPosts((existingPosts) =>
                    existingPosts.filter((post) => !successfulSet.has(post.postId || post.post_id || post.id))
                );
                setSelectedPosts((prevSelected) => {
                    const nextSelected = new Set(prevSelected);
                    successfulIds.forEach((id) => nextSelected.delete(id));
                    return nextSelected;
                });
            }

            if (failedCount === 0) {
                setSelectAll(false);
                setShowBulkDeleteDialog(false);
                toast({ title: "Posts Deleted", description: `${successfulIds.length} posts have been deleted` });
            } else {
                toast({
                    title: "Partial Delete",
                    description: `${successfulIds.length} deleted, ${failedCount} failed.`,
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error('Bulk delete error:', error);
            toast({ title: "Delete Failed", description: "Some posts could not be deleted", variant: "destructive" });
        }
    };

    // --- LOADING STATE ---
    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-blue-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">{t('loading_posts')}</p>
                </div>
            </div>
        );
    }

    // --- MAIN RENDER ---
    if (!isLoggedIn) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700" style={{ paddingBottom: '120px' }}>
                {/* Hero Section */}
                <div className="pt-16 pb-12 px-6 text-center">
                    <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-2xl">
                        <Package className="w-12 h-12 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-3">{t('my_home_title')}</h1>
                    <p className="text-white/80 text-lg max-w-md mx-auto">
                        {t('manage_listings')}
                    </p>
                </div>

                {/* Login/Signup Cards */}
                <div className="max-w-lg mx-auto px-6 space-y-4">
                    <Link
                        to="/login"
                        state={{ returnTo: '/my-home' }}
                        className="block bg-white rounded-2xl p-6 shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg">
                                <CheckCircle2 className="w-7 h-7 text-white" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-gray-900">{t('login')}</h3>
                                <p className="text-gray-500 text-sm">{t('already_account')}</p>
                            </div>
                            <ChevronRight className="w-6 h-6 text-gray-400" />
                        </div>
                    </Link>

                    <Link
                        to="/signup"
                        className="block bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-xl hover:shadow-2xl hover:bg-white/20 hover:scale-[1.02] transition-all duration-300"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center shadow-lg">
                                <Sparkles className="w-7 h-7 text-white" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-white">{t('signup')}</h3>
                                <p className="text-white/70 text-sm">{t('new_user')}</p>
                            </div>
                            <ChevronRight className="w-6 h-6 text-white/60" />
                        </div>
                    </Link>
                </div>
            </div>
        );
    }

    if (error && allPosts.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 pt-28">
                <Card className="max-w-xl mx-auto border-red-200">
                    <CardContent className="p-8 text-center">
                        <div className="w-12 h-12 mx-auto rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-3">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            Listings unavailable
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">{error}</p>
                        <div className="flex flex-wrap justify-center gap-2">
                            <Button onClick={retryFetchPosts}>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Retry
                            </Button>
                            <Button variant="outline" onClick={() => navigate('/all-posts')}>
                                Browse Marketplace
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300 pt-20">
            {/* Premium Header */}
            <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0YzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />

                <div className="relative max-w-4xl mx-auto px-4 py-10 sm:px-6">
                    {/* Back Button */}
                    <button
                        onClick={() => navigate('/all-posts')}
                        className="absolute top-4 left-4 p-2 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-all z-50"
                    >
                        <ArrowLeft className="w-6 h-6 text-white" />
                    </button>

                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm mb-4">
                            <span className="text-3xl font-semibold text-white">MH</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{t('my_home_title')}</h1>
                        <p className="text-blue-100 text-lg">{t('my_home_subtitle')}</p>
                    </div>
                </div>
            </div>

            {/* Stats Dashboard */}
            <div className="max-w-4xl mx-auto px-4 -mt-8 mb-6 relative z-10">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <Package className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-800 dark:text-white">{allPosts.length}</p>
                                <p className="text-sm text-gray-500">{t('total_posts')}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <CheckCircle2 className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-800 dark:text-white">{activePosts.length}</p>
                                <p className="text-sm text-gray-500">{t('active')}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                                <ShoppingBag className="w-6 h-6 text-indigo-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-800 dark:text-white">{soldPosts.length}</p>
                                <p className="text-sm text-gray-500">{t('sold')}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                <Heart className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-800 dark:text-white">{boughtPosts.length}</p>
                                <p className="text-sm text-gray-500">{t('bought')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 pb-8">
                {error ? (
                    <Alert variant="destructive" className="mb-4 bg-white/90 dark:bg-gray-900/90">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Latest refresh failed</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                        <div className="mt-3">
                            <Button size="sm" onClick={retryFetchPosts}>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Retry
                            </Button>
                        </div>
                    </Alert>
                ) : null}

                {/* Tabs */}
                <div className="w-full flex justify-center gap-2 py-2 mb-4 overflow-x-auto">
                    {[
                        { label: t('all'), tab: 'all', color: 'bg-blue-600', count: allPosts.length },
                        { label: t('active'), tab: 'active', color: 'bg-green-500', count: activePosts.length },
                        { label: t('sold'), tab: 'sold', color: 'bg-blue-500', count: soldPosts.length },
                        { label: t('bought'), tab: 'bought', color: 'bg-purple-500', count: boughtPosts.length }
                    ].map((item) => (
                        <button
                            key={item.tab}
                            className={`flex-1 min-w-0 px-2 py-2 rounded-xl font-bold text-sm shadow-lg border-2 border-blue-300 dark:border-gray-600 focus:outline-none transition-all duration-150 ${activeTab === item.tab
                                ? `${item.color} text-white scale-105 drop-shadow-xl border-2 border-blue-700`
                                : 'bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-gray-700'
                                }`}
                            onClick={() => {
                                setActiveTab(item.tab);
                                setCurrentPage(1);
                            }}
                        >
                            {item.label}
                            <span className={`ml-1 ${item.color} text-white px-2 py-0.5 rounded text-xs`}>{item.count}</span>
                        </button>
                    ))}
                </div>

                {/* Search Bar */}
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder={t('search_posts_placeholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none transition-colors"
                    />
                </div>

                {/* Bulk Actions Bar - Only for Active posts (user can only manage their own active listings) */}
                {activeTab === 'active' && activePosts.length > 0 && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 mb-4 border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={toggleSelectAll}
                                    className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium hover:text-blue-700 transition-colors"
                                    title={t('select_all_tooltip')}
                                >
                                    {selectAll ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                                    {selectAll ? t('deselect_all') : t('select_all')}
                                </button>
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    {selectedPosts.size} {t('of')} {activePosts.length} {t('selected')}
                                </span>
                            </div>
                            {selectedPosts.size > 0 && (
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => setShowBulkDeleteDialog(true)}
                                    className="bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-lg"
                                >
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    {t('delete')} ({selectedPosts.size})
                                </Button>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            Tip: {t('bulk_selection_tip')}
                        </p>
                    </div>
                )}

                {/* Sale Done/Undone Buttons */}
                <div className="flex w-full gap-4 mb-6">
                    <Button className="flex-1 bg-green-500 text-white font-bold rounded-xl px-0 py-3 text-lg shadow hover:scale-105 transition-all hover:bg-green-600" onClick={handleSaleDone}>
                        <CheckCircle2 className="w-5 h-5 mr-2" />
                        {t('sale_done')}
                    </Button>
                    <Button className="flex-1 bg-orange-500 text-white font-bold rounded-xl px-0 py-3 text-lg shadow hover:scale-105 transition-all hover:bg-orange-600" onClick={() => navigate('/saleundone')}>
                        <XCircle className="w-5 h-5 mr-2" />
                        {t('sale_undone')}
                    </Button>
                </div>

                {/* Posts List */}
                <div className="w-full flex flex-col gap-6 pb-24 pt-20">
                    {visiblePosts.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="text-6xl mb-4">[]</div>
                            <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">{t('no_posts')}</h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-6">{t('start_selling')}</p>
                            <Button
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl"
                                onClick={() => navigate('/tier-selection')}
                            >
                                <Plus className="w-5 h-5 mr-2" />
                                {t('create_new_listing')}
                            </Button>
                        </div>
                    ) : (
                        paginatedPosts.map((post) => {
                            const isBoughtPost = String(post?.ownership || '').toLowerCase() === 'bought';
                            const displayStatus = isBoughtPost ? 'bought' : (post.status || 'active');
                            return (
                            <Card key={post.postId || post.post_id || post.id} className="shadow-xl border-0 rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300 bg-white dark:bg-gray-800">
                                <div className="flex flex-col">
                                    {/* Image Section */}
                                    <div className="relative">
                                        <img
                                            src={getImageUrl(post.image || post.images?.[0])}
                                            onError={e => { e.target.onerror = null; e.target.src = '/placeholder.svg'; }}
                                            alt={post.title}
                                            className="w-full h-40 md:h-48 object-cover"
                                        />
                                        <Badge className={`absolute top-3 left-3 ${displayStatus === 'active' ? 'bg-green-500' :
                                            displayStatus === 'sold' ? 'bg-blue-500' :
                                                displayStatus === 'bought' ? 'bg-purple-500' : 'bg-gray-500'
                                            } text-white font-bold px-3 py-1 text-sm capitalize`}>
                                            {displayStatus}
                                        </Badge>

                                        {/* Dropdown Menu */}
                                        <div className="absolute top-3 right-3">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="bg-gray-800/80 hover:bg-gray-700 shadow-lg rounded-full h-9 w-9 p-0 z-50"
                                                    >
                                                        <MoreVertical className="h-4 w-4 text-white" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48 bg-white dark:bg-gray-800 shadow-lg border rounded-xl">
                                                    <DropdownMenuItem onClick={() => handleEditPost(post)}>
                                                        <Edit className="w-4 h-4 mr-2" />
                                                        {t('edit_post')}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleSharePost(post)}>
                                                        <Share2 className="w-4 h-4 mr-2" />
                                                        {t('share_post')}
                                                    </DropdownMenuItem>
                                                    {!isBoughtPost && (
                                                        <DropdownMenuItem
                                                            onClick={() => confirmDeletePost(post.postId || post.post_id || post.id)}
                                                            className="text-red-600"
                                                        >
                                                            <Trash2 className="w-4 h-4 mr-2" />
                                                            {t('delete')}
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>

                                    {/* Content Section */}
                                    <CardContent className="p-5">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-mono text-xs px-2 py-1">
                                                    Post ID: {post.postId || post.post_id || post.id}
                                                </Badge>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigator.clipboard.writeText(String(post.postId || post.post_id || post.id));
                                                        toast({ title: "Copied", description: "Post ID copied to clipboard" });
                                                    }}
                                                    className="text-gray-400 hover:text-blue-600 transition-colors p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                                    title={t('copy_post_id_tooltip')}
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                            </div>
                                            {displayStatus === 'active' && (
                                                <Switch
                                                    checked={selectedPosts.has(post.postId || post.post_id || post.id)}
                                                    onCheckedChange={() => togglePostSelection(post.postId || post.post_id || post.id)}
                                                    className="scale-90"
                                                />
                                            )}
                                        </div>

                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-2">
                                            {post.title}
                                        </h3>

                                        <div className="text-2xl font-extrabold text-green-600 dark:text-green-400 mb-3">
                                            INR {typeof post.price === 'number' ? post.price.toLocaleString() : post.price}
                                        </div>

                                        {post.location && (
                                            <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm mb-4">
                                                <MapPin className="w-4 h-4 mr-1" />
                                                {post.location}
                                            </div>
                                        )}

                                        {/* Action Buttons */}
                                        <div className="flex gap-3">
                                            <Button
                                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl py-3 text-base shadow flex items-center justify-center gap-2"
                                                onClick={() => handleViewPost(post)}
                                            >
                                                <Eye className="w-5 h-5" />
                                                View Details
                                            </Button>
                                            {!isBoughtPost && (
                                                <Button
                                                    variant="outline"
                                                    className="border-2 border-red-400 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 font-bold rounded-xl py-3 px-4"
                                                    onClick={() => confirmDeletePost(post.postId || post.post_id || post.id)}
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </Button>
                                            )}
                                        </div>
                                    </CardContent>
                                </div>
                            </Card>
                            );
                        })
                    )
                    }
                </div>

                {/* Pagination Controls */}
                {visiblePosts.length > 0 && (
                    <div className="flex justify-center items-center gap-4 mt-4 mb-8">
                        <Button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(currentPage - 1)}
                            className="text-base px-5 py-2 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                            {t('previous')}
                        </Button>
                        <span className="px-4 py-2 text-blue-700 dark:text-blue-300 font-bold text-base">
                            {t('page')} {currentPage} {t('of')} {totalPages}
                        </span>
                        <Button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(currentPage + 1)}
                            className="text-base px-5 py-2 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                            {t('next')}
                        </Button>
                    </div>
                )}
            </div>

            {/* Floating Add Button */}
            <div className="fixed bottom-20 right-4 z-40">
                <Button
                    className="bg-blue-600 text-white rounded-full shadow-xl w-14 h-14 flex items-center justify-center text-3xl hover:bg-blue-700 hover:scale-110 transition-all"
                    onClick={() => navigate('/tier-selection')}
                >
                    <Plus className="w-7 h-7" />
                </Button>
            </div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent className="bg-white dark:bg-gray-800 rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
                            {t('delete_post_title')}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-600 dark:text-gray-300">
                            {t('delete_post_desc')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">{t('cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeletePost}
                            className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
                        >
                            {t('delete')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Sale Undone Confirmation Dialog */}
            <AlertDialog open={showSaleUndoneDialog} onOpenChange={setShowSaleUndoneDialog}>
                <AlertDialogContent className="bg-white dark:bg-gray-800 rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
                            {t('move_sale_undone_title')}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-600 dark:text-gray-300">
                            {t('move_sale_undone_desc')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">{t('cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleSaleUndone}
                            className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl"
                        >
                            {t('confirm')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Bulk Delete Confirmation Dialog */}
            <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
                <AlertDialogContent className="bg-white dark:bg-gray-800 rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
                            {t('bulk_delete_title', { count: selectedPosts.size })}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-600 dark:text-gray-300">
                            {t('bulk_delete_desc')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">{t('cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleBulkDelete}
                            className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
                        >
                            {t('delete_all')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    );
};

export default MyHome;


