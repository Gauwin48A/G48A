param(
    [string]$DbHost = $env:DB_HOST,
    [string]$DbPort = $env:DB_PORT,
    [string]$DbName = $env:DB_NAME,
    [string]$DbUser = $env:DB_USER,
    [string]$BackupDir = $(if ($env:BACKUP_DIR) { $env:BACKUP_DIR } else { ".\\backups" }),
    [string]$DrillDbName = $(if ($env:BACKUP_DRILL_DB_NAME) { $env:BACKUP_DRILL_DB_NAME } else { "mhub_restore_drill" }),
    [int]$RetentionDays = $(if ($env:BACKUP_RETENTION_DAYS) { [int]$env:BACKUP_RETENTION_DAYS } else { 14 })
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($DbHost) -or
    [string]::IsNullOrWhiteSpace($DbPort) -or
    [string]::IsNullOrWhiteSpace($DbName) -or
    [string]::IsNullOrWhiteSpace($DbUser)) {
    throw "Missing DB connection inputs. Set DB_HOST, DB_PORT, DB_NAME, DB_USER."
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$absoluteBackupDir = Resolve-Path -Path $BackupDir -ErrorAction SilentlyContinue
if (-not $absoluteBackupDir) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    $absoluteBackupDir = Resolve-Path -Path $BackupDir
}

$backupFile = Join-Path $absoluteBackupDir "mhub_${DbName}_${timestamp}.dump"
$evidenceDir = Join-Path $absoluteBackupDir "evidence"
New-Item -ItemType Directory -Path $evidenceDir -Force | Out-Null

Write-Host "[BACKUP] Starting backup for database '$DbName' on $DbHost:$DbPort"
& pg_dump --host=$DbHost --port=$DbPort --username=$DbUser --dbname=$DbName --format=custom --file=$backupFile
if ($LASTEXITCODE -ne 0) {
    throw "pg_dump failed with exit code $LASTEXITCODE"
}

$backupSizeBytes = (Get-Item $backupFile).Length
Write-Host "[BACKUP] Backup created: $backupFile ($backupSizeBytes bytes)"

$restoreExecuted = $false
$restoreHealth = "skipped"
$restoreRowCheck = $null
$restoreError = $null
$drillFlag = [string]$env:RUN_RESTORE_DRILL

if ($drillFlag.ToLower() -eq "true") {
    try {
        Write-Host "[RESTORE] Running restore drill into '$DrillDbName'"

        & psql --host=$DbHost --port=$DbPort --username=$DbUser --dbname=postgres --command="DROP DATABASE IF EXISTS $DrillDbName;"
        if ($LASTEXITCODE -ne 0) { throw "Failed to drop drill database" }

        & psql --host=$DbHost --port=$DbPort --username=$DbUser --dbname=postgres --command="CREATE DATABASE $DrillDbName;"
        if ($LASTEXITCODE -ne 0) { throw "Failed to create drill database" }

        & pg_restore --host=$DbHost --port=$DbPort --username=$DbUser --dbname=$DrillDbName --clean --if-exists $backupFile
        if ($LASTEXITCODE -ne 0) { throw "pg_restore failed" }

        $restoreQueryOutput = & psql --host=$DbHost --port=$DbPort --username=$DbUser --dbname=$DrillDbName --tuples-only --no-align --command="SELECT COUNT(*) FROM users;"
        if ($LASTEXITCODE -ne 0) { throw "Restore validation query failed" }

        $restoreExecuted = $true
        $restoreHealth = "passed"
        $restoreRowCheck = ($restoreQueryOutput | Select-Object -First 1).Trim()
        Write-Host "[RESTORE] Drill passed. users_count=$restoreRowCheck"
    } catch {
        $restoreExecuted = $true
        $restoreHealth = "failed"
        $restoreError = $_.Exception.Message
        Write-Warning "[RESTORE] Drill failed: $restoreError"
    }
}

# Retention cleanup
$cutoff = (Get-Date).AddDays(-1 * $RetentionDays)
Get-ChildItem -Path $absoluteBackupDir -Filter "*.dump" -File -ErrorAction SilentlyContinue |
    Where-Object { $_.LastWriteTime -lt $cutoff } |
    Remove-Item -Force -ErrorAction SilentlyContinue

$evidence = [ordered]@{
    timestamp_utc = (Get-Date).ToUniversalTime().ToString("o")
    db_host = $DbHost
    db_port = $DbPort
    db_name = $DbName
    backup_file = $backupFile
    backup_size_bytes = $backupSizeBytes
    retention_days = $RetentionDays
    restore_executed = $restoreExecuted
    restore_target_db = $DrillDbName
    restore_health = $restoreHealth
    restore_row_check_users = $restoreRowCheck
    restore_error = $restoreError
}

$evidenceFile = Join-Path $evidenceDir "backup_drill_${timestamp}.json"
$evidence | ConvertTo-Json -Depth 5 | Set-Content -Path $evidenceFile -Encoding UTF8

Write-Host "[EVIDENCE] Drill evidence written to $evidenceFile"
if ($restoreHealth -eq "failed") {
    exit 1
}
