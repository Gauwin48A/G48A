import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageAuthGateState, PageErrorState, PageLoadingState } from '@/components/page-state/PageStateBlocks';

const KycVerification = () => {
  const navigate = useNavigate();
  const authToken = localStorage.getItem('authToken') || localStorage.getItem('token');

  const [formData, setFormData] = useState({
    aadhaar_number: '',
    pan_number: '',
    kyc_front: null,
    kyc_back: null
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState('');
  const [kycStatus, setKycStatus] = useState(null);

  const loadStatus = useCallback(async () => {
    if (!authToken) {
      setStatusLoading(false);
      return;
    }

    setStatusLoading(true);
    setStatusError('');
    try {
      const status = await axios.get('/users/kyc/status');
      setKycStatus(status || null);
    } catch (statusFetchError) {
      console.error('KYC status fetch failed', statusFetchError);
      setStatusError('Unable to load your KYC status right now. Please retry.');
    } finally {
      setStatusLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleChange = (event) => {
    setFormData((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleFileChange = (event) => {
    setFormData((prev) => ({ ...prev, [event.target.name]: event.target.files?.[0] || null }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
    setSubmitLoading(true);

    const payload = new FormData();
    payload.append('aadhaar_number', formData.aadhaar_number.trim());
    payload.append('pan_number', formData.pan_number.trim().toUpperCase());
    if (formData.kyc_front) payload.append('kyc_front', formData.kyc_front);
    if (formData.kyc_back) payload.append('kyc_back', formData.kyc_back);

    try {
      const response = await axios.post('/users/kyc/submit', payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setMessage(response?.message || 'Documents submitted successfully.');
      setKycStatus((prev) => ({ ...prev, ...(response || {}), status: response?.status || 'PENDING' }));
      loadStatus();
    } catch (submitError) {
      console.error('KYC submission failed', submitError);
      setError('KYC submission failed. Please verify details and retry.');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (!authToken) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <PageAuthGateState
            marker="auth-gate"
            title="Login required"
            description="Please log in to start KYC verification."
            primaryAction={(
              <Button onClick={() => navigate('/login', { state: { returnTo: '/kyc' } })}>
                Go to Login
              </Button>
            )}
          />
        </div>
      </div>
    );
  }

  if (statusLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <PageLoadingState
            marker="loading"
            title="Loading KYC status..."
            description="Checking your latest verification status."
          />
        </div>
      </div>
    );
  }

  if (statusError && !kycStatus) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <PageErrorState
            marker="error"
            className="border-red-200 bg-red-50"
            title="KYC status unavailable"
            description={statusError}
            onRetry={loadStatus}
            secondaryAction={(
              <Button variant="outline" onClick={() => navigate('/profile')}>
                Back to profile
              </Button>
            )}
          />
        </div>
      </div>
    );
  }

  if (kycStatus?.status === 'VERIFIED') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full border-green-200 bg-green-50">
          <CardContent className="pt-8 text-center space-y-4">
            <h2 className="text-3xl font-bold text-green-800">KYC Verified</h2>
            <p className="text-green-700">Your identity has been verified and your trust badge is active.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => navigate('/profile')}>
                View Profile
              </Button>
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                Open Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (kycStatus?.status === 'PENDING') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full border-amber-200 bg-amber-50">
          <CardContent className="pt-8 text-center space-y-4">
            <h2 className="text-3xl font-bold text-amber-800">Verification in progress</h2>
            <p className="text-amber-700">We are reviewing your documents. Most requests are reviewed within 24 hours.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={loadStatus}>
                Refresh status
              </Button>
              <Button variant="outline" onClick={() => navigate('/profile')}>
                Back to profile
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Identity Verification (KYC)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Submit your Aadhaar and PAN details with clear front/back ID images to activate verified trust markers.
            </p>
            {statusError && (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {statusError}
              </div>
            )}
            {kycStatus?.rejection_reason && (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                Previous request rejected: {kycStatus.rejection_reason}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="aadhaar_number">Aadhaar Number</Label>
                <Input
                  id="aadhaar_number"
                  type="text"
                  name="aadhaar_number"
                  value={formData.aadhaar_number}
                  onChange={handleChange}
                  placeholder="12-digit Aadhaar number"
                  pattern="\d{12}"
                  required
                />
              </div>

              <div>
                <Label htmlFor="pan_number">PAN Number</Label>
                <Input
                  id="pan_number"
                  type="text"
                  name="pan_number"
                  value={formData.pan_number}
                  onChange={handleChange}
                  placeholder="ABCDE1234F"
                  pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
                  required
                />
              </div>

              <div>
                <Label htmlFor="kyc_front">ID Proof (Front)</Label>
                <Input id="kyc_front" type="file" name="kyc_front" onChange={handleFileChange} accept="image/*,.pdf" required />
              </div>

              <div>
                <Label htmlFor="kyc_back">ID Proof (Back)</Label>
                <Input id="kyc_back" type="file" name="kyc_back" onChange={handleFileChange} accept="image/*,.pdf" required />
              </div>

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
              {message && (
                <p className="text-sm text-green-600">{message}</p>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Button type="submit" disabled={submitLoading} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {submitLoading ? 'Submitting...' : 'Submit Documents'}
                </Button>
                <Button type="button" variant="outline" onClick={loadStatus}>
                  Refresh status
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default KycVerification;
