/**
 * Contact Service
 * Protocol: Native Hybrid - Phase 3
 * 
 * Syncs phone contacts to find friends on platform
 * Uses Capacitor contacts plugin on native, skips on web
 */

import api from '../lib/api';

// Check if running in Capacitor native environment
const isNative = () => {
    return typeof window !== 'undefined' &&
        window.Capacitor &&
        window.Capacitor.isNativePlatform();
};

/**
 * Request contacts permission
 * Returns: 'granted', 'denied', or 'unavailable'
 */
export const requestContactsPermission = async () => {
    if (!isNative()) {
        console.log('[Contacts] Not on native platform, skipping permission request');
        return 'unavailable';
    }

    try {
        // Dynamic import to avoid errors on web
        const { Contacts } = await import('@capacitor-community/contacts');
        const result = await Contacts.requestPermissions();
        return result.contacts;
    } catch (error) {
        console.error('[Contacts] Permission request failed:', error);
        return 'denied';
    }
};

/**
 * Get all contacts from device
 * Only works on native platforms
 */
export const getDeviceContacts = async () => {
    if (!isNative()) {
        console.log('[Contacts] Not on native platform');
        return [];
    }

    try {
        const { Contacts } = await import('@capacitor-community/contacts');

        const result = await Contacts.getContacts({
            projection: {
                name: true,
                phones: true
            }
        });

        return result.contacts || [];
    } catch (error) {
        console.error('[Contacts] Failed to get contacts:', error);
        return [];
    }
};

/**
 * Sync contacts to server to find friends
 * Batches 100 contacts at a time
 */
export const syncContactsToServer = async () => {
    const contacts = await getDeviceContacts();

    if (contacts.length === 0) {
        console.log('[Contacts] No contacts to sync');
        return { synced: 0 };
    }

    // Clean and format contacts
    const cleanedContacts = contacts
        .filter(c => c.phones && c.phones.length > 0)
        .map(c => ({
            name: c.name?.display || 'Unknown',
            // Clean phone number: remove non-digits, keep last 10
            phone: c.phones[0].number.replace(/[^0-9]/g, '').slice(-10)
        }))
        .filter(c => c.phone.length === 10); // Only valid 10-digit numbers

    if (cleanedContacts.length === 0) {
        return { synced: 0 };
    }

    const token = localStorage.getItem('authToken');
    if (!token) {
        return { error: 'Not authenticated' };
    }

    try {
        // Batch upload (100 at a time)
        const BATCH_SIZE = 100;
        let totalSynced = 0;

        for (let i = 0; i < cleanedContacts.length; i += BATCH_SIZE) {
            const batch = cleanedContacts.slice(i, i + BATCH_SIZE);

            await api.post('/api/contacts/sync', { contacts: batch }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            totalSynced += batch.length;
            console.log(`[Contacts] Synced batch ${Math.ceil(i / BATCH_SIZE) + 1}`);
        }

        console.log(`[Contacts] Total synced: ${totalSynced}`);
        return { synced: totalSynced };

    } catch (error) {
        console.error('[Contacts] Sync failed:', error);
        return { error: error.message };
    }
};

/**
 * Find friends who are on the platform
 */
export const findFriendsOnPlatform = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) return [];

    try {
        const response = await api.get('/api/contacts/friends', {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data.friends || [];
    } catch (error) {
        console.error('[Contacts] Find friends failed:', error);
        return [];
    }
};

export default {
    isNative,
    requestContactsPermission,
    getDeviceContacts,
    syncContactsToServer,
    findFriendsOnPlatform
};
