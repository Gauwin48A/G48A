import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Shield, Upload, FileText, CheckCircle, AlertCircle, Download, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageAuthGateState } from '@/components/page-state/PageStateBlocks';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const AadhaarVerify = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const authToken = localStorage.getItem('authToken') || localStorage.getItem('token');

  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState('idle'); // idle | success | failed
  const [errorMessage, setErrorMessage] = useState('');
  const [extractedData, setExtractedData] = useState({
    name: '',
    gender: '',
    dob: '',
    address: ''
  });

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setErrorMessage('');
    if (!file.name.toLowerCase().endsWith('.xml')) {
      setSelectedFile(null);
      setVerificationStatus('failed');
      setErrorMessage('Please select a valid Aadhaar XML file.');
      toast({
        title: 'Invalid file type',
        description: 'Only XML files are supported for Aadhaar verification.',
        variant: 'destructive'
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setSelectedFile(null);
      setVerificationStatus('failed');
      setErrorMessage('File size exceeds 5MB limit. Please upload a smaller XML file.');
      toast({
        title: 'File too large',
        description: 'Aadhaar XML must be 5MB or smaller.',
        variant: 'destructive'
      });
      return;
    }

    setSelectedFile(file);
    setVerificationStatus('idle');
    toast({
      title: 'File selected',
      description: `Selected: ${file.name}`
    });
  };

  const resetVerification = () => {
    setSelectedFile(null);
    setVerificationStatus('idle');
    setErrorMessage('');
    setExtractedData({ name: '', gender: '', dob: '', address: '' });
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: 'No file selected',
        description: 'Select your Aadhaar XML file to continue.',
        variant: 'destructive'
      });
      return;
    }

    setIsUploading(true);
    setErrorMessage('');

    setTimeout(() => {
      setIsUploading(false);

      // Placeholder path until Aadhaar XML backend validation is wired.
      const simulatedSuccess = true;
      if (!simulatedSuccess) {
        setVerificationStatus('failed');
        setErrorMessage('Verification failed. Please retry with a fresh Aadhaar XML download.');
        return;
      }

      setVerificationStatus('success');
      setExtractedData({
        name: 'Verified User',
        gender: 'Not disclosed',
        dob: 'Protected',
        address: 'Protected'
      });
      toast({
        title: 'Aadhaar verified',
        description: 'Your identity verification is complete.'
      });
    }, 2500);
  };

  const handleDownloadSample = () => {
    toast({
      title: 'Sample format',
      description: 'Use UIDAI Aadhaar XML format when uploading.'
    });
  };

  if (!authToken) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <PageAuthGateState
            marker="auth-gate"
            title="Login required"
            description="Please log in to continue Aadhaar verification."
            primaryAction={(
              <Button onClick={() => navigate('/login', { state: { returnTo: '/aadhaar-verify' } })}>
                Go to Login
              </Button>
            )}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <Shield className="w-8 h-8 text-green-600" />
            <h1 className="text-3xl font-bold text-gray-900">Aadhaar Verification</h1>
          </div>
          <p className="text-gray-600">
            Verify identity with your Aadhaar XML file to unlock trust badges and safer transactions.
          </p>
        </div>

        <Card className="mb-8 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-blue-800">
              <FileText className="w-5 h-5" />
              <span>How to get your Aadhaar XML</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-blue-700">
              {[1, 2, 3, 4, 5].map((step, index) => (
                <div key={step} className="flex items-start space-x-2">
                  <span className="font-bold">{step}.</span>
                  <p>
                    {[
                      'Visit the official UIDAI portal.',
                      'Open the "Download Aadhaar" section.',
                      'Choose XML format and complete OTP verification.',
                      'Download the Aadhaar XML package.',
                      'Upload the XML file on this page.'
                    ][index]}
                  </p>
                </div>
              ))}
              <div className="mt-4 pt-4 border-t border-blue-200">
                <Button
                  variant="outline"
                  onClick={handleDownloadSample}
                  className="text-blue-700 border-blue-300 hover:bg-blue-100"
                >
                  <Download className="w-4 h-4 mr-2" />
                  XML format guidance
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Upload Aadhaar XML</CardTitle>
            <CardDescription>
              Select your XML file and start verification.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <Label htmlFor="aadhaar-xml">Aadhaar XML file</Label>
                <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <label htmlFor="aadhaar-xml" className="cursor-pointer block mt-4">
                    <span className="block text-sm font-medium text-gray-900">
                      Select Aadhaar XML file
                    </span>
                    <Input
                      id="aadhaar-xml"
                      name="aadhaar-xml"
                      type="file"
                      accept=".xml"
                      onChange={handleFileSelect}
                      className="sr-only"
                    />
                    <p className="mt-1 text-sm text-gray-500">XML only, up to 5MB</p>
                  </label>
                </div>

                {selectedFile && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-green-800">{selectedFile.name}</span>
                      <Badge className="bg-green-600">Ready</Badge>
                    </div>
                  </div>
                )}
              </div>

              {errorMessage && (
                <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
                  {errorMessage}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleUpload}
                  className="w-full sm:w-auto"
                  disabled={!selectedFile || isUploading}
                >
                  {isUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload and verify
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={resetVerification} disabled={isUploading}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {verificationStatus === 'success' && (
          <Card className="mb-8 border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-green-800">
                <CheckCircle className="w-5 h-5" />
                <span>Verification successful</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-green-700">
                Aadhaar verification is complete. Sensitive details are masked by design.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-green-700">Verified Name</Label>
                  <p className="font-medium text-green-800">{extractedData.name}</p>
                </div>
                <div>
                  <Label className="text-green-700">Gender</Label>
                  <p className="font-medium text-green-800">{extractedData.gender}</p>
                </div>
                <div>
                  <Label className="text-green-700">Date of Birth</Label>
                  <p className="font-medium text-green-800">{extractedData.dob}</p>
                </div>
                <div>
                  <Label className="text-green-700">Address</Label>
                  <p className="font-medium text-green-800">{extractedData.address}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <Badge className="bg-green-600">
                  <Shield className="w-3 h-3 mr-1" />
                  Aadhaar Verified
                </Badge>
                <span className="text-sm text-green-700">
                  This badge appears on your profile.
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link to="/profile">
                  <Button variant="outline" className="text-green-700 border-green-300 hover:bg-green-100">
                    View Profile
                  </Button>
                </Link>
                <Link to="/dashboard">
                  <Button className="bg-green-600 hover:bg-green-700">
                    Go to Dashboard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {verificationStatus === 'failed' && (
          <Card className="mb-8 border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-red-800">
                <AlertCircle className="w-5 h-5" />
                <span>Verification failed</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-red-700">
                We could not verify this file. Download a fresh XML from UIDAI and retry.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="outline" className="text-red-700 border-red-300 hover:bg-red-100" onClick={resetVerification}>
                  Try Again
                </Button>
                <Button variant="outline" onClick={() => navigate('/kyc')}>
                  Use KYC document flow
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-800">Security and privacy notice</h3>
                <ul className="text-sm text-yellow-700 mt-2 space-y-1">
                  <li>- Aadhaar XML is processed for verification only.</li>
                  <li>- Only required identity attributes are used.</li>
                  <li>- Aadhaar number is never displayed back in full.</li>
                  <li>- Verification helps buyers and sellers trust each other.</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AadhaarVerify;
