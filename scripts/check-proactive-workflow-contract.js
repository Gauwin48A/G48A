const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const workflowContracts = [
  {
    id: 'nightly',
    path: path.join(rootDir, '.github', 'workflows', 'proactive-nightly.yml'),
    requiredPatterns: [
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
    ]
  },
  {
    id: 'lifecycle',
    path: path.join(rootDir, '.github', 'workflows', 'proactive-alert-lifecycle.yml'),
    requiredPatterns: [
      {
        id: 'workflow-dispatch-trigger',
        pattern: /workflow_dispatch:/m
      },
      {
        id: 'simulate-failure-step',
        pattern: /name:\s*Simulate failure[\s\S]*inputs\.simulate_failure/m
      },
      {
        id: 'failure-job-condition',
        pattern: /alert-on-failure:[\s\S]*if:\s*(?:always\(\)\s*&&\s*)?needs\.lifecycle-check\.result == 'failure'/m
      },
      {
        id: 'recovery-job-condition',
        pattern: /close-on-recovery:[\s\S]*if:\s*(?:always\(\)\s*&&\s*)?needs\.lifecycle-check\.result == 'success'/m
      },
      {
        id: 'failure-issue-title',
        pattern: /\[Proactive Nightly\] Failing/m
      }
    ]
  }
];

const failures = [];
let checksCount = 0;

for (const workflowContract of workflowContracts) {
  if (!fs.existsSync(workflowContract.path)) {
    failures.push({
      workflowId: workflowContract.id,
      checkId: 'workflow-file-exists',
      details: workflowContract.path
    });
    continue;
  }

  const workflowContent = fs.readFileSync(workflowContract.path, 'utf8');
  for (const check of workflowContract.requiredPatterns) {
    checksCount += 1;
    if (!check.pattern.test(workflowContent)) {
      failures.push({
        workflowId: workflowContract.id,
        checkId: check.id
      });
    }
  }
}

if (failures.length > 0) {
  console.error('Proactive workflow contract violations detected:');
  failures.forEach((failure) => {
    const suffix = failure.details ? ` (${failure.details})` : '';
    console.error(`- [${failure.workflowId}] Missing: ${failure.checkId}${suffix}`);
  });
  process.exit(1);
}

console.log(`Proactive workflow contract checks passed (${checksCount} checks).`);
