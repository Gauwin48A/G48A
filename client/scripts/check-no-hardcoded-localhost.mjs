import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = fileURLToPath(new URL('../src', import.meta.url));
const TARGET_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx']);
const hardcodedApiPattern = /https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\/(?:api|socket\.io)\b/i;

function walk(dirPath, files = []) {
  const entries = readdirSync(dirPath);
  for (const entry of entries) {
    const absolutePath = join(dirPath, entry);
    const stats = statSync(absolutePath);
    if (stats.isDirectory()) {
      walk(absolutePath, files);
      continue;
    }

    const extension = absolutePath.slice(absolutePath.lastIndexOf('.'));
    if (TARGET_EXTENSIONS.has(extension)) {
      if (/\.test\.(js|jsx|ts|tsx)$/i.test(absolutePath)) {
        continue;
      }
      files.push(absolutePath);
    }
  }
  return files;
}

const sourceFiles = walk(ROOT_DIR);
const violations = [];

for (const filePath of sourceFiles) {
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!hardcodedApiPattern.test(line)) continue;
    violations.push({
      filePath,
      lineNumber: index + 1,
      line: line.trim()
    });
  }
}

if (violations.length > 0) {
  console.error('Hardcoded localhost API/socket endpoints detected. Use networkConfig/shared API client instead:');
  violations.forEach((violation) => {
    console.error(`- ${violation.filePath}:${violation.lineNumber} -> ${violation.line}`);
  });
  process.exit(1);
}

console.log(`No hardcoded localhost API/socket endpoints found across ${sourceFiles.length} source files.`);
