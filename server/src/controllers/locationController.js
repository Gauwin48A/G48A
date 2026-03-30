const { pool, runQuery } = require("../utils/dbHelpers");
const logger = require("../utils/logger");

const https = require("https");
const axios = require("axios");

const COLUMN_CACHE_TTL_MS = 60 * 1000;
const GOOGLE_PLACES_API_KEY = String(
  process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY || "",
).trim();
const GOOGLE_PLACES_RADIUS_METERS =
  Number.parseInt(process.env.GOOGLE_PLACES_RADIUS_METERS, 10) || 60;
const GOOGLE_PLACES_TIMEOUT_MS =
  Number.parseInt(process.env.GOOGLE_PLACES_TIMEOUT_MS, 10) || 3500;
const GOOGLE_PLACES_BASE_URL =
  "https://maps.googleapis.com/maps/api/place/nearbysearch/json";

const serverReverseGeocode = async (lat, lon) => {
  // zoom=18 for building/road-level detail; jsonv2 for richer response
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&namedetails=1&extratags=1`;
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), 5000);
    https
      .get(url, { headers: { "User-Agent": "MHub/1.0 (contact@mhub.app)" } }, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          clearTimeout(timeout);
          try {
            const parsed = JSON.parse(data);
            const address = parsed?.address || {};
            // Enrich with namedetails for landmark/POI names
            if (parsed?.namedetails?.name && !address.amenity) {
              address._poi_name = parsed.namedetails.name;
            }
            if (parsed?.extratags?.name && !address._poi_name) {
              address._poi_name = parsed.extratags.name;
            }
            resolve(address);
          } catch {
            resolve(null);
          }
        });
      })
      .on("error", () => {
        clearTimeout(timeout);
        resolve(null);
      });
  });
};

const INDIA_POST_API_ENABLED =
  String(process.env.INDIA_POST_API_ENABLED || "true").toLowerCase() === "true";
const INDIA_POST_TIMEOUT_MS =
  Number.parseInt(process.env.INDIA_POST_API_TIMEOUT_MS, 10) || 3500;

const fetchIndiaPostDetails = async (pincode) => {
  const normalized = String(pincode || "").replace(/\D/g, "");
  if (!INDIA_POST_API_ENABLED || normalized.length !== 6) return null;

  const url = `https://api.postalpincode.in/pincode/${normalized}`;
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), INDIA_POST_TIMEOUT_MS);
    https
      .get(url, { headers: { "User-Agent": "MHub/1.0" } }, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          clearTimeout(timeout);
          try {
            const parsed = JSON.parse(data);
            const payload = Array.isArray(parsed) ? parsed[0] : null;
            if (!payload || payload.Status !== "Success") return resolve(null);
            const office = Array.isArray(payload.PostOffice)
              ? payload.PostOffice[0]
              : null;
            if (!office) return resolve(null);
            resolve({
              pincode: office.Pincode || normalized,
              village: office.Name || null,
              district: office.District || null,
              state: office.State || null,
              block: office.Block || null,
              region: office.Region || null,
              division: office.Division || null,
              circle: office.Circle || null,
            });
          } catch {
            resolve(null);
          }
        });
      })
      .on("error", () => {
        clearTimeout(timeout);
        resolve(null);
      });
  });
};

let schemaReadyPromise = null;
let columnCache = null;
let columnCacheAt = 0;

const LOCATION_OPTIONAL_COLUMNS = [
  "state",
  "area",
  "locality",
  "district",
  "pincode",
  "display_name",
  "provider",
  "street",
  "timezone",
  "synced_at",
  "village",
  "colony",
  "suburb",
];

const USER_OPTIONAL_COLUMNS = [
  "current_area",
  "current_locality",
  "current_pincode",
  "current_display_name",
  "current_district",
  "current_village",
  "current_colony",
  "current_suburb",
];

const safeText = (value) => {
  if (value === undefined || value === null) return "";
  const normalized = String(value).trim();
  return normalized.length ? normalized : "";
};

const toNumberOrNull = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const clampNumber = (value, min, max) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return min;
  return Math.min(Math.max(parsed, min), max);
};

const getColumnSet = async (tableName) => {
  const result = await runQuery(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
    `,
    [tableName],
  );

  return new Set((result.rows || []).map((row) => String(row.column_name)));
};

const ensureLocationSchema = async () => {
  if (schemaReadyPromise) {
    return schemaReadyPromise;
  }

  schemaReadyPromise = (async () => {
    try {
      await runQuery(`ALTER TABLE user_locations ADD COLUMN IF NOT EXISTS speed DOUBLE PRECISION`);
      await runQuery(`ALTER TABLE user_locations ADD COLUMN IF NOT EXISTS state TEXT`);
      await runQuery(`ALTER TABLE user_locations ADD COLUMN IF NOT EXISTS area TEXT`);
      await runQuery(`ALTER TABLE user_locations ADD COLUMN IF NOT EXISTS locality TEXT`);
      await runQuery(`ALTER TABLE user_locations ADD COLUMN IF NOT EXISTS district TEXT`);
      await runQuery(`ALTER TABLE user_locations ADD COLUMN IF NOT EXISTS pincode TEXT`);
      await runQuery(`ALTER TABLE user_locations ADD COLUMN IF NOT EXISTS display_name TEXT`);
      await runQuery(`ALTER TABLE user_locations ADD COLUMN IF NOT EXISTS provider TEXT`);
      await runQuery(`ALTER TABLE user_locations ADD COLUMN IF NOT EXISTS street TEXT`);
      await runQuery(`ALTER TABLE user_locations ADD COLUMN IF NOT EXISTS timezone TEXT`);
      await runQuery(`ALTER TABLE user_locations ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ`);
      await runQuery(`ALTER TABLE user_locations ADD COLUMN IF NOT EXISTS village TEXT`);
      await runQuery(`ALTER TABLE user_locations ADD COLUMN IF NOT EXISTS colony TEXT`);
      await runQuery(`ALTER TABLE user_locations ADD COLUMN IF NOT EXISTS suburb TEXT`);

      await runQuery(`ALTER TABLE users ADD COLUMN IF NOT EXISTS current_area TEXT`);
      await runQuery(`ALTER TABLE users ADD COLUMN IF NOT EXISTS current_locality TEXT`);
      await runQuery(`ALTER TABLE users ADD COLUMN IF NOT EXISTS current_pincode TEXT`);
      await runQuery(`ALTER TABLE users ADD COLUMN IF NOT EXISTS current_display_name TEXT`);
      await runQuery(`ALTER TABLE users ADD COLUMN IF NOT EXISTS current_district TEXT`);
      await runQuery(`ALTER TABLE users ADD COLUMN IF NOT EXISTS current_village TEXT`);
      await runQuery(`ALTER TABLE users ADD COLUMN IF NOT EXISTS current_colony TEXT`);
      await runQuery(`ALTER TABLE users ADD COLUMN IF NOT EXISTS current_suburb TEXT`);

      await runQuery(
        `CREATE INDEX IF NOT EXISTS idx_user_locations_city_area ON user_locations(city, area, locality)`,
      );
      await runQuery(
        `CREATE INDEX IF NOT EXISTS idx_users_current_area ON users(current_city, current_area)`,
      );
    } catch (error) {
      logger.warn("[Location] Optional schema provisioning skipped", {
        message: error.message,
      });
    }
  })();

  return schemaReadyPromise;
};

const getColumnAvailability = async () => {
  const now = Date.now();
  if (columnCache && now - columnCacheAt < COLUMN_CACHE_TTL_MS) {
    return columnCache;
  }

  await ensureLocationSchema();

  const [locationColumns, userColumns] = await Promise.all([
    getColumnSet("user_locations"),
    getColumnSet("users"),
  ]);

  columnCache = {
    locationColumns,
    userColumns,
  };
  columnCacheAt = now;

  return columnCache;
};

const appendOptionalInsertColumn = (
  columns,
  placeholders,
  params,
  availability,
  column,
  value,
) => {
  if (!availability.locationColumns.has(column)) return;

  if (column === "synced_at") {
    columns.push(column);
    placeholders.push("NOW()");
    return;
  }

  params.push(value);
  columns.push(column);
  placeholders.push(`$${params.length}`);
};

const updateUserLocationSnapshot = async (
  client,
  userId,
  values,
  availability,
) => {
  if (!userId) return;

  const params = [];
  const updates = [];

  const pushUpdate = (column, value) => {
    params.push(value);
    updates.push(`${column} = $${params.length}`);
  };

  pushUpdate("current_city", values.city);
  pushUpdate("current_state", values.state || null);
  pushUpdate("last_latitude", values.latitude);
  pushUpdate("last_longitude", values.longitude);
  pushUpdate("device_speed", values.speed);

  if (availability.userColumns.has("current_area")) {
    pushUpdate("current_area", values.area || null);
  }
  if (availability.userColumns.has("current_locality")) {
    pushUpdate("current_locality", values.locality || null);
  }
  if (availability.userColumns.has("current_pincode")) {
    pushUpdate("current_pincode", values.pincode || null);
  }
  if (availability.userColumns.has("current_display_name")) {
    pushUpdate("current_display_name", values.displayName || null);
  }
  if (availability.userColumns.has("current_district")) {
    pushUpdate("current_district", values.district || null);
  }
  if (availability.userColumns.has("current_village")) {
    pushUpdate("current_village", values.village || null);
  }
  if (availability.userColumns.has("current_colony")) {
    pushUpdate("current_colony", values.colony || null);
  }
  if (availability.userColumns.has("current_suburb")) {
    pushUpdate("current_suburb", values.suburb || null);
  }

  updates.push("last_location_sync = NOW()");

  params.push(String(userId));

  const query = `
    UPDATE users
    SET ${updates.join(", ")}
    WHERE user_id::text = $${params.length}
  `;

  await client.query(query, params);
};

exports.updateLocation = async (req, res) => {
  req.body = {
    ...req.body,
    user_id: req.body?.user_id || req.body?.userId || null,
    permission_status: req.body?.permission_status || "granted",
    provider: req.body?.provider || "legacy_update",
  };

  return exports.saveLocation(req, res);
};

exports.saveLocation = async (req, res) => {
  try {
    // Prefer authenticated user ID from JWT to prevent identity spoofing
    const authenticatedUserId = req.user?.userId || req.user?.id || req.user?.user_id || null;
    const {
      latitude,
      longitude,
      accuracy,
      heading,
      permission_status,
      city,
      state,
      country,
      area,
      locality,
      district,
      pincode,
      display_name,
      displayName,
      provider,
      street,
      timezone,
      village,
      colony,
      suburb,
    } = req.body;

    // Authenticated user takes priority; fall back to body only for unauthenticated saves
    const user_id = authenticatedUserId || req.body?.user_id || req.body?.userId || null;

    const normalizedPermission = String(permission_status || "").toLowerCase();
    const hasLatitude = latitude !== undefined && latitude !== null && latitude !== "";
    const hasLongitude = longitude !== undefined && longitude !== null && longitude !== "";
    const parsedLatitude = hasLatitude ? toNumberOrNull(latitude) : null;
    const parsedLongitude = hasLongitude ? toNumberOrNull(longitude) : null;

    if (normalizedPermission.startsWith("granted") && (!hasLatitude || !hasLongitude)) {
      return res.status(400).json({ error: "Missing latitude or longitude" });
    }

    // Reject Null Island coordinates (0, 0) — these come from error-state clients
    if (parsedLatitude === 0 && parsedLongitude === 0) {
      return res.status(400).json({ error: "Invalid coordinates (0, 0)" });
    }

    if ((hasLatitude && parsedLatitude === null) || (hasLongitude && parsedLongitude === null)) {
      return res.status(400).json({ error: "Invalid latitude or longitude" });
    }

    // Validate coordinate bounds (latitude: -90 to 90, longitude: -180 to 180)
    if (parsedLatitude !== null && (parsedLatitude < -90 || parsedLatitude > 90)) {
      return res.status(400).json({ error: "Latitude out of range (-90 to 90)" });
    }
    if (parsedLongitude !== null && (parsedLongitude < -180 || parsedLongitude > 180)) {
      return res.status(400).json({ error: "Longitude out of range (-180 to 180)" });
    }

    const ipLocation = req.ipLocation || null;
    const locationVerified = req.locationVerified || false;
    const fraudRisk = req.fraudRisk || null;

    // ── Server-side spoof detection (NO client-reported flags trusted) ──
    if (parsedLatitude !== null && parsedLongitude !== null) {
      const spoofSignals = [];

      // Integer coordinates = fake GPS
      if (parsedLatitude % 1 === 0 && parsedLongitude % 1 === 0) {
        spoofSignals.push("integer_coordinates");
      }

      // Impossibly precise accuracy (< 0.5m) — consumer GPS ≥3m, survey-grade ~0.5m
      const accVal = Number(req.body?.accuracy);
      if (Number.isFinite(accVal) && accVal > 0 && accVal < 0.5) {
        spoofSignals.push("impossible_accuracy");
      }

      // Low decimal precision on either coord (real GPS has 6+ decimal places)
      const latDec = String(Math.abs(parsedLatitude)).split(".")[1] || "";
      const lngDec = String(Math.abs(parsedLongitude)).split(".")[1] || "";
      if (latDec.length < 3 || lngDec.length < 3) {
        spoofSignals.push("low_precision");
      }

      // Suspicious decimal patterns on either coord
      for (const dec of [latDec, lngDec]) {
        if (dec.length >= 4) {
          const tail = dec.slice(-4);
          if (tail === "0000" || tail === "5000" || tail === "1111" || tail === "9999") {
            spoofSignals.push("decimal_pattern");
            break;
          }
        }
      }

      // Block if 2+ signals detected (reduces false positives)
      if (spoofSignals.length >= 2) {
        logger.warn(`[Location] SPOOF BLOCKED - User: ${user_id}, GPS: (${parsedLatitude}, ${parsedLongitude}), signals: ${spoofSignals.join(",")}`);
        return res.status(403).json({
          error: "Location verification failed. Please use real GPS.",
          code: "LOCATION_SPOOF_DETECTED",
        });
      }

      // Attach signals for downstream logging
      req._locationSpoofSignals = spoofSignals;
    }
    // ── End server-side spoof detection ───────────────────

    if (locationVerified) {
      logger.info(
        `[Location] Verified location save - User: ${user_id}, GPS: (${latitude}, ${longitude}), IP: ${ipLocation?.city || "n/a"}`,
      );
    } else if (fraudRisk) {
      logger.warn(
        `[Location] Risk detected - User: ${user_id}, Risk: ${fraudRisk.level} (${fraudRisk.reason})`,
      );
    }

    // L8: Server-side reverse geocode for IP-based locations to get village/colony
    const isIpProvider = String(provider || "").toLowerCase().includes("ip");
    let enrichedAddress = null;
    // Always enrich with server-side reverse geocode for most specific area/village names
    if (parsedLatitude && parsedLongitude) {
      try {
        enrichedAddress = await serverReverseGeocode(parsedLatitude, parsedLongitude);
        if (enrichedAddress) {
          logger.info("[Location] Server-side reverse geocode enrichment", {
            neighbourhood: enrichedAddress.neighbourhood || "",
            suburb: enrichedAddress.suburb || "",
            village: enrichedAddress.village || "",
            road: enrichedAddress.road || "",
            poi: enrichedAddress._poi_name || "",
            hamlet: enrichedAddress.hamlet || "",
          });
        }
      } catch (err) {
        logger.warn("[Location] Server-side reverse geocode failed", { message: err.message });
      }
    }

    let indiaPostDetails = null;
    const pincodeCandidate =
      safeText(pincode) || safeText(enrichedAddress?.postcode) || "";
    const countryHint =
      safeText(country) ||
      safeText(enrichedAddress?.country) ||
      safeText(ipLocation?.country) ||
      "";
    if (
      INDIA_POST_API_ENABLED &&
      (countryHint.toLowerCase() === "india" || pincodeCandidate)
    ) {
      try {
        indiaPostDetails = await fetchIndiaPostDetails(pincodeCandidate);
        if (indiaPostDetails) {
          logger.info("[Location] India Post enrichment applied", {
            pincode: indiaPostDetails.pincode,
            village: indiaPostDetails.village || "",
            district: indiaPostDetails.district || "",
          });
        }
      } catch (err) {
        logger.warn("[Location] India Post lookup failed", {
          message: err.message,
        });
      }
    }

    const finalCity =
      safeText(city) ||
      safeText(enrichedAddress?.city) ||
      safeText(enrichedAddress?.town) ||
      safeText(area) ||
      safeText(locality) ||
      safeText(indiaPostDetails?.district) ||
      safeText(indiaPostDetails?.division) ||
      safeText(ipLocation?.city) ||
      "Unknown";
    const finalState =
      safeText(state) ||
      safeText(enrichedAddress?.state) ||
      safeText(ipLocation?.region) ||
      safeText(indiaPostDetails?.state) ||
      "";
    const finalCountry =
      safeText(country) ||
      safeText(enrichedAddress?.country) ||
      safeText(ipLocation?.country) ||
      "Unknown";
    const finalArea =
      safeText(area) ||
      safeText(enrichedAddress?.suburb) ||
      safeText(indiaPostDetails?.block) ||
      safeText(indiaPostDetails?.division) ||
      "";
    const finalLocality =
      safeText(locality) ||
      safeText(enrichedAddress?.neighbourhood) ||
      safeText(indiaPostDetails?.region) ||
      "";
    const finalDistrict =
      safeText(district) ||
      safeText(enrichedAddress?.county) ||
      safeText(enrichedAddress?.state_district) ||
      safeText(indiaPostDetails?.district) ||
      "";
    const finalPincode =
      safeText(pincode) ||
      safeText(enrichedAddress?.postcode) ||
      safeText(indiaPostDetails?.pincode) ||
      "";
    const finalProvider = safeText(provider) || "browser_gps";
    const finalStreet =
      safeText(street) ||
      safeText(enrichedAddress?.road) ||
      "";
    const finalTimezone = safeText(timezone) || safeText(ipLocation?.timezone);
    const finalVillage =
      safeText(village) ||
      safeText(enrichedAddress?.village) ||
      safeText(enrichedAddress?.hamlet) ||
      safeText(indiaPostDetails?.village) ||
      "";
    const finalColony =
      safeText(colony) ||
      safeText(enrichedAddress?.neighbourhood) ||
      safeText(enrichedAddress?.residential) ||
      safeText(enrichedAddress?.quarter) ||
      safeText(indiaPostDetails?.region) ||
      "";
    const finalSuburb =
      safeText(suburb) ||
      safeText(enrichedAddress?.suburb) ||
      "";
    // Build the most specific display name possible
    const clientDisplayName = safeText(display_name || displayName).slice(0, 500);
    const finalDisplayName = clientDisplayName || (() => {
      const parts = [];
      if (finalColony) parts.push(finalColony);
      else if (finalVillage) parts.push(finalVillage);
      else if (finalSuburb) parts.push(finalSuburb);
      if (finalArea && !parts.includes(finalArea)) parts.push(finalArea);
      if (finalCity && !parts.includes(finalCity)) parts.push(finalCity);
      if (finalDistrict && !parts.includes(finalDistrict)) parts.push(finalDistrict);
      return parts.join(", ") || "Unknown Location";
    })();
    const finalSpeed =
      toNumberOrNull(req.body?.device_speed ?? req.body?.speed) ?? 0;

    const availability = await getColumnAvailability();

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const columns = [
        "user_id",
        "latitude",
        "longitude",
        "accuracy",
        "heading",
        "permission_status",
        "city",
        "country",
        "speed",
      ];
      const params = [
        user_id || null,
        parsedLatitude,
        parsedLongitude,
        toNumberOrNull(accuracy),
        toNumberOrNull(heading),
        permission_status || null,
        finalCity,
        finalCountry,
        finalSpeed,
      ];
      const placeholders = params.map((_, index) => `$${index + 1}`);

      appendOptionalInsertColumn(
        columns,
        placeholders,
        params,
        availability,
        "state",
        finalState || null,
      );
      appendOptionalInsertColumn(
        columns,
        placeholders,
        params,
        availability,
        "area",
        finalArea || null,
      );
      appendOptionalInsertColumn(
        columns,
        placeholders,
        params,
        availability,
        "locality",
        finalLocality || null,
      );
      appendOptionalInsertColumn(
        columns,
        placeholders,
        params,
        availability,
        "district",
        finalDistrict || null,
      );
      appendOptionalInsertColumn(
        columns,
        placeholders,
        params,
        availability,
        "pincode",
        finalPincode || null,
      );
      appendOptionalInsertColumn(
        columns,
        placeholders,
        params,
        availability,
        "display_name",
        finalDisplayName || null,
      );
      appendOptionalInsertColumn(
        columns,
        placeholders,
        params,
        availability,
        "provider",
        finalProvider || null,
      );
      appendOptionalInsertColumn(
        columns,
        placeholders,
        params,
        availability,
        "street",
        finalStreet || null,
      );
      appendOptionalInsertColumn(
        columns,
        placeholders,
        params,
        availability,
        "timezone",
        finalTimezone || null,
      );
      appendOptionalInsertColumn(
        columns,
        placeholders,
        params,
        availability,
        "synced_at",
        null,
      );
      appendOptionalInsertColumn(
        columns,
        placeholders,
        params,
        availability,
        "village",
        finalVillage || null,
      );
      appendOptionalInsertColumn(
        columns,
        placeholders,
        params,
        availability,
        "colony",
        finalColony || null,
      );
      appendOptionalInsertColumn(
        columns,
        placeholders,
        params,
        availability,
        "suburb",
        finalSuburb || null,
      );

      const insertQuery = `
        INSERT INTO user_locations (${columns.join(", ")})
        VALUES (${placeholders.join(", ")})
        RETURNING id
      `;

      const insertResult = await client.query(insertQuery, params);

      if (user_id) {
        await updateUserLocationSnapshot(
          client,
          user_id,
          {
            city: finalCity,
            state: finalState,
            latitude: parsedLatitude,
            longitude: parsedLongitude,
            speed: finalSpeed,
            area: finalArea,
            locality: finalLocality,
            district: finalDistrict,
            pincode: finalPincode,
            displayName: finalDisplayName,
            village: finalVillage,
            colony: finalColony,
            suburb: finalSuburb,
          },
          availability,
        );
      }

      await client.query("COMMIT");

      return res.status(201).json({
        status: "success",
        id: insertResult.rows[0]?.id,
        location: {
          city: finalCity,
          area: finalArea,
          locality: finalLocality,
          district: finalDistrict,
          state: finalState,
          country: finalCountry,
          pincode: finalPincode,
          displayName: finalDisplayName,
          village: finalVillage,
          colony: finalColony,
          suburb: finalSuburb,
        },
        provider: finalProvider,
        verified: locationVerified,
        timezone: finalTimezone || null,
      });
    } catch (transactionError) {
      await client.query("ROLLBACK");
      throw transactionError;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error("saveLocation error:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error.message,
    });
  }
};

exports.getLocations = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?.user_id || null;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const limit = Math.min(Math.max(Number.parseInt(req.query?.limit, 10) || 50, 1), 200);
    const offset = Math.max(Number.parseInt(req.query?.offset, 10) || 0, 0);

    const availability = await getColumnAvailability();

    const columns = [
      "id",
      "user_id",
      "latitude",
      "longitude",
      "accuracy",
      "heading",
      "permission_status",
      "city",
      "country",
      "speed",
      "created_at",
    ];

    LOCATION_OPTIONAL_COLUMNS.forEach((column) => {
      if (availability.locationColumns.has(column) && !columns.includes(column)) {
        columns.push(column);
      }
    });

    const result = await runQuery(
      `
        SELECT ${columns.join(", ")}
        FROM user_locations
        WHERE user_id::text = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `,
      [String(userId), limit, offset],
    );

    return res.json(result.rows);
  } catch (error) {
    logger.error("getLocations error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getLocationById = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?.user_id || null;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { id } = req.params;
    const availability = await getColumnAvailability();

    const columns = [
      "id",
      "user_id",
      "latitude",
      "longitude",
      "accuracy",
      "heading",
      "permission_status",
      "city",
      "country",
      "speed",
      "created_at",
    ];

    LOCATION_OPTIONAL_COLUMNS.forEach((column) => {
      if (availability.locationColumns.has(column) && !columns.includes(column)) {
        columns.push(column);
      }
    });

    const result = await runQuery(
      `
        SELECT ${columns.join(", ")}
        FROM user_locations
        WHERE id = $1 AND user_id::text = $2
      `,
      [id, String(userId)],
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Location not found" });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    logger.error("getLocationById error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.deleteLocation = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?.user_id || null;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { id } = req.params;
    const result = await runQuery(
      "DELETE FROM user_locations WHERE id = $1 AND user_id::text = $2 RETURNING id",
      [id, String(userId)],
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Location not found" });
    }

    return res.json({ status: "deleted", id });
  } catch (error) {
    logger.error("deleteLocation error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getNearbyPlaces = async (req, res) => {
  try {
    const lat = toNumberOrNull(req.query?.lat);
    const lng = toNumberOrNull(req.query?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: "Invalid coordinates" });
    }

    if (!GOOGLE_PLACES_API_KEY) {
      return res.status(503).json({ error: "Google Places not configured" });
    }

    const radius = clampNumber(
      req.query?.radius ?? GOOGLE_PLACES_RADIUS_METERS,
      10,
      1000,
    );
    const language = safeText(req.query?.language || req.query?.lang);

    const response = await axios.get(GOOGLE_PLACES_BASE_URL, {
      params: {
        location: `${lat},${lng}`,
        radius,
        key: GOOGLE_PLACES_API_KEY,
        ...(language ? { language } : {}),
      },
      timeout: GOOGLE_PLACES_TIMEOUT_MS,
    });

    return res.status(200).json(response.data || {});
  } catch (error) {
    const status = error?.response?.status || 502;
    logger.warn("[Location] Google Places lookup failed", {
      status,
      message: error?.message,
    });
    return res.status(status).json({ error: "Google Places lookup failed" });
  }
};
