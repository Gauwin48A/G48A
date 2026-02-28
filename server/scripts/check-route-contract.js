const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
}

const checks = [
  {
    id: 'server-index-route-mounts',
    file: 'src/index.js',
    patterns: [
      /app\.use\(['"]\/api\/auth['"],\s*authRoutes\);/,
      /app\.use\(['"]\/api\/categories['"],\s*categoriesRoutes\);/,
      /app\.use\(['"]\/api\/posts['"],\s*postsRoutes\);/,
      /app\.use\(['"]\/api\/location['"],\s*locationRoutes\);/,
      /app\.use\(['"]\/api\/publicwall['"],\s*publicWallRoutes\);/,
      /app\.use\(['"]\/api\/public-wall['"],\s*publicWallRoutes\);/
    ]
  },
  {
    id: 'server-index-socket-cors-contract',
    file: 'src/index.js',
    patterns: [
      /const io = new Server\(server,\s*\{/,
      /origin:\s*resolveCorsOrigin/,
      /app\.use\(cors\(corsOptions\)\);/,
      /app\.options\(\/\.\*\/,\s*cors\(corsOptions\)\);/,
      /localhostOriginPattern/
    ]
  },
  {
    id: 'server-health-fingerprint-contract',
    file: 'src/index.js',
    patterns: [
      /app\.get\(['"]\/health['"]/,
      /app\.get\(['"]\/api\/health['"]/,
      /service:\s*['"]mhub-backend['"]/
    ]
  },
  {
    id: 'auth-refresh-route-contract',
    file: 'src/routes/auth.js',
    patterns: [
      /router\.post\(['"]\/refresh-token['"]/
    ]
  },
  {
    id: 'categories-route-contract',
    file: 'src/routes/categories.js',
    patterns: [
      /router\.get\(['"]\/['"]/
    ]
  },
  {
    id: 'for-you-route-contract',
    file: 'src/routes/posts.js',
    patterns: [
      /router\.get\(['"]\/for-you['"]/
    ]
  },
  {
    id: 'location-route-contract',
    file: 'src/routes/locationRoutes.js',
    patterns: [
      /router\.post\(['"]\/['"]/
    ]
  }
];

const failures = [];

for (const check of checks) {
  const content = read(check.file);
  for (const pattern of check.patterns) {
    if (!pattern.test(content)) {
      failures.push({
        id: check.id,
        file: check.file,
        pattern: String(pattern)
      });
    }
  }
}

if (failures.length > 0) {
  console.error('Route contract violations detected:');
  failures.forEach((failure) => {
    console.error(`- [${failure.id}] ${failure.file} missing ${failure.pattern}`);
  });
  process.exit(1);
}

console.log(`Route contract checks passed (${checks.length} checks).`);
