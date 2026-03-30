const pool = require('../src/config/db');

const applyMigration = async () => {
    console.log('🚀 Applying KYC Schema Updates...');

    try {
        await pool.query(`
            ALTER TABLE users ADD COLUMN IF NOT EXISTS aadhaar_number TEXT;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS pan_number TEXT;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_documents JSONB DEFAULT '{}';
            ALTER TABLE users ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
        `);

        // Check for aadhaar_status separately to avoid error if it exists
        try {
            await pool.query(`ALTER TABLE users ADD COLUMN aadhaar_status VARCHAR(20) DEFAULT 'PENDING';`);
        } catch (e) {
            // Ignore error if column exists
            if (e.code !== '42701') { // 42701 is duplicate_column
                console.log('Note on aadhaar_status:', e.message);
            }
        }

        console.log('✅ KYC columns added successfully!');
        process.exit(0);

    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
};

applyMigration();
