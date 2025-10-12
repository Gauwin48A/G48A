import React, { useEffect, useState } from 'react';
import { getAllChannels, followChannel } from '../lib/api';

const ChannelsListPage = () => {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchChannels = async () => {
    setLoading(true);
    const res = await getAllChannels();
    setChannels(res.data);
    setLoading(false);
  };

  const handleFollow = async (id) => {
    await followChannel(id);
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
              <div className="flex items-center gap-3">
                {channel.profile_pic && <img src={channel.profile_pic} alt="logo" className="w-10 h-10 rounded-full object-cover" />}
                <div>
                  <span className="font-semibold text-lg">{channel.name}</span>
                  <div className="text-xs text-gray-500">{channel.bio}</div>
                  <div className="text-xs text-gray-400">Owner: {channel.owner_name}</div>
                  <div className="text-xs text-gray-400">Followers: {channel.follower_count}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-2 py-1 bg-blue-500 text-white rounded" onClick={() => handleFollow(channel.channel_id)}>Follow/Unfollow</button>
                <a href={`/channels/${channel.channel_id}`} className="ml-2 underline text-blue-700">View</a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ChannelsListPage;
