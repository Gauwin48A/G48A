import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Users, FileText, Flag, Shield, TrendingUp, Search, MoreVertical, Ban, CheckCircle } from "lucide-react";

const AdminPanel = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState({});
  const [flaggedUsers, setFlaggedUsers] = useState([]);
  const [flaggedPosts, setFlaggedPosts] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    fetch(`${baseUrl}/api/admin/dashboard`)
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
    // Implementation for user actions
  };

  const handlePostAction = (postId, action) => {
    // Implementation for post actions
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 p-4 transition-colors duration-300">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center md:text-left">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('admin_panel')}</h1>
          <p className="text-gray-600 dark:text-gray-300">{t('admin_panel_desc')}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-700 dark:to-blue-900 text-white shadow-lg border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{stats.totalUsers}</div>
                  <div className="text-blue-100 text-sm">{t('total_users')}</div>
                  <div className="text-blue-200 text-xs">+{stats.todaySignups} {t('today')}</div>
                </div>
                <Users className="w-8 h-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 dark:from-green-700 dark:to-green-900 text-white shadow-lg border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{stats.totalPosts}</div>
                  <div className="text-green-100 text-sm">{t('total_posts')}</div>
                  <div className="text-green-200 text-xs">+{stats.todayPosts} {t('today')}</div>
                </div>
                <FileText className="w-8 h-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 dark:from-orange-700 dark:to-orange-900 text-white shadow-lg border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{stats.flaggedPosts}</div>
                  <div className="text-orange-100 text-sm">{t('flagged_posts')}</div>
                  <div className="text-orange-200 text-xs">{t('need_review')}</div>
                </div>
                <Flag className="w-8 h-8 text-orange-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-red-500 to-red-600 dark:from-red-700 dark:to-red-900 text-white shadow-lg border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{stats.restrictedUsers}</div>
                  <div className="text-red-100 text-sm">{t('restricted')}</div>
                  <div className="text-red-200 text-xs">{t('users_blocked')}</div>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 h-12 bg-white dark:bg-gray-800">
            <TabsTrigger value="users" className="text-sm dark:text-gray-300 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white">{t('users')}</TabsTrigger>
            <TabsTrigger value="posts" className="text-sm dark:text-gray-300 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white">{t('posts')}</TabsTrigger>
            <TabsTrigger value="flags" className="text-sm dark:text-gray-300 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white">{t('flags')}</TabsTrigger>
            <TabsTrigger value="activity" className="text-sm dark:text-gray-300 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white">{t('activity')}</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card className="shadow-lg bg-white dark:bg-gray-800 border-0">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-gray-900 dark:text-white">
                  <span>{t('flagged_users_management')}</span>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input placeholder={t('search_users')} className="pl-10 w-64 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                  </div>
                </CardTitle>
                <CardDescription className="dark:text-gray-400">{t('review_manage_flagged_users')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {flaggedUsers.map((user) => (
                    <Card key={user.id} className="border-l-4 border-l-red-500 bg-white dark:bg-gray-700 dark:border-gray-600">
                      <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row justify-between space-y-4 md:space-y-0">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{user.name}</h3>
                              <Badge variant={
                                user.status === 'Restricted' ? 'destructive' :
                                  user.status === 'Under Review' ? 'secondary' : 'outline'
                              } className="dark:text-white">
                                {user.status}
                              </Badge>
                              <Badge variant="outline" className="text-red-600 dark:text-red-400 dark:border-red-400">
                                {user.flagCount} {t('flags')}
                              </Badge>
                            </div>
                            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                              <p><strong>{t('email')}:</strong> {user.email}</p>
                              <p><strong>{t('phone')}:</strong> {user.phone}</p>
                              <p><strong>{t('reason')}:</strong> {user.reason}</p>
                              <p><strong>{t('stats')}:</strong> {user.totalPosts} {t('posts')}, {user.completedSales} {t('sales_completed')}</p>
                              <p><strong>{t('joined')}:</strong> {user.joinDate}</p>
                            </div>
                          </div>
                          <div className="flex flex-col space-y-2 md:w-48">
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500"
                              onClick={() => handleUserAction(user.id, 'review')}
                            >
                              {t('review_details')}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="w-full"
                              onClick={() => handleUserAction(user.id, 'restrict')}
                            >
                              <Ban className="w-4 h-4 mr-1" />
                              {t('restrict_user')}
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="w-full dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500"
                              onClick={() => handleUserAction(user.id, 'warn')}
                            >
                              {t('send_warning')}
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
            <Card className="shadow-lg bg-white dark:bg-gray-800 border-0">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">{t('flagged_posts_management')}</CardTitle>
                <CardDescription className="dark:text-gray-400">{t('review_moderate_flagged_posts')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {flaggedPosts.map((post) => (
                    <Card key={post.id} className="border-l-4 border-l-orange-500 bg-white dark:bg-gray-700 dark:border-gray-600">
                      <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row justify-between space-y-4 md:space-y-0">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="font-semibold text-gray-900 dark:text-white">{post.title}</h3>
                              <Badge variant="secondary" className="dark:bg-gray-600 dark:text-white">{post.status}</Badge>
                            </div>
                            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                              <p><strong>{t('price')}:</strong> {post.price}</p>
                              <p><strong>{t('seller')}:</strong> {post.sellerName} ({post.sellerId})</p>
                              <p><strong>{t('reason')}:</strong> {post.reason}</p>
                              <p><strong>{t('flagged_by')}:</strong> {post.flaggedBy}</p>
                              <p><strong>{t('views')}:</strong> {post.views}</p>
                            </div>
                          </div>
                          <div className="flex flex-col space-y-2 md:w-48">
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500"
                              onClick={() => handlePostAction(post.id, 'view')}
                            >
                              {t('view_post')}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="w-full"
                              onClick={() => handlePostAction(post.id, 'remove')}
                            >
                              {t('remove_post')}
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="w-full dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500"
                              onClick={() => handlePostAction(post.id, 'approve')}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              {t('approve')}
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
            <Card className="shadow-lg bg-white dark:bg-gray-800 border-0">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">{t('flag_management_system')}</CardTitle>
                <CardDescription className="dark:text-gray-400">{t('advanced_flagging_tools')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800">
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-2 text-yellow-800 dark:text-yellow-100">{t('auto_detection_rules')}</h3>
                      <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
                        <li>• {t('rule_price_drop')}</li>
                        <li>• {t('rule_duplicate_post')}</li>
                        <li>• {t('rule_suspicious_contact')}</li>
                        <li>• {t('rule_sale_undone')}</li>
                      </ul>
                    </CardContent>
                  </Card>
                  <Card className="bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800">
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-2 text-red-800 dark:text-red-100">{t('user_report_categories')}</h3>
                      <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
                        <li>• {t('report_fake_post')}</li>
                        <li>• {t('report_spam')}</li>
                        <li>• {t('report_inappropriate')}</li>
                        <li>• {t('report_pricing_manipulation')}</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card className="shadow-lg bg-white dark:bg-gray-800 border-0">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">{t('recent_platform_activity')}</CardTitle>
                <CardDescription className="dark:text-gray-400">{t('realtime_activity_desc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className={`flex items-center justify-between p-3 rounded-lg border-l-4 ${activity.type === 'signup' ? 'border-l-green-500 bg-green-50 dark:bg-green-900/20' :
                      activity.type === 'flag' ? 'border-l-red-500 bg-red-50 dark:bg-red-900/20' :
                        activity.type === 'sale' ? 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20' :
                          activity.type === 'verification' ? 'border-l-purple-500 bg-purple-50 dark:bg-purple-900/20' :
                            'border-l-gray-500 bg-gray-50 dark:bg-gray-700'
                      }`}>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">{activity.action}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{t('by')} {activity.user}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{activity.details}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm text-gray-500 dark:text-gray-400">{activity.time}</span>
                        <div className={`inline-block w-2 h-2 rounded-full ml-2 ${activity.type === 'signup' ? 'bg-green-500' :
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
