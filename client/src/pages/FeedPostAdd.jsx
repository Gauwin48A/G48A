import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const FeedPostAdd = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    description: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateFields = () => {
    const errors = {};
    if (!formData.description || formData.description.length < 5 || formData.description.length > 500) errors.description = 'Description is required (5-500 chars).';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateFields()) return;
    setIsLoading(true);
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${baseUrl}/api/feed/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ description: formData.description })
      });
      const result = await res.json();
      if (res.ok) {
        toast({ title: 'Feed Post Created', description: 'Your text post has been published.' });
        navigate('/feed');
      } else {
        toast({ title: 'Error', description: result.error || 'Failed to create feed post.', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: err.message || 'Failed to create feed post.', variant: 'destructive' });
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100">
      <div className="max-w-2xl mx-auto px-4 py-8 pb-40">
        <Button onClick={() => navigate('/feed')} variant="outline" className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Feed
        </Button>
        <Card className="shadow-xl border-0 rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-sky-500 to-blue-600 text-white">
            <CardTitle className="text-2xl">Create Text Post</CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="space-y-8">
              <div>
                <Label htmlFor="description" className="text-sm font-semibold text-gray-700">Description *</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Write your update here..."
                  className="mt-2 h-32 border-2 border-gray-200 focus:border-sky-500"
                  required
                  maxLength={500}
                  minLength={5}
                />
                {formErrors.description && <div className="text-red-500 text-xs mt-1">{formErrors.description}</div>}
              </div>
              <Button onClick={handleSubmit} className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700" disabled={isLoading}>
                {isLoading ? 'Publishing...' : 'Publish Post'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FeedPostAdd;
