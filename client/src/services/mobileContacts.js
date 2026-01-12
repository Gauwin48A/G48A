import { Contacts } from '@capacitor-community/contacts';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

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

        // 4. Batch Upload (100 at a time to prevent server crash)
        const chunkSize = 100;
        const token = localStorage.getItem('authToken');

        for (let i = 0; i < cleanContacts.length; i += chunkSize) {
            const batch = cleanContacts.slice(i, i + chunkSize);

            // We use our API endpoint instead of direct DB access
            await fetch(`${API_BASE}/api/contacts/sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ contacts: batch })
            });
        }

        console.log(`[DEFENDER] Synced ${cleanContacts.length} contacts.`);
    } catch (err) {
        console.error("[DEFENDER] Contact integration failed:", err);
    }
};
