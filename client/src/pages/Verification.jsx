import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";
import { Shield, Upload, CreditCard, FileText } from "lucide-react";
import AadhaarOtpVerify from '@/components/AadhaarOtpVerify';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';

const Verification = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        aadhaarNumber: '',
        panNumber: ''
    });

    const [files, setFiles] = useState({
        aadhaarXml: null,
        aadhaarImage: null,
        panImage: null
    });

    const [aadhaarVerified, setAadhaarVerified] = useState(false);

    const isLoggedIn = localStorage.getItem('userId') && localStorage.getItem('authToken');

    useEffect(() => {
        if (!isLoggedIn) {
            setLoading(false);
            return;
        }

        const fetchProfile = async () => {
            try {
                const userId = localStorage.getItem('userId');
                const token = localStorage.getItem('authToken');
                const res = await api.get(`/api/users/profile?userId=${userId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.data) {
                    const profile = res.data;
                    setFormData(prev => ({
                        ...prev,
                        aadhaarNumber: profile.aadhaar_number || '',
                        panNumber: profile.pan_number || ''
                    }));
                    setAadhaarVerified(!!profile.aadhaar_verified);
                }
            } catch (err) {
                console.error('Failed to fetch profile:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [isLoggedIn]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileUpload = (type) => (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (type === 'aadhaarXml' && !file.name.endsWith('.xml')) {
                toast({ title: t('invalid_file'), description: t('upload_valid_xml'), variant: "destructive" });
                return;
            }
            if ((type === 'aadhaarImage' || type === 'panImage') && !file.type.startsWith('image/')) {
                toast({ title: t('invalid_file'), description: t('upload_valid_image'), variant: "destructive" });
                return;
            }
            setFiles(prev => ({ ...prev, [type]: file }));
            toast({ title: t('file_uploaded'), description: "Document uploaded successfully" });
        }
    };

    const handleSubmit = async () => {
        setSaving(true);
        try {
            const userId = localStorage.getItem('userId');
            const token = localStorage.getItem('authToken');

            await api.put(`/api/users/profile`, {
                userId,
                aadhaar_number: formData.aadhaarNumber,
                pan_number: formData.panNumber,
                aadhaar_verified: aadhaarVerified
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            toast({ title: "✅ Verification Complete", description: "Your identity details have been saved." });
            navigate('/profile');
        } catch (err) {
            toast({ title: "Error", description: err.message || "Failed to save", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

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

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A]">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-[#96C2DB] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-300">{t('loading') || 'Loading...'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A]" style={{ paddingBottom: '120px' }}>
            <div className="max-w-2xl mx-auto px-4 py-8">
                {/* Header */}
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
                        <div className="space-y-6">
                            {/* Aadhaar & PAN Inputs */}
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
                                        placeholder={t('enter_aadhaar') || "XXXX XXXX XXXX"}
                                        maxLength="12"
                                    />
                                    {/* Aadhaar OTP Verification */}
                                    <div className="mt-4">
                                        <AadhaarOtpVerify
                                            onVerified={data => setAadhaarVerified(true)}
                                            onError={() => setAadhaarVerified(false)}
                                        />
                                        {aadhaarVerified && (
                                            <div className="text-green-600 dark:text-green-400 text-sm mt-2">
                                                {t('aadhaar_verified_success') || '✓ Aadhaar verified successfully!'}
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
                                        <Input id="aadhaarXml" type="file" accept=".xml" onChange={handleFileUpload('aadhaarXml')} className="sr-only" />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="border-blue-300 text-blue-600 hover:bg-blue-100 dark:border-blue-500 dark:text-blue-400 dark:hover:bg-gray-700"
                                            onClick={() => document.getElementById('aadhaarXml')?.click()}
                                        >
                                            {t('choose_file')}
                                        </Button>
                                        {files.aadhaarXml && <p className="text-sm text-green-600 mt-2 font-medium">✓ {files.aadhaarXml.name}</p>}
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
                                        <Input id="aadhaarImage" type="file" accept="image/*" onChange={handleFileUpload('aadhaarImage')} className="sr-only" />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="border-blue-300 text-blue-600 hover:bg-blue-100 dark:border-blue-500 dark:text-blue-400 dark:hover:bg-gray-700"
                                            onClick={() => document.getElementById('aadhaarImage')?.click()}
                                        >
                                            {t('choose_image')}
                                        </Button>
                                        {files.aadhaarImage && <p className="text-sm text-green-600 mt-2 font-medium">✓ {files.aadhaarImage.name}</p>}
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
                                        <Input id="panImage" type="file" accept="image/*" onChange={handleFileUpload('panImage')} className="sr-only" />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="border-blue-300 text-blue-600 hover:bg-blue-100 dark:border-blue-500 dark:text-blue-400 dark:hover:bg-gray-700"
                                            onClick={() => document.getElementById('panImage')?.click()}
                                        >
                                            {t('choose_image')}
                                        </Button>
                                        {files.panImage && <p className="text-sm text-green-600 mt-2 font-medium">✓ {files.panImage.name}</p>}
                                    </div>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <Button
                                type="button"
                                onClick={handleSubmit}
                                className="w-full py-6 text-white bg-[#96C2DB] dark:bg-blue-600 hover:bg-blue-500 transition-colors duration-300 text-lg font-semibold rounded-xl"
                                disabled={saving}
                            >
                                {saving ? t('saving') + '...' : (t('save_verification_details'))}
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
