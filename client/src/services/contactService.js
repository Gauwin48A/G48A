/**
 * Contact Service
 * Protocol: Native Hybrid - Phase 3
 * 
 * Syncs phone contacts to find friends on platform
 * Uses Capacitor contacts plugin on native, skips on web
 */

import api from '../lib/api';

const CONTACT_BATCH_SIZE = 100;
const CONTACT_SYNC_CONCURRENCY = 3;

// Check if running in Capacitor native environment
const isNative = () => {
    return typeof window !== 'undefined' &&
        window.Capacitor &&
        window.Capacitor.isNativePlatform();
};

const logDev = (...args) => {
    if (import.meta.env.DEV) {
        console.log(...args);
    }
};

const logError = (...args) => {
    if (import.meta.env.DEV) {
        console.error(...args);
    }
};

/**
 * Request contacts permission
 * Returns: 'granted', 'denied', or 'unavailable'
 */
export const requestContactsPermission = async () => {
    if (!isNative()) {
        logDev('[Contacts] Not on native platform, skipping permission request');
        return 'unavailable';
    }

    try {
        // Dynamic import to avoid errors on web
        const { Contacts } = await import('@capacitor-community/contacts');
        const result = await Contacts.requestPermissions();
        return result.contacts;
    } catch (error) {
        logError('[Contacts] Permission request failed:', error);
        return 'denied';
    }
};

/**
 * Get all contacts from device
 * Only works on native platforms
 */
export const getDeviceContacts = async () => {
    if (!isNative()) {
        logDev('[Contacts] Not on native platform');
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
        logError('[Contacts] Failed to get contacts:', error);
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
        logDev('[Contacts] No contacts to sync');
        return { synced: 0 };
    }

    // Clean, dedupe and format contacts
    const seenPhones = new Set();
    const cleanedContacts = contacts
        .filter((contact) => Array.isArray(contact.phones) && contact.phones.length > 0)
        .map((contact) => ({
            name: contact.name?.display || 'Unknown',
            phone: String(contact.phones[0].number || '').replace(/[^0-9]/g, '').slice(-10)
        }))
        .filter((contact) => contact.phone.length === 10)
        .filter((contact) => {
            if (seenPhones.has(contact.phone)) {
                return false;
            }
            seenPhones.add(contact.phone);
            return true;
        });

    if (cleanedContacts.length === 0) {
        return { synced: 0 };
    }

    const token = localStorage.getItem('authToken');
    if (!token) {
        return { error: 'Not authenticated' };
    }

    try {
        // Batch upload
        let totalSynced = 0;
        const batches = [];
        for (let i = 0; i < cleanedContacts.length; i += CONTACT_BATCH_SIZE) {
            batches.push(cleanedContacts.slice(i, i + CONTACT_BATCH_SIZE));
        }

        for (let i = 0; i < batches.length; i += CONTACT_SYNC_CONCURRENCY) {
            const windowBatches = batches.slice(i, i + CONTACT_SYNC_CONCURRENCY);
            const responses = await Promise.all(
                windowBatches.map((batch) => api.post('/api/contacts/sync', { contacts: batch }))
            );

            for (let j = 0; j < responses.length; j += 1) {
                const syncedCount = Number(responses[j]?.data?.synced);
                totalSynced += Number.isFinite(syncedCount) ? syncedCount : windowBatches[j].length;
            }
            logDev(`[Contacts] Synced batches ${i + 1}-${i + windowBatches.length} of ${batches.length}`);
        }

        logDev(`[Contacts] Total synced: ${totalSynced}`);
        return { synced: totalSynced };

    } catch (error) {
        logError('[Contacts] Sync failed:', error);
        return { error: error.message || 'Failed to sync contacts' };
    }
};

/**
 * Find friends who are on the platform
 */
export const findFriendsOnPlatform = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) return [];

    try {
        const response = await api.get('/api/contacts/friends');
        const payload = response?.data ?? response;
        return Array.isArray(payload?.friends) ? payload.friends : [];
    } catch (error) {
        logError('[Contacts] Find friends failed:', error);
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
