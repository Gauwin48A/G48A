const path = require('path');
const r = require(path.join(__dirname, '..', 'screenshots', 'audit-report.json'));
r.filter(x => x.mode === 'light').forEach(p => {
  console.log(`\n=== ${p.page} (${p.url}) ===`);
  console.log(`  Elements: ${p.totalElements}, Text: ${p.textElements}`);
  console.log(`  MissingDarkBg: ${p.missingDarkBg}, MissingDarkText: ${p.missingDarkText}`);
  console.log(`  TinyText: ${p.tinyText}, Overflow: ${p.overflowX}`);
  console.log(`  Body: ${p.bodyText.slice(0, 250).replace(/\n/g, ' | ')}`);
  if (p.issues.length) {
    p.issues.slice(0, 8).forEach(i => console.log(`    [${i.type}] ${JSON.stringify(i)}`));
  }
});
