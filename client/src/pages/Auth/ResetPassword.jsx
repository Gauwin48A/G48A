import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Lock, CheckCircle, Eye, EyeOff } from "lucide-react";
import { useTranslation } from 'react-i18next';

const ResetPassword = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!token) {
            toast({ title: "Error", description: "Invalid reset link", variant: "destructive" });
            return;
        }

        if (!password || !confirmPassword) {
            toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
            return;
        }

        if (password !== confirmPassword) {
            toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
            return;
        }

        // Password strength validation
        const hasUppercase = /[A-Z]/.test(password);
        const hasLowercase = /[a-z]/.test(password);
        const hasNumber = /\d/.test(password);
        const hasSpecial = /[!@#$%^&*]/.test(password);
        const isLongEnough = password.length >= 8;

        if (!isLongEnough || !hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
            toast({
                title: "Weak Password",
                description: "Password must be 8+ characters with uppercase, lowercase, number, and special character",
                variant: "destructive"
            });
            return;
        }

        setLoading(true);
        try {
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
            const res = await fetch(`${baseUrl}/api/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword: password })
            });

            const data = await res.json();

            if (res.ok) {
                setSuccess(true);
                toast({ title: "Success", description: "Password reset successfully!" });
                setTimeout(() => navigate('/login'), 3000);
            } else {
                toast({ title: "Error", description: data.error || "Failed to reset password", variant: "destructive" });
            }
        } catch (err) {
            toast({ title: "Error", description: "Network error. Please try again.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] p-4">
                <Card className="max-w-md w-full shadow-2xl border-0 rounded-3xl bg-white dark:bg-gray-800">
                    <CardContent className="p-8 text-center">
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Invalid Reset Link</h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">This password reset link is invalid or has expired.</p>
                        <Link to="/forgot-password">
                            <Button className="w-full bg-[#96C2DB] hover:bg-blue-500 text-white">Request New Link</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] p-4">
            <Card className="max-w-md w-full shadow-2xl border-0 rounded-3xl overflow-hidden bg-white dark:bg-gray-800">
                <CardHeader className="text-center py-8 bg-gradient-to-r from-blue-600 to-blue-700">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/20 flex items-center justify-center">
                        {success ? <CheckCircle className="w-8 h-8 text-white" /> : <Lock className="w-8 h-8 text-white" />}
                    </div>
                    <CardTitle className="text-2xl text-white">
                        {success ? 'Password Reset!' : 'Reset Password'}
                    </CardTitle>
                    <CardDescription className="text-blue-100">
                        {success ? 'Redirecting to login...' : 'Create a new secure password'}
                    </CardDescription>
                </CardHeader>

                <CardContent className="p-8">
                    {success ? (
                        <div className="text-center space-y-4">
                            <p className="text-gray-600 dark:text-gray-300">
                                Your password has been reset successfully. You will be redirected to the login page.
                            </p>
                            <Link to="/login">
                                <Button className="w-full bg-[#96C2DB] hover:bg-blue-500 text-white">Go to Login</Button>
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <Label htmlFor="password" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    New Password
                                </Label>
                                <div className="relative mt-2">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="h-12 border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:bg-gray-700 dark:text-white rounded-xl pr-12"
                                        placeholder="Create new password"
                                        disabled={loading}
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
                                <Label htmlFor="confirmPassword" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    Confirm Password
                                </Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="mt-2 h-12 border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:bg-gray-700 dark:text-white rounded-xl"
                                    placeholder="Confirm new password"
                                    disabled={loading}
                                />
                            </div>

                            {/* Password Requirements */}
                            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl text-xs">
                                <p className="font-semibold mb-2 text-gray-700 dark:text-gray-300">Password Requirements:</p>
                                <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                                    <li className={password.length >= 8 ? 'text-green-600' : ''}>✓ At least 8 characters</li>
                                    <li className={/[A-Z]/.test(password) ? 'text-green-600' : ''}>✓ Uppercase letter (A-Z)</li>
                                    <li className={/[a-z]/.test(password) ? 'text-green-600' : ''}>✓ Lowercase letter (a-z)</li>
                                    <li className={/\d/.test(password) ? 'text-green-600' : ''}>✓ Number (0-9)</li>
                                    <li className={/[!@#$%^&*]/.test(password) ? 'text-green-600' : ''}>✓ Special character (!@#$%^&*)</li>
                                </ul>
                            </div>

                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full py-6 text-lg bg-[#96C2DB] hover:bg-blue-500 text-white rounded-xl"
                            >
                                {loading ? 'Resetting...' : 'Reset Password'}
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default ResetPassword;
