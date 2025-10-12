import React, { useEffect, useState } from 'react';
import { getChannelByUser, createChannelPost } from '../lib/api';
import { useParams } from 'react-router-dom';

const ChannelPage = () => {
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

  if (!channel) return <div>Loading...</div>;

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center gap-4 mb-4">
        {channel.profile_pic && <img src={channel.profile_pic} alt="logo" className="w-16 h-16 rounded-full object-cover" />}
        <div>
          <div className="font-bold text-xl">{channel.name}</div>
          <div className="text-xs text-gray-500">Owner: {channel.owner_name}</div>
          <div className="text-xs text-gray-400">Followers: {channel.follower_count}</div>
        </div>
      </div>
      <div className="mb-4 text-gray-600">{channel.bio}</div>
      {isOwner && (
        <form onSubmit={handleSubmit} className="mb-4">
          <textarea
            className="w-full border rounded p-2 mb-2"
            placeholder="Description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
          />
          <input
            className="w-full border rounded p-2 mb-2"
            placeholder="Media URL (optional)"
            value={mediaUrl}
            onChange={e => setMediaUrl(e.target.value)}
          />
          <select className="w-full border rounded p-2 mb-2" value={type} onChange={e => setType(e.target.value)}>
            <option value="text">Text</option>
            <option value="image">Image</option>
            <option value="video">Video</option>
          </select>
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Post</button>
        </form>
      )}
      <div>
        <h3 className="font-bold mb-2">Posts</h3>
        {posts.length === 0 ? <div>No posts yet.</div> : (
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
