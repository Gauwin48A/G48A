const fs = require("fs");
const os = require("os");
const path = require("path");

const DEFAULT_UPLOADS_DIR = path.join(os.homedir(), "mhub_uploads");
const UPLOADS_DIR = path.resolve(
  process.env.MHUB_UPLOADS_DIR || process.env.UPLOAD_DIR || DEFAULT_UPLOADS_DIR,
);
const VALIDATE_UPLOADS =
  String(process.env.UPLOADS_VALIDATE_EXISTENCE || "").toLowerCase() === "true";
const UPLOADS_MATCH_PATTERN = /(?:^|\/)uploads\/(.+)$/i;

const normalizeSlashes = (value) => String(value || "").replace(/\\/g, "/");

function ensureDir(dirPath) {
  if (!dirPath) return;
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function getUploadsDir() {
  ensureDir(UPLOADS_DIR);
  return UPLOADS_DIR;
}

function getUploadsSubdir(...segments) {
  const dirPath = path.join(getUploadsDir(), ...segments);
  ensureDir(dirPath);
  return dirPath;
}

function resolveUploadsFilePath(value) {
  const normalized = normalizeSlashes(value).trim();
  if (!normalized) return null;
  if (/^https?:\/\//i.test(normalized) || /^data:/i.test(normalized)) {
    return null;
  }
  const match = normalized.match(UPLOADS_MATCH_PATTERN);
  if (!match?.[1]) return null;
  return path.join(getUploadsDir(), match[1].replace(/^\/+/, ""));
}

function filterMissingUploads(list) {
  if (!VALIDATE_UPLOADS || !Array.isArray(list)) return list || [];
  return list.filter((entry) => {
    const value = String(entry || "").trim();
    if (!value) return false;
    if (/^https?:\/\//i.test(value) || /^data:/i.test(value)) return true;
    const filePath = resolveUploadsFilePath(value);
    if (!filePath) return true;
    try {
      return fs.existsSync(filePath);
    } catch {
      return true;
    }
  });
}

module.exports = {
  getUploadsDir,
  getUploadsSubdir,
  resolveUploadsFilePath,
  filterMissingUploads,
};
