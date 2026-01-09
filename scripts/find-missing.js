const fs = require('fs');

const enPath = 'client/src/locales/en.json';
const taPath = 'client/src/locales/ta.json';

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const ta = JSON.parse(fs.readFileSync(taPath, 'utf8'));

const missing = Object.keys(en).filter(k => !ta[k]);
console.log(`Missing ${missing.length} keys in Tamil:\n`);
missing.forEach(k => console.log(`"${k}": "${en[k]}",`));
