import React from 'react';
import { Button } from '@/components/ui/button';
import { FaLock, FaUserPlus, FaSignInAlt } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

/**
 * LoginPromptModal - Shows when guest users try to access restricted content
 * Used on AllPosts and FeedPage when scrolling past 5 posts
 */
const LoginPromptModal = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const { t } = useTranslation();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-6 md:p-8 w-[95%] max-w-md mx-auto animate-fadeIn border border-gray-200 dark:border-gray-700">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Icon */}
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                    <FaLock className="text-white text-3xl" />
                </div>

                {/* Title */}
                <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-3">
                    {t('login_to_continue') || 'Login to Continue'}
                </h2>

                {/* Description */}
                <p className="text-center text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                    {t('login_prompt_message') || 'Sign in to view all posts, create listings, and access the full marketplace experience.'}
                </p>

                {/* Features preview */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-6">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('unlock_features') || 'Unlock these features:'}
                    </p>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <li>✓ {t('view_all_posts') || 'View unlimited posts'}</li>
                        <li>✓ {t('create_listings') || 'Create and sell listings'}</li>
                        <li>✓ {t('save_favorites') || 'Save favorites & wishlist'}</li>
                        <li>✓ {t('earn_rewards') || 'Earn rewards & referrals'}</li>
                    </ul>
                </div>

                {/* Buttons */}
                <div className="flex flex-col gap-3">
                    <Button
                        onClick={() => navigate('/login')}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2"
                    >
                        <FaSignInAlt /> {t('login') || 'Login'}
                    </Button>
                    <Button
                        onClick={() => navigate('/signup')}
                        variant="outline"
                        className="w-full border-2 border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-bold py-4 rounded-xl flex items-center justify-center gap-2"
                    >
                        <FaUserPlus /> {t('create_account') || 'Create Account'}
                    </Button>
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-gray-500 dark:text-gray-500 mt-4">
                    {t('guest_continue') || 'Or continue browsing as guest (limited access)'}
                </p>
            </div>
        </div>
    );
};

export default LoginPromptModal;
