import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getChannelById, createChannelPost, followChannel } from '../lib/api';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Image as ImageIcon, Loader2, RefreshCw, Users, Video } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import EmptyState from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const ChannelPage = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { channelId: routeChannelId, id: routeId } = useParams();
  const channelId = routeChannelId || routeId;
  const [channel, setChannel] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [description, setDescription] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [type, setType] = useState('text');
  const [isOwner, setIsOwner] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [error, setError] = useState(null);

  const applyChannelPayload = useCallback((response) => {
    const payload = response?.data ?? response;
    const channelData = payload?.channel || payload || null;
    const currentUserId = String(localStorage.getItem('userId') || '');

    setChannel(channelData);
    setIsOwner(
      Boolean(payload?.isOwner)
      || (channelData?.owner_id && String(channelData.owner_id) === currentUserId)
    );
    setPosts(
      Array.isArray(payload?.posts)
        ? payload.posts
        : (Array.isArray(channelData?.posts) ? channelData.posts : [])
    );
  }, []);

  const fetchChannel = useCallback(async () => {
    if (!channelId) {
      setError(t('something_went_wrong') || 'Failed to load channel');
      setChannel(null);
      setPosts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await getChannelById(channelId);
      applyChannelPayload(response);
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Failed to fetch channel:', err);
      }
      setError(err?.message || t('something_went_wrong') || 'Failed to load channel');
      setChannel(null);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [applyChannelPayload, channelId, t]);

  useEffect(() => {
    fetchChannel();
  }, [fetchChannel]);

  const normalizedPosts = useMemo(() => {
    return [...posts].sort((a, b) => {
      const first = new Date(b.created_at || 0).getTime();
      const second = new Date(a.created_at || 0).getTime();
      return first - second;
    });
  }, [posts]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!channelId || submitting) return;

    if (type === 'text' && !description.trim()) {
      toast({
        title: t('validation_error') || 'Validation Error',
        description: t('enter_description') || 'Enter a description before posting.',
        variant: 'destructive'
      });
      return;
    }

    if ((type === 'image' || type === 'video') && !mediaUrl.trim() && !description.trim()) {
      toast({
        title: t('validation_error') || 'Validation Error',
        description: t('media_or_description_required') || 'Add media URL or description.',
        variant: 'destructive'
      });
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await createChannelPost(channelId, { description, type, media_url: mediaUrl });
      setDescription('');
      setMediaUrl('');
      await fetchChannel();
      toast({
        title: t('success') || 'Success',
        description: t('post_created') || 'Channel post created successfully.'
      });
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Failed to create channel post:', err);
      }
      const message = err?.message || t('something_went_wrong') || 'Failed to post';
      setError(message);
      toast({
        title: t('error') || 'Error',
        description: message,
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleFollow = async () => {
    if (!channelId || followBusy || isOwner) return;
    setFollowBusy(true);
    setError(null);
    try {
      const response = await followChannel(channelId);
      const payload = response?.data ?? response;
      const action = String(payload?.action || '').toLowerCase();

      if (action === 'followed' || action === 'unfollowed') {
        setChannel((prev) => {
          if (!prev) return prev;
          const currentlyFollowing = Boolean(prev.is_following);
          const nextFollowing = action === 'followed';
          const currentFollowers = Number.parseInt(prev.follower_count, 10) || 0;
          const followerDelta =
            nextFollowing === currentlyFollowing ? 0 : (nextFollowing ? 1 : -1);

          return {
            ...prev,
            is_following: nextFollowing,
            follower_count: Math.max(0, currentFollowers + followerDelta)
          };
        });
      } else {
        await fetchChannel();
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Failed to toggle follow:', err);
      }
      const message = err?.message || t('something_went_wrong') || 'Failed to update follow state';
      setError(message);
      toast({
        title: t('error') || 'Error',
        description: message,
        variant: 'destructive'
      });
    } finally {
      setFollowBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto max-w-4xl p-4 sm:p-6">
        <div className="space-y-3">
          {[1, 2, 3].map((idx) => (
            <Card key={idx} className="animate-pulse">
              <CardContent className="p-4">
                <div className="mb-2 h-5 w-52 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="container mx-auto max-w-3xl p-4 sm:p-6">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <p className="text-sm text-red-600">
              {error || (t('something_went_wrong') || 'Failed to load channel')}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" className="gap-2" onClick={fetchChannel}>
                <RefreshCw className="h-4 w-4" />
                {t('retry') || 'Retry'}
              </Button>
              <Link to="/channels">
                <Button className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  {t('back') || 'Back'}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl p-4 sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <Link
          to="/channels"
          className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('back') || 'Back'}
        </Link>
      </div>

      <Card className="mb-5">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start">
          <div className="flex items-center gap-3">
            {(channel.logo_url || channel.profile_pic) ? (
              <img
                src={channel.logo_url || channel.profile_pic}
                alt="logo"
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                <Users className="h-7 w-7" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{channel.name}</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {(t('owner') || 'Owner')}: {channel.owner_name || channel.owner_id || '-'}
              </p>
              <p className="text-xs text-gray-400">
                {(t('followers') || 'Followers')}: {channel.follower_count || 0}
              </p>
            </div>
          </div>
          {!isOwner && (
            <Button
              type="button"
              onClick={handleToggleFollow}
              disabled={followBusy}
              className="sm:ml-auto"
              variant={channel.is_following ? 'outline' : 'default'}
            >
              {followBusy ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('loading') || 'Loading...'}
                </span>
              ) : (
                channel.is_following ? (t('unfollow') || 'Unfollow') : (t('follow') || 'Follow')
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {(channel.bio || channel.description) && (
        <Card className="mb-5">
          <CardContent className="p-4 text-sm text-gray-600 dark:text-gray-300">
            {channel.bio || channel.description}
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {isOwner && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
              {t('create_post') || 'Create Post'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <Textarea
                className="min-h-[90px]"
                placeholder={t('description_placeholder') || 'Write a description'}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <Input
                placeholder={t('media_url_optional') || 'Media URL (optional)'}
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
              />
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="text">{t('text_type') || 'Text'}</option>
                <option value="image">{t('image_type') || 'Image'}</option>
                <option value="video">{t('video_type') || 'Video'}</option>
              </select>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('publishing') || 'Publishing...'}
                  </span>
                ) : (
                  t('post_button') || 'Post'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div>
        <h3 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
          {t('channel_posts') || 'Posts'}
        </h3>
        {normalizedPosts.length === 0 ? (
          <EmptyState
            type="posts"
            title={t('no_posts') || 'No posts yet'}
            message={isOwner ? (t('start_posting') || 'Create the first post for this channel.') : (t('check_back_later') || 'Check back later for updates.')}
          />
        ) : (
          <ul className="space-y-3">
            {normalizedPosts.map((post) => (
              <li key={post.post_id}>
                <Card>
                  <CardContent className="p-4">
                    {post.description && (
                      <p className="mb-2 whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-100">
                        {post.description}
                      </p>
                    )}
                    {post.image_url && (
                      <a
                        href={post.image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mb-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                      >
                        <ImageIcon className="h-4 w-4" />
                        {t('view_image') || 'View image'}
                      </a>
                    )}
                    {post.video_url && (
                      <a
                        href={post.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mb-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                      >
                        <Video className="h-4 w-4" />
                        {t('view_video') || 'View video'}
                      </a>
                    )}
                    <p className="text-xs text-gray-400">
                      {new Date(post.created_at).toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ChannelPage;
