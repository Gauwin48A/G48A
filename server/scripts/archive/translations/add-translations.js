const fs = require('fs');
const path = require('path');

function findJsxFiles(dir) {
    let results = [];
    try {
        const list = fs.readdirSync(dir);
        list.forEach(file => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            if (stat && stat.isDirectory()) {
                results = results.concat(findJsxFiles(filePath));
            } else if (file.endsWith('.jsx')) {
                results.push(filePath);
            }
        });
    } catch (e) { }
    return results;
}

const dirs = ['client/src/pages', 'client/src/components'];
let files = [];
dirs.forEach(d => files = files.concat(findJsxFiles(d)));

let updated = 0;

files.forEach(filePath => {
    let content = fs.readFileSync(filePath, 'utf8');

    if (content.includes('useTranslation')) {
        return;
    }

    const importLine = "import { useTranslation } from 'react-i18next';\n";

    const importMatch = content.match(/^import .+ from .+;?\s*$/gm);
    if (importMatch && importMatch.length > 0) {
        const lastImport = importMatch[importMatch.length - 1];
        const lastImportIndex = content.lastIndexOf(lastImport);
        const insertPosition = lastImportIndex + lastImport.length;
        content = content.slice(0, insertPosition) + '\n' + importLine + content.slice(insertPosition);

        const funcMatch = content.match(/(const \w+ = \([^)]*\) => \{|function \w+\([^)]*\) \{)/);
        if (funcMatch) {
            const funcStart = content.indexOf(funcMatch[0]) + funcMatch[0].length;
            const hookLine = "\n  const { t } = useTranslation();";
            content = content.slice(0, funcStart) + hookLine + content.slice(funcStart);

            fs.writeFileSync(filePath, content);
            console.log(`Updated: ${path.basename(filePath)}`);
            updated++;
        }
    }
});

console.log(`\nTotal updated: ${updated} files`);
