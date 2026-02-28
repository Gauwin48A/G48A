-- Complaints lifecycle hardening: SLA fields + evidence metadata.
-- Safe to run multiple times and safe on environments where complaints table is absent.

DO $$
BEGIN
    IF to_regclass('public.complaints') IS NULL THEN
        RAISE NOTICE 'Skipping complaints SLA/evidence migration: table public.complaints not found.';
        RETURN;
    END IF;

    ALTER TABLE complaints ADD COLUMN IF NOT EXISTS severity VARCHAR(20) DEFAULT 'medium';
    ALTER TABLE complaints ADD COLUMN IF NOT EXISTS evidence_metadata JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE complaints ADD COLUMN IF NOT EXISTS sla_due_at TIMESTAMPTZ;
    ALTER TABLE complaints ADD COLUMN IF NOT EXISTS sla_breached_at TIMESTAMPTZ;
    ALTER TABLE complaints ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
    ALTER TABLE complaints ADD COLUMN IF NOT EXISTS last_status_change_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE complaints ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]'::jsonb;

    CREATE INDEX IF NOT EXISTS idx_complaints_sla_due_open
        ON complaints(sla_due_at)
        WHERE status IN ('open', 'triage', 'investigating');

    CREATE INDEX IF NOT EXISTS idx_complaints_severity_status
        ON complaints(severity, status);
END
$$;
