import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { addTextPost } from '../lib/api';
import { useTranslation } from 'react-i18next';

const PostAdd = () => {
  const { t } = useTranslation();
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setError(t('description_required') || 'Description is required');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await addTextPost({ description });
      toast({ title: t('post_published') || 'Post published!' });
      navigate('/feed');
    } catch (err) {
      setError(t('publish_failed') || 'Failed to publish post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      <div className="max-w-xl mx-auto py-8 px-4">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">{t('add_new_post') || 'Add New Post'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            className="w-full border rounded p-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            rows={5}
            placeholder={t('enter_description') || 'Enter your post description...'}
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
          {error && <div className="text-red-500">{error}</div>}
          <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
            {loading ? t('publishing') || 'Publishing...' : t('publish') || 'Publish'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default PostAdd;
