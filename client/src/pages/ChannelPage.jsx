import React, { useEffect, useState } from 'react';
import { getChannelByUser, createChannelPost } from '../lib/api';
import { useParams } from 'react-router-dom';

import { useTranslation } from 'react-i18next';

const ChannelPage = () => {
  const { t } = useTranslation();
  const { channelId } = useParams();
  const [channel, setChannel] = useState(null);
  const [posts, setPosts] = useState([]);
  const [description, setDescription] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [type, setType] = useState('text');
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    const fetchChannel = async () => {
      const res = await getChannelByUser(channelId);
      setChannel(res.data);
      setIsOwner(res.data.isOwner || false);
      setPosts(res.data.posts || []);
    };
    fetchChannel();
  }, [channelId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await createChannelPost(channelId, { description, type, media_url: mediaUrl });
    setDescription('');
    setMediaUrl('');
    // Refresh posts
    const res = await getChannelByUser(channelId);
    setPosts(res.data.posts || []);
  };

  if (!channel) return <div>{t('loading')}</div>;

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
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">{t('post_button')}</button>
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
