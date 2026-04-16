#!/usr/bin/env node

const fs = require('fs');
const https = require('https');

function log(message) {
  console.log(message);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function requestJson(url, token) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        headers: {
          'User-Agent': 'mhub-ui-screenshot-check',
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`
        }
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve({ status: res.statusCode, json });
          } catch (error) {
            reject(error);
          }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

function isUiFile(filePath) {
  if (!filePath.startsWith('client/')) return false;
  if (filePath.startsWith('client/docs/')) return false;
  if (filePath === 'client/README.md') return false;
  return true;
}

function hasScreenshotEvidence(body) {
  const text = body || '';
  const hasSection = /##\s*Screenshots|Screenshots:/i.test(text);
  const hasImage = /!\[[^\]]*\]\([^)]+\)|<img\s+[^>]*>/i.test(text);
  const hasLink = /https?:\/\/\S+/i.test(text);
  return hasSection && (hasImage || hasLink);
}

async function run() {
  const eventName = process.env.GITHUB_EVENT_NAME;
  if (eventName !== 'pull_request') {
    log('UI screenshot check skipped (not a pull_request event).');
    return;
  }

  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath || !fs.existsSync(eventPath)) {
    fail('GITHUB_EVENT_PATH is missing; cannot verify screenshot evidence.');
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    fail('GITHUB_TOKEN is missing; cannot query PR files.');
  }

  const event = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
  const pr = event.pull_request;
  if (!pr) {
    fail('pull_request payload missing from event.');
  }

  const repo = process.env.GITHUB_REPOSITORY;
  if (!repo) {
    fail('GITHUB_REPOSITORY is missing.');
  }

  const prNumber = pr.number;
  const body = pr.body || '';

  let page = 1;
  let uiChanged = false;
  while (true) {
    const url = `https://api.github.com/repos/${repo}/pulls/${prNumber}/files?per_page=100&page=${page}`;
    const response = await requestJson(url, token);
    if (response.status !== 200) {
      fail(`Failed to fetch PR files (status ${response.status}).`);
    }
    const files = response.json;
    if (!Array.isArray(files) || files.length === 0) break;
    if (files.some((file) => isUiFile(file.filename || ''))) {
      uiChanged = true;
      break;
    }
    page += 1;
  }

  if (!uiChanged) {
    log('UI screenshot check passed (no UI-impacting files).');
    return;
  }

  if (!hasScreenshotEvidence(body)) {
    fail('UI changes detected. Please add screenshot evidence in the PR body under a "Screenshots" section.');
  }

  log('UI screenshot check passed (evidence found).');
}

run().catch((error) => {
  fail(`UI screenshot check crashed: ${error.message}`);
});
