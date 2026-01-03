import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
    Eye,
    Heart,
    MessageCircle,
    Edit,
    Trash2,
    RefreshCw,
    Plus,
    ShoppingBag,
    Package,
    CheckCircle2,
    Calendar,
    User,
    MapPin,
    XCircle,
    MoreVertical,
    AlertTriangle,
    Share2,
    ArrowLeft,
    Search,
    CheckSquare,
    Square,
    Sparkles,
    ChevronRight,
    Copy,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
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

const MyHome = () => {
    // Filtering, sorting, pagination state
    const [activeTab, setActiveTab] = useState('active');
    // Use correct backend column for sorting
    const [filters, setFilters] = useState({ status: 'active', sortBy: 'created_at', sortOrder: 'desc', page: 1, limit: 10 });
    const [selectedPosts, setSelectedPosts] = useState(new Set());
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showSaleUndoneDialog, setShowSaleUndoneDialog] = useState(false);
    const [selectedPostForDelete, setSelectedPostForDelete] = useState(null);
    const [postsMovedToUndone, setPostsMovedToUndone] = useState(new Set());
    const [posts, setPosts] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortKey, setSortKey] = useState("postedDate");
    const [sortOrder, setSortOrder] = useState("desc");
    const [showPostDetailDialog, setShowPostDetailDialog] = useState(false);
    const [postDetailData, setPostDetailData] = useState(null);
    const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
    const [selectAll, setSelectAll] = useState(false);
    const navigate = useNavigate();
    const { toast } = useToast();

    // Helper to get full image URL
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    const getImageUrl = (img) => {
        if (!img) return '/placeholder.svg';
        if (img.startsWith('/uploads/')) return baseUrl + img;
        if (img.startsWith('http')) return img;
        return '/placeholder.svg';
    };

    // Fetch ALL posts for this user (no status filter) to get correct stats
    useEffect(() => {
        setLoading(true);
        const userId = localStorage.getItem('userId');
        const token = localStorage.getItem('authToken');
        if (!userId || !token) {
            setError('You must be logged in to view your posts.');
            setLoading(false);
            return;
        }
        // Fetch ALL posts without status filter for accurate stats
        fetch(`${baseUrl}/api/posts/mine?userId=${userId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            credentials: 'include'
        })
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data.posts)) {
                    setPosts(data.posts);
                    setError(null);
                } else if (Array.isArray(data)) {
                    setPosts(data);
                    setError(null);
                } else {
                    // Return empty array on error to show empty state gracefully
                    setPosts([]);
                    setError(null);
                }
            })
            .catch(err => {
                setPosts([]);
                setError(null);
            })
            .finally(() => setLoading(false));
    }, []); // Only fetch once on mount, not on filter change

    useEffect(() => {
        setTotalPages(Math.max(1, Math.ceil(posts.length / pageSize)));
    }, [posts, pageSize]);

    // Calculate stats from ALL posts
    const allPosts = Array.isArray(posts) ? posts : [];
    const soldPosts = allPosts.filter(post => post.status === 'sold');
    const boughtPosts = allPosts.filter(post => post.status === 'bought');
    const activePosts = allPosts.filter(post => post.status === 'active');

    // Filter posts for display based on activeTab
    const displayPosts = activeTab === 'all' ? allPosts :
        activeTab === 'active' ? activePosts :
            activeTab === 'sold' ? soldPosts :
                activeTab === 'bought' ? boughtPosts : allPosts;
    const paginatedPosts = allPosts.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    const filteredPosts = paginatedPosts.filter(post =>
        post.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.location?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const sortedPosts = [...filteredPosts].sort((a, b) => {
        if (sortOrder === "asc") {
            return a[sortKey] > b[sortKey] ? 1 : -1;
        } else {
            return a[sortKey] < b[sortKey] ? 1 : -1;
        }
    });

    // --- ALL LOGIC AND HELPERS ---
    const handleSaleDone = () => {
        navigate('/saledone');
    };

    const isEditAvailable = (postedTime) => {
        const now = new Date();
        const diffInMinutes = (now - new Date(postedTime)) / (1000 * 60);
        return diffInMinutes <= 5;
    };

    const handleViewPost = (post) => {
        navigate(`/post/${post.postId || post.post_id || post.id}`);
    };

    const handleEditPost = (post) => {
        if (!isEditAvailable(post.created_at || post.postedTime)) {
            toast({
                title: "Edit Not Available",
                description: "Posts can only be edited within 5 minutes of publishing",
                variant: "destructive"
            });
            return;
        }
        toast({
            title: "Edit Post",
            description: `Opening editor for post`
        });
        navigate(`/edit-post/${post.postId || post.post_id || post.id}`);
    };

    const handleSharePost = (post) => {
        const shareUrl = `${window.location.origin}/post/${post.postId || post.post_id || post.id}`;
        navigator.clipboard.writeText(shareUrl).then(() => {
            toast({
                title: "Link Copied",
                description: "Post link copied to clipboard"
            });
        }).catch(() => {
            toast({
                title: "Share Failed",
                description: "Unable to copy link",
                variant: "destructive"
            });
        });
    };

    const confirmDeletePost = (postId) => {
        setSelectedPostForDelete(postId);
        setShowDeleteDialog(true);
    };

    const handleDeletePost = async () => {
        if (selectedPostForDelete) {
            try {
                const token = localStorage.getItem('authToken');
                const response = await fetch(`${baseUrl}/api/posts/${selectedPostForDelete}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    credentials: 'include'
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to delete post');
                }

                // Only remove from local state after successful backend deletion
                setPosts(posts => posts.filter(post => (post.postId || post.post_id || post.id) !== selectedPostForDelete));
                toast({
                    title: "Post Deleted",
                    description: "Post has been deleted successfully"
                });
            } catch (error) {
                console.error('Delete error:', error);
                toast({
                    title: "Delete Failed",
                    description: error.message || "Could not delete the post. Please try again.",
                    variant: "destructive"
                });
            } finally {
                setSelectedPostForDelete(null);
                setShowDeleteDialog(false);
            }
        }
    };

    const confirmSaleUndone = () => {
        if (selectedPosts.size === 0) {
            toast({
                title: "No Posts Selected",
                description: "Please select posts to mark as sale undone",
                variant: "destructive"
            });
            return;
        }
        setShowSaleUndoneDialog(true);
    };

    const handleSaleUndone = () => {
        const newMovedPosts = new Set([...postsMovedToUndone, ...selectedPosts]);
        setPostsMovedToUndone(newMovedPosts);
        toast({
            title: "Posts Moved",
            description: `${selectedPosts.size} posts moved to Sale Undone`
        });
        setSelectedPosts(new Set());
        setShowSaleUndoneDialog(false);
        navigate('/saleundone');
    };

    const togglePostSelection = (postId) => {
        if (postsMovedToUndone.has(postId)) {
            toast({
                title: "Cannot Select",
                description: "This post has already been moved to Sale Undone",
                variant: "destructive"
            });
            return;
        }
        const newSelected = new Set(selectedPosts);
        if (newSelected.has(postId)) {
            newSelected.delete(postId);
        } else {
            newSelected.add(postId);
        }
        setSelectedPosts(newSelected);
    };

    // Toggle Select All
    const toggleSelectAll = () => {
        if (selectAll) {
            setSelectedPosts(new Set());
        } else {
            const activePostIds = allPosts
                .filter(p => p.status === 'active')
                .map(p => p.postId || p.post_id || p.id);
            setSelectedPosts(new Set(activePostIds));
        }
        setSelectAll(!selectAll);
    };

    // Bulk Delete handler
    const handleBulkDelete = async () => {
        if (selectedPosts.size === 0) {
            toast({
                title: "No Posts Selected",
                description: "Please select posts to delete",
                variant: "destructive"
            });
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            const deletePromises = Array.from(selectedPosts).map(postId =>
                fetch(`${baseUrl}/api/posts/${postId}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    credentials: 'include'
                })
            );

            await Promise.all(deletePromises);

            setPosts(posts => posts.filter(post =>
                !selectedPosts.has(post.postId || post.post_id || post.id)
            ));
            setSelectedPosts(new Set());
            setSelectAll(false);
            setShowBulkDeleteDialog(false);
            toast({
                title: "Posts Deleted",
                description: `${selectedPosts.size} posts have been deleted`
            });
        } catch (error) {
            console.error('Bulk delete error:', error);
            toast({
                title: "Delete Failed",
                description: "Some posts could not be deleted",
                variant: "destructive"
            });
        }
    };

    // --- LOADING STATE ---
    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-blue-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">Loading your posts...</p>
                </div>
            </div>
        );
    }

    // --- MAIN RENDER ---
    const isLoggedIn = localStorage.getItem('userId') && localStorage.getItem('authToken');

    if (!isLoggedIn) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700" style={{ paddingBottom: '120px' }}>
                {/* Hero Section */}
                <div className="pt-16 pb-12 px-6 text-center">
                    <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-2xl">
                        <Package className="w-12 h-12 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-3">My Home</h1>
                    <p className="text-white/80 text-lg max-w-md mx-auto">
                        Manage your listings, track sales, and view your activity history.
                    </p>
                </div>

                {/* Login/Signup Cards */}
                <div className="max-w-lg mx-auto px-6 space-y-4">
                    <a
                        href="/login"
                        className="block bg-white rounded-2xl p-6 shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg">
                                <CheckCircle2 className="w-7 h-7 text-white" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-gray-900">Login</h3>
                                <p className="text-gray-500 text-sm">Already have an account? Sign in here</p>
                            </div>
                            <ChevronRight className="w-6 h-6 text-gray-400" />
                        </div>
                    </a>

                    <a
                        href="/signup"
                        className="block bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-xl hover:shadow-2xl hover:bg-white/20 hover:scale-[1.02] transition-all duration-300"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center shadow-lg">
                                <Sparkles className="w-7 h-7 text-white" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-white">Create Account</h3>
                                <p className="text-white/70 text-sm">New user? Join us in just a few steps</p>
                            </div>
                            <ChevronRight className="w-6 h-6 text-white/60" />
                        </div>
                    </a>
                </div>
            </div>
        );
    }
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
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
                            <span className="text-4xl">🏠</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">My Home</h1>
                        <p className="text-blue-100 text-lg">Manage, track, and celebrate your listings</p>
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
                                <p className="text-sm text-gray-500">Total Posts</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <CheckCircle2 className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-800 dark:text-white">{allPosts.filter(p => p.status === 'active').length}</p>
                                <p className="text-sm text-gray-500">Active</p>
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
                                <p className="text-sm text-gray-500">Sold</p>
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
                                <p className="text-sm text-gray-500">Bought</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 pb-8">

                {/* Tabs */}
                <div className="w-full flex justify-center gap-2 py-2 mb-4 overflow-x-auto">
                    {[
                        { label: 'All', tab: 'all', color: 'bg-blue-600', count: allPosts.length },
                        { label: 'Active', tab: 'active', color: 'bg-green-500', count: allPosts.filter(p => p.status === 'active').length },
                        { label: 'Sold', tab: 'sold', color: 'bg-blue-500', count: soldPosts.length },
                        { label: 'Bought', tab: 'bought', color: 'bg-purple-500', count: boughtPosts.length }
                    ].map((item) => (
                        <button
                            key={item.tab}
                            className={`flex-1 min-w-0 px-2 py-2 rounded-xl font-bold text-sm shadow-lg border-2 border-blue-300 dark:border-gray-600 focus:outline-none transition-all duration-150 ${activeTab === item.tab
                                ? `${item.color} text-white scale-105 drop-shadow-xl border-2 border-blue-700`
                                : 'bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-gray-700'
                                }`}
                            onClick={() => {
                                setActiveTab(item.tab);
                                setFilters(f => ({ ...f, status: item.tab === 'all' ? '' : item.tab }));
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
                        placeholder="Search your posts by title or location..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none transition-colors"
                    />
                </div>

                {/* Bulk Actions Bar - Only for Active posts (user can only manage their own active listings) */}
                {activeTab === 'active' && allPosts.filter(p => p.status === 'active').length > 0 && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 mb-4 border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={toggleSelectAll}
                                    className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium hover:text-blue-700 transition-colors"
                                    title="Select all active posts for bulk actions"
                                >
                                    {selectAll ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                                    {selectAll ? 'Deselect All' : 'Select All'}
                                </button>
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    {selectedPosts.size} of {allPosts.filter(p => p.status === 'active').length} selected
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
                                    Delete Selected ({selectedPosts.size})
                                </Button>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            💡 Use this to quickly manage multiple active listings at once
                        </p>
                    </div>
                )}

                {/* Sale Done/Undone Buttons */}
                <div className="flex w-full gap-4 mb-6">
                    <Button className="flex-1 bg-green-500 text-white font-bold rounded-xl px-0 py-3 text-lg shadow hover:scale-105 transition-all hover:bg-green-600" onClick={handleSaleDone}>
                        <CheckCircle2 className="w-5 h-5 mr-2" />
                        Sale Done
                    </Button>
                    <Button className="flex-1 bg-orange-500 text-white font-bold rounded-xl px-0 py-3 text-lg shadow hover:scale-105 transition-all hover:bg-orange-600" onClick={() => navigate('/saleundone')}>
                        <XCircle className="w-5 h-5 mr-2" />
                        Sale Undone
                    </Button>
                </div>

                {/* Posts List */}
                <div className="w-full flex flex-col gap-6 pb-24">
                    {sortedPosts.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="text-6xl mb-4">📭</div>
                            <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">No posts to display</h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-6">Start selling by creating your first listing!</p>
                            <Button
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl"
                                onClick={() => navigate('/tier-selection')}
                            >
                                <Plus className="w-5 h-5 mr-2" />
                                Create New Listing
                            </Button>
                        </div>
                    ) : (
                        sortedPosts.filter(post => {
                            if (activeTab === 'active') return post.status === 'active';
                            if (activeTab === 'sold') return post.status === 'sold';
                            if (activeTab === 'bought') return post.status === 'bought';
                            return true;
                        }).map((post) => (
                            <Card key={post.postId || post.post_id || post.id} className="shadow-xl border-0 rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300 bg-white dark:bg-gray-800">
                                <div className="flex flex-col">
                                    {/* Image Section */}
                                    <div className="relative">
                                        <img
                                            src={getImageUrl(post.image || post.images?.[0])}
                                            onError={e => { e.target.onerror = null; e.target.src = '/placeholder.svg'; }}
                                            alt={post.title}
                                            className="w-full h-48 object-cover"
                                        />
                                        <Badge className={`absolute top-3 left-3 ${post.status === 'active' ? 'bg-green-500' :
                                            post.status === 'sold' ? 'bg-blue-500' :
                                                post.status === 'bought' ? 'bg-purple-500' : 'bg-gray-500'
                                            } text-white font-bold px-3 py-1 text-sm capitalize`}>
                                            {post.status || 'Active'}
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
                                                        Edit Post
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleSharePost(post)}>
                                                        <Share2 className="w-4 h-4 mr-2" />
                                                        Share Post
                                                    </DropdownMenuItem>
                                                    {post.status !== 'bought' && (
                                                        <DropdownMenuItem
                                                            onClick={() => confirmDeletePost(post.postId || post.post_id || post.id)}
                                                            className="text-red-600"
                                                        >
                                                            <Trash2 className="w-4 h-4 mr-2" />
                                                            Delete
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
                                                        toast({ title: "📋 Copied!", description: "Post ID copied to clipboard" });
                                                    }}
                                                    className="text-gray-400 hover:text-blue-600 transition-colors p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                                    title="Copy Post ID (use this in SaleDone)"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                            </div>
                                            {post.status === 'active' && (
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
                                            ₹{typeof post.price === 'number' ? post.price.toLocaleString() : post.price}
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
                                            {post.status !== 'bought' && (
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
                        ))
                    )
                    }
                </div>

                {/* Pagination Controls */}
                {sortedPosts.length > 0 && (
                    <div className="flex justify-center items-center gap-4 mt-4 mb-8">
                        <Button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(currentPage - 1)}
                            className="text-base px-5 py-2 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                            Previous
                        </Button>
                        <span className="px-4 py-2 text-blue-700 dark:text-blue-300 font-bold text-base">
                            Page {currentPage} of {totalPages}
                        </span>
                        <Button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(currentPage + 1)}
                            className="text-base px-5 py-2 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                            Next
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
                            Delete Post?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-600 dark:text-gray-300">
                            This action cannot be undone. This will permanently delete your post.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeletePost}
                            className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Sale Undone Confirmation Dialog */}
            <AlertDialog open={showSaleUndoneDialog} onOpenChange={setShowSaleUndoneDialog}>
                <AlertDialogContent className="bg-white dark:bg-gray-800 rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
                            Move to Sale Undone?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-600 dark:text-gray-300">
                            {selectedPosts.size} post(s) will be moved to Sale Undone section.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleSaleUndone}
                            className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl"
                        >
                            Confirm
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Bulk Delete Confirmation Dialog */}
            <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
                <AlertDialogContent className="bg-white dark:bg-gray-800 rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
                            Delete {selectedPosts.size} Posts?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-600 dark:text-gray-300">
                            This action cannot be undone. All selected posts will be permanently deleted.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleBulkDelete}
                            className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
                        >
                            Delete All
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    );
};

export default MyHome;
