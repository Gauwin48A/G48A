import React, { useMemo, useState } from 'react';
import { createChannel } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { getAccessToken, getUserId } from '@/utils/authStorage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, PlusCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';

const CreateChannelPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const token = getAccessToken();
  const userId = getUserId(user);
  const isLoggedIn = Boolean(token && userId);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const validationError = useMemo(() => {
    if (!name.trim() || !category.trim()) {
      return t('channel_name_and_category_required') || 'Channel name and category are required.';
    }

    if (name.trim().length < 3) {
      return 'Channel name must be at least 3 characters.';
    }

    if (category.trim().length < 2) {
      return 'Category must be at least 2 characters.';
    }

    return '';
  }, [category, name, t]);

  const canSubmit = !submitting && !validationError;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) {
      setSubmitError(validationError || 'Please fix form errors before submitting.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    setSuccessMessage('');

    try {
      const response = await createChannel({
        name: name.trim(),
        description: description.trim(),
        category: category.trim(),
      });

      const payload = response?.data ?? response;
      const channel = payload?.channel || payload || null;
      const createdChannelId = channel?.channel_id || channel?.id || null;

      setSuccessMessage(t('channel_created_successfully') || 'Channel created successfully.');

      if (createdChannelId) {
        navigate(`/channels/${createdChannelId}`);
        return;
      }

      navigate('/channels');
    } catch (error) {
      const status = Number(error?.status || error?.response?.status || 0);
      if (status === 401 || status === 403) {
        setSubmitError('Your session expired. Please sign in again to create channels.');
      } else {
        setSubmitError(error?.message || error?.response?.data?.error || t('something_went_wrong') || 'Error creating channel.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 px-4 py-20">
        <Card className="max-w-lg mx-auto">
          <CardHeader>
            <CardTitle>Create Channel</CardTitle>
            <CardDescription>Sign in to create and manage your own channel.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => navigate('/login', { state: { returnTo: '/channels/create' } })} className="w-full">
              Sign In to Continue
            </Button>
            <Button variant="outline" className="w-full" onClick={() => navigate('/channels')}>
              Back to Channels
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-4">
        <Button variant="ghost" onClick={() => navigate('/channels')} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Channels
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-blue-600" />
              Create Channel
            </CardTitle>
            <CardDescription>
              Launch a channel for your niche and publish updates for followers.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="channel-name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Channel Name
                </label>
                <Input
                  id="channel-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Verified Gadget Deals"
                  maxLength={80}
                  required
                />
              </div>

              <div>
                <label htmlFor="channel-description" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Description
                </label>
                <Textarea
                  id="channel-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Tell users what they can expect from this channel."
                  rows={4}
                  maxLength={500}
                />
                <p className="mt-1 text-xs text-gray-500">{description.length}/500</p>
              </div>

              <div>
                <label htmlFor="channel-category" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Category
                </label>
                <Input
                  id="channel-category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  placeholder="e.g. Electronics"
                  maxLength={60}
                  required
                />
              </div>

              {validationError ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Form incomplete</AlertTitle>
                  <AlertDescription>{validationError}</AlertDescription>
                </Alert>
              ) : null}

              {submitError ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Channel creation failed</AlertTitle>
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              ) : null}

              {successMessage ? (
                <Alert className="border-emerald-300 bg-emerald-50 text-emerald-900">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Success</AlertTitle>
                  <AlertDescription>{successMessage}</AlertDescription>
                </Alert>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={!canSubmit}>
                  {submitting ? (t('loading') || 'Loading...') : (t('create') || 'Create Channel')}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate('/channels')}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateChannelPage;
