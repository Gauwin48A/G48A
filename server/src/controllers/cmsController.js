const { runQuery } = require("../utils/dbHelpers");
const cacheService = require("../services/cacheService");
const logger = require("../utils/logger");

const CMS_CACHE_TTL_SECONDS =
  Number.parseInt(process.env.CMS_CACHE_TTL_SECONDS, 10) || 300;

const normalizeSlug = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const serializePage = (row) => {
  if (!row) return null;
  return {
    slug: row.slug,
    content: row.content || {},
    updatedAt: row.updated_at || null,
  };
};

/**
 * GET /api/cms/pages/:slug
 * Returns CMS content for the given page slug.
 */
exports.getPage = async (req, res) => {
  const slug = normalizeSlug(req.params?.slug);
  if (!slug) {
    return res.status(400).json({ error: "Valid page slug is required" });
  }

  try {
    const cacheKey = `cms:page:${slug}`;
    const page = await cacheService.getOrSetWithStampedeProtection(
      cacheKey,
      async () => {
        const result = await runQuery(
          `SELECT slug, content, updated_at
           FROM cms_pages
           WHERE slug = $1 AND is_active = true
           LIMIT 1`,
          [slug]
        );
        return serializePage(result.rows[0]);
      },
      CMS_CACHE_TTL_SECONDS
    );

    if (!page) {
      return res.status(404).json({ error: "CMS page not found" });
    }

    return res.json({
      success: true,
      slug: page.slug,
      content: page.content,
      updatedAt: page.updatedAt,
    });
  } catch (err) {
    // If the cms_pages table hasn't been provisioned yet (fresh DB / migration
    // not applied), fall back to empty content rather than emitting a 500 that
    // breaks every page consuming optional CMS slots.
    if (err && (err.code === "42P01" || /relation\s+"cms_pages"\s+does not exist/i.test(String(err.message || "")))) {
      logger.warn("CMS getPage: cms_pages table missing — returning empty content fallback");
      return res.json({ success: true, slug, content: {}, updatedAt: null, fallback: true });
    }
    logger.error("CMS getPage error:", err);
    return res.status(500).json({ error: "Failed to load CMS content" });
  }
};

/**
 * GET /api/cms/pages
 * Returns a list of available CMS page slugs (for admin tooling).
 */
exports.getPages = async (_req, res) => {
  try {
    const rows = await cacheService.getOrSetWithStampedeProtection(
      "cms:pages:list",
      async () => {
        const result = await runQuery(
          `SELECT slug, updated_at
           FROM cms_pages
           WHERE is_active = true
           ORDER BY slug ASC`
        );
        return result.rows || [];
      },
      CMS_CACHE_TTL_SECONDS
    );

    return res.json({
      success: true,
      pages: rows.map((row) => ({
        slug: row.slug,
        updatedAt: row.updated_at || null,
      })),
    });
  } catch (err) {
    if (err && (err.code === "42P01" || /relation\s+"cms_pages"\s+does not exist/i.test(String(err.message || "")))) {
      logger.warn("CMS getPages: cms_pages table missing — returning empty list fallback");
      return res.json({ success: true, pages: [], fallback: true });
    }
    logger.error("CMS getPages error:", err);
    return res.status(500).json({ error: "Failed to load CMS pages" });
  }
};

/**
 * GET /api/cms/support
 * Returns official support contact details, Grievance Officer details,
 * SLA times, and registered company address for statutory compliance.
 */
exports.getSupportInfo = async (_req, res) => {
  try {
    return res.json({
      success: true,
      platformName: "Zaruda Marketplace",
      supportEmail: process.env.SUPPORT_EMAIL || "support@zarudatech.com",
      grievanceEmail: process.env.GRIEVANCE_EMAIL || "grievance@zarudatech.com",
      grievanceOfficer: {
        name: "Customer Care Officer",
        designation: "Nodal Grievance Officer",
        email: process.env.GRIEVANCE_EMAIL || "grievance@zarudatech.com",
        address: "Zaruda Technologies Pvt. Ltd., India",
        acknowledgmentSla: "48 Hours",
        resolutionSla: "30 Days",
      },
      workingHours: "Monday to Saturday, 9:00 AM – 6:00 PM IST",
      inAppChannels: [
        { type: "feedback", path: "More -> Feedback", description: "Product feedback & suggestions" },
        { type: "complaints", path: "More -> Complaints", description: "Disputes, refunds & fraud reports" },
      ],
    });
  } catch (err) {
    logger.error("CMS getSupportInfo error:", err);
    return res.status(500).json({ error: "Failed to load support information" });
  }
};

