#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const srcLocalesDir = path.join(rootDir, 'client', 'src', 'locales');
const publicLocalesDir = path.join(rootDir, 'client', 'public', 'locales');
const validationConfigPath = path.join(__dirname, 'locale-validation.config.json');

function listFiles(dirPath, extension = '.json') {
  if (!fs.existsSync(dirPath)) return [];
  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === extension)
    .map((entry) => path.join(dirPath, entry.name));
}

function parseJsonFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(raw);
}

function getLocaleCodeFromFile(filePath) {
  return path.basename(filePath, '.json');
}

function loadValidationConfig() {
  if (!fs.existsSync(validationConfigPath)) {
    return {
      allowPublicOnlyLocales: new Set(),
      allowKeyCountDriftLocales: new Set()
    };
  }

  try {
    const parsed = parseJsonFile(validationConfigPath);
    const allowPublicOnlyLocales = new Set(
      Array.isArray(parsed.allowPublicOnlyLocales) ? parsed.allowPublicOnlyLocales : []
    );
    const allowKeyCountDriftLocales = new Set(
      Array.isArray(parsed.allowKeyCountDriftLocales) ? parsed.allowKeyCountDriftLocales : []
    );

    return { allowPublicOnlyLocales, allowKeyCountDriftLocales };
  } catch (error) {
    return {
      allowPublicOnlyLocales: new Set(),
      allowKeyCountDriftLocales: new Set(),
      configError: `Invalid locale validation config: ${error.message}`
    };
  }
}

const validationConfig = loadValidationConfig();

const errors = [];
const warnings = [];
const infos = [];

if (validationConfig.configError) {
  warnings.push(validationConfig.configError);
}

const srcLocaleFiles = listFiles(srcLocalesDir);
const srcLocaleCodes = srcLocaleFiles.map(getLocaleCodeFromFile).sort();

if (srcLocaleFiles.length === 0) {
  errors.push('No source locale files found in client/src/locales.');
}

const srcLocaleData = new Map();
for (const filePath of srcLocaleFiles) {
  const localeCode = getLocaleCodeFromFile(filePath);
  try {
    const data = parseJsonFile(filePath);
    srcLocaleData.set(localeCode, data);
  } catch (error) {
    errors.push(`Invalid JSON in src locale ${localeCode}: ${error.message}`);
  }
}

for (const localeCode of srcLocaleCodes) {
  const publicFilePath = path.join(publicLocalesDir, localeCode, 'translation.json');
  if (!fs.existsSync(publicFilePath)) {
    errors.push(`Missing public locale file: client/public/locales/${localeCode}/translation.json`);
    continue;
  }

  try {
    const publicData = parseJsonFile(publicFilePath);
    const srcData = srcLocaleData.get(localeCode);
    if (!srcData) continue;

    const srcKeys = Object.keys(srcData);
    const publicKeys = Object.keys(publicData);
    if (srcKeys.length !== publicKeys.length) {
      if (validationConfig.allowKeyCountDriftLocales.has(localeCode)) {
        infos.push(
          `Allowed key count drift for ${localeCode}: src=${srcKeys.length}, public=${publicKeys.length}`
        );
      } else {
        warnings.push(
          `Key count differs for ${localeCode}: src=${srcKeys.length}, public=${publicKeys.length}`
        );
      }
    }
  } catch (error) {
    errors.push(`Invalid JSON in public locale ${localeCode}: ${error.message}`);
  }
}

const publicLocaleDirs = fs.existsSync(publicLocalesDir)
  ? fs
      .readdirSync(publicLocalesDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()
  : [];

for (const publicLocaleCode of publicLocaleDirs) {
  if (!srcLocaleCodes.includes(publicLocaleCode)) {
    if (validationConfig.allowPublicOnlyLocales.has(publicLocaleCode)) {
      infos.push(`Allowed public-only locale: ${publicLocaleCode}`);
    } else {
      warnings.push(`Public locale exists without src counterpart: ${publicLocaleCode}`);
    }
  }
}

console.log('Locale validation report');
console.log(`- src locales: ${srcLocaleCodes.length}`);
console.log(`- public locale dirs: ${publicLocaleDirs.length}`);
console.log(`- warnings: ${warnings.length}`);
console.log(`- errors: ${errors.length}`);
console.log(`- info: ${infos.length}`);

if (infos.length > 0) {
  console.log('Info:');
  for (const info of infos) {
    console.log(`  - ${info}`);
  }
}

if (warnings.length > 0) {
  console.log('Warnings:');
  for (const warning of warnings) {
    console.log(`  - ${warning}`);
  }
}

if (errors.length > 0) {
  console.log('Errors:');
  for (const error of errors) {
    console.log(`  - ${error}`);
  }
  process.exit(1);
}

console.log('Locale validation passed.');
