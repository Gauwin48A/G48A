import React, { useEffect, useState } from 'react';
import { getChannelByUser, createChannelPost } from '../lib/api';
import { useParams } from 'react-router-dom';

import { useTranslation } from 'react-i18next';

const ChannelPage = () => {
  const { t } = useTranslation();
  const { channelId } = useParams();
  const [channel, setChannel] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [description, setDescription] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [type, setType] = useState('text');
  const [isOwner, setIsOwner] = useState(false);
  const [error, setError] = useState(null);

  const applyChannelPayload = (response) => {
    const payload = response?.data ?? response;
    setChannel(payload || null);
    setIsOwner(Boolean(payload?.isOwner));
    setPosts(Array.isArray(payload?.posts) ? payload.posts : []);
  };

  useEffect(() => {
    let isActive = true;
    const fetchChannel = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getChannelByUser(channelId);
        if (!isActive) return;
        applyChannelPayload(response);
      } catch (err) {
        if (import.meta.env.DEV) {
          console.error('Failed to fetch channel:', err);
        }
        if (isActive) {
          setError(t('something_went_wrong') || 'Failed to load channel');
          setChannel(null);
          setPosts([]);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };
    fetchChannel();
    return () => {
      isActive = false;
    };
  }, [channelId, t]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await createChannelPost(channelId, { description, type, media_url: mediaUrl });
      setDescription('');
      setMediaUrl('');
      // Refresh posts
      const response = await getChannelByUser(channelId);
      applyChannelPayload(response);
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Failed to create channel post:', err);
      }
      setError(t('something_went_wrong') || 'Failed to post');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div>{t('loading')}</div>;
  if (!channel) return <div>{error || (t('something_went_wrong') || 'Failed to load channel')}</div>;

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center gap-4 mb-4">
        {channel.profile_pic && <img src={channel.profile_pic} alt="logo" className="w-16 h-16 rounded-full object-cover" />}
        <div>
          <div className="font-bold text-xl">{channel.name}</div>
          <div className="text-xs text-gray-500">{t('owner_label', { name: channel.owner_name })}</div>
          <div className="text-xs text-gray-400">{t('followers_count', { count: channel.follower_count })}</div>
        </div>
      </div>
      <div className="mb-4 text-gray-600">{channel.bio}</div>
      {isOwner && (
        <form onSubmit={handleSubmit} className="mb-4">
          <textarea
            className="w-full border rounded p-2 mb-2"
            placeholder={t('description_placeholder')}
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
          />
          <input
            className="w-full border rounded p-2 mb-2"
            placeholder={t('media_url_optional')}
            value={mediaUrl}
            onChange={e => setMediaUrl(e.target.value)}
          />
          <select className="w-full border rounded p-2 mb-2" value={type} onChange={e => setType(e.target.value)}>
            <option value="text">{t('text_type')}</option>
            <option value="image">{t('image_type')}</option>
            <option value="video">{t('video_type')}</option>
          </select>
          <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-60">{t('post_button')}</button>
        </form>
      )}
      <div>
        <h3 className="font-bold mb-2">{t('channel_posts')}</h3>
        {posts.length === 0 ? <div>{t('no_posts')}</div> : (
          <ul className="space-y-2">
            {posts.map(post => (
              <li key={post.post_id} className="border rounded p-2">
                <div className="font-semibold">{post.type === 'text' ? post.description : <a href={post.media_url} target="_blank" rel="noopener noreferrer">{post.type}</a>}</div>
                <div className="text-xs text-gray-400">{new Date(post.created_at).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ChannelPage;
