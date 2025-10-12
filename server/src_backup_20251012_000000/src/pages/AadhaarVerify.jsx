import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Shield, Upload, FileText, CheckCircle, AlertCircle, Download
} from "lucide-react";
import { Link } from "react-router-dom";


const AadhaarVerify = () => {
  const { toast } = useToast();

  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState('pending'); // success, failed, pending

  const [extractedData, setExtractedData] = useState({
    name: '',
    gender: '',
    dob: '',
    address: ''
  });

  // Handle file input
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.xml')) {
        setSelectedFile(file);
        toast({
          title: "File Selected",
          description: `Selected: ${file.name}`,
        });
      } else {
        toast({
          title: "Invalid File Type",
          description: "Please select a valid Aadhaar XML file",
          variant: "destructive"
        });
      }
    }
  };

  // Handle upload simulation
  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select an Aadhaar XML file first",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    setTimeout(() => {
      setIsUploading(false);
      setVerificationStatus('success');
      setExtractedData({
        name: 'John Doe',
        gender: 'Male',
        dob: '15/05/1990',
        address: 'Mumbai, Maharashtra'
      });
      toast({
        title: "Aadhaar Verified Successfully",
        description: "Your identity has been verified.",
      });
    }, 3000);
  };

  // Handle sample download
  const handleDownloadSample = () => {
    toast({
      title: "Download Started",
      description: "Sample XML file download has started",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <Shield className="w-8 h-8 text-green-600" />
            <h1 className="text-3xl font-bold text-gray-900">Aadhaar Verification</h1>
          </div>
          <p className="text-gray-600">
            Verify your identity using your Aadhaar XML file to gain verified status.
          </p>
        </div>

        {/* Instructions */}
        <Card className="mb-8 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-blue-800">
              <FileText className="w-5 h-5" />
              <span>How to Get Your Aadhaar XML</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-blue-700">
              {[1, 2, 3, 4, 5].map((step, i) => (
                <div key={i} className="flex items-start space-x-2">
                  <span className="font-bold">{step}.</span>
                  <p>
                    {
                      [
                        'Visit the official UIDAI website: https://uidai.gov.in',
                        'Go to "Download Aadhaar" section',
                        'Enter your Aadhaar number and choose "XML" format',
                        'Complete OTP verification and download the XML file',
                        'Upload the downloaded XML file here for verification'
                      ][i]
                    }
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
                  Download Sample XML Format
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* File Upload */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Upload Aadhaar XML File</CardTitle>
            <CardDescription>
              Select and upload your Aadhaar XML file for identity verification.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <Label htmlFor="aadhaar-xml">Aadhaar XML File</Label>
                <div className="mt-2">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <label htmlFor="aadhaar-xml" className="cursor-pointer block mt-4">
                      <span className="block text-sm font-medium text-gray-900">
                        Select Aadhaar XML file
                      </span>
                      <input
                        id="aadhaar-xml"
                        name="aadhaar-xml"
                        type="file"
                        accept=".xml"
                        onChange={handleFileSelect}
                        className="sr-only"
                      />
                      <p className="mt-1 text-sm text-gray-500">XML files only, up to 5MB</p>
                    </label>
                  </div>

                  {selectedFile && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-5 h-5 text-green-600" />
                        <span className="text-sm font-medium text-green-800">{selectedFile.name}</span>
                        <Badge className="bg-green-600">Ready to upload</Badge>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Button */}
              <Button
                onClick={handleUpload}
                className="w-full"
                disabled={!selectedFile || isUploading}
              >
                {isUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Processing XML File...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload and Verify
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Verification Result */}
        {verificationStatus !== 'pending' && (
          <Card
            className={`mb-8 ${
              verificationStatus === 'success'
                ? 'border-green-200 bg-green-50'
                : 'border-red-200 bg-red-50'
            }`}
          >
            <CardHeader>
              <CardTitle className={`flex items-center space-x-2 ${
                verificationStatus === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {verificationStatus === 'success' ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
                <span>
                  Verification {verificationStatus === 'success' ? 'Successful' : 'Failed'}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {verificationStatus === 'success' ? (
                <div className="space-y-4">
                  <p className="text-green-700">
                    Your Aadhaar has been successfully verified! Your account is now verified.
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

                  <div className="flex items-center space-x-2 pt-4">
                    <Badge className="bg-green-600">
                      <Shield className="w-3 h-3 mr-1" />
                      Aadhaar Verified
                    </Badge>
                    <span className="text-sm text-green-700">
                      This badge will now appear on your profile and posts
                    </span>
                  </div>

                  <div className="flex space-x-4 pt-4">
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
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-red-700">
                    Verification failed. Please check your XML file and try again.
                  </p>
                  <Button
                    variant="outline"
                    className="text-red-700 border-red-300 hover:bg-red-100"
                    onClick={() => {
                      setVerificationStatus('pending');
                      setSelectedFile(null);
                    }}
                  >
                    Try Again
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Security Note */}
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-800">Security & Privacy Notice</h3>
                <ul className="text-sm text-yellow-700 mt-2 space-y-1">
                  <li>• Your Aadhaar XML file is processed locally and securely</li>
                  <li>• Only necessary identity information is extracted</li>
                  <li>• The file is not stored after processing</li>
                  <li>• Aadhaar number is never stored or displayed</li>
                  <li>• Verification builds user trust</li>
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
