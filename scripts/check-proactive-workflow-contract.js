const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const workflowPath = path.join(rootDir, '.github', 'workflows', 'proactive-nightly.yml');

const requiredPatterns = [
  {
    id: 'workflow-dispatch-input',
    pattern: /workflow_dispatch:\s*\n\s*inputs:\s*\n\s*simulate_failure:/m
  },
  {
    id: 'simulate-failure-step',
    pattern: /name:\s*Simulate failure for alert validation[\s\S]*inputs\.simulate_failure/m
  },
  {
    id: 'proactive-suite-pipefail',
    pattern: /set -o pipefail/m
  },
  {
    id: 'proactive-log-artifact',
    pattern: /uses:\s*actions\/upload-artifact@v4[\s\S]*proactive-check\.log/m
  },
  {
    id: 'failure-job-condition',
    pattern: /alert-on-failure:[\s\S]*if:\s*(?:always\(\)\s*&&\s*)?needs\.proactive-suite\.result == 'failure'/m
  },
  {
    id: 'recovery-job-condition',
    pattern: /close-on-recovery:[\s\S]*if:\s*(?:always\(\)\s*&&\s*)?needs\.proactive-suite\.result == 'success'/m
  },
  {
    id: 'failure-issue-title',
    pattern: /\[Proactive Nightly\] Failing/m
  }
];

if (!fs.existsSync(workflowPath)) {
  console.error(`Missing workflow file: ${workflowPath}`);
  process.exit(1);
}

const workflowContent = fs.readFileSync(workflowPath, 'utf8');
const failures = requiredPatterns.filter(({ pattern }) => !pattern.test(workflowContent));

if (failures.length > 0) {
  console.error('Proactive workflow contract violations detected:');
  failures.forEach((failure) => {
    console.error(`- Missing: ${failure.id}`);
  });
  process.exit(1);
}

console.log(`Proactive workflow contract checks passed (${requiredPatterns.length} checks).`);
