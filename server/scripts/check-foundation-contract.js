#!/usr/bin/env node

require("dotenv").config();

const {
  evaluateFoundationConfig,
  parseBoolean,
} = require("../src/services/foundationGuardService");

function parseArgs(argv = process.argv.slice(2)) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;

    const equalIndex = token.indexOf("=");
    if (equalIndex > 2) {
      args[token.slice(2, equalIndex)] = token.slice(equalIndex + 1);
      continue;
    }

    const key = token.slice(2);
    const hasInlineValue =
      argv[index + 1] !== undefined && !String(argv[index + 1]).startsWith("--");
    args[key] = hasInlineValue ? argv[index + 1] : "true";
    if (hasInlineValue) index += 1;
  }
  return args;
}

function printSection(name, section) {
  console.log(`[foundation-contract] ${name}.status=${section.status}`);
  const checks = section.checks || {};
  Object.keys(checks).forEach((key) => {
    const value = checks[key];
    const rendered =
      Array.isArray(value) || (value && typeof value === "object")
        ? JSON.stringify(value)
        : String(value);
    console.log(`[foundation-contract] ${name}.${key}=${rendered}`);
  });
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const strict = parseBoolean(
    args.strict ?? process.env.FOUNDATION_CONTRACT_STRICT,
    false
  );
  const isProduction = parseBoolean(
    args.production ?? process.env.FOUNDATION_CONTRACT_PRODUCTION,
    String(process.env.NODE_ENV || "").trim().toLowerCase() === "production"
  );

  const report = evaluateFoundationConfig({
    env: process.env,
    isProduction,
  });

  console.log(`FOUNDATION_CONTRACT_STATUS=${String(report.status).toUpperCase()}`);
  console.log(`[foundation-contract] strict=${strict}`);
  console.log(`[foundation-contract] is_production=${report.isProduction}`);

  Object.entries(report.sections).forEach(([name, section]) => {
    printSection(name, section);
  });

  if (strict && report.status !== "pass") {
    process.exit(1);
  }
}

main();
