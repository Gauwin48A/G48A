import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Upload, CreditCard, FileText } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import AadhaarOtpVerify from '@/components/AadhaarOtpVerify';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { getAccessToken, getUserId } from '@/utils/authStorage';

const Verification = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { user: authUser, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aadhaarVerified, setAadhaarVerified] = useState(false);
  const [kycStatusError, setKycStatusError] = useState('');
  const [retryTick, setRetryTick] = useState(0);

  const [formData, setFormData] = useState({
    aadhaarNumber: '',
    panNumber: ''
  });

  const [files, setFiles] = useState({
    aadhaarXml: null,
    aadhaarImage: null,
    panImage: null
  });

  const token = getAccessToken();
  const resolvedUserId = getUserId(authUser);
  const isLoggedIn = useMemo(
    () => Boolean(authUser || (token && resolvedUserId)),
    [authUser, resolvedUserId, token]
  );

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!isLoggedIn) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchKycStatus = async () => {
      try {
        const result = await api.get('/users/kyc/status');
        const payload = result?.data ?? result;
        const status = String(payload?.status || '').toUpperCase();

        if (!cancelled) {
          setKycStatusError('');
          setAadhaarVerified(status === 'APPROVED' || status === 'VERIFIED');

          // Endpoint returns masked values; keep only if available.
          if (payload?.aadhaar_number || payload?.pan_number) {
            setFormData((prev) => ({
              ...prev,
              aadhaarNumber: payload?.aadhaar_number || prev.aadhaarNumber,
              panNumber: payload?.pan_number || prev.panNumber
            }));
          }
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          console.error('[Verification] Failed to fetch KYC status:', err);
        }
        if (!cancelled) {
          setKycStatusError(err?.message || 'Failed to load verification status.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchKycStatus();

    return () => {
      cancelled = true;
    };
  }, [authLoading, isLoggedIn, retryTick]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = (type) => (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    if (type === 'aadhaarXml' && !file.name.endsWith('.xml')) {
      toast({ title: t('invalid_file'), description: t('upload_valid_xml'), variant: 'destructive' });
      return;
    }

    if ((type === 'aadhaarImage' || type === 'panImage') && !file.type.startsWith('image/')) {
      toast({ title: t('invalid_file'), description: t('upload_valid_image'), variant: 'destructive' });
      return;
    }

    setFiles((prev) => ({ ...prev, [type]: file }));
    toast({ title: t('file_uploaded'), description: t('document_uploaded') || 'Document uploaded successfully' });
  };

  const handleSubmit = async () => {
    if (!isLoggedIn) {
      navigate('/login', { state: { returnTo: '/verification' } });
      return;
    }

    if (!formData.aadhaarNumber || !formData.panNumber) {
      toast({
        title: t('incomplete_form') || 'Incomplete form',
        description: t('enter_aadhaar_pan') || 'Aadhaar and PAN are required.',
        variant: 'destructive'
      });
      return;
    }

    if (!files.aadhaarImage) {
      toast({
        title: t('missing_document') || 'Missing document',
        description: t('aadhaar_image_required') || 'Front ID image is required for KYC.',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      const payload = new FormData();
      payload.append('aadhaar_number', formData.aadhaarNumber);
      payload.append('pan_number', formData.panNumber);
      payload.append('kyc_front', files.aadhaarImage);
      if (files.panImage) {
        payload.append('kyc_back', files.panImage);
      }

      const result = await api.post('/users/kyc/submit', payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const data = result?.data ?? result;
      const status = String(data?.status || '').toUpperCase();
      setAadhaarVerified(status === 'APPROVED' || status === 'VERIFIED');

      toast({
        title: t('verification_submitted') || 'Verification submitted',
        description: data?.message || (t('verification_under_review') || 'Your KYC request is under review.')
      });
      navigate('/profile');
    } catch (err) {
      toast({ title: t('error') || 'Error', description: err.message || 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#96C2DB] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300">{t('loading') || 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] p-4">
        <Card className="max-w-md w-full shadow-2xl border-0 rounded-3xl overflow-hidden bg-white dark:bg-gray-800">
          <CardHeader className="text-center py-8 bg-gradient-to-r from-blue-600 to-blue-700">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/20 flex items-center justify-center">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl text-white">{t('identity_verification') || 'Identity Verification'}</CardTitle>
            <CardDescription className="text-blue-100">{t('aadhaar_subtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="p-8 text-center">
            <p className="text-gray-600 dark:text-gray-300 mb-6">{t('please_login_verify')}</p>
            <div className="flex flex-col gap-3">
              <Link to="/login">
                <Button className="w-full bg-[#96C2DB] hover:bg-blue-500 text-white">Login</Button>
              </Link>
              <Link to="/signup">
                <Button variant="outline" className="w-full dark:text-white">Create Account</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A]" style={{ paddingBottom: '120px' }}>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#96C2DB] to-blue-600 flex items-center justify-center shadow-lg">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">{t('identity_verification') || 'Identity Verification'}</h1>
          <p className="text-gray-400">{t('aadhaar_subtitle')}</p>
        </div>

        <Card className="shadow-2xl border-0 rounded-3xl overflow-hidden bg-white dark:bg-gray-800">
          <CardHeader className="bg-gradient-to-r from-[#96C2DB] to-blue-600 text-white">
            <CardTitle className="text-xl">{t('identity_verification') || 'Identity Verification'}</CardTitle>
            <CardDescription className="text-blue-100">{t('enter_aadhaar_pan')}</CardDescription>
          </CardHeader>

          <CardContent className="p-8">
            {kycStatusError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 p-4 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-red-700 dark:text-red-300">{kycStatusError}</p>
                <Button type="button" variant="outline" onClick={() => setRetryTick((value) => value + 1)}>
                  Retry
                </Button>
              </div>
            )}
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="aadhaarNumber" className="text-sm font-semibold flex items-center space-x-2 text-[#333A45] dark:text-gray-300">
                    <CreditCard className="w-4 h-4" />
                    <span>{t('aadhaar_number')}</span>
                  </Label>
                  <Input
                    id="aadhaarNumber"
                    name="aadhaarNumber"
                    type="text"
                    value={formData.aadhaarNumber}
                    onChange={handleInputChange}
                    className="mt-2 h-12 border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:bg-gray-700 dark:text-white rounded-xl"
                    placeholder={t('enter_aadhaar') || 'XXXX XXXX XXXX'}
                    maxLength="14"
                  />
                  <div className="mt-4">
                    <AadhaarOtpVerify
                      onVerified={() => setAadhaarVerified(true)}
                      onError={() => setAadhaarVerified(false)}
                    />
                    {aadhaarVerified && (
                      <div className="text-green-600 dark:text-green-400 text-sm mt-2">
                        {t('aadhaar_verified_success') || 'Aadhaar verified successfully'}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="panNumber" className="text-sm font-semibold flex items-center space-x-2 text-[#333A45] dark:text-gray-300">
                    <CreditCard className="w-4 h-4" />
                    <span>{t('pan_number')}</span>
                  </Label>
                  <Input
                    id="panNumber"
                    name="panNumber"
                    type="text"
                    value={formData.panNumber}
                    onChange={(e) => handleInputChange({
                      ...e,
                      target: {
                        ...e.target,
                        name: e.target.name,
                        value: String(e.target.value || '').toUpperCase()
                      }
                    })}
                    className="mt-2 h-12 border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:bg-gray-700 dark:text-white rounded-xl"
                    placeholder={t('enter_pan') || 'ABCDE1234F'}
                    maxLength="10"
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="border-2 border-dashed rounded-xl p-6 bg-[#F8FBFF] dark:bg-gray-800 border-[#96C2DB] dark:border-blue-600">
                  <Label className="text-sm font-semibold flex items-center space-x-2 mb-3 text-[#333A45] dark:text-gray-300">
                    <FileText className="w-4 h-4" />
                    <span>{t('aadhaar_xml')}</span>
                  </Label>
                  <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 mb-4 text-[#96C2DB] dark:text-blue-500" />
                    <Input id="aadhaarXml" type="file" accept=".xml" onChange={handleFileUpload('aadhaarXml')} className="sr-only" />
                    <Button type="button" variant="outline" onClick={() => document.getElementById('aadhaarXml')?.click()}>
                      {t('choose_file')}
                    </Button>
                    {files.aadhaarXml && <p className="text-sm text-green-600 mt-2 font-medium">{files.aadhaarXml.name}</p>}
                  </div>
                </div>

                <div className="border-2 border-dashed rounded-xl p-6 bg-[#F8FBFF] dark:bg-gray-800 border-[#96C2DB] dark:border-blue-600">
                  <Label className="text-sm font-semibold flex items-center space-x-2 mb-3 text-[#333A45] dark:text-gray-300">
                    <FileText className="w-4 h-4" />
                    <span>{t('aadhaar_image')}</span>
                  </Label>
                  <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 mb-4 text-[#96C2DB] dark:text-blue-500" />
                    <Input id="aadhaarImage" type="file" accept="image/*" onChange={handleFileUpload('aadhaarImage')} className="sr-only" />
                    <Button type="button" variant="outline" onClick={() => document.getElementById('aadhaarImage')?.click()}>
                      {t('choose_image')}
                    </Button>
                    {files.aadhaarImage && <p className="text-sm text-green-600 mt-2 font-medium">{files.aadhaarImage.name}</p>}
                  </div>
                </div>

                <div className="border-2 border-dashed rounded-xl p-6 bg-[#F8FBFF] dark:bg-gray-800 border-[#96C2DB] dark:border-blue-600">
                  <Label className="text-sm font-semibold flex items-center space-x-2 mb-3 text-[#333A45] dark:text-gray-300">
                    <FileText className="w-4 h-4" />
                    <span>{t('pan_image')}</span>
                  </Label>
                  <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 mb-4 text-[#96C2DB] dark:text-blue-500" />
                    <Input id="panImage" type="file" accept="image/*" onChange={handleFileUpload('panImage')} className="sr-only" />
                    <Button type="button" variant="outline" onClick={() => document.getElementById('panImage')?.click()}>
                      {t('choose_image')}
                    </Button>
                    {files.panImage && <p className="text-sm text-green-600 mt-2 font-medium">{files.panImage.name}</p>}
                  </div>
                </div>
              </div>

              <Button
                type="button"
                onClick={handleSubmit}
                className="w-full py-6 text-white bg-[#96C2DB] dark:bg-blue-600 hover:bg-blue-500 transition-colors duration-300 text-lg font-semibold rounded-xl"
                disabled={saving}
              >
                {saving ? `${t('saving') || 'Saving'}...` : (t('save_verification_details') || 'Submit Verification')}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-sm mt-6">
          <span className="text-gray-400">{t('already_have_account')} </span>
          <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium hover:underline">
            {t('sign_in_here')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Verification;
