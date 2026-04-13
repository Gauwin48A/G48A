/**
 * Theme Context
 * Provides app-wide theme modes (light/dark/system) with persistence
 */

import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

const ThemeContext = createContext();
const STORAGE_KEY = 'mhub-theme';
const LEGACY_KEY = 'darkMode';
const THEME_MODES = ['light', 'dark', 'system'];

const getSystemPreference = () => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const resolveTheme = (mode) => (mode === 'system' ? getSystemPreference() : mode);

const getInitialMode = () => {
    if (typeof window === 'undefined') return 'light';
    const saved = localStorage.getItem(STORAGE_KEY);
    if (THEME_MODES.includes(saved)) return saved;
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy !== null) {
        try {
            return JSON.parse(legacy) === true ? 'dark' : 'light';
        } catch {
            return 'light';
        }
    }
    return 'system';
};

const applyTheme = (resolved, mode, animate = false) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const metaTheme = document.querySelector('meta[name="theme-color"]');

    if (animate) {
        root.classList.add('theme-transition');
        window.setTimeout(() => root.classList.remove('theme-transition'), 260);
    }

    root.classList.toggle('dark', resolved === 'dark');
    root.setAttribute('data-theme', resolved);
    root.setAttribute('data-theme-mode', mode);
    root.style.colorScheme = resolved;
    document.body?.setAttribute('data-theme', resolved);
    document.body?.setAttribute('data-theme-mode', mode);

    if (metaTheme) {
        metaTheme.setAttribute('content', resolved === 'dark' ? '#0f1115' : '#ffffff');
    }
};

export const ThemeProvider = ({ children }) => {
    const [mode, setMode] = useState(getInitialMode);
    const [resolvedTheme, setResolvedTheme] = useState(() => resolveTheme(getInitialMode()));
    const didInit = useRef(false);

    useLayoutEffect(() => {
        const nextResolved = resolveTheme(mode);
        setResolvedTheme(nextResolved);
        applyTheme(nextResolved, mode, didInit.current);
        didInit.current = true;
        localStorage.setItem(STORAGE_KEY, mode);
        localStorage.setItem(LEGACY_KEY, JSON.stringify(nextResolved === 'dark'));
    }, [mode]);

    useEffect(() => {
        if (mode !== 'system') return undefined;
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => {
            const nextResolved = resolveTheme('system');
            setResolvedTheme(nextResolved);
            applyTheme(nextResolved, 'system', true);
        };
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [mode]);

    const setThemeMode = useCallback((nextMode) => {
        if (!THEME_MODES.includes(nextMode)) return;
        setMode(nextMode);
    }, []);

    const toggleTheme = useCallback(() => {
        const nextResolved = resolvedTheme === 'dark' ? 'light' : 'dark';
        setMode(nextResolved);
    }, [resolvedTheme]);

    const setTheme = useCallback((value) => {
        if (typeof value === 'boolean') {
            setMode(value ? 'dark' : 'light');
            return;
        }
        if (THEME_MODES.includes(value)) {
            setMode(value);
        }
    }, []);

    const contextValue = useMemo(() => ({
        mode,
        resolvedTheme,
        isDark: resolvedTheme === 'dark',
        toggleTheme,
        setTheme,
        setThemeMode,
    }), [mode, resolvedTheme, setTheme, setThemeMode, toggleTheme]);

    return (
        <ThemeContext.Provider value={contextValue}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

export default ThemeContext;
