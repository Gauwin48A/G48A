const { evaluateSchemaContract } = require('../src/services/schemaGuard');

async function main() {
  const report = await evaluateSchemaContract({ autoCreateTwoFactorFallback: true });
  const issues = [];

  for (const [tableName, check] of Object.entries(report.tableChecks || {})) {
    if (!check.exists) {
      issues.push(`table missing: ${tableName}`);
      continue;
    }
    if (Array.isArray(check.missingColumns) && check.missingColumns.length > 0) {
      issues.push(`${tableName} missing columns: ${check.missingColumns.join(', ')}`);
    }
  }

  const twoFactor = report.twoFactor || {};
  if (twoFactor.mode === 'unavailable') {
    issues.push('2FA storage unavailable (users 2FA columns missing and fallback table invalid/missing)');
  }

  if (report.status === 'fail') {
    console.error('Schema contract check failed:');
    for (const issue of issues) {
      console.error(`- ${issue}`);
    }
    process.exit(1);
  }

  if (report.status === 'warn') {
    console.warn('Schema contract passed with warnings:');
    if (twoFactor.warning) {
      console.warn(`- ${twoFactor.warning}`);
    }
  }

  console.log('Schema contract check passed.');
}

main().catch((error) => {
  console.error('Schema contract check crashed:', error.message);
  process.exit(1);
});
