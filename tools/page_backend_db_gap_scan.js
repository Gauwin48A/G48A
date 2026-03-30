/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const CLIENT_SRC = path.join(ROOT, "client", "src");
const PAGES_DIR = path.join(CLIENT_SRC, "pages");
const SERVER_SRC = path.join(ROOT, "server", "src");
const ANALYSIS_DIR = path.join(ROOT, "analysis");

const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".dev-logs",
  ".codex-snapshots",
  "_codex_backups",
  "uploads",
  "logs",
]);

const JS_EXTS = new Set([".js", ".jsx", ".ts", ".tsx"]);

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function isIgnoredDir(dirName) {
  return IGNORE_DIRS.has(dirName);
}

function walkFiles(dir, exts) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!isIgnoredDir(entry.name)) {
          stack.push(path.join(current, entry.name));
        }
        continue;
      }
      const ext = path.extname(entry.name);
      if (!exts || exts.has(ext)) {
        out.push(path.join(current, entry.name));
      }
    }
  }
  return out;
}

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function extractImports(code) {
  const imports = [];
  const importRegex =
    /import\s+(?:[^'"]+from\s+)?['"]([^'"]+)['"]/g;
  const requireRegex = /require\(\s*['"]([^'"]+)['"]\s*\)/g;
  const exportFromRegex =
    /export\s+(?:\*\s+from\s+|{[^}]+}\s+from\s+)['"]([^'"]+)['"]/g;
  const dynamicImportRegex =
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  let match;
  while ((match = importRegex.exec(code))) imports.push(match[1]);
  while ((match = requireRegex.exec(code))) imports.push(match[1]);
  while ((match = exportFromRegex.exec(code))) imports.push(match[1]);
  while ((match = dynamicImportRegex.exec(code))) imports.push(match[1]);
  return imports;
}

function resolveImport(baseFile, spec, aliasRoot) {
  if (!spec) return null;
  let target;
  if (spec.startsWith("@/")) {
    target = path.join(aliasRoot, spec.slice(2));
  } else if (spec.startsWith(".")) {
    target = path.resolve(path.dirname(baseFile), spec);
  } else {
    return null;
  }

  const tryFiles = [];
  if (fs.existsSync(target) && fs.statSync(target).isFile()) return target;
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    for (const ext of JS_EXTS) tryFiles.push(path.join(target, `index${ext}`));
  } else {
    for (const ext of JS_EXTS) tryFiles.push(`${target}${ext}`);
  }
  for (const candidate of tryFiles) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function collectDeps(entryFile, aliasRoot) {
  const deps = [];
  const stack = [entryFile];
  const seen = new Set();
  while (stack.length) {
    const file = stack.pop();
    if (!file || seen.has(file)) continue;
    seen.add(file);
    deps.push(file);
    const code = readFileSafe(file);
    const imports = extractImports(code);
    for (const spec of imports) {
      const resolved = resolveImport(file, spec, aliasRoot);
      if (resolved) stack.push(resolved);
    }
  }
  return deps;
}

function splitTopLevelCommas(text) {
  const parts = [];
  let current = "";
  let depth = 0;
  let quote = null;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quote) {
      current += ch;
      if (ch === "\\" && i + 1 < text.length) {
        current += text[i + 1];
        i += 1;
        continue;
      }
      if (quote === "`" && ch === "$" && text[i + 1] === "{") {
        current += "{";
        i += 2;
        let braceDepth = 1;
        for (; i < text.length && braceDepth > 0; i += 1) {
          const inner = text[i];
          current += inner;
          if (inner === "{") braceDepth += 1;
          if (inner === "}") braceDepth -= 1;
          if (inner === "\\" && i + 1 < text.length) {
            current += text[i + 1];
            i += 1;
          }
        }
        i -= 1;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === "(" || ch === "[" || ch === "{") {
      depth += 1;
      current += ch;
      continue;
    }
    if (ch === ")" || ch === "]" || ch === "}") {
      depth = Math.max(0, depth - 1);
      current += ch;
      continue;
    }
    if (ch === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function extractStringLiterals(text) {
  const results = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === "'" || ch === '"' || ch === "`") {
      const quote = ch;
      let buf = "";
      i += 1;
      for (; i < text.length; i += 1) {
        const c = text[i];
        if (c === "\\" && i + 1 < text.length) {
          buf += c + text[i + 1];
          i += 1;
          continue;
        }
        if (quote === "`" && c === "$" && text[i + 1] === "{") {
          buf += "${param}";
          i += 2;
          let braceDepth = 1;
          for (; i < text.length && braceDepth > 0; i += 1) {
            const inner = text[i];
            if (inner === "{") braceDepth += 1;
            if (inner === "}") braceDepth -= 1;
            if (inner === "\\" && i + 1 < text.length) i += 1;
          }
          i -= 1;
          continue;
        }
        if (c === quote) break;
        buf += c;
      }
      results.push(buf);
    }
    i += 1;
  }
  return results;
}

function buildConstStringMap(code) {
  const map = new Map();
  const declRegex = /\b(const|let|var)\s+([^;]+);/gs;
  let match;
  while ((match = declRegex.exec(code))) {
    const declBody = match[2];
    const parts = splitTopLevelCommas(declBody);
    for (const part of parts) {
      const idx = part.indexOf("=");
      if (idx < 0) continue;
      const name = part.slice(0, idx).trim();
      if (!/^[A-Za-z_$][\w$]*$/.test(name)) continue;
      const expr = part.slice(idx + 1).trim();
      const exprTrimmed = expr.trim();
      if (!exprTrimmed) continue;
      // Ignore object/array literals to avoid treating options as URL strings.
      if (exprTrimmed.startsWith("{") || exprTrimmed.startsWith("[")) continue;
      if (!/['"`]/.test(exprTrimmed)) continue;
      const strings = extractStringLiterals(exprTrimmed);
      if (!strings.length) continue;
      const values = [];
      if (strings.length === 1) {
        let val = strings[0];
        if (/\+/.test(expr) && val.endsWith("/")) val += ":param";
        values.push(val);
      } else if (/\?/.test(expr) && /:/.test(expr)) {
        values.push(...strings);
      } else {
        const joiner = /\+/.test(expr) || /\$\{/.test(expr) ? ":param" : "";
        values.push(strings.join(joiner));
      }
      for (const value of values) {
        if (!map.has(name)) map.set(name, new Set());
        map.get(name).add(value);
      }
    }
  }
  return map;
}

function extractBuildApiPathAliases(code) {
  const aliases = new Set();
  const members = new Set();
  const namedRegex =
    /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]*networkConfig[^'"]*)['"]/g;
  const nsRegex =
    /import\s+\*\s+as\s+([A-Za-z_$][\w$]*)\s+from\s+['"]([^'"]*networkConfig[^'"]*)['"]/g;
  let match;
  while ((match = namedRegex.exec(code))) {
    const spec = match[1];
    const parts = spec.split(",").map((p) => p.trim());
    for (const p of parts) {
      if (!p) continue;
      const [orig, alias] = p.split(/\s+as\s+/).map((s) => s.trim());
      if (orig === "buildApiPath") {
        aliases.add(alias || orig);
      }
    }
  }
  while ((match = nsRegex.exec(code))) {
    members.add(`${match[1]}.buildApiPath`);
  }
  return { aliases, members };
}

function extractCallArg(code, openParenIndex) {
  let i = openParenIndex;
  let depth = 0;
  let quote = null;
  let arg = "";
  for (; i < code.length; i += 1) {
    const ch = code[i];
    if (quote) {
      arg += ch;
      if (ch === "\\" && i + 1 < code.length) {
        arg += code[i + 1];
        i += 1;
        continue;
      }
      if (quote === "`" && ch === "$" && code[i + 1] === "{") {
        arg += "{";
        i += 2;
        let braceDepth = 1;
        for (; i < code.length && braceDepth > 0; i += 1) {
          const inner = code[i];
          arg += inner;
          if (inner === "{") braceDepth += 1;
          if (inner === "}") braceDepth -= 1;
          if (inner === "\\" && i + 1 < code.length) {
            arg += code[i + 1];
            i += 1;
          }
        }
        i -= 1;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      quote = ch;
      arg += ch;
      continue;
    }
    if (ch === "(" || ch === "[" || ch === "{") {
      depth += 1;
      arg += ch;
      continue;
    }
    if (ch === ")" || ch === "]" || ch === "}") {
      if (depth === 0 && ch === ")") break;
      depth = Math.max(0, depth - 1);
      arg += ch;
      continue;
    }
    if (ch === "," && depth === 0) break;
    arg += ch;
  }
  return arg.trim();
}

function extractCallArgs(code, openParenIndex) {
  let i = openParenIndex;
  let depth = 0;
  let quote = null;
  let argsText = "";
  for (; i < code.length; i += 1) {
    const ch = code[i];
    if (quote) {
      argsText += ch;
      if (ch === "\\" && i + 1 < code.length) {
        argsText += code[i + 1];
        i += 1;
        continue;
      }
      if (quote === "`" && ch === "$" && code[i + 1] === "{") {
        argsText += "{";
        i += 2;
        let braceDepth = 1;
        for (; i < code.length && braceDepth > 0; i += 1) {
          const inner = code[i];
          argsText += inner;
          if (inner === "{") braceDepth += 1;
          if (inner === "}") braceDepth -= 1;
          if (inner === "\\" && i + 1 < code.length) {
            argsText += code[i + 1];
            i += 1;
          }
        }
        i -= 1;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      quote = ch;
      argsText += ch;
      continue;
    }
    if (ch === "(" || ch === "[" || ch === "{") {
      depth += 1;
      argsText += ch;
      continue;
    }
    if (ch === ")" || ch === "]" || ch === "}") {
      if (depth === 0 && ch === ")") break;
      depth = Math.max(0, depth - 1);
      argsText += ch;
      continue;
    }
    argsText += ch;
  }
  return splitTopLevelCommas(argsText);
}

function parseStringLiteral(text) {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const quote = trimmed[0];
  if (quote !== "'" && quote !== '"' && quote !== "`") return null;
  const literal = extractStringLiterals(trimmed);
  return literal.length ? literal[0] : null;
}

function resolveArgToRawStrings(arg, constMap) {
  if (!arg) return [];
  const literal = parseStringLiteral(arg);
  if (literal !== null) return [literal];

  const ident = arg.match(/^[A-Za-z_$][\w$]*$/);
  if (ident) {
    const set = constMap.get(ident[0]);
    if (set && set.size) return Array.from(set);
    return [];
  }

  const buildApiCall = arg.match(/buildApiPath\s*\(([\s\S]+)\)/);
  if (buildApiCall) {
    const inner = extractCallArg(buildApiCall[1], 0);
    const innerLiteral = parseStringLiteral(inner);
    if (innerLiteral !== null) return [innerLiteral];
  }

  const pieces = extractStringLiterals(arg);
  if (!pieces.length) return [];
  if (pieces.length === 1) {
    let val = pieces[0];
    if (/\+/.test(arg) && val.endsWith("/")) val += ":param";
    return [val];
  }
  if (/\?/.test(arg) && /:/.test(arg)) return pieces;
  const joiner = /\+/.test(arg) || /\$\{/.test(arg) ? ":param" : "";
  return [pieces.join(joiner)];
}

function toApiPath(raw) {
  if (!raw) return null;
  let s = raw.trim();
  if (!s) return null;
  const rawValue = s.replace(/^['"`]|['"`]$/g, "");
  if (!rawValue) return null;
  const upperValue = rawValue.toUpperCase();
  const disallowedTokens = new Set([
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
    "HEAD",
    "CONTENT-TYPE",
    "APPLICATION/JSON",
    "INCLUDE",
    "OMIT",
    "SAME-ORIGIN",
  ]);
  if (disallowedTokens.has(upperValue)) return null;
  if (rawValue.startsWith("Bearer ") || rawValue.includes("Content-Type"))
    return null;

  s = rawValue;
  s = s.replace(/^https?:\/\/[^/]+/i, "");
  s = s.replace(/\$\{[^}]+\}/g, ":param");
  // Strip only a leading placeholder (used for base URL/host).
  s = s.replace(/^:param(?=\/)/, "");
  if (!s.startsWith("/")) s = `/${s}`;
  // Drop trailing placeholder that likely represents a query string.
  if (s.endsWith(":param") && s[s.length - 7] !== "/") {
    s = s.slice(0, -6);
  }
  const queryIndex = s.indexOf("?");
  if (queryIndex >= 0) s = s.slice(0, queryIndex);
  s = s.replace(/\/{2,}/g, "/");
  if (s === "/" || s === "/:param" || s === "/:param:param") return null;
  if (s === "/") return s;
  if (!s.startsWith("/api")) {
    s = s.startsWith("/") ? `/api${s}` : `/api/${s}`;
  }
  if (s.length > 1 && s.endsWith("/")) s = s.slice(0, -1);
  return s;
}

function normalizePathForMatch(pathStr) {
  if (!pathStr) return null;
  let s = pathStr.replace(/\/{2,}/g, "/");
  if (s.length > 1 && s.endsWith("/")) s = s.slice(0, -1);
  s = s.replace(/:[^/]+/g, ":param");
  return s;
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildBackendMatchers(backendEndpoints) {
  const matchers = [];
  for (const ep of backendEndpoints) {
    const normalized = normalizePathForMatch(ep.api_path);
    if (!normalized) continue;
    const placeholder = "__PARAM__";
    const withPlaceholder = normalized.replace(/:param/g, placeholder);
    const escaped = escapeRegex(withPlaceholder);
    const pattern = `^${escaped.replace(
      new RegExp(placeholder, "g"),
      "[^/]+"
    )}$`;
    matchers.push({
      method: ep.method.toLowerCase(),
      regex: new RegExp(pattern),
      route_file: ep.route_file,
      api_path: ep.api_path,
      key: `${ep.method.toLowerCase()} ${normalized}`,
    });
  }
  return matchers;
}

function findBackendMatches(method, norm, backendIndex, backendMatchers) {
  if (!norm) return [];
  const matches = new Set();
  const normalizedMethod = String(method || "").toLowerCase();
  if (normalizedMethod === "fetch" || normalizedMethod === "buildapipath") {
    for (const [key, files] of backendIndex.entries()) {
      if (key.endsWith(` ${norm}`)) {
        files.forEach((file) => matches.add(file));
      }
    }
    for (const matcher of backendMatchers) {
      if (matcher.regex.test(norm)) matches.add(matcher.route_file);
    }
    return Array.from(matches);
  }

  const directKey = `${normalizedMethod} ${norm}`;
  const direct = backendIndex.get(directKey);
  if (direct) direct.forEach((file) => matches.add(file));

  for (const matcher of backendMatchers) {
    if (matcher.method !== normalizedMethod) continue;
    if (matcher.regex.test(norm)) matches.add(matcher.route_file);
  }
  return Array.from(matches);
}

function detectStaticData(code) {
  const arrayPattern = /\bconst\s+\w+\s*=\s*\[\s*[{'\"]/s;
  return arrayPattern.test(code);
}

function extractEndpointsFromCode(code) {
  const endpoints = [];
  const constMap = buildConstStringMap(code);
  const buildAliases = extractBuildApiPathAliases(code);
  const ignoreTokens = new Set([
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
    "HEAD",
    "CONTENT-TYPE",
    "APPLICATION/JSON",
    "INCLUDE",
    "OMIT",
    "SAME-ORIGIN",
  ]);

  const shouldIgnoreRaw = (raw) => {
    const value = String(raw || "").trim().replace(/^['"`]|['"`]$/g, "");
    if (!value) return true;
    if (ignoreTokens.has(value.toUpperCase())) return true;
    if (value.startsWith("Bearer ")) return true;
    if (value.includes("Content-Type")) return true;
    return false;
  };

  const addEndpoint = (method, raw) => {
    const apiPath = toApiPath(raw);
    if (!apiPath && shouldIgnoreRaw(raw)) return;
    if (apiPath === "/api" || apiPath === "/api/") return;
    endpoints.push({
      method,
      raw,
      api_path: apiPath,
      status: "pending",
    });
  };

  const scanCall = (regex, methodBuilder) => {
    let match;
    while ((match = regex.exec(code))) {
      const openIndex = match.index + match[0].lastIndexOf("(") + 1;
      const arg = extractCallArg(code, openIndex);
      const rawStrings = resolveArgToRawStrings(arg, constMap);
      if (rawStrings.length) {
        for (const raw of rawStrings) addEndpoint(methodBuilder(match), raw);
      } else {
        endpoints.push({
          method: methodBuilder(match),
          raw: arg || "<dynamic>",
          api_path: null,
          status: "unresolved",
        });
      }
    }
  };

  scanCall(/\bfetch\s*\(/g, () => "fetch");
  scanCall(/\b(axios|api|client)\s*\.\s*(get|post|put|delete|patch)\s*\(/g, (m) =>
    m[2].toLowerCase()
  );

  for (const alias of buildAliases.aliases) {
    const re = new RegExp(`\\b${alias}\\s*\\(`, "g");
    scanCall(re, () => "buildApiPath");
  }
  for (const member of buildAliases.members) {
    const escaped = member.replace(/\./g, "\\.");
    const re = new RegExp(`\\b${escaped}\\s*\\(`, "g");
    scanCall(re, () => "buildApiPath");
  }

  return endpoints;
}

function parseServerImports(code, baseDir) {
  const map = new Map();
  const requireRegex =
    /\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*require\(\s*['"]([^'"]+)['"]\s*\)/g;
  const importRegex =
    /import\s+([A-Za-z_$][\w$]*)\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = requireRegex.exec(code))) {
    const resolved = resolveImport(
      path.join(baseDir, "index.js"),
      match[2],
      SERVER_SRC
    );
    if (resolved) map.set(match[1], resolved);
  }
  while ((match = importRegex.exec(code))) {
    const resolved = resolveImport(
      path.join(baseDir, "index.js"),
      match[2],
      SERVER_SRC
    );
    if (resolved) map.set(match[1], resolved);
  }
  return map;
}

function splitTopLevelArrayItems(text) {
  const items = [];
  let current = "";
  let depth = 0;
  let quote = null;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quote) {
      current += ch;
      if (ch === "\\" && i + 1 < text.length) {
        current += text[i + 1];
        i += 1;
        continue;
      }
      if (quote === "`" && ch === "$" && text[i + 1] === "{") {
        current += "{";
        i += 2;
        let braceDepth = 1;
        for (; i < text.length && braceDepth > 0; i += 1) {
          const inner = text[i];
          current += inner;
          if (inner === "{") braceDepth += 1;
          if (inner === "}") braceDepth -= 1;
          if (inner === "\\" && i + 1 < text.length) {
            current += text[i + 1];
            i += 1;
          }
        }
        i -= 1;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === "[") {
      depth += 1;
      current += ch;
      continue;
    }
    if (ch === "]") {
      depth = Math.max(0, depth - 1);
      current += ch;
      if (depth === 0) {
        items.push(current.trim());
        current = "";
        continue;
      }
      continue;
    }
    if (depth > 0 || current.trim()) current += ch;
  }
  return items.filter(Boolean);
}

function extractMountsFromIndex(indexCode, importMap) {
  const mounts = [];
  const appUseRegex = /\bapp\.use\s*\(/g;
  let match;
  while ((match = appUseRegex.exec(indexCode))) {
    const openIndex = match.index + match[0].lastIndexOf("(") + 1;
    const args = extractCallArgs(indexCode, openIndex);
    if (!args.length) continue;
    const mountPath = parseStringLiteral(args[0]);
    if (!mountPath) continue;
    let handler = null;
    for (const arg of args) {
      const routeMatches = arg.match(/\b[A-Za-z_$][\w$]*Routes?\b/g);
      if (routeMatches && routeMatches.length) {
        handler = routeMatches[routeMatches.length - 1];
      }
    }
    if (handler && importMap.has(handler)) {
      mounts.push({ mountPath, file: importMap.get(handler) });
    }
  }

  const apiMountsMatch = indexCode.match(
    /const\s+apiRouteMounts\s*=\s*\[([\s\S]*?)\];/
  );
  if (apiMountsMatch) {
    const block = apiMountsMatch[1];
    const items = splitTopLevelArrayItems(block);
    for (const item of items) {
      const stringLits = extractStringLiterals(item).filter((s) =>
        s.startsWith("/")
      );
      if (!stringLits.length) continue;
      const routeMatches = item.match(/\b[A-Za-z_$][\w$]*Routes?\b/g) || [];
      const handler = routeMatches[routeMatches.length - 1];
      if (!handler || !importMap.has(handler)) continue;
      for (const mountPath of stringLits) {
        mounts.push({ mountPath, file: importMap.get(handler) });
      }
    }
  }

  return mounts;
}

function parseRouteFile(filePath) {
  const code = readFileSafe(filePath);
  const endpoints = [];
  const directRegex =
    /\brouter\.(get|post|put|delete|patch|all)\s*\(\s*(['"`])([^'"`]+)\2/g;
  let match;
  while ((match = directRegex.exec(code))) {
    endpoints.push({ method: match[1], path: match[3] });
  }

  const routeRegex =
    /\brouter\.route\s*\(\s*(['"`])([^'"`]+)\1\s*\)([\s\S]*?);/g;
  while ((match = routeRegex.exec(code))) {
    const routePath = match[2];
    const chain = match[3];
    const methodRegex = /\.(get|post|put|delete|patch|all)\s*\(/g;
    let methodMatch;
    while ((methodMatch = methodRegex.exec(chain))) {
      endpoints.push({ method: methodMatch[1], path: routePath });
    }
  }

  return endpoints;
}

function parseIndexDirectRoutes(indexCode) {
  const endpoints = [];
  const directRegex =
    /\bapp\.(get|post|put|delete|patch|all)\s*\(\s*(['"`])([^'"`]+)\2/g;
  let match;
  while ((match = directRegex.exec(indexCode))) {
    endpoints.push({ method: match[1], path: match[3] });
  }
  return endpoints;
}

function joinPaths(base, routePath) {
  if (!routePath || routePath === "/") return base;
  const baseClean = base.endsWith("/") ? base.slice(0, -1) : base;
  const sub = routePath.startsWith("/") ? routePath : `/${routePath}`;
  return `${baseClean}${sub}`;
}

function extractTablesFromSql(sqlText) {
  const tables = new Set();
  const ctes = new Set();
  const cteRegex = /\bwith\s+(?:recursive\s+)?([A-Za-z_][\w]*)\s+as\s*\(/gi;
  const cteCommaRegex = /,\s*([A-Za-z_][\w]*)\s+as\s*\(/gi;
  let cteMatch;
  while ((cteMatch = cteRegex.exec(sqlText))) {
    ctes.add(cteMatch[1].toLowerCase());
  }
  while ((cteMatch = cteCommaRegex.exec(sqlText))) {
    ctes.add(cteMatch[1].toLowerCase());
  }

  const tableRegex =
    /\b(from|join|update|delete\s+from|insert\s+into)\s+([A-Za-z0-9_."`]+)/gi;
  let match;
  while ((match = tableRegex.exec(sqlText))) {
    let name = match[2];
    const keyword = match[1].toLowerCase();
    if (keyword === "from") {
      const prefix = sqlText
        .slice(Math.max(0, match.index - 20), match.index)
        .toLowerCase();
      if (/\bdistinct\s+$/.test(prefix) || /\bis\s+distinct\s+$/.test(prefix)) {
        continue;
      }
    }
    name = name.replace(/["`]/g, "");
    let schema = null;
    if (name.includes(".")) {
      const parts = name.split(".");
      schema = parts[0].toLowerCase();
      name = parts[parts.length - 1];
    }
    name = name.replace(/[;,)]$/, "");
    if (keyword === "from" || keyword === "join") {
      const afterIdx = match.index + match[0].length;
      let scanIdx = afterIdx;
      while (scanIdx < sqlText.length && /\s/.test(sqlText[scanIdx])) {
        scanIdx += 1;
      }
      if (sqlText[scanIdx] === "(") continue;
    }
    const lower = name.toLowerCase();
    if (!lower) continue;
    if (schema && (schema === "information_schema" || schema === "pg_catalog"))
      continue;
    if (ctes.has(lower)) continue;
    if (
      lower.startsWith("pg_") ||
      lower === "information_schema" ||
      lower === "select" ||
      lower === "values" ||
      lower === "unnest" ||
      lower === "set" ||
      lower === "this"
    )
      continue;
    if (lower.includes("(")) continue;
    tables.add(lower);
  }
  return tables;
}

function buildConstLiteralMap(code) {
  const map = new Map();
  const declRegex = /\b(const|let|var)\s+([^;]+);/gs;
  let match;
  while ((match = declRegex.exec(code))) {
    const declBody = match[2];
    const parts = splitTopLevelCommas(declBody);
    for (const part of parts) {
      const idx = part.indexOf("=");
      if (idx < 0) continue;
      const name = part.slice(0, idx).trim();
      if (!/^[A-Za-z_$][\w$]*$/.test(name)) continue;
      const expr = part.slice(idx + 1).trim();
      const literal = parseStringLiteral(expr);
      if (literal !== null) map.set(name, literal);
    }
  }
  return map;
}

function extractTablesFromCode(code) {
  const tables = new Set();
  const constLiterals = buildConstLiteralMap(code);
  const patterns = [
    /\b[A-Za-z_$][\w$]*\s*\.\s*query\s*\(/g,
    /\brunQuery\s*\(/g,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(code))) {
      const openIndex = match.index + match[0].lastIndexOf("(") + 1;
      const arg = extractCallArg(code, openIndex);
      let sql = parseStringLiteral(arg);
      if (!sql) {
        const ident = arg.match(/^[A-Za-z_$][\w$]*$/);
        if (ident) sql = constLiterals.get(ident[0]) || null;
      }
      if (!sql) continue;
      if (!/\b(select|insert|update|delete|from|join)\b/i.test(sql)) continue;
      const found = extractTablesFromSql(sql);
      for (const t of found) tables.add(t);
    }
  }
  return tables;
}

function buildSchemaTables() {
  const schemaDirs = [
    path.join(ROOT, "server", "database"),
    path.join(ROOT, "server", "migrations"),
    path.join(ROOT, "server", "sql"),
  ];
  const tables = new Set();
  const sqlRegex =
    /\bcreate\s+(?:or\s+replace\s+)?(?:materialized\s+)?table\s+(?:if\s+not\s+exists\s+)?([A-Za-z0-9_."`]+)/gi;
  const viewRegex =
    /\bcreate\s+(?:or\s+replace\s+)?(?:materialized\s+)?view\s+(?:if\s+not\s+exists\s+)?([A-Za-z0-9_."`]+)/gi;
  const renameRegex =
    /\balter\s+table\s+(?:if\s+exists\s+)?([A-Za-z0-9_."`]+)\s+rename\s+to\s+([A-Za-z0-9_."`]+)/gi;

  for (const dir of schemaDirs) {
    const files = walkFiles(dir, new Set([".sql"]));
    for (const file of files) {
      const content = readFileSafe(file);
      let match;
      while ((match = sqlRegex.exec(content))) {
        let name = match[1].replace(/["`]/g, "");
        if (name.includes(".")) name = name.split(".").pop();
        tables.add(name.toLowerCase());
      }
      while ((match = viewRegex.exec(content))) {
        let name = match[1].replace(/["`]/g, "");
        if (name.includes(".")) name = name.split(".").pop();
        tables.add(name.toLowerCase());
      }
      while ((match = renameRegex.exec(content))) {
        let oldName = match[1].replace(/["`]/g, "");
        let newName = match[2].replace(/["`]/g, "");
        if (oldName.includes(".")) oldName = oldName.split(".").pop();
        if (newName.includes(".")) newName = newName.split(".").pop();
        tables.add(oldName.toLowerCase());
        tables.add(newName.toLowerCase());
      }
    }
  }
  return tables;
}

function main() {
  ensureDir(ANALYSIS_DIR);

  const schemaTables = buildSchemaTables();

  const serverFiles = walkFiles(SERVER_SRC, JS_EXTS);
  const tablesByFile = new Map();
  for (const file of serverFiles) {
    const code = readFileSafe(file);
    const tables = extractTablesFromCode(code);
    tablesByFile.set(file, tables);
  }

  const indexPath = path.join(SERVER_SRC, "index.js");
  const indexCode = readFileSafe(indexPath);
  const importMap = parseServerImports(indexCode, SERVER_SRC);
  const mounts = extractMountsFromIndex(indexCode, importMap);

  const routeFileSet = new Set(mounts.map((m) => m.file));
  const routeFiles = Array.from(routeFileSet);
  const routeFileByName = new Map();
  for (const file of routeFiles) {
    routeFileByName.set(path.basename(file), file);
  }

  const backendEndpoints = [];
  for (const mount of mounts) {
    const routes = parseRouteFile(mount.file);
    for (const route of routes) {
      const fullPath = joinPaths(mount.mountPath, route.path);
      backendEndpoints.push({
        method: route.method.toLowerCase(),
        api_path: fullPath,
        route_file: path.basename(mount.file),
      });
    }
  }

  const indexDirect = parseIndexDirectRoutes(indexCode);
  for (const route of indexDirect) {
    backendEndpoints.push({
      method: route.method.toLowerCase(),
      api_path: route.path,
      route_file: "index.js",
    });
  }

  const backendIndex = new Map();
  for (const ep of backendEndpoints) {
    const key = `${ep.method} ${normalizePathForMatch(ep.api_path)}`;
    if (!backendIndex.has(key)) backendIndex.set(key, []);
    backendIndex.get(key).push(ep.route_file);
  }
  const backendMatchers = buildBackendMatchers(backendEndpoints);

  const pageFiles = walkFiles(PAGES_DIR, JS_EXTS);
  const pageReports = [];

  for (const pageFile of pageFiles) {
    const deps = collectDeps(pageFile, CLIENT_SRC);
    const endpoints = [];
    for (const dep of deps) {
      const code = readFileSafe(dep);
      const found = extractEndpointsFromCode(code);
      for (const ep of found) {
        ep.source_file = path.relative(CLIENT_SRC, dep);
        endpoints.push(ep);
      }
    }

    const pageCode = readFileSafe(pageFile);
    const hasStatic = detectStaticData(pageCode);

    const merged = new Map();
    for (const ep of endpoints) {
      if (!ep.api_path) {
        ep.status = "unresolved";
      } else {
        const norm = normalizePathForMatch(ep.api_path);
        const matches = findBackendMatches(
          ep.method,
          norm,
          backendIndex,
          backendMatchers
        );
        if (matches.length) {
          ep.status = "ok";
          ep.route_files = Array.from(new Set(matches));
        } else {
          ep.status = "missing";
        }
      }

      const key = ep.api_path
        ? `${ep.method}|${ep.api_path}`
        : `${ep.method}|${ep.raw}`;
      if (!merged.has(key)) {
        if (ep.source_file) {
          ep.source_files = [ep.source_file];
          delete ep.source_file;
        }
        merged.set(key, ep);
        continue;
      }
      const existing = merged.get(key);
      const rank = (status) =>
        status === "ok" ? 2 : status === "missing" ? 1 : 0;
      if (rank(ep.status) > rank(existing.status)) {
        existing.status = ep.status;
      }
      if (!existing.api_path && ep.api_path) existing.api_path = ep.api_path;
      if (ep.route_files && ep.route_files.length) {
        const combined = new Set(existing.route_files || []);
        ep.route_files.forEach((f) => combined.add(f));
        existing.route_files = Array.from(combined);
      }
      if (ep.source_file) {
        const combined = new Set(existing.source_files || []);
        combined.add(ep.source_file);
        existing.source_files = Array.from(combined);
      } else if (ep.source_files && ep.source_files.length) {
        const combined = new Set(existing.source_files || []);
        ep.source_files.forEach((f) => combined.add(f));
        existing.source_files = Array.from(combined);
      }
    }

    const mergedEndpoints = Array.from(merged.values());
    const missingEndpoints = mergedEndpoints
      .filter((ep) => ep.status === "missing")
      .map((ep) => ({
        method: ep.method,
        raw: ep.raw,
        api_path: ep.api_path,
      }));
    const matchedRouteFiles = new Set();
    for (const ep of mergedEndpoints) {
      if (ep.status === "ok" && ep.route_files) {
        ep.route_files.forEach((f) => matchedRouteFiles.add(f));
      }
    }

    const tables = new Set();
    for (const routeFile of matchedRouteFiles) {
      const routePath = routeFileByName.get(routeFile);
      if (!routePath) continue;
      const depFiles = collectDeps(routePath, SERVER_SRC);
      for (const dep of depFiles) {
        const tset = tablesByFile.get(dep);
        if (!tset) continue;
        for (const t of tset) tables.add(t);
      }
    }

    const missingTables = Array.from(tables).filter(
      (t) => !schemaTables.has(t)
    );

    pageReports.push({
      page: path.relative(CLIENT_SRC, pageFile),
      endpoints: mergedEndpoints,
      has_api: mergedEndpoints.length > 0,
      has_static: hasStatic,
      missing_endpoints: missingEndpoints,
      tables: Array.from(tables).sort(),
      missing_tables: missingTables.sort(),
    });
  }

  pageReports.sort((a, b) => a.page.localeCompare(b.page));

  const usedBackendKeys = new Set();
  for (const page of pageReports) {
    for (const ep of page.endpoints) {
      if (!ep.api_path) continue;
      const norm = normalizePathForMatch(ep.api_path);
      const method = ep.method.toLowerCase();
      if (method === "fetch" || method === "buildapipath") {
        for (const matcher of backendMatchers) {
          if (matcher.regex.test(norm)) usedBackendKeys.add(matcher.key);
        }
        continue;
      }

      const directKey = `${method} ${norm}`;
      if (backendIndex.has(directKey)) usedBackendKeys.add(directKey);
      for (const matcher of backendMatchers) {
        if (matcher.method !== method) continue;
        if (matcher.regex.test(norm)) usedBackendKeys.add(matcher.key);
      }
    }
  }

  const unusedBackendEndpoints = [];
  for (const [key] of backendIndex.entries()) {
    if (!usedBackendKeys.has(key)) unusedBackendEndpoints.push(key);
  }
  unusedBackendEndpoints.sort();

  const report = {
    pages: pageReports,
    schema_tables_count: schemaTables.size,
    unused_backend_endpoints: unusedBackendEndpoints,
  };

  const jsonPath = path.join(ANALYSIS_DIR, "page_backend_db_gap_report.json");
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  const missingTableSet = new Set();
  for (const page of pageReports) {
    for (const t of page.missing_tables) missingTableSet.add(t);
  }

  const noApiPages = pageReports.filter((p) => !p.has_api);

  const lines = [];
  lines.push("# Page - Backend - DB Gap Report (MHub)");
  lines.push("");
  lines.push(`Total pages: ${pageReports.length}`);
  lines.push(`Pages with no API calls detected: ${noApiPages.length}`);
  lines.push(
    `DB tables referenced but not found in schema SQL: ${
      missingTableSet.size ? Array.from(missingTableSet).sort().join(", ") : "none"
    }`
  );
  lines.push("");

  const formatEndpoint = (ep) => {
    const method =
      ep.method === "buildApiPath"
        ? "BUILDAPIPATH"
        : ep.method.toUpperCase();
    const display = ep.api_path || ep.raw || "<dynamic>";
    const routes =
      ep.route_files && ep.route_files.length
        ? ` (routes: ${ep.route_files.join(", ")})`
        : "";
    return `${method} ${display}${routes}`;
  };

  for (const page of pageReports) {
    lines.push(`**${page.page}**`);
    const okEndpoints = page.endpoints.filter((ep) => ep.status === "ok");
    lines.push(
      `Endpoints: ${
        okEndpoints.length ? okEndpoints.map(formatEndpoint).join(", ") : "none"
      }`
    );
    const routeFiles = new Set();
    for (const ep of okEndpoints) {
      if (ep.route_files) ep.route_files.forEach((f) => routeFiles.add(f));
    }
    lines.push(
      `Backend routes: ${routeFiles.size ? Array.from(routeFiles).join(", ") : "none"}`
    );
    lines.push(
      `DB tables: ${page.tables.length ? page.tables.join(", ") : "none"}`
    );
    const gaps = [];
    if (!page.has_api) gaps.push("No API calls detected");
    if (page.has_static) gaps.push("Static data detected in page module");
    if (page.missing_endpoints.length) {
      const missing = page.missing_endpoints
        .map(
          (ep) =>
            `${String(ep.method || "").toUpperCase()} ${ep.api_path || ep.raw}`
        )
        .join(", ");
      gaps.push(`Missing endpoints: ${missing}`);
    }
    if (page.missing_tables.length) {
      gaps.push(
        `Tables not found in schema SQL: ${page.missing_tables.join(", ")}`
      );
    }
    lines.push(`Gaps: ${gaps.length ? gaps.join(" | ") : "none detected"}`);
    lines.push("");
  }

  const mdPath = path.join(ANALYSIS_DIR, "page_backend_db_gap_report.md");
  fs.writeFileSync(mdPath, lines.join("\n"));

  console.log(`Wrote ${jsonPath}`);
  console.log(`Wrote ${mdPath}`);
}

main();
