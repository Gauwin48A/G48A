/**
 * Language Sheet Component
 * Protocol: Zero-Latency Linguistics
 * 
 * Features:
 * - Prefetch on hover (downloads JSON before click)
 * - Cache-first display
 * - RTL support
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LANGUAGE_TIERS, LANGUAGES, getLanguageByCode } from '../constants/languages';
import { prefetchLanguage } from '../i18n';
import { X, Check, Globe, Search } from 'lucide-react';

const LanguageSheet = ({ isOpen, onClose }) => {
    const { i18n, t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');

    const handleLanguageChange = (lang) => {
        i18n.changeLanguage(lang.code);

        // Dynamic RTL Support
        document.documentElement.dir = lang.dir;
        document.documentElement.lang = lang.code;

        onClose?.();
    };

    // PERFORMANCE: Prefetch on hover - downloads JSON while user thinks
    const handleMouseEnter = (langCode) => {
        prefetchLanguage(langCode);
    };

    // Filter languages by search
    const filteredTiers = searchQuery.trim()
        ? [{
            tier: 'Search Results',
            id: 'search',
            languages: LANGUAGES.filter(lang =>
                lang.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                lang.native.toLowerCase().includes(searchQuery.toLowerCase()) ||
                lang.code.toLowerCase().includes(searchQuery.toLowerCase())
            )
        }]
        : LANGUAGE_TIERS;

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Sheet */}
            <div className="fixed bottom-0 left-0 right-0 z-50 sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[420px] animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95">
                <div className="bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[85vh] overflow-hidden flex flex-col">

                    {/* Header */}
                    <div className="sticky top-0 bg-white dark:bg-gray-900 z-10 p-4 border-b border-gray-100 dark:border-gray-800">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-500 rounded-full flex items-center justify-center">
                                    <Globe className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                        {t('language', 'App Language')}
                                    </h2>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {LANGUAGES.length} languages • Instant switching
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search languages..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full ps-10 pe-4 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:text-white"
                            />
                        </div>
                    </div>

                    {/* Language List */}
                    <div className="overflow-y-auto flex-1 p-2">
                        {filteredTiers.map((tierGroup, tierIndex) => (
                            <div key={tierGroup.id} className={tierIndex > 0 ? 'mt-4' : ''}>
                                {/* Tier Header */}
                                <div className="px-3 py-2 mb-1">
                                    <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        {tierGroup.tier}
                                    </h3>
                                </div>

                                {/* Languages in Tier */}
                                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {tierGroup.languages.map((lang) => {
                                        const isSelected = i18n.language === lang.code ||
                                            i18n.language?.startsWith(lang.code);

                                        return (
                                            <button
                                                key={lang.code}
                                                onMouseEnter={() => handleMouseEnter(lang.code)}
                                                onClick={() => handleLanguageChange(lang)}
                                                className={`
                          w-full flex items-center justify-between p-4 transition-colors
                          ${isSelected
                                                        ? 'bg-green-50 dark:bg-green-900/20'
                                                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                                    }
                        `}
                                            >
                                                <div className="flex flex-col items-start">
                                                    <span className={`text-base font-medium ${isSelected
                                                            ? 'text-green-700 dark:text-green-400'
                                                            : 'text-gray-900 dark:text-gray-100'
                                                        }`}>
                                                        {lang.native}
                                                    </span>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        {lang.label}
                                                    </span>
                                                </div>

                                                {isSelected && (
                                                    <span className="text-green-600 dark:text-green-400 font-bold text-xl">●</span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}

                        {filteredTiers[0]?.languages.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                No languages found for "{searchQuery}"
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                        <p className="text-[10px] text-center text-gray-400 dark:text-gray-500">
                            ⚡ Zero-latency • Cached locally • Works offline
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
};

export default LanguageSheet;
