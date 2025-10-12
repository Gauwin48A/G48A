import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Users, FileText, Flag, Shield, TrendingUp, Search, MoreVertical, Ban, CheckCircle } from "lucide-react";

const AdminPanel = () => {
  const [stats, setStats] = useState({});
  const [flaggedUsers, setFlaggedUsers] = useState([]);
  const [flaggedPosts, setFlaggedPosts] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setLoading(true);
    fetch('http://localhost:5000/api/admin/dashboard')
      .then(res => res.json())
      .then(data => {
        setStats(data.stats || {});
        setFlaggedUsers(data.flaggedUsers || []);
        setFlaggedPosts(data.flaggedPosts || []);
        setRecentActivity(data.recentActivity || []);
        setError(null);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Failed to fetch admin dashboard data');
        setLoading(false);
      });
  }, []);

  const handleUserAction = (userId, action) => {
    console.log(`${action} user ${userId}`);
    // Implementation for user actions
  };

  const handlePostAction = (postId, action) => {
    console.log(`${action} post ${postId}`);
    // Implementation for post actions
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center md:text-left">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Admin Panel</h1>
          <p className="text-gray-600">Manage users, posts, and platform security</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{stats.totalUsers}</div>
                  <div className="text-blue-100 text-sm">Total Users</div>
                  <div className="text-blue-200 text-xs">+{stats.todaySignups} today</div>
                </div>
                <Users className="w-8 h-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{stats.totalPosts}</div>
                  <div className="text-green-100 text-sm">Total Posts</div>
                  <div className="text-green-200 text-xs">+{stats.todayPosts} today</div>
                </div>
                <FileText className="w-8 h-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{stats.flaggedPosts}</div>
                  <div className="text-orange-100 text-sm">Flagged Posts</div>
                  <div className="text-orange-200 text-xs">Need review</div>
                </div>
                <Flag className="w-8 h-8 text-orange-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{stats.restrictedUsers}</div>
                  <div className="text-red-100 text-sm">Restricted</div>
                  <div className="text-red-200 text-xs">Users blocked</div>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 h-12">
            <TabsTrigger value="users" className="text-sm">Users</TabsTrigger>
            <TabsTrigger value="posts" className="text-sm">Posts</TabsTrigger>
            <TabsTrigger value="flags" className="text-sm">Flags</TabsTrigger> 
            <TabsTrigger value="activity" className="text-sm">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Flagged Users Management</span>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input placeholder="Search users..." className="pl-10 w-64" />
                  </div>
                </CardTitle>
                <CardDescription>Review and manage flagged user accounts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {flaggedUsers.map((user) => (
                    <Card key={user.id} className="border-l-4 border-l-red-500">
                      <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row justify-between space-y-4 md:space-y-0">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="font-semibold text-lg">{user.name}</h3>
                              <Badge variant={
                                user.status === 'Restricted' ? 'destructive' : 
                                user.status === 'Under Review' ? 'secondary' : 'outline'
                              }>
                                {user.status}
                              </Badge>
                              <Badge variant="outline" className="text-red-600">
                                {user.flagCount} flags
                              </Badge>
                            </div>
                            <div className="space-y-1 text-sm text-gray-600">
                              <p><strong>Email:</strong> {user.email}</p>
                              <p><strong>Phone:</strong> {user.phone}</p>
                              <p><strong>Reason:</strong> {user.reason}</p>
                              <p><strong>Stats:</strong> {user.totalPosts} posts, {user.completedSales} sales completed</p>
                              <p><strong>Joined:</strong> {user.joinDate}</p>
                            </div>
                          </div>
                          <div className="flex flex-col space-y-2 md:w-48">
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="w-full"
                              onClick={() => handleUserAction(user.id, 'review')}
                            >
                              Review Details
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              className="w-full"
                              onClick={() => handleUserAction(user.id, 'restrict')}
                            >
                              <Ban className="w-4 h-4 mr-1" />
                              Restrict User
                            </Button>
                            <Button 
                              size="sm" 
                              variant="secondary"
                              className="w-full"
                              onClick={() => handleUserAction(user.id, 'warn')}
                            >
                              Send Warning
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="posts">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Flagged Posts Management</CardTitle>
                <CardDescription>Review and moderate flagged posts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {flaggedPosts.map((post) => (
                    <Card key={post.id} className="border-l-4 border-l-orange-500">
                      <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row justify-between space-y-4 md:space-y-0">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="font-semibold">{post.title}</h3>
                              <Badge variant="secondary">{post.status}</Badge>
                            </div>
                            <div className="space-y-1 text-sm text-gray-600">
                              <p><strong>Price:</strong> {post.price}</p>
                              <p><strong>Seller:</strong> {post.sellerName} ({post.sellerId})</p>
                              <p><strong>Reason:</strong> {post.reason}</p>
                              <p><strong>Flagged by:</strong> {post.flaggedBy}</p>
                              <p><strong>Views:</strong> {post.views}</p>
                            </div>
                          </div>
                          <div className="flex flex-col space-y-2 md:w-48">
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="w-full"
                              onClick={() => handlePostAction(post.id, 'view')}
                            >
                              View Post
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              className="w-full"
                              onClick={() => handlePostAction(post.id, 'remove')}
                            >
                              Remove Post
                            </Button>
                            <Button 
                              size="sm" 
                              variant="secondary"
                              className="w-full"
                              onClick={() => handlePostAction(post.id, 'approve')}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="flags">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Flag Management System</CardTitle>
                <CardDescription>Advanced flagging and moderation tools</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="bg-yellow-50 border-yellow-200">
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-2">Auto-Detection Rules</h3>
                      <ul className="text-sm space-y-1 text-gray-700">
                        <li>• Prices 70% below market average</li>
                        <li>• Duplicate post detection</li>
                        <li>• Suspicious contact patterns</li>
                        <li>• Excessive sale undone frequency</li>
                      </ul>
                    </CardContent>
                  </Card>
                  <Card className="bg-red-50 border-red-200">
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-2">User Report Categories</h3>
                      <ul className="text-sm space-y-1 text-gray-700">
                        <li>• Fake/Misleading posts</li>
                        <li>• Spam/Duplicate content</li>
                        <li>• Inappropriate behavior</li>
                        <li>• Pricing manipulation</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Recent Platform Activity</CardTitle>
                <CardDescription>Real-time platform activity and user actions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className={`flex items-center justify-between p-3 rounded-lg border-l-4 ${
                      activity.type === 'signup' ? 'border-l-green-500 bg-green-50' :
                      activity.type === 'flag' ? 'border-l-red-500 bg-red-50' :
                      activity.type === 'sale' ? 'border-l-blue-500 bg-blue-50' :
                      activity.type === 'verification' ? 'border-l-purple-500 bg-purple-50' :
                      'border-l-gray-500 bg-gray-50'
                    }`}>
                      <div className="flex-1">
                        <p className="font-medium">{activity.action}</p>
                        <p className="text-sm text-gray-600">by {activity.user}</p>
                        <p className="text-xs text-gray-500">{activity.details}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm text-gray-500">{activity.time}</span>
                        <div className={`inline-block w-2 h-2 rounded-full ml-2 ${
                          activity.type === 'signup' ? 'bg-green-500' :
                          activity.type === 'flag' ? 'bg-red-500' :
                          activity.type === 'sale' ? 'bg-blue-500' :
                          activity.type === 'verification' ? 'bg-purple-500' :
                          'bg-gray-500'
                        }`}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPanel;
