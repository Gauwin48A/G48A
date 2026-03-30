/**
 * Date/Time Utilities
 * WhatsApp-style "Last Seen" formatting
 */

/**
 * Format last seen timestamp like WhatsApp
 * @param {string|Date} dateString - The last active timestamp
 * @returns {string} - "Online", "Last seen 2 hours ago", etc.
 */
export const formatLastSeen = (dateString) => {
    if (!dateString) return 'Offline';

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Offline';

    const now = new Date();
    const diffInMs = now - date;
    const diffInMinutes = diffInMs / 1000 / 60;
    const diffInHours = diffInMinutes / 60;
    const diffInDays = diffInHours / 24;

    // Online: Active in last 5 minutes
    if (diffInMinutes < 6) {
        return 'Online';
    }

    // Just now: 5-15 minutes ago
    if (diffInMinutes < 15) {
        return 'Last seen just now';
    }

    // Minutes ago
    if (diffInMinutes < 60) {
        const mins = Math.floor(diffInMinutes);
        return `Last seen ${mins} min${mins > 1 ? 's' : ''} ago`;
    }

    // Hours ago
    if (diffInHours < 24) {
        const hours = Math.floor(diffInHours);
        return `Last seen ${hours} hour${hours > 1 ? 's' : ''} ago`;
    }

    // Days ago
    if (diffInDays < 7) {
        const days = Math.floor(diffInDays);
        return `Last seen ${days} day${days > 1 ? 's' : ''} ago`;
    }

    // Older than a week
    return `Last seen ${date.toLocaleDateString()}`;
};

/**
 * Check if user is online
 * @param {string|Date} lastActiveAt 
 * @returns {boolean}
 */
export const isOnline = (lastActiveAt) => {
    if (!lastActiveAt) return false;
    const date = new Date(lastActiveAt);
    const diffInMinutes = (Date.now() - date.getTime()) / 1000 / 60;
    return diffInMinutes < 6;
};

/**
 * Format relative time (e.g., "2 hours ago")
 * @param {string|Date} dateString 
 * @returns {string}
 */
export const formatRelativeTime = (dateString) => {
    if (!dateString) return '';

    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now - date;
    const diffInSeconds = diffInMs / 1000;
    const diffInMinutes = diffInSeconds / 60;
    const diffInHours = diffInMinutes / 60;
    const diffInDays = diffInHours / 24;

    if (diffInSeconds < 60) return 'Just now';
    if (diffInMinutes < 60) return `${Math.floor(diffInMinutes)}m ago`;
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
    if (diffInDays < 7) return `${Math.floor(diffInDays)}d ago`;

    return date.toLocaleDateString();
};

/**
 * Format timestamp for messages
 * @param {string|Date} dateString 
 * @returns {string}
 */
export const formatMessageTime = (dateString) => {
    if (!dateString) return '';

    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isToday) return time;
    if (isYesterday) return `Yesterday ${time}`;

    return `${date.toLocaleDateString()} ${time}`;
};
