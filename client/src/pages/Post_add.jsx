import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { addTextPost } from '../lib/api';

const PostAdd = () => {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Description is required');
      return;
    }
    if (description.length < 5 || description.length > 500) {
      setError('Description must be 5-500 characters.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await addTextPost({ description });
      toast({ title: 'Post published!' });
      setDescription('');
      navigate('/feed');
    } catch (err) {
      setError('Failed to publish post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8">
      <h2 className="text-2xl font-bold mb-4">Add New Text Post</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          className="w-full border rounded p-2"
          rows={5}
          placeholder="Enter your post description..."
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
        {error && <div className="text-red-500">{error}</div>}
        <Button type="submit" disabled={loading} className="bg-blue-600 text-white">
          {loading ? 'Publishing...' : 'Publish'}
        </Button>
      </form>
    </div>
  );
};

export default PostAdd;
