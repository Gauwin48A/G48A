# Backup and Restore Drill Plan

Last updated: 2026-02-27  
Owner: Platform Engineering  
Backup cadence owner: Database Operations

## 1. Objectives

1. Prove database backups are restorable and complete.
2. Track restore speed against production RTO targets.
3. Keep dated evidence for audit and launch readiness.

## 2. Targets

- RPO target: `<= 15 minutes` for transactional data.
- RTO target: `<= 60 minutes` for full database recovery.
- Drill frequency: weekly restore drill + daily backup validation.

## 3. Scripted Drill Command

From `server/` root:

```powershell
$env:RUN_RESTORE_DRILL='true'
powershell -ExecutionPolicy Bypass -File .\scripts\run_backup_drill.ps1
```

What the script does:
1. Creates a timestamped `pg_dump` backup artifact.
2. Optionally restores into drill database (`BACKUP_DRILL_DB_NAME`).
3. Runs restore smoke-check query (`SELECT COUNT(*) FROM users`).
4. Writes evidence JSON to `backups/evidence/`.

## 4. Environment Variables

- `BACKUP_DIR` (default: `./backups`)
- `BACKUP_RETENTION_DAYS` (default: `14`)
- `BACKUP_DRILL_DB_NAME` (default: `mhub_restore_drill`)
- `RUN_RESTORE_DRILL` (`true` or `false`)
- Existing DB vars:
  - `DB_HOST`
  - `DB_PORT`
  - `DB_NAME`
  - `DB_USER`

## 5. Manual Validation Checklist

- [ ] Backup file exists and file size is non-zero.
- [ ] Restore drill database creation succeeded.
- [ ] Restore command completed without error.
- [ ] Smoke query succeeded.
- [ ] Evidence JSON captured date/time, backup path, restore status.
- [ ] Old backups cleaned per retention policy.

## 6. Evidence Table

| Date (UTC) | Backup File | Restore Drill | RPO Result | RTO Result | Notes |
|---|---|---|---|---|---|
| 2026-02-27 | scripted artifact | PASS (template baseline) | Target defined | Target defined | Initial drill process and evidence template added |

## 7. Escalation Rules

1. If backup creation fails: treat as P1 operational incident.
2. If restore drill fails two runs in a row: block release until fixed.
3. If RTO breach occurs: open corrective action with owner and deadline.
