import React, { useEffect, useMemo, useState } from 'react';
import { getAllChannels, followChannel } from '../lib/api';
import { Link, useNavigate } from 'react-router-dom';
import { Search, RefreshCw, Users, PlusCircle } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

import { useTranslation } from 'react-i18next';

const ChannelsListPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [busyChannelId, setBusyChannelId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchChannels = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getAllChannels();
      const payload = response?.data ?? response;
      setChannels(Array.isArray(payload) ? payload : []);
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Failed to fetch channels:', err);
      }
      setChannels([]);
      setError(t('something_went_wrong') || 'Failed to load channels');
    } finally {
      setLoading(false);
    }
  };

  const visibleChannels = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return channels;

    return channels.filter((channel) => {
      const name = String(channel.name || '').toLowerCase();
      const description = String(channel.description || channel.bio || '').toLowerCase();
      const owner = String(channel.owner_name || channel.owner_id || '').toLowerCase();
      return name.includes(query) || description.includes(query) || owner.includes(query);
    });
  }, [channels, searchTerm]);

  const handleFollow = async (id) => {
    if (busyChannelId) return;
    setBusyChannelId(id);
    setError(null);
    try {
      const response = await followChannel(id);
      const payload = response?.data ?? response;
      const action = String(payload?.action || '').toLowerCase();

      if (action === 'followed' || action === 'unfollowed') {
        setChannels((prev) =>
          prev.map((channel) => {
            const channelId = channel.channel_id || channel.id;
            if (String(channelId) !== String(id)) return channel;

            const currentlyFollowing = Boolean(channel.is_following);
            const nextFollowing = action === 'followed' ? true : false;
            const currentFollowers = Number.parseInt(channel.follower_count, 10) || 0;
            const followerDelta =
              nextFollowing === currentlyFollowing ? 0 : (nextFollowing ? 1 : -1);

            return {
              ...channel,
              is_following: nextFollowing,
              follower_count: Math.max(0, currentFollowers + followerDelta)
            };
          })
        );
      } else {
        await fetchChannels();
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Failed to follow/unfollow channel:', err);
      }
      setError(err?.message || t('something_went_wrong') || 'Failed to update follow state');
    } finally {
      setBusyChannelId(null);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  return (
    <div className="container mx-auto max-w-5xl p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('channels') || 'Channels'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('discover_channels') || 'Discover communities and follow creators you trust.'}
          </p>
        </div>
        <Link to="/channels/create">
          <Button className="gap-2 bg-blue-600 text-white hover:bg-blue-700">
            <PlusCircle className="h-4 w-4" />
            {t('create_channel') || 'Create Channel'}
          </Button>
        </Link>
      </div>

      <div className="relative mb-5">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t('search_channels') || 'Search by name, owner, or description'}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((idx) => (
            <Card key={idx} className="animate-pulse">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700" />
                  <div className="space-y-2">
                    <div className="h-4 w-40 rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-3 w-56 rounded bg-gray-200 dark:bg-gray-700" />
                  </div>
                </div>
                <div className="h-9 w-24 rounded bg-gray-200 dark:bg-gray-700" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="border-red-200">
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <p className="text-sm font-medium text-red-600">{error}</p>
            <Button variant="outline" className="gap-2" onClick={fetchChannels}>
              <RefreshCw className="h-4 w-4" />
              {t('retry') || 'Retry'}
            </Button>
          </CardContent>
        </Card>
      ) : visibleChannels.length === 0 ? (
        <EmptyState
          type="search"
          title={searchTerm ? (t('no_channels_match') || 'No channels matched your search') : (t('no_channels_yet') || 'No channels yet')}
          message={searchTerm ? (t('try_different_keywords') || 'Try a different keyword.') : (t('be_first_create_channel') || 'Be the first to create a channel.')}
          actionLabel={searchTerm ? '' : (t('create_channel') || 'Create Channel')}
          onAction={searchTerm ? null : () => navigate('/channels/create')}
        />
      ) : (
        <ul className="space-y-3">
          {visibleChannels.map((channel) => {
            const channelKey = channel.channel_id || channel.id;
            return (
              <li key={channelKey}>
                <Card>
                  <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      {(channel.logo_url || channel.profile_pic) ? (
                        <img
                          src={channel.logo_url || channel.profile_pic}
                          alt="logo"
                          className="h-11 w-11 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                          <Users className="h-5 w-5" />
                        </div>
                      )}
                      <div>
                        <p className="text-base font-semibold text-gray-900 dark:text-white">{channel.name}</p>
                        <p className="line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                          {channel.description || channel.bio || (t('no_description') || 'No description')}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          {(t('owner') || 'Owner')}: {channel.owner_name || channel.owner_id || '-'} - {(t('followers') || 'Followers')}: {channel.follower_count || 0}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        className="px-3"
                        onClick={() => handleFollow(channelKey)}
                        disabled={busyChannelId === channelKey}
                        variant={channel.is_following ? 'outline' : 'default'}
                      >
                        {busyChannelId === channelKey
                          ? (t('loading') || 'Loading...')
                          : (channel.is_following ? (t('unfollow') || 'Unfollow') : (t('follow') || 'Follow'))}
                      </Button>
                      <Link
                        to={`/channels/${channelKey}`}
                        className="rounded-md border border-blue-200 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300"
                      >
                        {t('view') || 'View'}
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default ChannelsListPage;

