const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../../client/src');
const ignoreFiles = ['main.jsx', 'App.jsx', 'index.css', 'vite-env.d.ts'];
const reportPath = path.resolve(__dirname, 'hardcoded-strings-audit.generated.md');

console.log('Starting audit for hardcoded strings...');

function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);

    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function (file) {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
        } else {
            if (file.endsWith('.jsx') || file.endsWith('.js')) {
                arrayOfFiles.push(fullPath);
            }
        }
    });

    return arrayOfFiles;
}

function scanFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);

    if (ignoreFiles.includes(fileName)) return { count: 0, items: [] };

    let hardcodedCount = 0;
    const issues = [];

    // Regex to find JSX text content >Text<
    const textRegex = />([^<>{}\n]+[^<>{}\n\s]*?)[\s]*</g;

    // Regex for attributes
    const attrRegex = /(placeholder|title|alt|label|aria-label)="([^"{}]+)"/g;

    let match;

    // Check for Text Nodes
    while ((match = textRegex.exec(content)) !== null) {
        const text = match[1].trim();
        // Ignore known safe strings (numbers, partials, etc)
        if (text && !text.match(/^[0-9\s!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]*$/) && text.length > 2) {
            if (!text.includes("t('") && !text.includes('t("')) {
                // Ignore some common false positives
                if (['&nbsp;', '&bull;'].includes(text)) continue;

                const lineNo = content.substring(0, match.index).split('\n').length;
                issues.push({ line: lineNo, type: 'Text', text: text });
                hardcodedCount++;
            }
        }
    }

    // Check for Attributes
    while ((match = attrRegex.exec(content)) !== null) {
        const attr = match[1];
        const val = match[2];
        if (val && !val.match(/^[0-9\s]*$/) && val.length > 2) {
            const lineNo = content.substring(0, match.index).split('\n').length;
            issues.push({ line: lineNo, type: `Attr (${attr})`, text: val });
            hardcodedCount++;
        }
    }

    return { count: hardcodedCount, items: issues };
}

try {
    const files = getAllFiles(srcDir);
    let totalIssues = 0;
    let filesWithIssues = 0;
    const runDate = new Date().toISOString().slice(0, 10);
    let report = '# Hardcoded Strings Audit (Generated)\n\n';
    report += `Generated: ${runDate}\n\n`;
    report += `Source root: ${srcDir}\n\n`;

    files.forEach(file => {
        const issues = scanFile(file);
        if (issues.count > 0) {
            totalIssues += issues.count;
            filesWithIssues++;
            report += `## ${path.relative(srcDir, file)} (${issues.count} issues)\n`;
            issues.items.forEach(issue => {
                report += `- L${issue.line} [${issue.type}]: "${issue.text}"\n`;
            });
            report += '\n';
        }
    });

    report += '---\n';
    report += `Files scanned: ${files.length}\n`;
    report += `Files with issues: ${filesWithIssues}\n`;
    report += `Total potential hardcoded strings: ${totalIssues}\n`;

    fs.writeFileSync(reportPath, report, 'utf8');
    console.log(`Audit saved to ${reportPath} (${totalIssues} issues found)`);

} catch (err) {
    console.error('Error running audit:', err);
}
