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
  Share2
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

const MyPosts = () => {
  // Filtering, sorting, pagination state
  const [activeTab, setActiveTab] = useState('active');
  const [filters, setFilters] = useState({ status: 'active', sortBy: 'posted_date', sortOrder: 'desc', page: 1, limit: 10 });
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
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams(filters).toString();
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    const token = localStorage.getItem('authToken');
    const userId = localStorage.getItem('userId') || 1;
    fetch(`${baseUrl}/api/posts/mine?userId=${userId}&${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      credentials: 'include'
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data.posts)) {
          setPosts(data.posts);
          setError(null);
        } else {
          setError(data.error || 'Failed to fetch your posts');
        }
      })
      .catch(err => {
        setError(err.message || 'Failed to fetch your posts');
      })
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => {
    setTotalPages(Math.ceil(posts.length / pageSize));
  }, [posts, pageSize]);

  const allPosts = Array.isArray(posts) ? posts : [];
  const soldPosts = allPosts.filter(post => post.status === 'sold');
  const boughtPosts = allPosts.filter(post => post.status === 'bought');
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

  // --- ALL LOGIC AND HELPERS MUST BE ABOVE RETURN ---
  const handleSaleDone = () => {
    navigate('/saledone');
  };
  const isEditAvailable = (postedTime) => {
    const now = new Date();
    const diffInMinutes = (now - postedTime) / (1000 * 60);
    return diffInMinutes <= 5;
  };
  const handleViewPost = (post, type) => {
    console.log(`Post ${post.postId} viewed - tracking as inquiry`);
    navigate('/post-detail-view', { state: { post, type } });
  };
  const handleEditPost = (post) => {
    if (!isEditAvailable(post.postedTime)) {
      toast({
        title: "Edit Not Available",
        description: "Posts can only be edited within 5 minutes of publishing",
        variant: "destructive"
      });
      return;
    }
    toast({
      title: "Edit Post",
      description: `Opening editor for post ${post.postId}`
    });
    navigate(`/edit-post/${post.postId}`);
  };
  const handleSharePost = (post) => {
    const shareUrl = `${window.location.origin}/post/${post.postId}`;
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
  const handleDeletePost = () => {
    if (selectedPostForDelete) {
      setPosts(posts => posts.filter(post => post.postId !== selectedPostForDelete));
      toast({
        title: "Post Deleted",
        description: `Post ${selectedPostForDelete} has been deleted successfully`
      });
      setSelectedPostForDelete(null);
      setShowDeleteDialog(false);
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
  const openPostDetailDialog = (post) => {
    setPostDetailData(post);
    setShowPostDetailDialog(true);
  };
  const closePostDetailDialog = () => {
    setShowPostDetailDialog(false);
    setPostDetailData(null);
  };

  // Helper to get full image URL
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  const getImageUrl = (img) => {
    if (!img) return '/placeholder.svg';
    if (img.startsWith('/uploads/')) return baseUrl + img;
    if (img.startsWith('http')) return img;
    return '/placeholder.svg';
  };

  // --- ERROR BOUNDARY & SAFE RENDERING ---
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-400 via-blue-100 to-blue-200 w-full">
        <div className="bg-red-100 border border-red-300 rounded-3xl p-10 shadow-2xl">
          <h2 className="text-3xl font-extrabold text-red-700 mb-4">Error Loading My Posts</h2>
          <p className="text-xl text-red-600 mb-4">{error}</p>
          <Button className="bg-blue-700 hover:bg-blue-800 text-white text-xl px-8 py-4 rounded-2xl font-extrabold" onClick={() => window.location.reload()}>Reload Page</Button>
        </div>
      </div>
    );
  }
  if (loading) {
    return <div className="flex items-center justify-center h-screen"><p className="text-gray-500">Loading...</p></div>;
  }
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen flex-col gap-4">
        <p className="text-red-500">{error}</p>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  // --- MAIN RENDER ---
  return (
    <div className="w-full min-h-screen bg-white flex flex-col items-center pb-24">
      {/* Tabs */}
      <div className="flex w-full justify-between gap-2 py-2 px-1 mb-2 overflow-x-auto scrollbar-hide max-w-2xl">
        {[{label:'All',tab:'all',color:'bg-blue-600',count:allPosts.length},{label:'Active',tab:'active',color:'bg-green-500',count:allPosts.filter(p=>p.status==='active').length},{label:'Sold',tab:'sold',color:'bg-blue-500',count:soldPosts.length},{label:'Bought',tab:'bought',color:'bg-purple-500',count:boughtPosts.length}].map((item) => (
          <button key={item.tab} className={`flex-1 min-w-0 px-0 py-2 rounded-lg font-bold text-base shadow-sm border-2 border-transparent focus:outline-none transition-all duration-150 ${activeTab===item.tab?`${item.color} text-white scale-105`:'bg-white text-blue-700'}`} onClick={()=>{
            setActiveTab(item.tab);
            setFilters(f => ({ ...f, status: item.tab==='all'?'':item.tab }));
          }}>{item.label} <span className={`ml-1 ${item.color} text-white px-2 py-0.5 rounded text-xs`}>{item.count}</span></button>
        ))}
      </div>
      {/* Welcome Banner - styled like Home */}
      <div className="w-full max-w-2xl bg-blue-50 rounded-2xl shadow-lg p-6 mt-2 mb-4 flex flex-col items-start">
        <h2 className="text-2xl font-black text-blue-900 mb-1">Welcome to MyHome</h2>
        <p className="text-base font-medium text-blue-700 mb-2">Manage, track, and celebrate your listings</p>
        <div className="flex w-full gap-2 mt-2">
          <Button className="flex-1 bg-green-500 text-white font-bold rounded-lg px-0 py-2 text-base shadow" onClick={handleSaleDone}>Sale Done</Button>
          <Button className="flex-1 bg-orange-500 text-white font-bold rounded-lg px-0 py-2 textBase shadow" onClick={handleSaleUndone}>Sale Undone</Button>
        </div>
      </div>
      {/* Posts List - styled like Home cards */}
      <div className="w-full max-w-2xl flex flex-col gap-6">
        {sortedPosts.length === 0 ? (
          <div className="text-center text-gray-400 text-lg font-bold py-10">No posts to display.</div>
        ) : (
          sortedPosts.filter(post => {
            if (activeTab === 'active') return post.status === 'active';
            if (activeTab === 'sold') return post.status === 'sold';
            if (activeTab === 'bought') return post.status === 'bought';
            return true;
          }).map((post) => (
            <div key={post.postId || post.id} className="bg-white rounded-2xl shadow-lg border border-blue-200 p-6 flex flex-col gap-2">
              <div className="flex items-center justify-between mb-2">
                <span className={`font-bold rounded-full px-3 py-0.5 text-xs capitalize ${post.status==='active'?'bg-blue-600 text-white':post.status==='sold'?'bg-green-500 text-white':post.status==='bought'?'bg-purple-500 text-white':'bg-gray-200 text-gray-700'}`}>{post.status}</span>
                <span className="text-xs font-semibold text-blue-700">ID: {post.postId || post.id}</span>
              </div>
              <div className="text-lg font-bold text-blue-900 mb-1">{post.title}</div>
              <div className="text-xl font-black text-blue-600 mb-2">₹{typeof post.price === 'number' ? post.price.toLocaleString() : post.price}</div>
              <div className="flex gap-2 mt-1">
                <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg px-0 py-2 text-base shadow flex items-center justify-center gap-2 transition-all" onClick={() => navigate(`/post/${post.postId || post.id}`)}>
                  <Eye className="w-4 h-4 mr-1" />
                  View Details
                </Button>
                <Button className="flex-1 bg-white border-2 border-blue-600 text-blue-600 font-bold rounded-lg px-0 py-2 textBase shadow flex items-center justify-center gap-2 hover:bg-blue-50 transition-all" onClick={() => handleDelete(post.postId || post.id)}>
                  <Trash2 className="w-4 h-4 mr-1 text-red-500" />
                  <span className="text-red-500">Delete</span>
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
      {/* Pagination Controls */}
      <div className="flex justify-center items-center gap-2 mt-4 mb-2">
        <Button disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)} className="text-base px-5 py-2 rounded-lg font-bold bg-blue-600 text-white hover:bg-blue-700">Previous</Button>
        <span className="px-3 py-1 text-blue-700 font-bold text-base">Page {currentPage} of {totalPages}</span>
        <Button disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)} className="text-base px-5 py-2 rounded-lg font-bold bg-blue-600 text-white hover:bg-blue-700">Next</Button>
      </div>
      {/* Centered + Button at Bottom */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
        <Button className="bg-blue-600 text-white rounded-full shadow-lg w-16 h-16 flex items-center justify-center text-4xl hover:bg-blue-700" onClick={() => navigate('/add-post')}>
          <Plus className="w-8 h-8" />
        </Button>
      </div>
    </div>
  );

  // --- BEGIN RESTORED BLOCK: PostCard Component ---
  function PostCard({ post, type }) {
    const isSelected = selectedPosts.has(post.postId);
    const isUndone = postsMovedToUndone.has(post.postId);
    return (
      <Card className="shadow-2xl border-0 rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-300 mb-8 transform hover:scale-[1.01] card-hover animate-tap w-full">
        <div className="flex flex-col h-full">
          <div className="relative">
            <img
              src={getImageUrl(post.image)}
              onError={e => { e.target.onerror = null; e.target.src = '/placeholder.svg'; }}
              alt={post.title}
              className="w-full h-64 object-cover rounded-t-3xl"
            />
            {type === 'active' && (
              <div className="absolute top-4 right-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="bg-white/90 hover:bg-white shadow-lg rounded-full h-10 w-10 p-0"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-white shadow-lg border rounded-xl">
                    <DropdownMenuItem 
                      onClick={() => handleEditPost(post)}
                      disabled={!isEditAvailable(post.postedTime)}
                      className={!isEditAvailable(post.postedTime) ? "opacity-50 cursor-not-allowed" : ""}
                    >
                      <Edit className="w-5 h-5 mr-2" />
                      Edit Post
                      {!isEditAvailable(post.postedTime) && (
                        <span className="ml-2 text-base text-red-500 font-bold">(Expired)</span>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSharePost(post)}>
                      <Share2 className="w-5 h-5 mr-2" />
                      Share Post
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>

          <div className="p-7 flex-1 flex flex-col">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-4 mb-3">
                  {type === 'active' && (
                    <Switch
                      checked={isSelected}
                      onCheckedChange={() => togglePostSelection(post.postId)}
                      disabled={isUndone}
                      className={isUndone ? "opacity-50" : ""}
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-extrabold text-2xl text-gray-900 mb-2 line-clamp-2">{post.title}</h3>
                    <div className="flex items-center space-x-4 mb-2">
                      <Badge className={
                        type === 'active' ? 'bg-green-500 text-white text-base font-bold px-4 py-2' :
                        type === 'sold' ? 'bg-blue-500 text-white text-base font-bold px-4 py-2' :
                        type === 'bought' ? 'bg-orange-500 text-white text-base font-bold px-4 py-2' :
                        'bg-purple-500 text-white text-base font-bold px-4 py-2'
                      }>
                        {type === 'active' ? 'Active' :
                         type === 'sold' ? 'Sold' :
                         type === 'bought' ? 'Purchased' :
                         post.status === 'active' ? 'Active' : 'Sold'}
                      </Badge>
                      <div className="text-base text-gray-500 font-mono">
                        ID: {post.postId}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mb-4">
              <div className="text-4xl font-extrabold text-green-600 mb-1">
                ₹{typeof post.price === 'number' ? post.price.toLocaleString() : post.price}
              </div>
              {post.originalPrice && (
                <div className="text-lg text-gray-500 line-through">
                  MRP: ₹{typeof post.originalPrice === 'number' ? post.originalPrice.toLocaleString() : post.originalPrice}
                </div>
              )}
            </div>

            {(type === 'sold' || type === 'bought') && (
              <div className={`${type === 'sold' ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'} border rounded-2xl p-5 mb-4`}> 
                <h4 className={`font-bold text-xl ${type === 'sold' ? 'text-green-800' : 'text-orange-800'} mb-3`}>
                  {type === 'sold' ? 'Sale Details' : 'Purchase Details'}
                </h4>
                <div className="space-y-2 text-lg">
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      {type === 'sold' ? 'Buyer:' : 'Seller:'}
                    </span>
                    <span className="font-bold">
                      {type === 'sold' ? post.buyerName : post.sellerName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      {type === 'sold' ? 'Buyer ID:' : 'Seller ID:'}
                    </span>
                    <span className="font-mono font-bold text-base">
                      {type === 'sold' ? post.buyerId : post.sellerId}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Contact:</span>
                    <span className="font-bold">
                      {type === 'sold' ? post.buyerPhone : post.sellerPhone}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-auto space-y-4">
              {type === 'active' && (
                <div className="flex space-x-4">
                  <Button 
                    onClick={() => handleViewPost(post, type)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 h-14 text-lg font-bold rounded-xl"
                  >
                    <Eye className="w-5 h-5 mr-2" />
                    View Details
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => confirmDeletePost(post.postId)}
                    className="flex-1 border-red-400 text-red-600 hover:bg-red-50 h-14 text-lg font-bold rounded-xl"
                  >
                    <Trash2 className="w-5 h-5 mr-2" />
                    Delete
                  </Button>
                </div>
              )}

              {type === 'all' && (
                <Button 
                  onClick={() => handleViewPost(post, type)}
                  className="w-full bg-blue-600 hover:bg-blue-700 h-14 text-lg font-bold rounded-xl"
                >
                  <Eye className="w-5 h-5 mr-2" />
                  View Details
                </Button>
              )}

              {type === 'sold' && (
                <Button 
                  onClick={() => handleViewPost(post, type)}
                  className="w-full bg-green-600 hover:bg-green-700 h-14 text-lg font-bold rounded-xl"
                >
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  View Sale Details
                </Button>
              )}

              {type === 'bought' && (
                <Button 
                  onClick={() => handleViewPost(post, type)}
                  className="w-full bg-orange-500 hover:bg-orange-600 h-14 text-lg font-bold rounded-xl"
                >
                  <ShoppingBag className="w-5 h-5 mr-2" />
                  View Purchase Details
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  }
  // --- END RESTORED BLOCK ---
};
export default MyPosts;
