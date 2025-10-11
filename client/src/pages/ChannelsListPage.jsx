import React, { useEffect, useState } from 'react';
import axios from 'axios';

const ChannelsListPage = () => {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchChannels = async () => {
    setLoading(true);
    const res = await axios.get('/api/channels');
    setChannels(res.data);
    setLoading(false);
  };

  const handleFollow = async (id) => {
    await axios.post(`/api/channels/${id}/follow`);
    fetchChannels();
  };
  const handleUnfollow = async (id) => {
    await axios.post(`/api/channels/${id}/unfollow`);
    fetchChannels();
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Channels & Pages</h1>
      {loading ? <p>Loading...</p> : (
        <ul>
          {channels.map(channel => (
            <li key={channel.channel_id} className="border-b py-2 flex items-center justify-between">
              <div>
                <span className="font-semibold">{channel.name}</span> by {channel.owner}
                <div className="text-xs text-gray-500">{channel.description}</div>
              </div>
              <div>
                <button className="px-2 py-1 bg-blue-500 text-white rounded mr-2" onClick={() => handleFollow(channel.channel_id)}>Follow</button>
                <button className="px-2 py-1 bg-gray-400 text-white rounded" onClick={() => handleUnfollow(channel.channel_id)}>Unfollow</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ChannelsListPage;
