import React, { useState } from 'react';
import axios from 'axios';

const CreateChannelPage = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/channels', { name, description });
      setMessage('Channel created successfully!');
      setName('');
      setDescription('');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Error creating channel');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Create Channel/Page</h1>
      <form onSubmit={handleSubmit} className="mb-4">
        <input
          className="w-full border rounded p-2 mb-2"
          placeholder="Channel/Page Name"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <textarea
          className="w-full border rounded p-2 mb-2"
          placeholder="Description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
        />
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Create</button>
      </form>
      {message && <div className="text-green-600">{message}</div>}
    </div>
  );
};

export default CreateChannelPage;
