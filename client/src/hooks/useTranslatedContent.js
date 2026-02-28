/**
 * useTranslatedContent Hook
 * React hook for translating dynamic content based on selected language
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { translatePosts, translateText } from '../utils/translateContent';

/**
 * Hook to translate an array of posts
 * @param {Object[]} posts - Original posts array
 * @returns {{ translatedPosts: Object[], isTranslating: boolean }}
 */
export function useTranslatedPosts(posts) {
    const { i18n } = useTranslation();
    const [translatedPosts, setTranslatedPosts] = useState(posts || []);
    const [isTranslating, setIsTranslating] = useState(false);
    const currentLang = i18n.language;

    useEffect(() => {
        let cancelled = false;

        if (!posts?.length) {
            setTranslatedPosts([]);
            return () => {
                cancelled = true;
            };
        }

        // If English, no translation needed
        if (currentLang === 'en') {
            setTranslatedPosts(posts);
            return () => {
                cancelled = true;
            };
        }

        // Translate posts
        const doTranslate = async () => {
            setIsTranslating(true);
            try {
                const translated = await translatePosts(posts, currentLang);
                if (!cancelled) {
                    setTranslatedPosts(translated);
                }
            } catch (error) {
                if (import.meta.env.DEV) {
                    console.warn('Translation error:', error);
                }
                if (!cancelled) {
                    setTranslatedPosts(posts);
                }
            } finally {
                if (!cancelled) {
                    setIsTranslating(false);
                }
            }
        };

        doTranslate();

        return () => {
            cancelled = true;
        };
    }, [posts, currentLang]);

    return { translatedPosts, isTranslating };
}

/**
 * Hook to translate a single text string
 * @param {string} text - Original text
 * @returns {{ translatedText: string, isTranslating: boolean }}
 */
export function useTranslatedText(text) {
    const { i18n } = useTranslation();
    const [translatedText, setTranslatedText] = useState(text || '');
    const [isTranslating, setIsTranslating] = useState(false);
    const currentLang = i18n.language;

    useEffect(() => {
        let cancelled = false;

        if (!text) {
            setTranslatedText('');
            return () => {
                cancelled = true;
            };
        }

        if (currentLang === 'en') {
            setTranslatedText(text);
            return () => {
                cancelled = true;
            };
        }

        const doTranslate = async () => {
            setIsTranslating(true);
            try {
                const translated = await translateText(text, currentLang);
                if (!cancelled) {
                    setTranslatedText(translated);
                }
            } catch {
                if (!cancelled) {
                    setTranslatedText(text);
                }
            } finally {
                if (!cancelled) {
                    setIsTranslating(false);
                }
            }
        };

        doTranslate();

        return () => {
            cancelled = true;
        };
    }, [text, currentLang]);

    return { translatedText, isTranslating };
}

/**
 * Hook that returns a translation function for on-demand translation
 * @returns {{ translate: Function, currentLang: string }}
 */
export function useContentTranslator() {
    const { i18n } = useTranslation();
    const currentLang = i18n.language;

    const translate = useCallback(async (text) => {
        if (!text || currentLang === 'en') {
            return text;
        }
        return translateText(text, currentLang);
    }, [currentLang]);

    const translateMany = useCallback(async (posts) => {
        if (!posts?.length || currentLang === 'en') {
            return posts;
        }
        return translatePosts(posts, currentLang);
    }, [currentLang]);

    return { translate, translateMany, currentLang };
}

export default {
    useTranslatedPosts,
    useTranslatedText,
    useContentTranslator
};
