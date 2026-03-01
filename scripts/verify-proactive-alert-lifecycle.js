const { execSync } = require('child_process');

const WORKFLOW_FILE = 'proactive-nightly.yml';
const ISSUE_TITLE = '[Proactive Nightly] Failing';
const POLL_INTERVAL_MS = 10000;
const RUN_TIMEOUT_MS = 25 * 60 * 1000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readGit(command) {
  return execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

function parseOwnerRepo() {
  const explicit = String(process.env.GITHUB_REPOSITORY || '').trim();
  if (explicit && explicit.includes('/')) {
    const [owner, repo] = explicit.split('/');
    if (owner && repo) return { owner, repo };
  }

  const remoteUrl = readGit('git config --get remote.origin.url');
  const match = remoteUrl.match(/github\.com[:/](.+?)\/(.+?)(?:\.git)?$/i);
  if (!match) {
    throw new Error(`Unable to parse GitHub owner/repo from remote URL: ${remoteUrl}`);
  }
  return { owner: match[1], repo: match[2] };
}

function getCurrentBranch() {
  const branch = String(process.env.PROACTIVE_VERIFY_REF || '').trim();
  if (branch) return branch;
  return readGit('git rev-parse --abbrev-ref HEAD');
}

function getToken() {
  const token = String(process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '').trim();
  if (!token) {
    throw new Error('Missing GITHUB_TOKEN (or GH_TOKEN).');
  }
  return token;
}

async function githubRequest({ token, method, path, body }) {
  const response = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    let details = '';
    try {
      const parsed = await response.json();
      details = parsed?.message ? ` (${parsed.message})` : '';
    } catch {
      // ignore body parse errors on failures
    }
    const error = new Error(`GitHub API ${method} ${path} failed: ${response.status}${details}`);
    error.status = response.status;
    error.path = path;
    throw error;
  }

  if (response.status === 204) return null;
  return response.json();
}

async function ensureWorkflowAvailable({ token, owner, repo }) {
  try {
    const workflow = await githubRequest({
      token,
      method: 'GET',
      path: `/repos/${owner}/${repo}/actions/workflows/${WORKFLOW_FILE}`
    });
    if (!workflow?.path) {
      throw new Error(`Workflow ${WORKFLOW_FILE} exists but metadata is incomplete.`);
    }
    return workflow;
  } catch (error) {
    if (Number(error?.status) === 404) {
      throw new Error(
        `Workflow ${WORKFLOW_FILE} is not available on GitHub yet. Push commits containing .github/workflows/${WORKFLOW_FILE} and rerun.`
      );
    }
    throw error;
  }
}

async function listWorkflowDispatchRuns({ token, owner, repo, branch }) {
  const encodedBranch = encodeURIComponent(branch);
  const encodedEvent = encodeURIComponent('workflow_dispatch');
  const data = await githubRequest({
    token,
    method: 'GET',
    path: `/repos/${owner}/${repo}/actions/workflows/${WORKFLOW_FILE}/runs?branch=${encodedBranch}&event=${encodedEvent}&per_page=20`
  });
  return data?.workflow_runs || [];
}

async function dispatchWorkflow({ token, owner, repo, ref, simulateFailure }) {
  await githubRequest({
    token,
    method: 'POST',
    path: `/repos/${owner}/${repo}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
    body: {
      ref,
      inputs: {
        simulate_failure: simulateFailure ? 'true' : 'false'
      }
    }
  });
}

async function waitForNewRun({
  token,
  owner,
  repo,
  branch,
  beforeRunId,
  timeoutMs
}) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    // eslint-disable-next-line no-await-in-loop
    const runs = await listWorkflowDispatchRuns({ token, owner, repo, branch });
    const nextRun = runs.find((run) => Number(run.id) > Number(beforeRunId || 0));
    if (nextRun) return nextRun;
    // eslint-disable-next-line no-await-in-loop
    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error('Timed out waiting for dispatched workflow run to appear.');
}

async function waitForRunCompletion({ token, owner, repo, runId, timeoutMs }) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    // eslint-disable-next-line no-await-in-loop
    const run = await githubRequest({
      token,
      method: 'GET',
      path: `/repos/${owner}/${repo}/actions/runs/${runId}`
    });
    if (String(run.status) === 'completed') return run;
    // eslint-disable-next-line no-await-in-loop
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error(`Timed out waiting for workflow run ${runId} to complete.`);
}

async function findOpenFailureIssue({ token, owner, repo }) {
  const issues = await githubRequest({
    token,
    method: 'GET',
    path: `/repos/${owner}/${repo}/issues?state=open&per_page=100`
  });
  return (issues || []).find((issue) => issue.title === ISSUE_TITLE) || null;
}

async function getIssue({ token, owner, repo, issueNumber }) {
  return githubRequest({
    token,
    method: 'GET',
    path: `/repos/${owner}/${repo}/issues/${issueNumber}`
  });
}

function runUrl(owner, repo, runId) {
  return `https://github.com/${owner}/${repo}/actions/runs/${runId}`;
}

async function main() {
  const token = getToken();
  const { owner, repo } = parseOwnerRepo();
  const branch = getCurrentBranch();

  console.log(`Repo: ${owner}/${repo}`);
  console.log(`Branch: ${branch}`);
  await ensureWorkflowAvailable({ token, owner, repo });
  console.log(`Workflow located: ${WORKFLOW_FILE}`);
  console.log('Step 1/4: Dispatching simulated failure run...');

  const initialRuns = await listWorkflowDispatchRuns({ token, owner, repo, branch });
  const beforeFailureRunId = initialRuns[0]?.id || 0;

  await dispatchWorkflow({
    token,
    owner,
    repo,
    ref: branch,
    simulateFailure: true
  });

  const failureRun = await waitForNewRun({
    token,
    owner,
    repo,
    branch,
    beforeRunId: beforeFailureRunId,
    timeoutMs: RUN_TIMEOUT_MS
  });

  console.log(`Dispatched failure run: ${runUrl(owner, repo, failureRun.id)}`);
  const failureCompleted = await waitForRunCompletion({
    token,
    owner,
    repo,
    runId: failureRun.id,
    timeoutMs: RUN_TIMEOUT_MS
  });

  if (String(failureCompleted.conclusion) !== 'failure') {
    throw new Error(`Expected failure run conclusion to be "failure", got "${failureCompleted.conclusion}"`);
  }
  console.log('Failure run finished as expected.');

  console.log('Step 2/4: Verifying failure issue is open...');
  const openIssue = await findOpenFailureIssue({ token, owner, repo });
  if (!openIssue) {
    throw new Error(`Expected open issue titled "${ISSUE_TITLE}" after failure run.`);
  }
  console.log(`Open failure issue detected: #${openIssue.number}`);

  console.log('Step 3/4: Dispatching recovery run...');
  const runsAfterFailure = await listWorkflowDispatchRuns({ token, owner, repo, branch });
  const beforeRecoveryRunId = runsAfterFailure[0]?.id || failureRun.id;

  await dispatchWorkflow({
    token,
    owner,
    repo,
    ref: branch,
    simulateFailure: false
  });

  const recoveryRun = await waitForNewRun({
    token,
    owner,
    repo,
    branch,
    beforeRunId: beforeRecoveryRunId,
    timeoutMs: RUN_TIMEOUT_MS
  });
  console.log(`Dispatched recovery run: ${runUrl(owner, repo, recoveryRun.id)}`);

  const recoveryCompleted = await waitForRunCompletion({
    token,
    owner,
    repo,
    runId: recoveryRun.id,
    timeoutMs: RUN_TIMEOUT_MS
  });
  if (String(recoveryCompleted.conclusion) !== 'success') {
    throw new Error(`Expected recovery run conclusion to be "success", got "${recoveryCompleted.conclusion}"`);
  }
  console.log('Recovery run finished successfully.');

  console.log('Step 4/4: Verifying failure issue auto-closed...');
  const recoveryCheckDeadline = Date.now() + 5 * 60 * 1000;
  while (Date.now() < recoveryCheckDeadline) {
    // eslint-disable-next-line no-await-in-loop
    const issue = await getIssue({ token, owner, repo, issueNumber: openIssue.number });
    if (String(issue.state) === 'closed') {
      console.log(`Issue #${openIssue.number} is closed. Alert lifecycle verification passed.`);
      return;
    }
    // eslint-disable-next-line no-await-in-loop
    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(`Issue #${openIssue.number} did not close within recovery timeout.`);
}

main().catch((error) => {
  console.error(error.message || String(error));
  process.exitCode = 1;
});
