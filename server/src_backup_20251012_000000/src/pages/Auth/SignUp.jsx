import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";
import { Shield, Upload, Eye, EyeOff, User, Mail, Phone, FileText, Calendar, MapPin, CreditCard } from "lucide-react";
import { registerUser } from "@/lib/auth";
import AadhaarOtpVerify from '@/components/AadhaarOtpVerify';

const SignUp = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    aadhaarNumber: '',
    panNumber: '',
    agreeToTerms: false
  });
  const [files, setFiles] = useState({
    aadhaarXml: null,
    aadhaarImage: null,
    panImage: null
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [aadhaarVerified, setAadhaarVerified] = useState(false);
  const [aadhaarVerifyData, setAadhaarVerifyData] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (name) => (value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileUpload = (type) => (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (type === 'aadhaarXml' && !file.name.endsWith('.xml')) {
        toast({
          title: "Invalid file",
          description: "Please upload a valid XML file",
          variant: "destructive"
        });
        return;
      }
      if ((type === 'aadhaarImage' || type === 'panImage') && !file.type.startsWith('image/')) {
        toast({
          title: "Invalid file",
          description: "Please upload a valid image file",
          variant: "destructive"
        });
        return;
      }
      
      setFiles(prev => ({
        ...prev,
        [type]: file
      }));
      
      toast({
        title: "File uploaded",
        description: `${type.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} uploaded successfully`
      });
    }
  };

  const validateStep = (stepNumber) => {
    switch (stepNumber) {
      case 1:
        return formData.fullName && formData.phoneNumber && formData.email && 
               formData.password && formData.confirmPassword && 
               formData.password === formData.confirmPassword;
      case 2:
        return formData.dateOfBirth && formData.gender && formData.address && 
               formData.city && formData.state && formData.pincode;
      case 3:
        return formData.aadhaarNumber && formData.panNumber && 
               files.aadhaarXml && files.aadhaarImage && files.panImage;
      case 4:
        return formData.agreeToTerms;
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    } else {
      toast({
        title: "Please complete all fields",
        description: "Fill in all required information to continue",
        variant: "destructive"
      });
    }
  };

  // Strict frontend validation for all fields
  const validateForm = () => {
    const errors = [];
    if (!formData.fullName || formData.fullName.length < 2) errors.push('Full name must be at least 2 characters.');
    const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
    if (!formData.email || !emailRegex.test(formData.email)) errors.push('Invalid email format.');
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!formData.password || !passwordRegex.test(formData.password)) errors.push('Password must be at least 8 characters, include uppercase, lowercase, and a number.');
    if (formData.password !== formData.confirmPassword) errors.push('Passwords do not match.');
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!formData.phoneNumber || !phoneRegex.test(formData.phoneNumber)) errors.push('Phone number must be 10 digits, start with 6-9.');
    if (!formData.address || formData.address.length < 5) errors.push('Address must be at least 5 characters.');
    if (!formData.agreeToTerms) errors.push('You must agree to the terms and conditions.');
    // Alpha/Beta/Prod: block common test/dummy emails and phone numbers
    const testEmails = ['test@test.com', 'admin@admin.com', 'user@user.com'];
    if (testEmails.includes(formData.email.toLowerCase())) errors.push('Test/dummy emails are not allowed.');
    if (/^1234567890$|^9999999999$/.test(formData.phoneNumber)) errors.push('Test/dummy phone numbers are not allowed.');
    // Add more field checks as needed
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const errors = validateForm();
    if (!aadhaarVerified) errors.push('Aadhaar verification is required.');
    if (errors.length > 0) {
      toast({
        title: "Signup Failed",
        description: errors.join(", "),
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }
    try {
      // Map frontend fields to backend expected fields
      const userData = {
        name: formData.fullName,
        phone: formData.phoneNumber,
        email: formData.email,
        password: formData.password,
        address: formData.address,
        // Add other fields as needed
      };
      await registerUser(userData);
      toast({
        title: "Signup Successful 🎉",
        description: "Your account has been created!",
      });
      navigate("/login");
    } catch (err) {
      toast({
        title: "Signup Failed",
        description: err.errors ? err.errors.join(", ") : (err.error || "Signup failed"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const stepTitles = [
    "Basic Information",
    "Personal Details", 
    "Identity Verification",
    "Terms & Conditions"
  ];

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4" style={{ backgroundColor: '#E5EDF1' }}>
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg" style={{ backgroundColor: '#96C2DB' }}>
              <Shield className="h-10 w-10 text-white" />
            </div>
          </div>
          <h2 className="text-4xl font-bold mb-2" style={{ color: '#333A45' }}>Create Account</h2>
          <p className="text-gray-600 text-lg">Join our verified mobile marketplace</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {stepTitles.map((title, index) => (
              <div key={index} className="flex flex-col items-center">
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                    step > index + 1 ? 'text-white' : step === index + 1 ? 'text-white' : 'text-gray-400 bg-gray-200'
                  }`}
                  style={step >= index + 1 ? { backgroundColor: '#96C2DB' } : {}}
                >
                  {index + 1}
                </div>
                <span className="text-xs mt-2 text-center font-medium" style={{ color: '#333A45' }}>
                  {title}
                </span>
              </div>
            ))}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="h-2 rounded-full transition-all duration-300"
              style={{ 
                backgroundColor: '#96C2DB',
                width: `${(step / 4) * 100}%`
              }}
            />
          </div>
        </div>

        <Card className="shadow-2xl border-0 rounded-3xl overflow-hidden">
          <CardHeader style={{ backgroundColor: '#96C2DB' }} className="text-white text-center py-8">
            <CardTitle className="text-2xl font-bold">Step {step}: {stepTitles[step - 1]}</CardTitle>
            <CardDescription className="text-blue-100">
              {step === 1 && "Enter your basic account information"}
              {step === 2 && "Tell us more about yourself"}  
              {step === 3 && "Verify your identity with official documents"}
              {step === 4 && "Review and accept our terms"}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-8">
            <form onSubmit={handleSubmit}>
              {/* Step 1: Basic Information */}
              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="fullName" className="text-sm font-semibold flex items-center space-x-2" style={{ color: '#333A45' }}>
                      <User className="w-4 h-4" />
                      <span>Full Name</span>
                    </Label>
                    <Input
                      id="fullName"
                      name="fullName"
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className="mt-2 h-12 border-2 border-gray-200 focus:border-blue-500 rounded-xl"
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phoneNumber" className="text-sm font-semibold flex items-center space-x-2" style={{ color: '#333A45' }}>
                      <Phone className="w-4 h-4" />
                      <span>Phone Number</span>
                    </Label>
                    <Input
                      id="phoneNumber"
                      name="phoneNumber"
                      type="tel"
                      required
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      className="mt-2 h-12 border-2 border-gray-200 focus:border-blue-500 rounded-xl"
                      placeholder="+91 XXXXXXXXXX"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-sm font-semibold flex items-center space-x-2" style={{ color: '#333A45' }}>
                      <Mail className="w-4 h-4" />
                      <span>Email</span>
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      className="mt-2 h-12 border-2 border-gray-200 focus:border-blue-500 rounded-xl"
                      placeholder="Enter your email"
                    />
                  </div>

                  <div>
                    <Label htmlFor="password" className="text-sm font-semibold" style={{ color: '#333A45' }}>Password</Label>
                    <div className="relative mt-2">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        required
                        value={formData.password}
                        onChange={handleInputChange}
                        className="h-12 border-2 border-gray-200 focus:border-blue-500 rounded-xl pr-12"
                        placeholder="Create a password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword" className="text-sm font-semibold" style={{ color: '#333A45' }}>Confirm Password</Label>
                    <div className="relative mt-2">
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className="h-12 border-2 border-gray-200 focus:border-blue-500 rounded-xl pr-12"
                        placeholder="Confirm your password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Personal Details */}
              {step === 2 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="dateOfBirth" className="text-sm font-semibold flex items-center space-x-2" style={{ color: '#333A45' }}>
                        <Calendar className="w-4 h-4" />
                        <span>Date of Birth</span>
                      </Label>
                      <Input
                        id="dateOfBirth"
                        name="dateOfBirth"
                        type="date"
                        required
                        value={formData.dateOfBirth}
                        onChange={handleInputChange}
                        className="mt-2 h-12 border-2 border-gray-200 focus:border-blue-500 rounded-xl"
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-semibold" style={{ color: '#333A45' }}>Gender</Label>
                      <Select value={formData.gender || ""} onValueChange={handleSelectChange('gender')}>
                        <SelectTrigger className="mt-2 h-12 border-2 border-gray-200 focus:border-blue-500 rounded-xl">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="address" className="text-sm font-semibold flex items-center space-x-2" style={{ color: '#333A45' }}>
                      <MapPin className="w-4 h-4" />
                      <span>Address</span>
                    </Label>
                    <Input
                      id="address"
                      name="address"
                      type="text"
                      required
                      value={formData.address}
                      onChange={handleInputChange}
                      className="mt-2 h-12 border-2 border-gray-200 focus:border-blue-500 rounded-xl"
                      placeholder="Enter your full address"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <Label htmlFor="city" className="text-sm font-semibold" style={{ color: '#333A45' }}>City</Label>
                      <Input
                        id="city"
                        name="city"
                        type="text"
                        required
                        value={formData.city}
                        onChange={handleInputChange}
                        className="mt-2 h-12 border-2 border-gray-200 focus:border-blue-500 rounded-xl"
                        placeholder="City"
                      />
                    </div>

                    <div>
                      <Label htmlFor="state" className="text-sm font-semibold" style={{ color: '#333A45' }}>State</Label>
                      <Input
                        id="state"
                        name="state"
                        type="text"
                        required
                        value={formData.state}
                        onChange={handleInputChange}
                        className="mt-2 h-12 border-2 border-gray-200 focus:border-blue-500 rounded-xl"
                        placeholder="State"
                      />
                    </div>

                    <div>
                      <Label htmlFor="pincode" className="text-sm font-semibold" style={{ color: '#333A45' }}>Pincode</Label>
                      <Input
                        id="pincode"
                        name="pincode"
                        type="text"
                        required
                        value={formData.pincode}
                        onChange={handleInputChange}
                        className="mt-2 h-12 border-2 border-gray-200 focus:border-blue-500 rounded-xl"
                        placeholder="000000"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Identity Verification */}
              {step === 3 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="aadhaarNumber" className="text-sm font-semibold flex items-center space-x-2" style={{ color: '#333A45' }}>
                        <CreditCard className="w-4 h-4" />
                        <span>Aadhaar Number</span>
                      </Label>
                      <Input
                        id="aadhaarNumber"
                        name="aadhaarNumber"
                        type="text"
                        required
                        value={formData.aadhaarNumber}
                        onChange={handleInputChange}
                        className="mt-2 h-12 border-2 border-gray-200 focus:border-blue-500 rounded-xl"
                        placeholder="XXXX XXXX XXXX"
                        maxLength="12"
                      />
                      {/* Aadhaar OTP Verification */}
                      <div className="mt-4">
                        <AadhaarOtpVerify
                          onVerified={data => { setAadhaarVerified(true); setAadhaarVerifyData(data); }}
                          onError={() => setAadhaarVerified(false)}
                        />
                        {aadhaarVerified && <div className="text-green-600 text-sm mt-2">Aadhaar verified successfully!</div>}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="panNumber" className="text-sm font-semibold flex items-center space-x-2" style={{ color: '#333A45' }}>
                        <CreditCard className="w-4 h-4" />
                        <span>PAN Number</span>
                      </Label>
                      <Input
                        id="panNumber"
                        name="panNumber"
                        type="text"
                        required
                        value={formData.panNumber}
                        onChange={handleInputChange}
                        className="mt-2 h-12 border-2 border-gray-200 focus:border-blue-500 rounded-xl"
                        placeholder="ABCDE1234F"
                        maxLength="10"
                        style={{ textTransform: 'uppercase' }}
                      />
                    </div>
                  </div>

                  {/* File Uploads */}
                  <div className="space-y-4">
                    {/* Aadhaar XML */}
                    <div className="border-2 border-dashed rounded-xl p-6" style={{ borderColor: '#96C2DB', backgroundColor: '#F8FBFF' }}>
                      <Label className="text-sm font-semibold flex items-center space-x-2 mb-3" style={{ color: '#333A45' }}>
                        <FileText className="w-4 h-4" />
                        <span>Aadhaar XML File (Required)</span>
                      </Label>
                      <div className="text-center">
                        <Upload className="mx-auto h-12 w-12 mb-4" style={{ color: '#96C2DB' }} />
                        <label htmlFor="aadhaarXml" className="cursor-pointer">
                          <Input
                            id="aadhaarXml"
                            type="file"
                            accept=".xml"
                            onChange={handleFileUpload('aadhaarXml')}
                            className="sr-only"
                          />
                          <Button 
                            type="button"
                            variant="outline" 
                            className="border-blue-300 text-blue-600 hover:bg-blue-100"
                            onClick={() => document.getElementById('aadhaarXml').click()}
                          >
                            Choose XML File
                          </Button>
                        </label>
                        {files.aadhaarXml && (
                          <p className="text-sm text-green-600 mt-2 font-medium">
                            ✓ {files.aadhaarXml.name}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Aadhaar Image */}
                    <div className="border-2 border-dashed rounded-xl p-6" style={{ borderColor: '#96C2DB', backgroundColor: '#F8FBFF' }}>
                      <Label className="text-sm font-semibold flex items-center space-x-2 mb-3" style={{ color: '#333A45' }}>
                        <FileText className="w-4 h-4" />
                        <span>Aadhaar Card Image (Required)</span>
                      </Label>
                      <div className="text-center">
                        <Upload className="mx-auto h-12 w-12 mb-4" style={{ color: '#96C2DB' }} />
                        <label htmlFor="aadhaarImage" className="cursor-pointer">
                          <Input
                            id="aadhaarImage"
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload('aadhaarImage')}
                            className="sr-only"
                          />
                          <Button 
                            type="button"
                            variant="outline" 
                            className="border-blue-300 text-blue-600 hover:bg-blue-100"
                            onClick={() => document.getElementById('aadhaarImage').click()}
                          >
                            Choose Image
                          </Button>
                        </label>
                        {files.aadhaarImage && (
                          <p className="text-sm text-green-600 mt-2 font-medium">
                            ✓ {files.aadhaarImage.name}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* PAN Image */}
                    <div className="border-2 border-dashed rounded-xl p-6" style={{ borderColor: '#96C2DB', backgroundColor: '#F8FBFF' }}>
                      <Label className="text-sm font-semibold flex items-center space-x-2 mb-3" style={{ color: '#333A45' }}>
                        <FileText className="w-4 h-4" />
                        <span>PAN Card Image (Required)</span>
                      </Label>
                      <div className="text-center">
                        <Upload className="mx-auto h-12 w-12 mb-4" style={{ color: '#96C2DB' }} />
                        <label htmlFor="panImage" className="cursor-pointer">
                          <Input
                            id="panImage"
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload('panImage')}
                            className="sr-only"
                          />
                          <Button 
                            type="button"
                            variant="outline" 
                            className="border-blue-300 text-blue-600 hover:bg-blue-100"
                            onClick={() => document.getElementById('panImage').click()}
                          >
                            Choose Image
                          </Button>
                        </label>
                        {files.panImage && (
                          <p className="text-sm text-green-600 mt-2 font-medium">
                            ✓ {files.panImage.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Terms & Conditions */}
              {step === 4 && (
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold mb-4" style={{ color: '#333A45' }}>Review Your Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div><strong>Name:</strong> {formData.fullName}</div>
                      <div><strong>Phone:</strong> {formData.phoneNumber}</div>
                      <div><strong>Email:</strong> {formData.email}</div>
                      <div><strong>Date of Birth:</strong> {formData.dateOfBirth}</div>
                      <div><strong>Gender:</strong> {formData.gender}</div>
                      <div><strong>City:</strong> {formData.city}, {formData.state}</div>
                      <div><strong>Aadhaar:</strong> {formData.aadhaarNumber}</div>
                      <div><strong>PAN:</strong> {formData.panNumber}</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="agreeToTerms"
                      checked={formData.agreeToTerms}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({ ...prev, agreeToTerms: checked }))
                      }
                    />
                    <Label htmlFor="agreeToTerms" className="text-sm">
                      I agree to the <Link to="/terms" className="text-blue-600 hover:underline font-medium">Terms and Conditions</Link> and <Link to="/privacy" className="text-blue-600 hover:underline font-medium">Privacy Policy</Link>
                    </Label>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8">
                {step > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(step - 1)}
                    className="px-8"
                  >
                    Previous
                  </Button>
                )}
                
                {step < 4 ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    className="ml-auto px-8 text-white"
                    style={{ backgroundColor: '#96C2DB' }}
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    className="ml-auto px-8 text-white"
                    style={{ backgroundColor: '#96C2DB' }}
                    disabled={isLoading}
                  >
                    {isLoading ? "Creating Account..." : "Create Account"}
                  </Button>
                )}
              </div>
            </form>

            <div className="text-center text-sm mt-6">
              <span className="text-gray-600">Already have an account? </span>
              <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium hover:underline">
                Sign in here
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignUp;
