
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertTriangle,
  CheckCircle,
  FileText,
  Flag,
  Search,
  Shield,
  Users,
  Ban,
  RefreshCw,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import api from '../lib/api';

const EMPTY_STATS = {
  totalUsers: 0,
  totalPosts: 0,
  flaggedPosts: 0,
  restrictedUsers: 0,
  todaySignups: 0,
  todayPosts: 0,
};

const normalizeAdminError = (error) => {
  const status = Number(error?.status || error?.response?.status || 0);
  const message = String(error?.message || '').toLowerCase();

  if (status === 401 || status === 403 || message.includes('permission') || message.includes('unauthorized')) {
    return 'You do not have access to admin operations in this session.';
  }

  return 'Admin dashboard data is temporarily unavailable. Please retry.';
};

const getSafeArray = (value) => (Array.isArray(value) ? value : []);

const AdminPanel = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const undoTimerRef = useRef(null);

  const [stats, setStats] = useState(EMPTY_STATS);
  const [flaggedUsers, setFlaggedUsers] = useState([]);
  const [flaggedPosts, setFlaggedPosts] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState('');

  const [userSearch, setUserSearch] = useState('');
  const [postSearch, setPostSearch] = useState('');

  const [pendingAction, setPendingAction] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [undoAction, setUndoAction] = useState(null);

  const clearUndo = useCallback(() => {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    setUndoAction(null);
  }, []);

  const queueUndo = useCallback((payload) => {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
    }

    setUndoAction(payload);
    undoTimerRef.current = setTimeout(() => {
      setUndoAction(null);
      undoTimerRef.current = null;
    }, 12000);
  }, []);

  const fetchDashboard = useCallback(async ({ panel = 'all' } = {}) => {
    const refreshingActivityPanel = panel === 'activity';

    if (refreshingActivityPanel) {
      setActivityLoading(true);
      setActivityError('');
    } else {
      setLoading(true);
    }

    try {
      const response = await api.get('/api/admin/dashboard');
      const payload = response?.data ?? response;

      setStats({ ...EMPTY_STATS, ...(payload?.stats || {}) });
      setFlaggedUsers(getSafeArray(payload?.flaggedUsers));
      setFlaggedPosts(getSafeArray(payload?.flaggedPosts));
      setRecentActivity(getSafeArray(payload?.recentActivity));
      if (refreshingActivityPanel) {
        setActivityError('');
      } else {
        setError('');
      }
    } catch (fetchError) {
      const normalizedError = normalizeAdminError(fetchError);
      if (refreshingActivityPanel) {
        setActivityError(normalizedError);
      } else {
        setError(normalizedError);
      }
      if (import.meta.env.DEV) {
        console.error('[AdminPanel] Dashboard fetch failed:', fetchError);
      }
    } finally {
      if (refreshingActivityPanel) {
        setActivityLoading(false);
      } else {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    return () => {
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }
    };
  }, [fetchDashboard]);

  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    if (!query) {
      return flaggedUsers;
    }

    return flaggedUsers.filter((user) => {
      const haystack = [
        user.name,
        user.email,
        user.phone,
        user.reason,
        user.status,
        user.id,
      ]
        .map((entry) => String(entry || '').toLowerCase())
        .join(' ');
      return haystack.includes(query);
    });
  }, [flaggedUsers, userSearch]);

  const filteredPosts = useMemo(() => {
    const query = postSearch.trim().toLowerCase();
    if (!query) {
      return flaggedPosts;
    }

    return flaggedPosts.filter((post) => {
      const haystack = [
        post.title,
        post.reason,
        post.sellerName,
        post.sellerId,
        post.status,
        post.id,
      ]
        .map((entry) => String(entry || '').toLowerCase())
        .join(' ');
      return haystack.includes(query);
    });
  }, [flaggedPosts, postSearch]);

  const openActionDialog = useCallback((payload) => {
    setPendingAction(payload);
  }, []);

  const handleUserAction = useCallback(
    (user, action) => {
      if (action === 'review') {
        navigate(`/complaints?userId=${encodeURIComponent(String(user.id || ''))}`);
        return;
      }

      if (action === 'warn') {
        toast({
          title: 'Warning workflow queued',
          description: 'Send policy reminders using neutral language and include evidence references.',
        });
        return;
      }

      if (action === 'suspend') {
        openActionDialog({
          kind: 'user',
          action: 'suspend',
          id: user.id,
          label: user.name,
          previousStatus: user.status,
          snapshot: user,
          confirmLabel: 'Restrict User',
          title: `Restrict ${user.name}?`,
          description:
            'This blocks account activity while review continues. Use this only when evidence supports temporary restriction.',
        });
        return;
      }

      if (action === 'unsuspend') {
        openActionDialog({
          kind: 'user',
          action: 'unsuspend',
          id: user.id,
          label: user.name,
          previousStatus: user.status,
          snapshot: user,
          confirmLabel: 'Re-Activate User',
          title: `Re-activate ${user.name}?`,
          description: 'This restores account access and moves status back to review mode.',
        });
      }
    },
    [navigate, openActionDialog, toast]
  );

  const handlePostAction = useCallback(
    (post, action) => {
      if (action === 'view') {
        navigate(`/post/${encodeURIComponent(String(post.id || ''))}`);
        return;
      }

      if (action === 'remove') {
        openActionDialog({
          kind: 'post',
          action: 'remove',
          id: post.id,
          label: post.title,
          previousStatus: post.status,
          snapshot: post,
          confirmLabel: 'Remove Post',
          title: `Remove "${post.title}"?`,
          description:
            'This will hide the post from the marketplace. Ensure the removal reason is policy-based and documented.',
        });
        return;
      }

      if (action === 'approve') {
        openActionDialog({
          kind: 'post',
          action: 'approve',
          id: post.id,
          label: post.title,
          previousStatus: post.status,
          snapshot: post,
          confirmLabel: 'Approve Post',
          title: `Approve "${post.title}"?`,
          description: 'This returns the post to active status and closes the current moderation flag.',
        });
      }
    },
    [navigate, openActionDialog]
  );

  const applyPostAction = useCallback(async (actionPayload) => {
    const response = await api.post('/api/admin/dashboard/flagged-posts/bulk-action', {
      postIds: [String(actionPayload.id)],
      action: actionPayload.action,
      reason: `Admin panel ${actionPayload.action} action`,
    });

    const payload = response?.data ?? response;
    const statusAfter = payload?.statusAfter || (actionPayload.action === 'approve' ? 'active' : 'removed');

    setFlaggedPosts((previous) => previous.filter((post) => String(post.id) !== String(actionPayload.id)));
    setStats((previous) => ({
      ...previous,
      flaggedPosts: Math.max(0, Number(previous.flaggedPosts || 0) - 1),
    }));

    toast({
      title: 'Post moderation updated',
      description: payload?.requestId
        ? `Request reference: ${payload.requestId}`
        : 'Post status updated successfully.',
    });

    if (actionPayload.action === 'approve' || actionPayload.action === 'remove') {
      queueUndo({
        kind: 'post',
        reverseAction: 'reflag',
        id: actionPayload.id,
        snapshot: { ...actionPayload.snapshot, status: actionPayload.previousStatus || 'flagged' },
        successMessage: 'Post restored to flagged review status.',
        requestId: payload?.requestId || '',
      });
    }

    return statusAfter;
  }, [queueUndo, toast]);

  const applyUserAction = useCallback(async (actionPayload) => {
    const response = await api.post('/api/admin/users/bulk-action', {
      userIds: [String(actionPayload.id)],
      action: actionPayload.action,
      reason: `Admin panel ${actionPayload.action} action`,
    });

    const payload = response?.data ?? response;
    const nextStatus = actionPayload.action === 'suspend' ? 'Restricted' : 'Under Review';

    setFlaggedUsers((previous) =>
      previous.map((user) =>
        String(user.id) === String(actionPayload.id)
          ? { ...user, status: nextStatus }
          : user
      )
    );

    setStats((previous) => ({
      ...previous,
      restrictedUsers: actionPayload.action === 'suspend'
        ? Number(previous.restrictedUsers || 0) + 1
        : Math.max(0, Number(previous.restrictedUsers || 0) - 1),
    }));

    toast({
      title: 'User moderation updated',
      description: payload?.requestId
        ? `Request reference: ${payload.requestId}`
        : 'User status updated successfully.',
    });

    if (actionPayload.action === 'suspend') {
      queueUndo({
        kind: 'user',
        reverseAction: 'unsuspend',
        id: actionPayload.id,
        snapshot: actionPayload.snapshot,
        successMessage: 'User restriction was reverted.',
        requestId: payload?.requestId || '',
      });
    }
  }, [queueUndo, toast]);

  const executePendingAction = useCallback(async () => {
    if (!pendingAction) {
      return;
    }

    setActionInProgress(true);
    setError('');

    try {
      if (pendingAction.kind === 'post') {
        await applyPostAction(pendingAction);
      } else if (pendingAction.kind === 'user') {
        await applyUserAction(pendingAction);
      }
      setPendingAction(null);
    } catch (actionError) {
      setError(normalizeAdminError(actionError));
      toast({
        title: 'Action failed',
        description: normalizeAdminError(actionError),
        variant: 'destructive',
      });
    } finally {
      setActionInProgress(false);
    }
  }, [applyPostAction, applyUserAction, pendingAction, toast]);

  const handleUndo = useCallback(async () => {
    if (!undoAction) {
      return;
    }

    setActionInProgress(true);
    setError('');

    try {
      if (undoAction.kind === 'post') {
        await api.post('/api/admin/dashboard/flagged-posts/bulk-action', {
          postIds: [String(undoAction.id)],
          action: undoAction.reverseAction,
          reason: 'Undo from admin panel',
        });

        setFlaggedPosts((previous) => {
          const alreadyPresent = previous.some((post) => String(post.id) === String(undoAction.id));
          if (alreadyPresent) {
            return previous;
          }
          return [{ ...undoAction.snapshot, status: 'flagged' }, ...previous];
        });

        setStats((previous) => ({
          ...previous,
          flaggedPosts: Number(previous.flaggedPosts || 0) + 1,
        }));
      }

      if (undoAction.kind === 'user') {
        await api.post('/api/admin/users/bulk-action', {
          userIds: [String(undoAction.id)],
          action: undoAction.reverseAction,
          reason: 'Undo from admin panel',
        });

        setFlaggedUsers((previous) =>
          previous.map((user) =>
            String(user.id) === String(undoAction.id)
              ? { ...user, status: undoAction.snapshot?.status || 'Under Review' }
              : user
          )
        );

        setStats((previous) => ({
          ...previous,
          restrictedUsers: Math.max(0, Number(previous.restrictedUsers || 0) - 1),
        }));
      }

      toast({
        title: 'Undo complete',
        description: undoAction.successMessage || 'Reverted successfully.',
      });

      clearUndo();
    } catch (undoError) {
      setError(normalizeAdminError(undoError));
      toast({
        title: 'Undo failed',
        description: normalizeAdminError(undoError),
        variant: 'destructive',
      });
    } finally {
      setActionInProgress(false);
    }
  }, [clearUndo, toast, undoAction]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 p-4 transition-colors duration-300">
        <div className="max-w-6xl mx-auto py-20 text-center">
          <div className="w-12 h-12 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading admin operations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 p-4 transition-colors duration-300">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="text-center md:text-left">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('admin_panel')}</h1>
          <p className="text-gray-600 dark:text-gray-300">{t('admin_panel_desc')}</p>
        </div>

        <Alert className="border-blue-200 bg-blue-50 text-blue-900">
          <Shield className="h-4 w-4 text-blue-700" />
          <AlertTitle>Moderation safety baseline</AlertTitle>
          <AlertDescription>
            Confirm evidence before actioning. Use neutral policy language, avoid accusations, and include traceable references.
          </AlertDescription>
        </Alert>

        {error ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Operational warning</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={fetchDashboard}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate('/dashboard')}>
                Open user dashboard
              </Button>
            </div>
          </Alert>
        ) : null}

        {undoAction ? (
          <Alert className="border-emerald-300 bg-emerald-50 text-emerald-900">
            <AlertTitle>Recent action available for undo</AlertTitle>
            <AlertDescription>
              Reverse the last moderation update if this was applied incorrectly.
              {undoAction.requestId ? ` Reference: ${undoAction.requestId}.` : ''}
            </AlertDescription>
            <div className="mt-3">
              <Button size="sm" variant="outline" onClick={handleUndo} disabled={actionInProgress}>
                Undo
              </Button>
            </div>
          </Alert>
        ) : null}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-700 dark:to-blue-900 text-white shadow-lg border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{Number(stats.totalUsers || 0)}</div>
                  <div className="text-blue-100 text-sm">{t('total_users')}</div>
                  <div className="text-blue-200 text-xs">+{Number(stats.todaySignups || 0)} {t('today')}</div>
                </div>
                <Users className="w-8 h-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 dark:from-green-700 dark:to-green-900 text-white shadow-lg border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{Number(stats.totalPosts || 0)}</div>
                  <div className="text-green-100 text-sm">{t('total_posts')}</div>
                  <div className="text-green-200 text-xs">+{Number(stats.todayPosts || 0)} {t('today')}</div>
                </div>
                <FileText className="w-8 h-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 dark:from-orange-700 dark:to-orange-900 text-white shadow-lg border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{Number(stats.flaggedPosts || 0)}</div>
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
                  <div className="text-2xl font-bold">{Number(stats.restrictedUsers || 0)}</div>
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
                <CardTitle className="flex items-center justify-between text-gray-900 dark:text-white flex-wrap gap-2">
                  <span>{t('flagged_users_management')}</span>
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      value={userSearch}
                      onChange={(event) => setUserSearch(event.target.value)}
                      placeholder={t('search_users')}
                      className="pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                </CardTitle>
                <CardDescription className="dark:text-gray-400">{t('review_manage_flagged_users')}</CardDescription>
              </CardHeader>
              <CardContent>
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-10 space-y-3">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No flagged users match this filter.
                    </p>
                    <Button variant="outline" size="sm" onClick={() => setUserSearch('')}>Clear User Filter</Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredUsers.map((user) => {
                      const isRestricted = String(user.status || '').toLowerCase() === 'restricted';

                      return (
                        <Card key={user.id} className="border-l-4 border-l-red-500 bg-white dark:bg-gray-700 dark:border-gray-600">
                          <CardContent className="p-4">
                            <div className="flex flex-col md:flex-row justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2 flex-wrap">
                                  <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{user.name}</h3>
                                  <Badge variant={isRestricted ? 'destructive' : 'secondary'} className="dark:text-white">
                                    {user.status || 'Flagged'}
                                  </Badge>
                                  <Badge variant="outline" className="text-red-600 dark:text-red-400 dark:border-red-400">
                                    {Number(user.flagCount || 0)} {t('flags')}
                                  </Badge>
                                </div>
                                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                                  <p><strong>{t('email')}:</strong> {user.email || 'N/A'}</p>
                                  <p><strong>{t('phone')}:</strong> {user.phone || 'N/A'}</p>
                                  <p><strong>{t('reason')}:</strong> {user.reason || 'Policy review triggered'}</p>
                                  <p><strong>{t('stats')}:</strong> {Number(user.totalPosts || 0)} {t('posts')}, {Number(user.completedSales || 0)} {t('sales_completed')}</p>
                                  <p><strong>{t('joined')}:</strong> {user.joinDate || 'N/A'}</p>
                                </div>
                              </div>
                              <div className="flex flex-col space-y-2 md:w-52">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500"
                                  onClick={() => handleUserAction(user, 'review')}
                                  disabled={actionInProgress}
                                >
                                  {t('review_details')}
                                </Button>
                                <Button
                                  size="sm"
                                  variant={isRestricted ? 'secondary' : 'destructive'}
                                  className="w-full"
                                  onClick={() => handleUserAction(user, isRestricted ? 'unsuspend' : 'suspend')}
                                  disabled={actionInProgress}
                                >
                                  <Ban className="w-4 h-4 mr-1" />
                                  {isRestricted ? 'Re-Activate User' : t('restrict_user')}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="w-full dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500"
                                  onClick={() => handleUserAction(user, 'warn')}
                                  disabled={actionInProgress}
                                >
                                  {t('send_warning')}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="posts">
            <Card className="shadow-lg bg-white dark:bg-gray-800 border-0">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white flex items-center justify-between gap-2 flex-wrap">
                  {t('flagged_posts_management')}
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      value={postSearch}
                      onChange={(event) => setPostSearch(event.target.value)}
                      placeholder="Search flagged posts"
                      className="pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                </CardTitle>
                <CardDescription className="dark:text-gray-400">{t('review_moderate_flagged_posts')}</CardDescription>
              </CardHeader>
              <CardContent>
                {filteredPosts.length === 0 ? (
                  <div className="text-center py-10 space-y-3">
                    <p className="text-sm text-gray-500 dark:text-gray-400">No flagged posts match this filter.</p>
                    <Button variant="outline" size="sm" onClick={() => setPostSearch('')}>Clear Post Filter</Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredPosts.map((post) => (
                      <Card key={post.id} className="border-l-4 border-l-orange-500 bg-white dark:bg-gray-700 dark:border-gray-600">
                        <CardContent className="p-4">
                          <div className="flex flex-col md:flex-row justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2 flex-wrap">
                                <h3 className="font-semibold text-gray-900 dark:text-white">{post.title}</h3>
                                <Badge variant="secondary" className="dark:bg-gray-600 dark:text-white">{post.status || 'flagged'}</Badge>
                              </div>
                              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                                <p><strong>{t('price')}:</strong> {post.price || 'N/A'}</p>
                                <p><strong>{t('seller')}:</strong> {post.sellerName || 'N/A'} ({post.sellerId || 'N/A'})</p>
                                <p><strong>{t('reason')}:</strong> {post.reason || 'Policy review required'}</p>
                                <p><strong>{t('flagged_by')}:</strong> {post.flaggedBy || 'system'}</p>
                                <p><strong>{t('views')}:</strong> {Number(post.views || 0)}</p>
                              </div>
                            </div>
                            <div className="flex flex-col space-y-2 md:w-48">
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500"
                                onClick={() => handlePostAction(post, 'view')}
                                disabled={actionInProgress}
                              >
                                {t('view_post')}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="w-full"
                                onClick={() => handlePostAction(post, 'remove')}
                                disabled={actionInProgress}
                              >
                                {t('remove_post')}
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                className="w-full dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500"
                                onClick={() => handlePostAction(post, 'approve')}
                                disabled={actionInProgress}
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
                )}
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
                      <ul className="list-disc list-inside text-sm space-y-1 text-gray-700 dark:text-gray-300">
                        <li>Rapid price changes requiring review</li>
                        <li>Potential duplicate listing clusters</li>
                        <li>Suspicious off-platform contact patterns</li>
                        <li>Repeated sale disputes requiring escalation</li>
                      </ul>
                    </CardContent>
                  </Card>
                  <Card className="bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800">
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-2 text-red-800 dark:text-red-100">{t('user_report_categories')}</h3>
                      <ul className="list-disc list-inside text-sm space-y-1 text-gray-700 dark:text-gray-300">
                        <li>Possible authenticity concerns</li>
                        <li>Potential spam behavior</li>
                        <li>Potentially inappropriate listing content</li>
                        <li>Possible pricing manipulation pattern</li>
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
                {recentActivity.length === 0 ? (
                  <div className="text-center py-8 space-y-3">
                    <p className="text-sm text-gray-500 dark:text-gray-400">No recent admin activity available.</p>
                    <Button size="sm" variant="outline" onClick={fetchDashboard}>Refresh Activity</Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentActivity.map((activity, index) => {
                      const activityType = String(activity.type || '').toLowerCase();
                      const styleClass = activityType === 'signup'
                        ? 'border-l-green-500 bg-green-50 dark:bg-green-900/20'
                        : activityType === 'flag'
                          ? 'border-l-red-500 bg-red-50 dark:bg-red-900/20'
                          : activityType === 'sale'
                            ? 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : activityType === 'verification'
                              ? 'border-l-purple-500 bg-purple-50 dark:bg-purple-900/20'
                              : 'border-l-gray-500 bg-gray-50 dark:bg-gray-700';

                      return (
                        <div key={`${activity.action}-${index}`} className={`flex items-center justify-between p-3 rounded-lg border-l-4 ${styleClass}`}>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-white">{activity.action || 'Activity event'}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">{t('by')} {activity.user || 'system'}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{activity.details || 'No additional details available.'}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-sm text-gray-500 dark:text-gray-400">{activity.time || 'now'}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog
        open={Boolean(pendingAction)}
        onOpenChange={(open) => {
          if (!open && !actionInProgress) {
            setPendingAction(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pendingAction?.title || 'Confirm action'}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.description || 'This action changes moderation state and may impact user visibility.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionInProgress}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executePendingAction} disabled={actionInProgress}>
              {actionInProgress ? 'Applying...' : pendingAction?.confirmLabel || 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminPanel;
