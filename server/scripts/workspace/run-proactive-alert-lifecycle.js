const { spawnSync } = require('child_process');
const path = require('path');

function readTokenFromGitCredentialManager() {
  const result = spawnSync('git', ['credential', 'fill'], {
    input: 'protocol=https\nhost=github.com\n',
    encoding: 'utf8'
  });

  if (result.error) {
    throw new Error(`Unable to run git credential fill: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error('git credential fill failed.');
  }

  const match = String(result.stdout || '').match(/^password=(.+)$/m);
  if (!match || !match[1]) {
    throw new Error('No GitHub token available from git credential manager.');
  }

  return match[1].trim();
}

function runVerifier(token) {
  const verifierPath = path.join(__dirname, 'verify-proactive-alert-lifecycle.js');
  const result = spawnSync(process.execPath, [verifierPath], {
    env: {
      ...process.env,
      GITHUB_TOKEN: token
    },
    stdio: 'inherit'
  });

  if (result.error) {
    throw new Error(`Unable to execute proactive verifier: ${result.error.message}`);
  }

  return result.status || 0;
}

try {
  console.log('Acquiring GitHub token from git credential manager...');
  const token = readTokenFromGitCredentialManager();
  const code = runVerifier(token);
  process.exit(code);
} catch (error) {
  console.error(error.message || String(error));
  process.exit(1);
}
