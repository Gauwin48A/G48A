/**
 * locationGuard.js
 *
 * Comprehensive fake / mock GPS location detection system.
 * Detects mock-location APIs, perfect coordinates, teleportation,
 * altitude & accuracy anomalies, timestamp replays, heading/speed
 * inconsistencies, and common root/jailbreak indicators.
 */

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

const MAX_HISTORY = 20;
let locationHistory = [];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Haversine distance in kilometres between two {lat,lng} objects. */
function haversineKm(lat1, lng1, lat2, lng2) {
  // Guard against NaN/Infinity inputs
  if (!Number.isFinite(lat1) || !Number.isFinite(lng1) ||
      !Number.isFinite(lat2) || !Number.isFinite(lng2)) {
    return NaN;
  }
  const R = 6371; // Earth radius in km
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const result = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number.isFinite(result) ? result : NaN;
}

/** Count meaningful decimal places of a number (ignoring trailing zeros). */
function decimalPlaces(value) {
  const str = String(value);
  const dotIndex = str.indexOf('.');
  if (dotIndex === -1) return 0;
  return str.length - dotIndex - 1;
}

/** Check whether the fractional part ends with suspicious patterns. */
function hasSuspiciousTrailing(value) {
  const str = String(value);
  const dotIndex = str.indexOf('.');
  if (dotIndex === -1) return true; // integer → suspicious
  const frac = str.slice(dotIndex + 1);
  return frac.endsWith('0000') || frac.endsWith('5000');
}

// ---------------------------------------------------------------------------
// Detection routines — each returns an array of signal strings
// ---------------------------------------------------------------------------

function detectMockProperties(position) {
  const signals = [];
  const coords = position?.coords || {};

  if (coords.isMock === true) signals.push('coords.isMock is true');
  if (position?.isMocked === true) signals.push('position.isMocked is true');
  if (position?.mock === true) signals.push('position.mock is true');
  if (String(coords.provider).toLowerCase() === 'mock') {
    signals.push('Android mock provider detected');
  }
  return signals;
}

function detectPerfectCoordinates(position) {
  const signals = [];
  const { latitude, longitude } = position?.coords || {};
  if (latitude == null || longitude == null) return signals;

  if (Number.isInteger(latitude) || Number.isInteger(longitude)) {
    signals.push('Integer coordinates detected');
  }
  if (decimalPlaces(latitude) < 4 || decimalPlaces(longitude) < 4) {
    signals.push('Coordinates have fewer than 4 decimal places');
  }
  if (hasSuspiciousTrailing(latitude) || hasSuspiciousTrailing(longitude)) {
    signals.push('Suspicious trailing pattern in coordinates');
  }
  return signals;
}

function detectTeleportation(position, previousPosition) {
  const signals = [];
  if (!previousPosition) return signals;

  const { latitude: lat1, longitude: lng1 } = previousPosition.coords || {};
  const { latitude: lat2, longitude: lng2 } = position.coords || {};
  if (lat1 == null || lat2 == null) return signals;

  const distKm = haversineKm(lat1, lng1, lat2, lng2);
  if (!Number.isFinite(distKm)) return signals; // Guard NaN

  const timeDiffS = (position.timestamp - previousPosition.timestamp) / 1000;
  if (timeDiffS <= 0) {
    if (distKm > 0.01) signals.push('Position changed with zero/negative time delta');
    return signals;
  }

  const speedKmH = (distKm / timeDiffS) * 3600;

  if (speedKmH > 300) {
    signals.push(`Teleportation detected: ${speedKmH.toFixed(0)} km/h`);
  }
  if (distKm > 50 && timeDiffS < 30) {
    signals.push(
      `Position jumped ${distKm.toFixed(1)} km in ${timeDiffS.toFixed(1)}s`
    );
  }
  return signals;
}

function detectAltitudeIssues(position) {
  const signals = [];
  const alt = position?.coords?.altitude;

  // Check current reading
  if (alt === 0 || alt === null || (typeof alt === 'number' && isNaN(alt))) {
    // Only flag if we have enough history showing the same issue
    const badAltCount = locationHistory.filter((r) => {
      const a = r?.coords?.altitude;
      return a === 0 || a === null || (typeof a === 'number' && isNaN(a));
    }).length;
    if (badAltCount >= 3) {
      signals.push('Altitude repeatedly zero/null/NaN');
    }
  }

  // Altitude never changes
  if (locationHistory.length >= 3) {
    const altitudes = locationHistory
      .map((r) => r?.coords?.altitude)
      .filter((a) => a != null && !isNaN(a));
    if (altitudes.length >= 3 && altitudes.every((a) => a === altitudes[0])) {
      signals.push('Altitude never changes across readings');
    }
  }

  return signals;
}

function detectAccuracyIssues(position) {
  const signals = [];
  const acc = position?.coords?.accuracy;

  if (typeof acc === 'number' && acc < 1) {
    signals.push(`Suspiciously precise accuracy: ${acc}m`);
  }

  if (locationHistory.length >= 3) {
    const accuracies = locationHistory
      .map((r) => r?.coords?.accuracy)
      .filter((a) => a != null);

    // All exactly the same
    if (
      accuracies.length >= 3 &&
      accuracies.every((a) => a === accuracies[0])
    ) {
      signals.push('Accuracy value never fluctuates');
    }

    // Wild jumps
    if (accuracies.length >= 2) {
      for (let i = 1; i < accuracies.length; i++) {
        const ratio = accuracies[i] / accuracies[i - 1];
        if (ratio > 10 || ratio < 0.1) {
          signals.push('Accuracy jumps wildly between readings');
          break;
        }
      }
    }
  }

  return signals;
}

function detectTimestampIssues(position) {
  const signals = [];
  const ts = position?.timestamp;

  if (typeof ts === 'number' && ts > Date.now() + 60000) {
    signals.push('Timestamp is in the future');
  }

  if (locationHistory.length >= 2) {
    const lastTs = locationHistory[locationHistory.length - 1]?.timestamp;
    if (lastTs != null && ts === lastTs) {
      signals.push('Timestamp unchanged between readings (replay attack)');
    }
  }

  return signals;
}

function detectHeadingSpeedInconsistency(position, previousPosition) {
  const signals = [];
  if (!previousPosition) return signals;

  const { latitude: lat1, longitude: lng1 } = previousPosition.coords || {};
  const { latitude: lat2, longitude: lng2 } = position.coords || {};
  if (lat1 == null || lat2 == null) return signals;

  const distKm = haversineKm(lat1, lng1, lat2, lng2);
  const positionChanged = distKm > 0.01; // > 10 m

  if (positionChanged) {
    const heading = position?.coords?.heading;
    if (heading === 0 || heading === null || heading === undefined) {
      signals.push('Heading is 0/null while position changed');
    }
    const speed = position?.coords?.speed;
    if (speed === null || speed === undefined) {
      signals.push('Speed is null while position changed');
    }
  }

  return signals;
}

function detectRootJailbreakIndicators() {
  const signals = [];

  if (typeof navigator === 'undefined') return signals;

  const ua = (navigator.userAgent || '').toLowerCase();
  const appVersion = (navigator.appVersion || '').toLowerCase();
  const combined = ua + ' ' + appVersion;

  const suspiciousTokens = [
    'xposed',
    'magisk',
    'supersu',
    'fakegps',
    'fake gps',
    'mock location',
    'mocklocation',
    'lexa',
    'location spoofer',
    'gps joystick',
    'fly gps',
    'cydia',
    'substrate',
  ];

  for (const token of suspiciousTokens) {
    if (combined.includes(token)) {
      signals.push(`Root/jailbreak indicator in user agent: "${token}"`);
    }
  }

  return signals;
}

// ---------------------------------------------------------------------------
// Signal → score mapping
// ---------------------------------------------------------------------------

const SIGNAL_SCORES = {
  mock: 100,
  teleportation: 80,
  perfectCoords: 60,
  timestamp: 40,
  accuracy: 30,
  altitude: 20,
  headingSpeed: 25,
  rootJailbreak: 50,
};

function categoriseSignal(signal) {
  const s = signal.toLowerCase();
  if (s.includes('mock') || s.includes('provider')) return 'mock';
  if (s.includes('teleport') || s.includes('jumped')) return 'teleportation';
  if (
    s.includes('integer') ||
    s.includes('decimal') ||
    s.includes('trailing')
  )
    return 'perfectCoords';
  if (s.includes('timestamp') || s.includes('future') || s.includes('replay'))
    return 'timestamp';
  if (s.includes('accuracy') || s.includes('precise') || s.includes('fluctuat'))
    return 'accuracy';
  if (s.includes('altitude')) return 'altitude';
  if (s.includes('heading') || s.includes('speed')) return 'headingSpeed';
  if (s.includes('root') || s.includes('jailbreak') || s.includes('user agent'))
    return 'rootJailbreak';
  return 'accuracy'; // fallback
}

function computeScore(signals) {
  // Each category only contributes once (max score for that category)
  const seen = new Set();
  let score = 0;
  for (const signal of signals) {
    const cat = categoriseSignal(signal);
    if (!seen.has(cat)) {
      seen.add(cat);
      score += SIGNAL_SCORES[cat] || 0;
    }
  }
  return score;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Analyse a single position for spoofing signals.
 *
 * @param {GeolocationPosition} position        — current reading
 * @param {GeolocationPosition} [previousPosition] — prior reading (optional)
 * @returns {{ isSpoofed: boolean, confidence: 'low'|'medium'|'high', signals: string[], score: number }}
 */
export function analyzeLocationForSpoofing(position, previousPosition) {
  const signals = [
    ...detectMockProperties(position),
    ...detectPerfectCoordinates(position),
    ...detectTeleportation(position, previousPosition),
    ...detectAltitudeIssues(position),
    ...detectAccuracyIssues(position),
    ...detectTimestampIssues(position),
    ...detectHeadingSpeedInconsistency(position, previousPosition),
    ...detectRootJailbreakIndicators(),
  ];

  const score = computeScore(signals);

  let confidence = 'low';
  if (score >= 70) confidence = 'high';
  else if (score >= 50) confidence = 'medium';

  return {
    isSpoofed: score >= 50,
    confidence,
    signals,
    score,
  };
}

/**
 * Record a position reading into the internal history ring buffer.
 * Keeps only the last MAX_HISTORY entries.
 *
 * @param {GeolocationPosition} position
 */
export function recordLocationReading(position) {
  locationHistory.push(position);
  // O(1) removal from front instead of O(n) slice
  while (locationHistory.length > MAX_HISTORY) {
    locationHistory.shift();
  }
}

/**
 * Compute an overall trust score (0–100) based on the stored history.
 * 100 = fully trusted, 0 = almost certainly spoofed.
 *
 * @returns {number}
 */
export function getLocationTrustScore() {
  if (locationHistory.length === 0) return 100; // no data → assume trusted

  let totalPenalty = 0;

  for (let i = 0; i < locationHistory.length; i++) {
    const prev = i > 0 ? locationHistory[i - 1] : null;
    const { score } = analyzeLocationForSpoofing(locationHistory[i], prev);
    totalPenalty += score;
  }

  // Average penalty across readings, capped to 100
  const avgPenalty = Math.min(totalPenalty / locationHistory.length, 100);
  return Math.max(Math.round(100 - avgPenalty), 0);
}

/**
 * Get spoof signals summary suitable for sending to the server.
 * Returns a lightweight object with only the data the server needs.
 */
export function getSpoofSignalsForServer(position, previousPosition) {
  const result = analyzeLocationForSpoofing(position, previousPosition);
  return {
    spoofScore: result.score,
    spoofSignals: result.signals.slice(0, 5), // Limit to 5 signals to reduce payload
    isSpoofed: result.isSpoofed,
    historyLength: locationHistory.length,
  };
}

/**
 * Clear all stored location readings.
 */
export function resetLocationHistory() {
  locationHistory = [];
}
