import React, { useEffect, useState } from 'react';
import { getAllChannels, followChannel } from '../lib/api';
import { Link } from 'react-router-dom';

import { useTranslation } from 'react-i18next';

const ChannelsListPage = () => {
  const { t } = useTranslation();
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [busyChannelId, setBusyChannelId] = useState(null);

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
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Channels & Pages</h1>
      {loading ? <p>Loading...</p> : error ? <p>{error}</p> : (
        <ul>
          {channels.map(channel => (
            <li key={channel.channel_id || channel.id} className="border-b py-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {(channel.logo_url || channel.profile_pic) && <img src={channel.logo_url || channel.profile_pic} alt="logo" className="w-10 h-10 rounded-full object-cover" />}
                <div>
                  <span className="font-semibold text-lg">{channel.name}</span>
                  <div className="text-xs text-gray-500">{channel.description || channel.bio}</div>
                  <div className="text-xs text-gray-400">Owner: {channel.owner_name || channel.owner_id || '-'}</div>
                  <div className="text-xs text-gray-400">Followers: {channel.follower_count || 0}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="px-2 py-1 bg-blue-500 text-white rounded disabled:opacity-60"
                  onClick={() => handleFollow(channel.channel_id || channel.id)}
                  disabled={busyChannelId === (channel.channel_id || channel.id)}
                >
                  {channel.is_following ? (t('unfollow') || 'Unfollow') : (t('follow') || 'Follow')}
                </button>
                <Link to={`/channels/${channel.channel_id || channel.id}`} className="ml-2 underline text-blue-700">View</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ChannelsListPage;
