-- ============================================================================
-- AUTH HARDENING MIGRATION
-- Align auth table user_id types with users.user_id (user_sessions + audit_logs)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
DECLARE
    users_type TEXT;
    sessions_exists BOOLEAN;
    sessions_type TEXT;
    audit_exists BOOLEAN;
    audit_type TEXT;
    user_id_sql_type TEXT;
    backup_table_name TEXT := 'user_sessions_incompatible_backup';
    backup_audit_table_name TEXT := 'audit_logs_incompatible_backup';
BEGIN
    SELECT c.data_type
    INTO users_type
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'users'
      AND c.column_name = 'user_id'
    LIMIT 1;

    IF users_type IS NULL THEN
        RAISE EXCEPTION 'users.user_id not found. Cannot align user_sessions schema.';
    END IF;

    user_id_sql_type := CASE users_type
        WHEN 'uuid' THEN 'UUID'
        WHEN 'integer' THEN 'INTEGER'
        WHEN 'bigint' THEN 'BIGINT'
        ELSE NULL
    END;

    IF user_id_sql_type IS NULL THEN
        RAISE EXCEPTION 'Unsupported users.user_id type: %', users_type;
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables t
        WHERE t.table_schema = 'public'
          AND t.table_name = 'user_sessions'
    ) INTO sessions_exists;

    IF sessions_exists THEN
        SELECT c.data_type
        INTO sessions_type
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.table_name = 'user_sessions'
          AND c.column_name = 'user_id'
        LIMIT 1;

        IF sessions_type IS DISTINCT FROM users_type THEN
            RAISE NOTICE 'Detected mismatch: users.user_id=% user_sessions.user_id=%. Rebuilding user_sessions.', users_type, sessions_type;

            IF to_regclass(format('public.%I', backup_table_name)) IS NOT NULL THEN
                EXECUTE format('DROP TABLE %I', backup_table_name);
            END IF;

            EXECUTE format('ALTER TABLE user_sessions RENAME TO %I', backup_table_name);
            sessions_exists := FALSE;
        ELSE
            RAISE NOTICE 'user_sessions.user_id already matches users.user_id (%).', users_type;
        END IF;
    END IF;

    IF NOT sessions_exists THEN
        EXECUTE format($create$
            CREATE TABLE user_sessions (
                session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id %s NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                token_hash VARCHAR(255) NOT NULL,
                device_fingerprint VARCHAR(255),
                ip_address VARCHAR(45),
                user_agent TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                expires_at TIMESTAMPTZ NOT NULL,
                last_activity TIMESTAMPTZ DEFAULT NOW()
            )
        $create$, user_id_sql_type);
        RAISE NOTICE 'Created user_sessions with user_id type %', user_id_sql_type;
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables t
        WHERE t.table_schema = 'public'
          AND t.table_name = 'audit_logs'
    ) INTO audit_exists;

    IF audit_exists THEN
        SELECT c.data_type
        INTO audit_type
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.table_name = 'audit_logs'
          AND c.column_name = 'user_id'
        LIMIT 1;

        IF audit_type IS DISTINCT FROM users_type THEN
            RAISE NOTICE 'Detected mismatch: users.user_id=% audit_logs.user_id=%. Rebuilding audit_logs.', users_type, audit_type;

            IF to_regclass(format('public.%I', backup_audit_table_name)) IS NOT NULL THEN
                EXECUTE format('DROP TABLE %I', backup_audit_table_name);
            END IF;

            EXECUTE format('ALTER TABLE audit_logs RENAME TO %I', backup_audit_table_name);
            audit_exists := FALSE;
        ELSE
            RAISE NOTICE 'audit_logs.user_id already matches users.user_id (%).', users_type;
        END IF;
    END IF;

    IF NOT audit_exists THEN
        EXECUTE format($create_audit$
            CREATE TABLE audit_logs (
                log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id %s REFERENCES users(user_id) ON DELETE SET NULL,
                action VARCHAR(100) NOT NULL,
                ip_address VARCHAR(45),
                user_agent TEXT,
                details JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        $create_audit$, user_id_sql_type);
        RAISE NOTICE 'Created audit_logs with user_id type %', user_id_sql_type;
    END IF;

    -- Ensure indexes required by auth refresh/session lookups.
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active ON user_sessions(user_id, is_active)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions(token_hash)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC)';
END $$;
