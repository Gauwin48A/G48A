const pool = require("../config/db");
const logger = require("../utils/logger");

const DB_QUERY_TIMEOUT_MS = Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 10000;
const COLUMN_CACHE_TTL_MS = 60 * 1000;

const runQuery = (text, values = []) =>
  pool.query({ text, values, query_timeout: DB_QUERY_TIMEOUT_MS });

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
];

const USER_OPTIONAL_COLUMNS = [
  "current_area",
  "current_locality",
  "current_pincode",
  "current_display_name",
  "current_district",
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

      await runQuery(`ALTER TABLE users ADD COLUMN IF NOT EXISTS current_area TEXT`);
      await runQuery(`ALTER TABLE users ADD COLUMN IF NOT EXISTS current_locality TEXT`);
      await runQuery(`ALTER TABLE users ADD COLUMN IF NOT EXISTS current_pincode TEXT`);
      await runQuery(`ALTER TABLE users ADD COLUMN IF NOT EXISTS current_display_name TEXT`);
      await runQuery(`ALTER TABLE users ADD COLUMN IF NOT EXISTS current_district TEXT`);

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
    const {
      user_id,
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
    } = req.body;

    const normalizedPermission = String(permission_status || "").toLowerCase();
    const hasLatitude = latitude !== undefined && latitude !== null && latitude !== "";
    const hasLongitude = longitude !== undefined && longitude !== null && longitude !== "";
    const parsedLatitude = hasLatitude ? toNumberOrNull(latitude) : null;
    const parsedLongitude = hasLongitude ? toNumberOrNull(longitude) : null;

    if (normalizedPermission.startsWith("granted") && (!hasLatitude || !hasLongitude)) {
      return res.status(400).json({ error: "Missing latitude or longitude" });
    }

    if ((hasLatitude && parsedLatitude === null) || (hasLongitude && parsedLongitude === null)) {
      return res.status(400).json({ error: "Invalid latitude or longitude" });
    }

    const ipLocation = req.ipLocation || null;
    const locationVerified = req.locationVerified || false;
    const fraudRisk = req.fraudRisk || null;

    if (locationVerified) {
      logger.info(
        `[Location] Verified location save - User: ${user_id}, GPS: (${latitude}, ${longitude}), IP: ${ipLocation?.city || "n/a"}`,
      );
    } else if (fraudRisk) {
      logger.warn(
        `[Location] Risk detected - User: ${user_id}, Risk: ${fraudRisk.level} (${fraudRisk.reason})`,
      );
    }

    const finalCity =
      safeText(city) || safeText(area) || safeText(locality) || safeText(ipLocation?.city) || "Unknown";
    const finalState = safeText(state) || safeText(ipLocation?.region) || "";
    const finalCountry = safeText(country) || safeText(ipLocation?.country) || "Unknown";
    const finalArea = safeText(area);
    const finalLocality = safeText(locality);
    const finalDistrict = safeText(district);
    const finalPincode = safeText(pincode);
    const finalDisplayName = safeText(display_name || displayName);
    const finalProvider = safeText(provider) || "browser_gps";
    const finalStreet = safeText(street);
    const finalTimezone = safeText(timezone) || safeText(ipLocation?.timezone);
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

exports.getLocations = async (_req, res) => {
  try {
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
        ORDER BY created_at DESC
      `,
    );

    return res.json(result.rows);
  } catch (error) {
    logger.error("getLocations error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getLocationById = async (req, res) => {
  try {
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
        WHERE id = $1
      `,
      [id],
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
    const { id } = req.params;
    const result = await runQuery(
      "DELETE FROM user_locations WHERE id = $1 RETURNING id",
      [id],
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
