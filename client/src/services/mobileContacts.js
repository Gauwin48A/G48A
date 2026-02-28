import { Contacts } from '@capacitor-community/contacts';
import { buildApiPath } from '@/lib/networkConfig';

const CONTACT_SYNC_CONCURRENCY = 3;

export const syncNativeContacts = async (userId) => {
    try {
        // 1. Ask Permission
        const perm = await Contacts.requestPermissions();
        if (perm.contacts !== 'granted') {
            console.log("[DEFENDER] Contact permission denied");
            return;
        }

        // 2. Read Phonebook (The "Heavy" Lift)
        // projection: only get names and phones to save memory
        const result = await Contacts.getContacts({
            projection: { name: true, phones: true }
        });

        // 3. Filter & Sanitize
        const cleanContacts = result.contacts
            .filter(c => c.phones && c.phones.length > 0)
            .map(c => ({
                owner_id: userId,
                contact_name: c.name?.display || "Unknown",
                // Normalize phone: remove spaces, dashes, +91
                contact_phone: c.phones[0].number?.replace(/[^0-9]/g, '').slice(-10)
            }));

        if (cleanContacts.length === 0) return;

        // 4. Batch Upload
        const chunkSize = 100;
        const token = localStorage.getItem('authToken');
        const batches = [];
        for (let i = 0; i < cleanContacts.length; i += chunkSize) {
            batches.push(cleanContacts.slice(i, i + chunkSize));
        }

        for (let i = 0; i < batches.length; i += CONTACT_SYNC_CONCURRENCY) {
            const windowBatches = batches.slice(i, i + CONTACT_SYNC_CONCURRENCY);
            const responses = await Promise.all(
                windowBatches.map((batch) => fetch(buildApiPath('/contacts/sync'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ contacts: batch })
                }))
            );

            for (const response of responses) {
                if (!response.ok) {
                    throw new Error(`Contact sync failed with status ${response.status}`);
                }
            }
        }

        console.log(`[DEFENDER] Synced ${cleanContacts.length} contacts.`);
    } catch (err) {
        console.error("[DEFENDER] Contact integration failed:", err);
    }
};
