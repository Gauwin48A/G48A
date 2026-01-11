/**
 * OTP Auto-Read Component
 * Protocol: Native Hybrid - Phase 4
 * 
 * Uses Web OTP API to auto-read SMS codes
 * Works on Chrome mobile and Capacitor apps
 */

import React, { useEffect, useState, useRef } from 'react';
import { Input } from '@/components/ui/input';

const OtpAutoRead = ({
    length = 6,
    onComplete,
    onError,
    className = ''
}) => {
    const [otp, setOtp] = useState('');
    const [isAutoReading, setIsAutoReading] = useState(false);
    const inputRef = useRef(null);
    const abortControllerRef = useRef(null);

    useEffect(() => {
        // Try Web OTP API for auto-read
        if ('OTPCredential' in window) {
            setIsAutoReading(true);
            abortControllerRef.current = new AbortController();

            navigator.credentials.get({
                otp: { transport: ['sms'] },
                signal: abortControllerRef.current.signal
            })
                .then((otpCredential) => {
                    if (otpCredential?.code) {
                        console.log('[OTP] Auto-read successful');
                        setOtp(otpCredential.code);
                        onComplete?.(otpCredential.code);
                    }
                })
                .catch((err) => {
                    if (err.name !== 'AbortError') {
                        console.log('[OTP] Auto-read not available:', err.message);
                    }
                })
                .finally(() => {
                    setIsAutoReading(false);
                });
        }

        // Focus input
        inputRef.current?.focus();

        return () => {
            // Cancel OTP listener on unmount
            abortControllerRef.current?.abort();
        };
    }, [onComplete]);

    const handleChange = (e) => {
        const value = e.target.value.replace(/[^0-9]/g, '').slice(0, length);
        setOtp(value);

        if (value.length === length) {
            onComplete?.(value);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && otp.length === length) {
            onComplete?.(otp);
        }
    };

    return (
        <div className={`relative ${className}`}>
            <Input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder={`Enter ${length}-digit OTP`}
                value={otp}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                maxLength={length}
                className="text-center text-2xl tracking-widest font-mono"
            />

            {isAutoReading && (
                <p className="text-xs text-blue-500 text-center mt-2 animate-pulse">
                    Waiting for SMS...
                </p>
            )}
        </div>
    );
};

/**
 * Individual OTP Box Input (Alternative style)
 */
export const OtpBoxInput = ({
    length = 6,
    onComplete,
    className = ''
}) => {
    const [values, setValues] = useState(Array(length).fill(''));
    const inputRefs = useRef([]);

    useEffect(() => {
        inputRefs.current[0]?.focus();
    }, []);

    const handleChange = (index, e) => {
        const value = e.target.value.replace(/[^0-9]/g, '');

        if (value) {
            const newValues = [...values];
            newValues[index] = value.slice(-1);
            setValues(newValues);

            // Move to next input
            if (index < length - 1) {
                inputRefs.current[index + 1]?.focus();
            }

            // Check if complete
            const otp = newValues.join('');
            if (otp.length === length) {
                onComplete?.(otp);
            }
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !values[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, length);

        if (pastedData) {
            const newValues = pastedData.split('').concat(Array(length).fill('')).slice(0, length);
            setValues(newValues);

            if (pastedData.length === length) {
                onComplete?.(pastedData);
            }
        }
    };

    return (
        <div className={`flex gap-2 justify-center ${className}`}>
            {values.map((value, index) => (
                <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    autoComplete={index === 0 ? 'one-time-code' : 'off'}
                    value={value}
                    onChange={(e) => handleChange(index, e)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    maxLength={1}
                    className="w-12 h-14 text-center text-2xl font-bold border-2 rounded-lg focus:border-blue-500 focus:outline-none bg-white dark:bg-gray-800"
                />
            ))}
        </div>
    );
};

export default OtpAutoRead;
