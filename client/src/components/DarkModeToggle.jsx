/**
 * Dark Mode Toggle Component
 * Animates between sun and moon icons
 */

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const DarkModeToggle = ({ className = '' }) => {
    const { isDark, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className={`
        relative p-2 rounded-full
        bg-gray-100 dark:bg-gray-800
        hover:bg-gray-200 dark:hover:bg-gray-700
        transition-all duration-300
        ${className}
      `}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
            <div className="relative w-5 h-5">
                {/* Sun icon */}
                <Sun
                    className={`
            absolute inset-0 w-5 h-5 text-amber-500
            transition-all duration-300
            ${isDark ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'}
          `}
                />
                {/* Moon icon */}
                <Moon
                    className={`
            absolute inset-0 w-5 h-5 text-blue-400
            transition-all duration-300
            ${isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'}
          `}
                />
            </div>
        </button>
    );
};

export default DarkModeToggle;
