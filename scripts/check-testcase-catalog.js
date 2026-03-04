const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const appPath = path.join(rootDir, 'client', 'src', 'App.jsx');
const testcaseCatalogPath = path.join(rootDir, 'docs', 'testcase.md');
const featureMatrixPath = path.join(rootDir, 'FEATURE_COMPLETION_MATRIX.md');

function readRequiredFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing ${label}: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

function extractRoutes(appSource) {
  const routes = new Set();

  // JSX route form: <Route path="/foo" ... />
  const jsxRouteRegex = /<Route\b[^>]*\bpath\s*=\s*["']([^"']+)["']/g;
  let match = jsxRouteRegex.exec(appSource);
  while (match) {
    const route = String(match[1] || '').trim();
    if (route && (route.startsWith('/') || route === '*')) routes.add(route);
    match = jsxRouteRegex.exec(appSource);
  }

  // Compiled/minified form (e.g. React.createElement(Route, { path:"/foo" }))
  const compiledRouteRegex = /\bpath\s*:\s*["']([^"']+)["']/g;
  match = compiledRouteRegex.exec(appSource);
  while (match) {
    const route = String(match[1] || '').trim();
    if (route && (route.startsWith('/') || route === '*')) routes.add(route);
    match = compiledRouteRegex.exec(appSource);
  }

  return [...routes];
}

function extractFeatureSubAreas(matrixSource) {
  const matrixRowRegex = /^\|\s*[^|]+\|\s*([^|]+)\|\s*([^|]+)\|/gm;
  const features = [];
  let match = matrixRowRegex.exec(matrixSource);
  while (match) {
    const subArea = String(match[1] || '').trim();
    const status = String(match[2] || '').trim();

    if (!subArea || subArea === 'Sub-area' || subArea.startsWith('---')) {
      match = matrixRowRegex.exec(matrixSource);
      continue;
    }

    features.push({
      subArea,
      status
    });
    match = matrixRowRegex.exec(matrixSource);
  }

  return features;
}

function hasRouteCoverage(catalogSource, route) {
  if (catalogSource.includes(`\`${route}\``)) {
    return true;
  }

  if (route === '*') {
    return catalogSource.includes('Wildcard redirect');
  }

  return catalogSource.includes(route);
}

function hasFeatureCoverage(catalogSource, subArea) {
  return catalogSource.includes(`\`${subArea}\``) || catalogSource.includes(subArea);
}

function main() {
  const appSource = readRequiredFile(appPath, 'app route source');
  const testcaseCatalog = readRequiredFile(testcaseCatalogPath, 'test case catalog');
  const featureMatrix = readRequiredFile(featureMatrixPath, 'feature completion matrix');

  const routes = extractRoutes(appSource);
  const features = extractFeatureSubAreas(featureMatrix);

  const missingRoutes = routes.filter((route) => !hasRouteCoverage(testcaseCatalog, route));
  const missingFeatures = features.filter((item) => !hasFeatureCoverage(testcaseCatalog, item.subArea));

  if (missingRoutes.length || missingFeatures.length) {
    console.error('Test case catalog coverage check failed.');

    if (missingRoutes.length) {
      console.error(`- Missing route coverage (${missingRoutes.length}):`);
      missingRoutes.forEach((route) => console.error(`  - ${route}`));
    }

    if (missingFeatures.length) {
      console.error(`- Missing feature coverage (${missingFeatures.length}):`);
      missingFeatures.forEach((feature) => {
        console.error(`  - ${feature.subArea} [${feature.status}]`);
      });
    }

    process.exit(1);
  }

  console.log(
    `Test case catalog coverage passed (${routes.length} routes, ${features.length} feature sub-areas).`
  );
}

try {
  main();
} catch (error) {
  console.error(`Test case catalog coverage check failed: ${error.message}`);
  process.exit(1);
}
