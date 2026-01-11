/**
 * ShareButton Component
 * Architect Cleanup - Phase 4
 * 
 * Native share on mobile, copy link on desktop
 */

import React, { useState } from 'react';
import { Share2, Check, Copy, Link } from 'lucide-react';

const ShareButton = ({
    url,
    title = 'Check this out!',
    text = '',
    className = '',
    variant = 'button', // 'button' | 'icon' | 'text'
    onShareSuccess,
    onShareError,
}) => {
    const [copied, setCopied] = useState(false);
    const [isSharing, setIsSharing] = useState(false);

    const shareUrl = url || window.location.href;

    // Check if native share is available
    const canShare = typeof navigator !== 'undefined' && navigator.share;

    const handleShare = async () => {
        setIsSharing(true);

        try {
            if (canShare) {
                // Native share (mobile)
                await navigator.share({
                    title,
                    text,
                    url: shareUrl,
                });
                onShareSuccess?.('native');
            } else {
                // Fallback: copy to clipboard
                await navigator.clipboard.writeText(shareUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
                onShareSuccess?.('clipboard');
            }
        } catch (error) {
            // User cancelled or error
            if (error.name !== 'AbortError') {
                console.error('Share failed:', error);
                onShareError?.(error);

                // Last resort: try clipboard
                try {
                    await navigator.clipboard.writeText(shareUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                } catch (clipError) {
                    console.error('Clipboard failed:', clipError);
                }
            }
        } finally {
            setIsSharing(false);
        }
    };

    // Icon-only variant
    if (variant === 'icon') {
        return (
            <button
                onClick={handleShare}
                disabled={isSharing}
                className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${className}`}
                title="Share"
            >
                {copied ? (
                    <Check className="w-5 h-5 text-green-500" />
                ) : (
                    <Share2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                )}
            </button>
        );
    }

    // Text link variant
    if (variant === 'text') {
        return (
            <button
                onClick={handleShare}
                disabled={isSharing}
                className={`flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors ${className}`}
            >
                {copied ? (
                    <>
                        <Check className="w-4 h-4 text-green-500" />
                        <span className="text-green-500">Link copied!</span>
                    </>
                ) : (
                    <>
                        <Share2 className="w-4 h-4" />
                        <span>Share</span>
                    </>
                )}
            </button>
        );
    }

    // Full button variant (default)
    return (
        <button
            onClick={handleShare}
            disabled={isSharing}
            className={`
        flex items-center justify-center gap-2 px-4 py-2 
        bg-gray-100 dark:bg-gray-800 
        hover:bg-gray-200 dark:hover:bg-gray-700 
        text-gray-700 dark:text-gray-300 
        rounded-lg font-medium transition-all
        disabled:opacity-50
        ${className}
      `}
        >
            {copied ? (
                <>
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-green-500">Copied!</span>
                </>
            ) : (
                <>
                    {canShare ? (
                        <Share2 className="w-4 h-4" />
                    ) : (
                        <Copy className="w-4 h-4" />
                    )}
                    <span>{canShare ? 'Share' : 'Copy Link'}</span>
                </>
            )}
        </button>
    );
};

export default ShareButton;
