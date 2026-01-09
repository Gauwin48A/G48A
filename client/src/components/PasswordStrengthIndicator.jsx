import React, { useMemo } from 'react';

import { useTranslation } from 'react-i18next';

/**
 * Password Strength Indicator Component
 * Shows real-time feedback on password strength
 */
const PasswordStrengthIndicator = ({ password }) => {
  const { t } = useTranslation();
    const analysis = useMemo(() => {
        if (!password) {
            return { score: 0, level: 'empty', message: '', checks: [] };
        }

        const checks = [
            { label: '8+ characters', met: password.length >= 8 },
            { label: 'Uppercase letter (A-Z)', met: /[A-Z]/.test(password) },
            { label: 'Lowercase letter (a-z)', met: /[a-z]/.test(password) },
            { label: 'Number (0-9)', met: /\d/.test(password) },
            { label: 'Special character (!@#$%^&*)', met: /[!@#$%^&*]/.test(password) },
        ];

        const score = checks.filter(c => c.met).length;

        let level, message, color;
        if (score <= 1) {
            level = 'weak';
            message = 'Very Weak - Easy to crack';
            color = '#ef4444'; // red
        } else if (score === 2) {
            level = 'weak';
            message = 'Weak - Add more character types';
            color = '#f97316'; // orange
        } else if (score === 3) {
            level = 'medium';
            message = 'Fair - Could be stronger';
            color = '#eab308'; // yellow
        } else if (score === 4) {
            level = 'strong';
            message = 'Good - Almost there!';
            color = '#84cc16'; // lime
        } else {
            level = 'very-strong';
            message = 'Strong - Excellent password!';
            color = '#22c55e'; // green
        }

        return { score, level, message, color, checks };
    }, [password]);

    if (!password) return null;

    return (
        <div className="password-strength-indicator mt-2 p-3 rounded-lg bg-gray-800/50 border border-gray-700">
            {/* Strength bar */}
            <div className="flex gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div
                        key={i}
                        className="h-1.5 flex-1 rounded-full transition-all duration-300"
                        style={{
                            backgroundColor: i <= analysis.score ? analysis.color : '#374151'
                        }}
                    />
                ))}
            </div>

            {/* Strength message */}
            <p
                className="text-sm font-medium mb-2"
                style={{ color: analysis.color }}
            >
                {analysis.message}
            </p>

            {/* Requirements checklist */}
            <div className="space-y-1">
                {analysis.checks.map((check, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                        <span
                            className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${check.met ? 'bg-green-500/20 text-green-400' : 'bg-gray-600/20 text-gray-500'
                                }`}
                        >
                            {check.met ? '✓' : '○'}
                        </span>
                        <span className={check.met ? 'text-gray-300' : 'text-gray-500'}>
                            {check.label}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PasswordStrengthIndicator;
