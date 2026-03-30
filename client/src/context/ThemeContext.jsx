/**
 * Dark Mode Context
 * Provides app-wide dark mode toggle with persistence
 */

import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    // Initialize from localStorage or system preference
    const [isDark, setIsDark] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('mhub-theme');
            if (saved) return saved === 'dark';
            // Check legacy key for backward compatibility
            const legacy = localStorage.getItem('darkMode');
            if (legacy !== null) {
                try { return JSON.parse(legacy) === true; } catch { return false; }
            }
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        return false;
    });

    // Apply dark class to document
    useEffect(() => {
        const root = document.documentElement;
        const themeName = isDark ? 'dark-v2' : 'light';
        if (isDark) {
            root.classList.add('dark');
            root.setAttribute('data-theme', themeName);
            root.style.colorScheme = 'dark';
            localStorage.setItem('mhub-theme', 'dark');
            localStorage.setItem('darkMode', JSON.stringify(true));
        } else {
            root.classList.remove('dark');
            root.setAttribute('data-theme', themeName);
            root.style.colorScheme = 'light';
            localStorage.setItem('mhub-theme', 'light');
            localStorage.setItem('darkMode', JSON.stringify(false));
        }
        document.body?.setAttribute('data-theme', themeName);
    }, [isDark]);

    // Listen for system preference changes
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e) => {
            const saved = localStorage.getItem('mhub-theme');
            if (!saved) setIsDark(e.matches);
        };
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    const toggleTheme = () => setIsDark(!isDark);
    const setTheme = (dark) => setIsDark(dark);

    return (
        <ThemeContext.Provider value={{ isDark, toggleTheme, setTheme }}>
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
