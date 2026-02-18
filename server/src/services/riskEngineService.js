/**
 * riskEngineService.js — Alias / re-export
 *
 * The audit noted that some code references `riskEngineService.js`
 * while the actual implementation lives in `riskEngine.js`.
 * This file re-exports everything so both import paths work.
 */
module.exports = require('./riskEngine');
