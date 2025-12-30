import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Shield, Upload, Eye, EyeOff, User, Mail, Phone, FileText, Calendar, MapPin, CreditCard } from "lucide-react";
import { registerUser } from "@/lib/auth";
import AadhaarOtpVerify from '@/components/AadhaarOtpVerify';
import { useTranslation } from 'react-i18next';

const SignUp = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  // Get step from URL param (e.g., /signup?step=2) or default to 1
  const urlParams = new URLSearchParams(location.search);
  const initialStep = parseInt(urlParams.get('step')) || 1;
  const [step, setStep] = useState(initialStep);
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
          title: t('invalid_file'),
          description: t('upload_valid_xml'),
          variant: "destructive"
        });
        return;
      }
      if ((type === 'aadhaarImage' || type === 'panImage') && !file.type.startsWith('image/')) {
        toast({
          title: t('invalid_file'),
          description: t('upload_valid_image'),
          variant: "destructive"
        });
        return;
      }

      setFiles(prev => ({
        ...prev,
        [type]: file
      }));

      toast({
        title: t('file_uploaded'),
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
        title: t('please_complete_all'),
        description: t('fill_all_info'),
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
    if (!aadhaarVerified) errors.push(t('aadhaar_verification_required'));
    if (errors.length > 0) {
      toast({
        title: t('signup_failed'),
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
        title: t('signup_successful') + " 🎉",
        description: t('account_created'),
      });
      navigate("/login");
    } catch (err) {
      toast({
        title: t('signup_failed'),
        description: err.errors ? err.errors.join(", ") : (err.error || t('signup_failed')),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const stepTitles = [
    t('basic_info'),
    t('personal_details'),
    t('identity_verification'),
    t('terms_conditions')
  ];

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-[#E5EDF1] dark:bg-gray-900 transition-colors duration-300">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg bg-[#96C2DB] dark:bg-blue-600 transition-colors duration-300">
              <Shield className="h-10 w-10 text-white" />
            </div>
          </div>
          <h2 className="text-4xl font-bold mb-2 text-[#333A45] dark:text-white">{t('create_account')}</h2>
          <p className="text-gray-600 dark:text-gray-300 text-lg">{t('join_verified_marketplace') || "Join our verified mobile marketplace"}</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {stepTitles.map((title, index) => (
              <div key={index} className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors duration-300 ${step > index + 1 ? 'text-white bg-[#96C2DB] dark:bg-blue-600' : step === index + 1 ? 'text-white bg-[#96C2DB] dark:bg-blue-600' : 'text-gray-400 bg-gray-200 dark:bg-gray-700'
                    }`}
                >
                  {index + 1}
                </div>
                <span className="text-xs mt-2 text-center font-medium text-[#333A45] dark:text-gray-300">
                  {title}
                </span>
              </div>
            ))}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all duration-300 bg-[#96C2DB] dark:bg-blue-600"
              style={{
                width: `${(step / 4) * 100}%`
              }}
            />
          </div>
        </div>

        <Card className="shadow-2xl border-0 rounded-3xl overflow-hidden dark:bg-gray-800">
          <CardHeader className="text-white text-center py-8 bg-[#96C2DB] dark:bg-blue-600 transition-colors duration-300">
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
                    <Label htmlFor="fullName" className="text-sm font-semibold flex items-center space-x-2 text-[#333A45] dark:text-gray-300">
                      <User className="w-4 h-4" />
                      <span>{t('full_name')}</span>
                    </Label>
                    <Input
                      id="fullName"
                      name="fullName"
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className="mt-2 h-12 border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:bg-gray-700 dark:text-white rounded-xl"
                      placeholder={t('enter_full_name') || "Enter your full name"}
                    />
                  </div>

                  <div>
                    <Label htmlFor="phoneNumber" className="text-sm font-semibold flex items-center space-x-2 text-[#333A45] dark:text-gray-300">
                      <Phone className="w-4 h-4" />
                      <span>{t('phone')}</span>
                    </Label>
                    <Input
                      id="phoneNumber"
                      name="phoneNumber"
                      type="tel"
                      required
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      className="mt-2 h-12 border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:bg-gray-700 dark:text-white rounded-xl"
                      placeholder={t('phone_placeholder') || "+91 XXXXXXXXXX"}
                    />
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-sm font-semibold flex items-center space-x-2 text-[#333A45] dark:text-gray-300">
                      <Mail className="w-4 h-4" />
                      <span>{t('email')}</span>
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      className="mt-2 h-12 border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:bg-gray-700 dark:text-white rounded-xl"
                      placeholder={t('enter_email') || "Enter your email"}
                    />
                  </div>

                  <div>
                    <Label htmlFor="password" className="text-sm font-semibold text-[#333A45] dark:text-gray-300">{t('password')}</Label>
                    <div className="relative mt-2">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        required
                        value={formData.password}
                        onChange={handleInputChange}
                        className="h-12 border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:bg-gray-700 dark:text-white rounded-xl pr-12"
                        placeholder={t('password_placeholder') || "Create a password"}
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

                    {/* Password Strength Meter */}
                    {formData.password && (
                      <div className="mt-3 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                        <div className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">{t('password_strength') || "Password Strength"}</div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className={`flex items-center gap-1.5 ${formData.password.length >= 8 ? 'text-green-600' : 'text-gray-400'}`}>
                            {formData.password.length >= 8 ? '✓' : '○'} 8+ Characters
                          </div>
                          <div className={`flex items-center gap-1.5 ${/[A-Z]/.test(formData.password) ? 'text-green-600' : 'text-gray-400'}`}>
                            {/[A-Z]/.test(formData.password) ? '✓' : '○'} Uppercase Letter
                          </div>
                          <div className={`flex items-center gap-1.5 ${/[0-9]/.test(formData.password) ? 'text-green-600' : 'text-gray-400'}`}>
                            {/[0-9]/.test(formData.password) ? '✓' : '○'} Number (0-9)
                          </div>
                          <div className={`flex items-center gap-1.5 ${/[!@#$%^&*]/.test(formData.password) ? 'text-green-600' : 'text-gray-400'}`}>
                            {/[!@#$%^&*]/.test(formData.password) ? '✓' : '○'} Special (!@#$%)
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword" className="text-sm font-semibold text-[#333A45] dark:text-gray-300">{t('confirm_password') || "Confirm Password"}</Label>
                    <div className="relative mt-2">
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className="h-12 border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:bg-gray-700 dark:text-white rounded-xl pr-12"
                        placeholder={t('confirm_password_placeholder') || "Confirm your password"}
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
                      <Label htmlFor="dateOfBirth" className="text-sm font-semibold flex items-center space-x-2 text-[#333A45] dark:text-gray-300">
                        <Calendar className="w-4 h-4" />
                        <span>{t('date_of_birth')}</span>
                      </Label>
                      <Input
                        id="dateOfBirth"
                        name="dateOfBirth"
                        type="date"
                        required
                        value={formData.dateOfBirth}
                        onChange={handleInputChange}
                        className="mt-2 h-12 border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:bg-gray-700 dark:text-white rounded-xl"
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-semibold text-[#333A45] dark:text-gray-300">{t('gender')}</Label>
                      <Select value={formData.gender || ""} onValueChange={handleSelectChange('gender')}>
                        <SelectTrigger className="mt-2 h-12 border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:bg-gray-700 dark:text-white rounded-xl">
                          <SelectValue placeholder={t('select')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">{t('male')}</SelectItem>
                          <SelectItem value="female">{t('female')}</SelectItem>
                          <SelectItem value="other">{t('other')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="address" className="text-sm font-semibold flex items-center space-x-2 text-[#333A45] dark:text-gray-300">
                      <MapPin className="w-4 h-4" />
                      <span>{t('address')}</span>
                    </Label>
                    <Input
                      id="address"
                      name="address"
                      type="text"
                      required
                      value={formData.address}
                      onChange={handleInputChange}
                      className="mt-2 h-12 border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:bg-gray-700 dark:text-white rounded-xl"
                      placeholder="Enter your full address"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <Label htmlFor="city" className="text-sm font-semibold text-[#333A45] dark:text-gray-300">{t('city')}</Label>
                      <Input
                        id="city"
                        name="city"
                        type="text"
                        required
                        value={formData.city}
                        onChange={handleInputChange}
                        className="mt-2 h-12 border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:bg-gray-700 dark:text-white rounded-xl"
                        placeholder={t('enter_city') || "City"}
                      />
                    </div>

                    <div>
                      <Label htmlFor="state" className="text-sm font-semibold text-[#333A45] dark:text-gray-300">{t('state') || "State"}</Label>
                      <Input
                        id="state"
                        name="state"
                        type="text"
                        required
                        value={formData.state}
                        onChange={handleInputChange}
                        className="mt-2 h-12 border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:bg-gray-700 dark:text-white rounded-xl"
                        placeholder={t('enter_state') || "State"}
                      />
                    </div>

                    <div>
                      <Label htmlFor="pincode" className="text-sm font-semibold text-[#333A45] dark:text-gray-300">{t('pincode') || "Pincode"}</Label>
                      <Input
                        id="pincode"
                        name="pincode"
                        type="text"
                        required
                        value={formData.pincode}
                        onChange={handleInputChange}
                        className="mt-2 h-12 border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:bg-gray-700 dark:text-white rounded-xl"
                        placeholder={t('enter_pincode') || "000000"}
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
                      <Label htmlFor="aadhaarNumber" className="text-sm font-semibold flex items-center space-x-2 text-[#333A45] dark:text-gray-300">
                        <CreditCard className="w-4 h-4" />
                        <span>{t('aadhaar_number')}</span>
                      </Label>
                      <Input
                        id="aadhaarNumber"
                        name="aadhaarNumber"
                        type="text"
                        required
                        value={formData.aadhaarNumber}
                        onChange={handleInputChange}
                        className="mt-2 h-12 border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:bg-gray-700 dark:text-white rounded-xl"
                        placeholder={t('enter_aadhaar') || "XXXX XXXX XXXX"}
                        maxLength="12"
                      />
                      {/* Aadhaar OTP Verification */}
                      <div className="mt-4">
                        <AadhaarOtpVerify
                          onVerified={data => { setAadhaarVerified(true); setAadhaarVerifyData(data); }}
                          onError={() => setAadhaarVerified(false)}
                        />
                        {aadhaarVerified && <div className="text-green-600 dark:text-green-400 text-sm mt-2">{t('aadhaar_verified_success')}</div>}
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
                        required
                        value={formData.panNumber}
                        onChange={handleInputChange}
                        className="mt-2 h-12 border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:bg-gray-700 dark:text-white rounded-xl"
                        placeholder={t('enter_pan') || "ABCDE1234F"}
                        maxLength="10"
                        style={{ textTransform: 'uppercase' }}
                      />
                    </div>
                  </div>

                  {/* File Uploads */}
                  <div className="space-y-4">
                    {/* Aadhaar XML */}
                    <div className="border-2 border-dashed rounded-xl p-6 bg-[#F8FBFF] dark:bg-gray-800 border-[#96C2DB] dark:border-blue-600 transition-colors duration-300">
                      <Label className="text-sm font-semibold flex items-center space-x-2 mb-3 text-[#333A45] dark:text-gray-300">
                        <FileText className="w-4 h-4" />
                        <span>{t('aadhaar_xml')}</span>
                      </Label>
                      <div className="text-center">
                        <Upload className="mx-auto h-12 w-12 mb-4 text-[#96C2DB] dark:text-blue-500" />
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
                            className="border-blue-300 text-blue-600 hover:bg-blue-100 dark:border-blue-500 dark:text-blue-400 dark:hover:bg-gray-700"
                            onClick={() => document.getElementById('aadhaarXml').click()}
                          >
                            {t('choose_file')}
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
                    <div className="border-2 border-dashed rounded-xl p-6 bg-[#F8FBFF] dark:bg-gray-800 border-[#96C2DB] dark:border-blue-600 transition-colors duration-300">
                      <Label className="text-sm font-semibold flex items-center space-x-2 mb-3 text-[#333A45] dark:text-gray-300">
                        <FileText className="w-4 h-4" />
                        <span>{t('aadhaar_image')}</span>
                      </Label>
                      <div className="text-center">
                        <Upload className="mx-auto h-12 w-12 mb-4 text-[#96C2DB] dark:text-blue-500" />
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
                            className="border-blue-300 text-blue-600 hover:bg-blue-100 dark:border-blue-500 dark:text-blue-400 dark:hover:bg-gray-700"
                            onClick={() => document.getElementById('aadhaarImage').click()}
                          >
                            {t('choose_image')}
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
                    <div className="border-2 border-dashed rounded-xl p-6 bg-[#F8FBFF] dark:bg-gray-800 border-[#96C2DB] dark:border-blue-600 transition-colors duration-300">
                      <Label className="text-sm font-semibold flex items-center space-x-2 mb-3 text-[#333A45] dark:text-gray-300">
                        <FileText className="w-4 h-4" />
                        <span>{t('pan_image')}</span>
                      </Label>
                      <div className="text-center">
                        <Upload className="mx-auto h-12 w-12 mb-4 text-[#96C2DB] dark:text-blue-500" />
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
                            className="border-blue-300 text-blue-600 hover:bg-blue-100 dark:border-blue-500 dark:text-blue-400 dark:hover:bg-gray-700"
                            onClick={() => document.getElementById('panImage').click()}
                          >
                            {t('choose_image')}
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
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                    <h3 className="text-lg font-semibold mb-4 text-[#333A45] dark:text-white">{t('review_info')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm dark:text-gray-300">
                      <div><strong>{t('name')}:</strong> {formData.fullName}</div>
                      <div><strong>{t('phone')}:</strong> {formData.phoneNumber}</div>
                      <div><strong>{t('email')}:</strong> {formData.email}</div>
                      <div><strong>{t('date_of_birth')}:</strong> {formData.dateOfBirth}</div>
                      <div><strong>{t('gender')}:</strong> {formData.gender}</div>
                      <div><strong>{t('city')}:</strong> {formData.city}, {formData.state}</div>
                      <div><strong>{t('aadhaar_number')}:</strong> {formData.aadhaarNumber}</div>
                      <div><strong>{t('pan_number')}:</strong> {formData.panNumber}</div>
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
                      I agree to the <Link to="/terms" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">{t('terms_conditions')}</Link> and <Link to="/privacy" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">{t('privacy')}</Link>
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
                    className="px-8 dark:text-white"
                  >
                    {t('previous')}
                  </Button>
                )}

                {step < 4 ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    className="ml-auto px-8 text-white bg-[#96C2DB] dark:bg-blue-600 hover:bg-blue-500 transition-colors duration-300"
                  >
                    {t('next')}
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    className="ml-auto px-8 text-white bg-[#96C2DB] dark:bg-blue-600 hover:bg-blue-500 transition-colors duration-300"
                    disabled={isLoading}
                  >
                    {isLoading ? t('creating_account') : t('create_account')}
                  </Button>
                )}
              </div>
            </form>

            <div className="text-center text-sm mt-6">
              <span className="text-gray-600 dark:text-gray-400">{t('already_have_account')} </span>
              <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium hover:underline">
                {t('sign_in_here')}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignUp;
