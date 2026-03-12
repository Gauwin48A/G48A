#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "../..");
const PUBLIC_DIR = path.join(ROOT_DIR, "client", "public");
const SITEMAP_PATH = path.join(PUBLIC_DIR, "sitemap.xml");
const ROBOTS_PATH = path.join(PUBLIC_DIR, "robots.txt");
const ROOT_ENV_PATH = path.join(ROOT_DIR, ".env");

const PUBLIC_ROUTES = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/all-posts", changefreq: "hourly", priority: "0.95" },
  { path: "/home", changefreq: "daily", priority: "0.85" },
  { path: "/categories", changefreq: "daily", priority: "0.82" },
  { path: "/nearby", changefreq: "daily", priority: "0.8" },
  { path: "/public-wall", changefreq: "daily", priority: "0.78" },
  { path: "/support", changefreq: "weekly", priority: "0.6" },
  { path: "/t&c", changefreq: "monthly", priority: "0.45" },
  { path: "/privacy-policy", changefreq: "monthly", priority: "0.45" },
  { path: "/refund-policy", changefreq: "monthly", priority: "0.45" },
  { path: "/support-ticket-policy", changefreq: "monthly", priority: "0.45" },
];

const NO_INDEX_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/profile",
  "/dashboard",
  "/admin-panel",
  "/cart",
  "/payment",
  "/offers",
];

function normalizeBaseUrl(raw) {
  const value = String(raw || "").trim().replace(/\/+$/, "");
  if (!value) return "https://example.com";
  if (!/^https?:\/\//i.test(value)) {
    return `https://${value}`;
  }
  return value;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function readRootEnv() {
  try {
    const raw = fs.readFileSync(ROOT_ENV_PATH, "utf8");
    return raw.split(/\r?\n/).reduce((acc, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return acc;
      const index = trimmed.indexOf("=");
      if (index <= 0) return acc;
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
      if (key) acc[key] = value;
      return acc;
    }, {});
  } catch {
    return {};
  }
}

function buildSitemap(baseUrl) {
  const lastmod = new Date().toISOString().slice(0, 10);
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ];

  for (const entry of PUBLIC_ROUTES) {
    const location = `${baseUrl}${entry.path === "/" ? "" : entry.path}`;
    lines.push("  <url>");
    lines.push(`    <loc>${escapeXml(location)}</loc>`);
    lines.push(`    <lastmod>${lastmod}</lastmod>`);
    lines.push(`    <changefreq>${entry.changefreq}</changefreq>`);
    lines.push(`    <priority>${entry.priority}</priority>`);
    lines.push("  </url>");
  }

  lines.push("</urlset>", "");
  return lines.join("\n");
}

function buildRobots(baseUrl) {
  let hostValue = "";
  try {
    hostValue = new URL(baseUrl).host;
  } catch {
    hostValue = "";
  }

  const lines = [
    "User-agent: *",
    "Allow: /",
    "",
    ...NO_INDEX_PATHS.map((pathValue) => `Disallow: ${pathValue}`),
    "",
    `Sitemap: ${baseUrl}/sitemap.xml`,
    ...(hostValue ? [`Host: ${hostValue}`] : []),
    "",
  ];

  return lines.join("\n");
}

function writeArtifacts() {
  const envMap = readRootEnv();
  const siteUrl = normalizeBaseUrl(
    process.env.SITE_URL ||
      process.env.CLIENT_URL ||
      process.env.VITE_SITE_URL ||
      envMap.SITE_URL ||
      envMap.CLIENT_URL ||
      envMap.VITE_SITE_URL,
  );

  if (siteUrl === "https://example.com") {
    console.warn(
      "[seo] SITE_URL/CLIENT_URL not set. Generated sitemap uses https://example.com. Set SITE_URL before production deploy.",
    );
  }

  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  fs.writeFileSync(SITEMAP_PATH, buildSitemap(siteUrl), "utf8");
  fs.writeFileSync(ROBOTS_PATH, buildRobots(siteUrl), "utf8");

  console.log(`[seo] sitemap generated: ${path.relative(ROOT_DIR, SITEMAP_PATH)}`);
  console.log(`[seo] robots generated: ${path.relative(ROOT_DIR, ROBOTS_PATH)}`);
}

writeArtifacts();

