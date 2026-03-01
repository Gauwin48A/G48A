import React, { useState } from 'react';
import { createChannel } from '@/lib/api';
import { useNavigate } from 'react-router-dom';

import { useTranslation } from 'react-i18next';

const CreateChannelPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!name.trim() || !category.trim()) {
      setIsError(true);
      setMessage(t('channel_name_and_category_required') || 'Channel name and category are required');
      return;
    }

    setSubmitting(true);
    setIsError(false);
    setMessage('');
    try {
      const response = await createChannel({ name, description, category });
      const payload = response?.data ?? response;
      const channel = payload?.channel || payload || null;

      setMessage(t('channel_created_successfully') || 'Channel created successfully!');
      setName('');
      setDescription('');
      setCategory('');
      const createdChannelId = channel?.channel_id || channel?.id || null;
      if (createdChannelId) {
        navigate(`/channels/${createdChannelId}`);
      }
    } catch (err) {
      setIsError(true);
      setMessage(err?.message || err?.response?.data?.error || t('something_went_wrong') || 'Error creating channel');
    } finally {
      setSubmitting(false);
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
          required
        />
        <textarea
          className="w-full border rounded p-2 mb-2"
          placeholder="Description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
        />
        <input
          className="w-full border rounded p-2 mb-2"
          placeholder="Category"
          value={category}
          onChange={e => setCategory(e.target.value)}
          required
        />
        <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-60">
          {submitting ? (t('loading') || 'Loading...') : (t('create') || 'Create')}
        </button>
      </form>
      {message && <div className={isError ? 'text-red-600' : 'text-green-600'}>{message}</div>}
    </div>
  );
};

export default CreateChannelPage;
