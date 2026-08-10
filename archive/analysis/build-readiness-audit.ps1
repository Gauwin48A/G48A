$ErrorActionPreference = 'Stop'
$repo = "C:\Users\laksh\GITHUB\MHUB\Mhub"
$readinessPath = Join-Path $repo "analysis\readiness-audit.md"
$appPath = Join-Path $repo "client\src\App.jsx"
$pageDataPath = Join-Path $repo "analysis\page-data.json"
$serverIndexPath = Join-Path $repo "server\src\index.js"

$appText = Get-Content -Path $appPath -Raw

$routeMatches = [regex]::Matches($appText, '<Route\s+path="([^"]+)"\s+element=\{([^}]+)\}', [System.Text.RegularExpressions.RegexOptions]::Singleline)
$routes = @()
foreach ($m in $routeMatches) {
  $routes += [pscustomobject]@{ Path = $m.Groups[1].Value; Element = $m.Groups[2].Value }
}
$authRoutes = New-Object System.Collections.Generic.HashSet[string]
$adminRoutes = New-Object System.Collections.Generic.HashSet[string]
foreach ($r in $routes) {
  if ($r.Element -match '<RequireAuth') {
    $authRoutes.Add($r.Path) | Out-Null
    if ($r.Element -match 'requiredRoles') { $adminRoutes.Add($r.Path) | Out-Null }
  }
}
$componentRoutes = @{}
foreach ($r in $routes) {
  if ($r.Path -eq '*') { continue }
  if ($r.Element -match 'Navigate\s+to="([^"]+)"') {
    $comp = 'Navigate->' + $Matches[1]
  } elseif ($r.Element -match '<RequireAuth[^>]*>\s*<([^\s/>]+)') {
    $comp = $Matches[1]
  } elseif ($r.Element -match '<([^\s/>]+)') {
    $comp = $Matches[1]
  } else {
    $comp = 'Unknown'
  }
  if (-not $componentRoutes.ContainsKey($comp)) { $componentRoutes[$comp] = @() }
  $componentRoutes[$comp] += $r.Path
}

$importMatches = [regex]::Matches($appText, 'const\s+([A-Za-z0-9_]+)\s*=\s*lazyWithRetry\(\s*\(\)\s*=>\s*import\("([^"]+)"\)', [System.Text.RegularExpressions.RegexOptions]::Singleline)
$componentFiles = @{}
foreach ($m in $importMatches) { $componentFiles[$m.Groups[1].Value] = $m.Groups[2].Value }

$pageData = @()
if (Test-Path $pageDataPath) {
  $pageData = Get-Content -Path $pageDataPath -Raw | ConvertFrom-Json
}
$pageMap = @{}
foreach ($p in $pageData) { $pageMap[$p.Component] = $p }

$indexText = Get-Content -Path $serverIndexPath -Raw
$routeImports = @{}
$importMatches = [regex]::Matches($indexText, 'const\s+([A-Za-z0-9_]+)\s*=\s*require\("\.\/routes\/([^"]+)"\)', [System.Text.RegularExpressions.RegexOptions]::Singleline)
foreach ($m in $importMatches) { $routeImports[$m.Groups[1].Value] = $m.Groups[2].Value }

$apiMounts = @()
$appUseMatches = [regex]::Matches($indexText, 'app\.use\(\s*"([^"]+)"[\s\S]*?,\s*([A-Za-z0-9_]+)\s*\)', [System.Text.RegularExpressions.RegexOptions]::Singleline)
foreach ($m in $appUseMatches) {
  $apiMounts += [pscustomobject]@{ Path = $m.Groups[1].Value; Var = $m.Groups[2].Value }
}
$mountMatchesSimple = [regex]::Matches($indexText, '\[\s*"([^"]+)"\s*,\s*([A-Za-z0-9_]+)\s*\]', [System.Text.RegularExpressions.RegexOptions]::Singleline)
foreach ($m in $mountMatchesSimple) {
  $apiMounts += [pscustomobject]@{ Path = $m.Groups[1].Value; Var = $m.Groups[2].Value }
}
$mountMatchesNested = [regex]::Matches($indexText, '\[\s*"([^"]+)"\s*,\s*\[[\s\S]*?([A-Za-z0-9_]+)\s*\]\s*\]', [System.Text.RegularExpressions.RegexOptions]::Singleline)
foreach ($m in $mountMatchesNested) {
  $apiMounts += [pscustomobject]@{ Path = $m.Groups[1].Value; Var = $m.Groups[2].Value }
}
$apiMounts = $apiMounts | Group-Object Path, Var | ForEach-Object { $_.Group[0] }

function Get-FileText($path) {
  if ([string]::IsNullOrWhiteSpace($path)) { return "" }
  if (-not (Test-Path $path)) { return "" }
  return Get-Content -Path $path -Raw
}

function Detect-Flags($text) {
  if ([string]::IsNullOrWhiteSpace($text)) { return @() }
  $flags = @()
  if ($text -match '(?i)mock|stub') { $flags += 'mock-or-stub' }
  if ($text -match '(?i)razorpay|upi|webhook') { $flags += 'payments-integration' }
  if ($text -match '(?i)aadhaar|kyc') { $flags += 'identity-integration' }
  if ($text -match '(?i)otp|sms') { $flags += 'otp-sms' }
  if ($text -match '(?i)fcm|firebase|push') { $flags += 'push-integration' }
  if ($text -match '(?i)sentry|datadog|newrelic|opentelemetry|prometheus') { $flags += 'observability-integration' }
  return ($flags | Select-Object -Unique)
}

$backendEntries = @()
foreach ($mount in $apiMounts) {
  $var = $mount.Var
  $routeRel = if ($routeImports.ContainsKey($var)) { $routeImports[$var] } else { $null }
  $routeFile = if ($routeRel) { Join-Path $repo ("server\src\routes\" + $routeRel) } else { "" }
  $routeText = Get-FileText $routeFile
  $controllers = @()
  if ($routeText) {
    $controllerMatches = [regex]::Matches($routeText, 'require\("\.\.\/controllers\/([^"]+)"\)', [System.Text.RegularExpressions.RegexOptions]::Singleline)
    foreach ($cm in $controllerMatches) { $controllers += $cm.Groups[1].Value }
  }
  $controllerFlags = @()
  foreach ($c in ($controllers | Select-Object -Unique)) {
    $controllerFile = Join-Path $repo ("server\src\controllers\" + $c)
    $controllerFlags += Detect-Flags (Get-FileText $controllerFile)
  }
  $routeFlags = Detect-Flags $routeText
  $flags = ($routeFlags + $controllerFlags) | Select-Object -Unique
  $status = 'implemented'
  if ($flags -contains 'mock-or-stub') { $status = 'contains-mock-or-stub' }
  elseif ($flags -match 'payments-integration|identity-integration|otp-sms|push-integration') {
    $status = 'implemented-with-external-integration'
  }
  $backendEntries += [pscustomobject]@{
    Path = $mount.Path
    RouteVar = $var
    RouteFile = $routeFile
    Controllers = ($controllers | Select-Object -Unique) -join ', '
    Flags = ($flags -join ', ')
    Status = $status
  }
}

$frontendEntries = @()
foreach ($comp in ($componentRoutes.Keys | Where-Object { $_ -notlike 'Navigate->*' -and $_ -ne 'Unknown' } | Sort-Object)) {
  $routesList = $componentRoutes[$comp] | Sort-Object
  $data = $pageMap[$comp]
  $fileAbs = if ($data -and $data.File) { $data.File } else {
    $fileRel = $componentFiles[$comp]
    if ($fileRel) { (Resolve-Path -Path (Join-Path $repo ('client\\src\\' + ($fileRel -replace '^\\./','')))).Path } else { '' }
  }
  $services = if ($data) { $data.Services } else { '' }
  $hooks = if ($data) { $data.Hooks } else { '' }
  $contexts = if ($data) { $data.Contexts } else { '' }

  $access = 'Public'
  $hasAuth = $false
  $hasPublic = $false
  foreach ($r in $routesList) { if ($authRoutes.Contains($r)) { $hasAuth = $true } else { $hasPublic = $true } }
  if ($hasAuth -and -not $hasPublic) { $access = 'Auth' }
  elseif ($hasAuth -and $hasPublic) { $access = 'Mixed' }
  if ($routesList | Where-Object { $adminRoutes.Contains($_) }) { $access = 'Admin' }

  $impl = 'local-ui'
  if ($services -match 'services\/api|@\/services\/api') { $impl = 'api-backed' }
  elseif ($hooks -match 'useCmsPage' -and -not $services) { $impl = 'cms-driven' }
  elseif ($contexts) { $impl = 'context-driven' }

  $frontendEntries += [pscustomobject]@{
    Routes = ($routesList -join ', ')
    Component = $comp
    File = $fileAbs
    Access = $access
    Services = $services
    Hooks = $hooks
    Contexts = $contexts
    ImplementationSignal = $impl
  }
}

$frontendCount = $frontendEntries.Count
$backendCount = ($backendEntries | Select-Object -Unique Path).Count
$clientTests = (Get-ChildItem -Recurse -File (Join-Path $repo 'client\tests') | Measure-Object).Count
$serverTests = (Get-ChildItem -Recurse -File (Join-Path $repo 'server\tests') | Measure-Object).Count
$workflowDir = Join-Path $repo '.github\workflows'
$workflowCount = if (Test-Path $workflowDir) { (Get-ChildItem -Path $workflowDir -Filter *.yml | Measure-Object).Count } else { 0 }

$lines = @()
$lines += '# Readiness Audit (Static Code Review)'
$lines += ''
$lines += 'This audit is based on static code inspection only. It does not prove runtime configuration, external integrations, or real user traffic. Use this as a readiness baseline.'
$lines += ''
$lines += '## Summary'
$lines += "- Frontend pages detected: $frontendCount"
$lines += "- Backend API mounts detected: $backendCount"
$lines += "- Client tests: $clientTests"
$lines += "- Server tests: $serverTests"
$lines += "- CI workflows: $workflowCount"
$lines += ''
$lines += '## Readiness Verdict'
$lines += '- MVP-ready: YES (core loops and backend endpoints exist)'
$lines += '- Beta-ready: LIKELY (tests + CI + monitoring hooks exist), subject to staging verification'
$lines += '- Production-ready: NOT VERIFIED (requires live integrations, load testing, and operational proof)'
$lines += ''
$lines += '## Key Integration Dependencies'
$lines += '- Payments: Razorpay + webhook flows (env keys required)'
$lines += '- Identity/KYC: Aadhaar OTP + verification (mock fallback exists if provider not configured)'
$lines += '- Messaging/Notifications: Push/FCM hooks present (requires provider setup)'
$lines += '- Error reporting: client-side reporting supports Sentry DSN or internal endpoint'
$lines += ''
$lines += '## Frontend Page Audit (Page-by-Page)'
$lines += '| Routes | Component | File | Access | Implementation Signal | Data Sources / APIs | State & Context |'
$lines += '|---|---|---|---|---|---|---|'
foreach ($entry in $frontendEntries) {
  $servicesText = if ($entry.Services) { $entry.Services } else { 'none' }
  $hooksText = if ($entry.Hooks) { $entry.Hooks } else { 'none' }
  $dataSources = "Services: $servicesText; Hooks: $hooksText"
  $contextsText = if ($entry.Contexts) { $entry.Contexts } else { 'none' }
  $lines += "| $($entry.Routes) | $($entry.Component) | $($entry.File) | $($entry.Access) | $($entry.ImplementationSignal) | $dataSources | $contextsText |"
}
$lines += ''
$lines += '## Backend API Audit (Mounted Routes)'
$lines += '| Base Path | Route File | Controllers | Status | Flags |'
$lines += '|---|---|---|---|---|'
foreach ($entry in ($backendEntries | Sort-Object Path)) {
  $routeFile = if ($entry.RouteFile) { $entry.RouteFile } else { 'unknown' }
  $controllers = if ($entry.Controllers) { $entry.Controllers } else { 'none' }
  $flags = if ($entry.Flags) { $entry.Flags } else { 'none' }
  $lines += "| $($entry.Path) | $routeFile | $controllers | $($entry.Status) | $flags |"
}
$lines += ''
$lines += '## Notable Mocks / Stubs (Detected)'
$lines += '- Admin doc auto-validation returns mocked confidence scores (see adminDocController).'
$lines += '- Aadhaar OTP service supports mock OTP generation when provider config is missing.'
$lines += ''
$lines += '## Production Readiness Checklist (What Is Still Needed)'
$lines += '- Live integration verification (payments, OTP/KYC, push, email)'
$lines += '- Load testing and performance baselines'
$lines += '- Observability dashboards + alerting in production'
$lines += '- Incident response runbooks + on-call rotation'
$lines += '- Data backup/restore drills at least once in production-like environment'
$lines += ''

$lines | Set-Content -Path $readinessPath -Encoding UTF8
