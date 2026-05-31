const fs = require('fs');
const content = fs.readFileSync('C:/Users/laksh/GITHUB/1hub_rep2/G48A/build_out.txt', 'utf8');
const lines = content.split('\n');
const errors = lines.filter(l => l.includes('.kt:') || (l.trim().startsWith('e:') && l.includes('error')));
errors.slice(0, 80).forEach(e => console.log(e));
