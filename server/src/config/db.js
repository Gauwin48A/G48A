/**
 * Unified Database Module
 * Re-exports dbPool (Primary + Read Replica Manager) for application-wide consistency.
 */
const dbPool = require("./dbPool");

module.exports = dbPool;
