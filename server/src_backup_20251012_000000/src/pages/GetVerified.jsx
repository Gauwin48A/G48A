
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Shield, Upload, CheckCircle, AlertCircle, Award } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const GetVerified = () => {
  const [verificationData, setVerificationData] = useState({
    fullName: '',
    aadhaarNumber: '',
    dateOfBirth: '',
    address: ''
  });
  const [aadhaarFile, setAadhaarFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState('pending'); // pending, verified, rejected
  const { toast } = useToast();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setVerificationData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith('.xml')) {
      setAadhaarFile(file);
      toast({
        title: "File Selected",
        description: "Aadhaar XML file selected successfully"
      });
    } else if (file) {
      toast({
        title: "Invalid File",
        description: "Please upload a valid XML file downloaded from UIDAI",
        variant: "destructive"
      });
    }
  };

  const handleSubmitVerification = async (e) => {
    e.preventDefault();
    if (!aadhaarFile) {
      toast({
        title: "File Required",
        description: "Please upload your Aadhaar XML file",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    
    // Simulate verification process
    setTimeout(() => {
      setIsUploading(false);
      setVerificationStatus('verified');
      toast({
        title: "Verification Successful",
        description: "Your Aadhaar has been verified successfully!"
      });
    }, 3000);
  };

  const benefits = [
    { icon: Shield, title: "Verified Badge", description: "Display verified status on your profile" },
    { icon: Award, title: "Higher Trust", description: "Gain buyer and seller confidence" },
    { icon: CheckCircle, title: "Priority Listing", description: "Your posts appear higher in search" },
    { icon: Upload, title: "Better Rewards", description: "Earn bonus points for transactions" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Get Aadhaar Verified</h1>
          <p className="text-gray-600">Verify your identity to unlock premium features and build trust</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Verification Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-green-600" />
                <span>Aadhaar Verification</span>
              </CardTitle>
              <CardDescription>
                Upload your Aadhaar XML file to verify your identity
              </CardDescription>
            </CardHeader>
            <CardContent>
              {verificationStatus === 'pending' && (
                <form onSubmit={handleSubmitVerification} className="space-y-4">
                  <div>
                    <Label htmlFor="fullName">Full Name (as per Aadhaar)</Label>
                    <Input
                      id="fullName"
                      name="fullName"
                      type="text"
                      required
                      value={verificationData.fullName}
                      onChange={handleInputChange}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="aadhaarNumber">Aadhaar Number (Last 4 digits)</Label>
                    <Input
                      id="aadhaarNumber"
                      name="aadhaarNumber"
                      type="text"
                      required
                      maxLength={4}
                      value={verificationData.aadhaarNumber}
                      onChange={handleInputChange}
                      className="mt-1"
                      placeholder="XXXX"
                    />
                  </div>

                  <div>
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input
                      id="dateOfBirth"
                      name="dateOfBirth"
                      type="date"
                      required
                      value={verificationData.dateOfBirth}
                      onChange={handleInputChange}
                      className="mt-1"
                    />
                  </div>

                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                    <div className="text-center">
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <Label htmlFor="aadhaarFile" className="block text-sm font-medium mb-2">
                        Upload Aadhaar XML File
                      </Label>
                      <Input
                        id="aadhaarFile"
                        type="file"
                        accept=".xml"
                        onChange={handleFileUpload}
                        className="mb-2"
                      />
                      {aadhaarFile && (
                        <p className="text-sm text-green-600 mt-2">
                          ✓ {aadhaarFile.name} selected
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        Download XML file from{' '}
                        <a href="https://resident.uidai.gov.in/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          UIDAI website
                        </a>
                      </p>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isUploading}
                  >
                    {isUploading ? "Verifying..." : "Submit for Verification"}
                  </Button>
                </form>
              )}

              {verificationStatus === 'verified' && (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-green-600">Verification Complete!</h3>
                    <p className="text-gray-600">Your Aadhaar has been successfully verified</p>
                  </div>
                  <Badge className="bg-green-600">
                    <Shield className="w-3 h-3 mr-1" />
                    Aadhaar Verified
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Benefits Section */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Verification Benefits</CardTitle>
                <CardDescription>Why you should get verified</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {benefits.map((benefit, index) => {
                    const Icon = benefit.icon;
                    return (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-medium">{benefit.title}</h3>
                          <p className="text-sm text-gray-600">{benefit.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="pt-6">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-amber-800">Privacy & Security</h3>
                    <p className="text-sm text-amber-700 mt-1">
                      Your Aadhaar data is encrypted and used only for verification. 
                      We comply with all government privacy regulations.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GetVerified;
