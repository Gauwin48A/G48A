import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
    Shield, ShieldCheck, ShieldX, Copy, Eye,
    Smartphone, Key, QrCode, AlertTriangle, CheckCircle,
    ArrowLeft, Loader2, RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { PageAuthGateState, PageErrorState, PageLoadingState } from '@/components/page-state/PageStateBlocks';

const SecuritySettings = () => {
    const { toast } = useToast();
    const navigate = useNavigate();

    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [twoFactorAvailable, setTwoFactorAvailable] = useState(true);
    const [statusLoading, setStatusLoading] = useState(true);
    const [statusError, setStatusError] = useState('');
    const [setupLoading, setSetupLoading] = useState(false);
    const [setupError, setSetupError] = useState('');
    const [setupSuccess, setSetupSuccess] = useState('');
    const [verifyLoading, setVerifyLoading] = useState(false);
    const [verifyError, setVerifyError] = useState('');
    const [verifySuccess, setVerifySuccess] = useState('');
    const [disableLoading, setDisableLoading] = useState(false);
    const [disableError, setDisableError] = useState('');
    const [disableSuccess, setDisableSuccess] = useState('');
    const [setupMode, setSetupMode] = useState(false);
    const [verifyMode, setVerifyMode] = useState(false);
    const [disableMode, setDisableMode] = useState(false);

    // Setup data
    const [qrCode, setQrCode] = useState('');
    const [backupCodes, setBackupCodes] = useState([]);
    const [showBackupCodes, setShowBackupCodes] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');

    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    const userId = localStorage.getItem('userId') || localStorage.getItem('user_id');

    // Check 2FA status on mount
    useEffect(() => {
        checkTwoFactorStatus();
    }, []);

    const checkTwoFactorStatus = async () => {
        if (!userId || !token) {
            setStatusLoading(false);
            return;
        }

        setStatusLoading(true);
        setStatusError('');

        try {
            const data = await api.get('/auth/2fa/status');
            setTwoFactorEnabled(Boolean(data?.enabled));
            setTwoFactorAvailable(data?.available !== false);
        } catch (err) {
            console.error('Failed to check 2FA status:', err);
            setTwoFactorEnabled(false);
            setTwoFactorAvailable(false);
            setStatusError('Unable to load security settings right now. Please retry.');
        } finally {
            setStatusLoading(false);
        }
    };

    // Start 2FA setup
    const handleSetup2FA = async () => {
        setSetupSuccess('');
        setSetupError('');
        setVerifyError('');
        setDisableError('');
        if (!twoFactorAvailable) {
            setSetupError('Two-factor authentication is temporarily unavailable on this server.');
            return;
        }

        setSetupLoading(true);
        try {
            const data = await api.post('/auth/2fa/setup', {});
            if (!data?.qrCode) {
                throw new Error('Unable to generate QR code. Please retry.');
            }

            setQrCode(data.qrCode);
            setBackupCodes([]);
            setShowBackupCodes(false);
            setSetupMode(true);
            setVerifyMode(true);
            setDisableMode(false);
            setSetupSuccess('Setup started. Scan the QR code and verify to enable 2FA.');

            toast({ title: 'Setup Started', description: 'Scan the QR code with your authenticator app.' });
        } catch (err) {
            const description = err?.message || 'Failed to start 2FA setup';
            if (String(description).toLowerCase().includes('unavailable')) {
                setTwoFactorAvailable(false);
            }
            setSetupError(description);
        } finally {
            setSetupLoading(false);
        }
    };

    // Verify 2FA code
    const handleVerify2FA = async () => {
        if (!verificationCode || verificationCode.length !== 6) {
            setVerifyError('Please enter a valid 6-digit code.');
            return;
        }

        setVerifyLoading(true);
        setVerifyError('');
        setVerifySuccess('');
        try {
            const data = await api.post('/auth/2fa/verify', { code: verificationCode });

            if (data.success) {
                setTwoFactorEnabled(true);
                setSetupMode(false);
                setVerifyMode(false);
                setBackupCodes(Array.isArray(data.backupCodes) ? data.backupCodes : []);
                setShowBackupCodes(true);
                setVerifySuccess('2FA enabled successfully.');
                toast({ title: '2FA Enabled!', description: 'Your account is now protected with 2FA.' });
            } else {
                setVerifyError(data.error || 'Verification failed. Check the code and retry.');
            }
        } catch (err) {
            setVerifyError(err?.message || 'Verification failed. Please retry.');
        } finally {
            setVerifyLoading(false);
            setVerificationCode('');
        }
    };

    // Disable 2FA
    const handleDisable2FA = async () => {
        if (!verificationCode || verificationCode.length !== 6) {
            setDisableError('Please enter a valid 6-digit code to disable 2FA.');
            return;
        }

        setDisableLoading(true);
        setDisableError('');
        setDisableSuccess('');
        try {
            const data = await api.post('/auth/2fa/disable', { code: verificationCode });

            if (data.success) {
                setTwoFactorEnabled(false);
                setDisableMode(false);
                setBackupCodes([]);
                setShowBackupCodes(false);
                setDisableSuccess('Two-factor authentication has been disabled.');
                toast({ title: '2FA Disabled', description: 'Two-factor authentication has been removed.' });
            } else {
                setDisableError(data.error || 'Failed to disable 2FA. Please retry.');
            }
        } catch (err) {
            setDisableError(err?.message || 'Failed to disable 2FA. Please retry.');
        } finally {
            setDisableLoading(false);
            setVerificationCode('');
        }
    };

    // Copy backup codes
    const copyBackupCodes = () => {
        const text = backupCodes.join('\n');
        navigator.clipboard.writeText(text);
        toast({ title: 'Copied!', description: 'Backup codes copied to clipboard' });
    };

    if (!userId || !token) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full">
                    <PageAuthGateState
                        title="Authentication Required"
                        description="Please log in to access security settings."
                        marker="auth-gate"
                        primaryAction={(
                            <Button onClick={() => navigate('/login', { state: { returnTo: '/security' } })}>
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
            <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center p-4">
                <PageLoadingState
                    title="Loading security settings"
                    description="Checking your current 2FA status."
                    className="max-w-md w-full"
                    marker="loading"
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
            {/* Header */}
            <div className="bg-emerald-600 text-white px-4 py-6">
                <div className="max-w-4xl mx-auto">
                    <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-emerald-100 hover:text-white mb-4">
                        <ArrowLeft className="w-5 h-5" />
                        Back
                    </button>
                    <div className="flex items-center gap-3">
                        <Shield className="w-8 h-8" />
                        <div>
                            <h1 className="text-2xl font-bold">Security Settings</h1>
                            <p className="text-emerald-100">Protect your account with advanced security features</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto p-4 space-y-6">

                {/* 2FA Status Card */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {twoFactorEnabled ? (
                                    <div className="p-2 rounded-full bg-emerald-100">
                                        <ShieldCheck className="w-6 h-6 text-emerald-600" />
                                    </div>
                                ) : (
                                    <div className="p-2 rounded-full bg-amber-100">
                                        <ShieldX className="w-6 h-6 text-amber-600" />
                                    </div>
                                )}
                                <div>
                                    <CardTitle>Two-Factor Authentication</CardTitle>
                                    <CardDescription>
                                        Add an extra layer of security to your account
                                    </CardDescription>
                                </div>
                            </div>
                            <Badge variant={twoFactorEnabled ? "default" : "secondary"} className={twoFactorEnabled ? "bg-emerald-500" : ""}>
                                {twoFactorEnabled ? "Enabled" : "Disabled"}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {/* Status description */}
                        <div className="mb-6">
                            {statusError && (
                                <Alert className="bg-red-50 border-red-200 mb-4">
                                    <AlertTriangle className="h-4 w-4 text-red-600" />
                                    <AlertTitle className="text-red-800">Could not refresh security status</AlertTitle>
                                    <AlertDescription className="text-red-700">
                                        <div className="space-y-3">
                                            <p>{statusError}</p>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="border-red-300 text-red-700 hover:bg-red-100"
                                                onClick={checkTwoFactorStatus}
                                            >
                                                Retry
                                            </Button>
                                        </div>
                                    </AlertDescription>
                                </Alert>
                            )}
                            {!twoFactorAvailable && (
                                <Alert className="bg-red-50 border-red-200 mb-4">
                                    <AlertTriangle className="h-4 w-4 text-red-600" />
                                    <AlertTitle className="text-red-800">2FA is temporarily unavailable</AlertTitle>
                                    <AlertDescription className="text-red-700">
                                        The server has not enabled secure 2FA storage yet. Contact support/admin to enable it.
                                    </AlertDescription>
                                </Alert>
                            )}
                            {twoFactorEnabled ? (
                                <Alert className="bg-emerald-50 border-emerald-200">
                                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                                    <AlertTitle className="text-emerald-800">Your account is protected</AlertTitle>
                                    <AlertDescription className="text-emerald-700">
                                        You'll need to enter a code from your authenticator app when logging in.
                                    </AlertDescription>
                                </Alert>
                            ) : (
                                <Alert className="bg-amber-50 border-amber-200">
                                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                                    <AlertTitle className="text-amber-800">2FA is not enabled</AlertTitle>
                                    <AlertDescription className="text-amber-700">
                                        Enable 2FA to add an extra layer of security to your account.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>

                        {setupSuccess && (
                            <Alert className="bg-emerald-50 border-emerald-200 mb-4">
                                <CheckCircle className="h-4 w-4 text-emerald-600" />
                                <AlertTitle className="text-emerald-800">Setup in progress</AlertTitle>
                                <AlertDescription className="text-emerald-700">{setupSuccess}</AlertDescription>
                            </Alert>
                        )}

                        {verifySuccess && (
                            <Alert className="bg-emerald-50 border-emerald-200 mb-4">
                                <CheckCircle className="h-4 w-4 text-emerald-600" />
                                <AlertTitle className="text-emerald-800">Verification successful</AlertTitle>
                                <AlertDescription className="text-emerald-700">{verifySuccess}</AlertDescription>
                            </Alert>
                        )}

                        {disableSuccess && (
                            <Alert className="bg-emerald-50 border-emerald-200 mb-4">
                                <CheckCircle className="h-4 w-4 text-emerald-600" />
                                <AlertTitle className="text-emerald-800">2FA disabled</AlertTitle>
                                <AlertDescription className="text-emerald-700">{disableSuccess}</AlertDescription>
                            </Alert>
                        )}

                        {setupLoading && !setupMode && (
                            <PageLoadingState
                                title="Preparing 2FA setup"
                                description="Generating a secure QR code and setup token."
                                marker="security-setup-loading"
                                className="mb-4"
                            />
                        )}

                        {setupError && !setupMode && (
                            <PageErrorState
                                title="2FA setup unavailable"
                                description={setupError}
                                onRetry={handleSetup2FA}
                                retryLabel="Retry setup"
                                marker="security-setup-error"
                                className="mb-4"
                                secondaryAction={(
                                    <Button
                                        variant="outline"
                                        data-ux-action="security_setup_dismiss_error"
                                        onClick={() => setSetupError('')}
                                    >
                                        Dismiss
                                    </Button>
                                )}
                            />
                        )}

                        {/* Setup Flow */}
                        {setupMode && verifyMode && (
                            <div className="space-y-6">
                                <Separator />

                                {/* Step 1: QR Code */}
                                <div>
                                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                                        <QrCode className="w-5 h-5" />
                                        Step 1: Scan QR Code
                                    </h3>
                                    <p className="text-sm text-gray-600 mb-4">
                                        Open your authenticator app (Google Authenticator, Authy, etc.) and scan this QR code.
                                    </p>
                                    {qrCode && (
                                        <div className="flex justify-center p-4 bg-white rounded-lg border">
                                            <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                                        </div>
                                    )}
                                </div>

                                {/* Step 2: Verify */}
                                <div>
                                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                                        <Smartphone className="w-5 h-5" />
                                        Step 2: Enter Verification Code
                                    </h3>
                                    {verifyLoading && (
                                        <PageLoadingState
                                            title="Verifying your code"
                                            description="Checking the one-time code with the server."
                                            marker="security-verify-loading"
                                            className="mb-4"
                                        />
                                    )}
                                    {verifyError && (
                                        <PageErrorState
                                            title="2FA verification failed"
                                            description={verifyError}
                                            onRetry={handleVerify2FA}
                                            retryLabel="Retry verification"
                                            marker="security-verify-error"
                                            className="mb-4"
                                            secondaryAction={(
                                                <Button
                                                    variant="outline"
                                                    data-ux-action="security_verify_clear_error"
                                                    onClick={() => setVerifyError('')}
                                                >
                                                    Clear error
                                                </Button>
                                            )}
                                        />
                                    )}
                                    <p className="text-sm text-gray-600 mb-4">
                                        Enter the 6-digit code from your authenticator app to complete setup.
                                    </p>
                                    <div className="flex gap-3">
                                        <Input
                                            type="text"
                                            placeholder="000000"
                                            maxLength={6}
                                            value={verificationCode}
                                            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                                            className="max-w-32 text-center text-2xl tracking-widest font-mono"
                                        />
                                        <Button onClick={handleVerify2FA} disabled={verifyLoading || verificationCode.length !== 6}>
                                            {verifyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify & Enable'}
                                        </Button>
                                        <Button variant="outline" onClick={() => { setSetupMode(false); setVerifyMode(false); setVerifyError(''); }}>
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Backup Codes Display */}
                        {showBackupCodes && backupCodes.length > 0 && (
                            <div className="space-y-4">
                                <Separator />
                                <div>
                                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                                        <Key className="w-5 h-5" />
                                        Backup Codes
                                    </h3>
                                    <Alert className="bg-red-50 border-red-200 mb-4">
                                        <AlertTriangle className="h-4 w-4 text-red-600" />
                                        <AlertTitle className="text-red-800">Save these codes!</AlertTitle>
                                        <AlertDescription className="text-red-700">
                                            These codes can be used to access your account if you lose your authenticator. Store them safely.
                                        </AlertDescription>
                                    </Alert>

                                    <div className="grid grid-cols-2 gap-2 p-4 bg-gray-100 rounded-lg font-mono text-sm">
                                        {backupCodes.map((code, i) => (
                                            <div key={i} className="bg-white px-3 py-2 rounded border">{code}</div>
                                        ))}
                                    </div>

                                    <div className="flex gap-2 mt-4">
                                        <Button variant="outline" onClick={copyBackupCodes}>
                                            <Copy className="w-4 h-4 mr-2" /> Copy Codes
                                        </Button>
                                        <Button onClick={() => setShowBackupCodes(false)}>
                                            I've Saved My Codes
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Disable Mode */}
                        {disableMode && (
                            <div className="space-y-4">
                                <Separator />
                                <div>
                                    <h3 className="font-semibold mb-2 text-red-600">Disable Two-Factor Authentication</h3>
                                    {disableLoading && (
                                        <PageLoadingState
                                            title="Disabling 2FA"
                                            description="Verifying your code before disabling two-factor authentication."
                                            marker="security-disable-loading"
                                            className="mb-4"
                                        />
                                    )}
                                    {disableError && (
                                        <PageErrorState
                                            title="Unable to disable 2FA"
                                            description={disableError}
                                            onRetry={handleDisable2FA}
                                            retryLabel="Retry disable"
                                            marker="security-disable-error"
                                            className="mb-4"
                                            secondaryAction={(
                                                <Button
                                                    variant="outline"
                                                    data-ux-action="security_disable_clear_error"
                                                    onClick={() => setDisableError('')}
                                                >
                                                    Clear error
                                                </Button>
                                            )}
                                        />
                                    )}
                                    <p className="text-sm text-gray-600 mb-4">
                                        Enter a code from your authenticator app to disable 2FA.
                                    </p>
                                    <div className="flex gap-3">
                                        <Input
                                            type="text"
                                            placeholder="000000"
                                            maxLength={6}
                                            value={verificationCode}
                                            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                                            className="max-w-32 text-center text-2xl tracking-widest font-mono"
                                        />
                                        <Button variant="destructive" onClick={handleDisable2FA} disabled={disableLoading || verificationCode.length !== 6}>
                                            {disableLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Disable 2FA'}
                                        </Button>
                                        <Button variant="outline" onClick={() => { setDisableMode(false); setDisableError(''); }}>
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        {!setupMode && !disableMode && (
                            <div className="flex gap-3 mt-4">
                                {!twoFactorEnabled ? (
                                    <Button onClick={handleSetup2FA} disabled={setupLoading || !twoFactorAvailable} className="bg-emerald-600 hover:bg-emerald-700">
                                        {setupLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Shield className="w-4 h-4 mr-2" />}
                                        Enable 2FA
                                    </Button>
                                ) : (
                                    <>
                                        <Button variant="outline" onClick={() => setShowBackupCodes(true)}>
                                            <Key className="w-4 h-4 mr-2" /> View Backup Codes
                                        </Button>
                                        <Button variant="destructive" onClick={() => { setDisableMode(true); setDisableError(''); }}>
                                            <ShieldX className="w-4 h-4 mr-2" /> Disable 2FA
                                        </Button>
                                    </>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Other Security Features */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Other Security Features</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <RefreshCw className="w-5 h-5 text-gray-600" />
                                <div>
                                    <p className="font-medium">Password</p>
                                    <p className="text-sm text-gray-500">Last changed: Never</p>
                                </div>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => navigate('/forgot-password')}>
                                Change Password
                            </Button>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <Eye className="w-5 h-5 text-gray-600" />
                                <div>
                                    <p className="font-medium">Login Activity</p>
                                    <p className="text-sm text-gray-500">View recent login attempts</p>
                                </div>
                            </div>
                            <Button variant="outline" size="sm" disabled>
                                Coming Soon
                            </Button>
                        </div>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
};

export default SecuritySettings;

