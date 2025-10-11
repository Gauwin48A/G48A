import React, { useEffect, useState } from 'react';
import axios from 'axios';

const ChannelPage = ({ channelId }) => {
  const [channel, setChannel] = useState(null);
  const [posts, setPosts] = useState([]);
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    const fetchChannel = async () => {
      const res = await axios.get(`/api/channels/${channelId}`);
      setChannel(res.data.channel);
      setPosts(res.data.posts);
      // Assume backend returns isOwner flag in channel object if needed
      setIsOwner(res.data.channel?.isOwner || false);
    };
    fetchChannel();
  }, [channelId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await axios.post(`/api/channels/${channelId}/posts`, { description, image_url: imageUrl, video_url: videoUrl });
    setDescription('');
    setImageUrl('');
    setVideoUrl('');
    // Refresh posts
    const res = await axios.get(`/api/channels/${channelId}`);
    setPosts(res.data.posts);
  };

  if (!channel) return <div>Loading...</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-2">{channel.name}</h1>
      <div className="mb-4 text-gray-600">{channel.description}</div>
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
            placeholder="Image URL (optional)"
            value={imageUrl}
            onChange={e => setImageUrl(e.target.value)}
          />
          <input
            className="w-full border rounded p-2 mb-2"
            placeholder="Video URL (optional, max 3 per channel)"
            value={videoUrl}
            onChange={e => setVideoUrl(e.target.value)}
          />
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Publish</button>
        </form>
      )}
      <ul>
        {posts.map(post => (
          <li key={post.channel_post_id} className="border-b py-2">
            <div>{post.description}</div>
            {post.image_url && <img src={post.image_url} alt="" className="max-w-xs my-2" />}
            {post.video_url && <video src={post.video_url} controls className="max-w-xs my-2" />}
            <div className="text-xs text-gray-500">{new Date(post.created_at).toLocaleString()}</div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ChannelPage;
