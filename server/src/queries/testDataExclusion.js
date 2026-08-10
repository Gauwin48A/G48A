/**
 * SQL fragment that excludes posts authored by known test / e2e users.
 *
 * These identities are created by seed-e2e-data.js, _debug_e2e.js,
 * create-test-credentials.js, _make_user.js and ad-hoc emulator trials.
 * The exclusion is identity-based (username / email), because the seeded
 * posts often carry realistic titles (e.g. "iPhone 15 Pro Max 256GB") that
 * a title-based filter would never catch.
 *
 * Expects the posts table to be aliased as `p`.
 */
const TEST_USER_EXCLUSION = `
  AND NOT EXISTS (
    SELECT 1 FROM users u2
    WHERE u2.user_id::text = p.user_id::text
      AND (
        u2.username ILIKE 'e2e%'
        OR u2.username ILIKE 'test%'
        OR u2.username ILIKE 'trial\\_%'
        OR u2.username ILIKE 'verify\\_%'
        OR u2.username ILIKE 'escrow%'
        OR u2.username ILIKE 'probe%'
        OR u2.username ILIKE 'demo'
        OR u2.username ILIKE 'demo\\_%'
        OR u2.username ILIKE 'qa\\_%'
        OR u2.email ILIKE '%@test.local'
        OR u2.email ILIKE '%@e2e.com'
        OR u2.email ILIKE '%@%.test'
        OR u2.email ILIKE '%@%.local'
      )
  )`;

/** Same predicate without the leading AND — for WHERE-condition arrays. */
const TEST_USER_CONDITION = `NOT EXISTS (
  SELECT 1 FROM users u2
  WHERE u2.user_id::text = p.user_id::text
    AND (
      u2.username ILIKE 'e2e%'
      OR u2.username ILIKE 'test%'
      OR u2.username ILIKE 'trial\\_%'
      OR u2.username ILIKE 'verify\\_%'
      OR u2.username ILIKE 'escrow%'
      OR u2.username ILIKE 'probe%'
      OR u2.username ILIKE 'demo%'
      OR u2.username ILIKE 'qa\\_%'
      OR u2.email ILIKE '%@test.local'
      OR u2.email ILIKE '%@e2e.com'
      OR u2.email ILIKE '%@%.test'
      OR u2.email ILIKE '%@%.local'
    )
)`;

/** Bare SELECT of test user ids — for JS-side filters (no posts alias). */
const TEST_USER_ID_SELECT = `
  SELECT user_id::text AS id FROM users
  WHERE username ILIKE 'e2e%'
     OR username ILIKE 'test%'
     OR username ILIKE 'trial\\_%'
     OR username ILIKE 'verify\\_%'
     OR username ILIKE 'escrow%'
     OR username ILIKE 'probe%'
     OR username ILIKE 'demo'
     OR username ILIKE 'demo\\_%'
     OR username ILIKE 'qa\\_%'
     OR email ILIKE '%@test.local'
     OR email ILIKE '%@e2e.com'
     OR email ILIKE '%@%.test'
     OR email ILIKE '%@%.local'
`;

module.exports = { TEST_USER_EXCLUSION, TEST_USER_CONDITION, TEST_USER_ID_SELECT };
