/**
 * workers.fixes.test.js
 *
 * Tests for worker file fixes:
 * 1. cronPostExpiry.js imports emitNotification (not sendNotificationToUser)
 * 2. cronEscrowSettlement.js imports emitNotification (not sendNotificationToUser)
 * 3. cronEscrowSettlement.js uses agreed_price (not amount)
 * 4. cronEscrowSettlement.js does NOT reference nonexistent 'transactions' table
 * 5. Both workers use logger (not console.log)
 */

const fs = require('fs');
const path = require('path');

const WORKER_DIR = path.resolve(__dirname, '../src/workers');

describe('Worker files — source code correctness', () => {
  let postExpirySrc;
  let escrowSettlementSrc;

  beforeAll(() => {
    postExpirySrc = fs.readFileSync(
      path.join(WORKER_DIR, 'cronPostExpiry.js'),
      'utf-8'
    );
    escrowSettlementSrc = fs.readFileSync(
      path.join(WORKER_DIR, 'cronEscrowSettlement.js'),
      'utf-8'
    );
  });

  describe('cronPostExpiry.js', () => {
    it('imports emitNotification (not sendNotificationToUser)', () => {
      expect(postExpirySrc).toContain("emitNotification");
      expect(postExpirySrc).not.toContain("sendNotificationToUser");
    });

    it('imports emitNotification from notificationEmitter', () => {
      expect(postExpirySrc).toContain(
        "require('../services/notificationEmitter')"
      );
    });

    it('uses logger instead of console.log', () => {
      expect(postExpirySrc).toContain("require('../utils/logger')");
      expect(postExpirySrc).not.toMatch(/console\.(log|warn|error)\(/);
    });

    it('calls emitNotification with user_id as first argument', () => {
      // The function should call emitNotification(post.user_id, ...)
      expect(postExpirySrc).toMatch(
        /emitNotification\s*\(\s*post\.user_id/
      );
    });

    it('notification payload includes title, message, and data', () => {
      expect(postExpirySrc).toContain("title:");
      expect(postExpirySrc).toContain("message:");
      expect(postExpirySrc).toContain("data:");
    });
  });

  describe('cronEscrowSettlement.js', () => {
    it('imports emitNotification (not sendNotificationToUser)', () => {
      expect(escrowSettlementSrc).toContain("emitNotification");
      expect(escrowSettlementSrc).not.toContain("sendNotificationToUser");
    });

    it('imports emitNotification from notificationEmitter', () => {
      expect(escrowSettlementSrc).toContain(
        "require('../services/notificationEmitter')"
      );
    });

    it('uses agreed_price (not amount) for sale price', () => {
      expect(escrowSettlementSrc).toContain("agreed_price");
      expect(escrowSettlementSrc).not.toMatch(/\bs\.amount\b/);
    });

    it('does NOT reference nonexistent transactions table', () => {
      // Should not INSERT INTO transactions
      expect(escrowSettlementSrc).not.toMatch(
        /INSERT\s+INTO\s+transactions\b/i
      );
    });

    it('queries sales table with correct columns', () => {
      expect(escrowSettlementSrc).toContain("sale_id");
      expect(escrowSettlementSrc).toContain("seller_id");
      expect(escrowSettlementSrc).toContain("buyer_id");
      expect(escrowSettlementSrc).toContain("agreed_price");
      expect(escrowSettlementSrc).toContain("payment_mode");
    });

    it('uses logger instead of console.log', () => {
      expect(escrowSettlementSrc).toContain("require('../utils/logger')");
      expect(escrowSettlementSrc).not.toMatch(/console\.(log|warn|error)\(/);
    });

    it('sends notification to seller (not buyer)', () => {
      expect(escrowSettlementSrc).toMatch(
        /emitNotification\s*\(\s*sale\.seller_id/
      );
    });
  });

  describe('Both workers — structural correctness', () => {
    it('both use pool.connect() for transaction management', () => {
      expect(postExpirySrc).toContain("pool.connect()");
      expect(escrowSettlementSrc).toContain("pool.connect()");
    });

    it('both have BEGIN/COMMIT/ROLLBACK transaction handling', () => {
      expect(postExpirySrc).toContain("BEGIN");
      expect(postExpirySrc).toContain("COMMIT");
      expect(postExpirySrc).toContain("ROLLBACK");
      expect(escrowSettlementSrc).toContain("BEGIN");
      expect(escrowSettlementSrc).toContain("COMMIT");
      expect(escrowSettlementSrc).toContain("ROLLBACK");
    });

    it('both release client in finally block', () => {
      expect(postExpirySrc).toContain("client.release()");
      expect(escrowSettlementSrc).toContain("client.release()");
    });

    it('both export their main function', () => {
      expect(postExpirySrc).toContain("module.exports");
      expect(escrowSettlementSrc).toContain("module.exports");
    });

    it('both have LIMIT on their main query to prevent runaway processing', () => {
      // Both should have LIMIT 100 or similar
      expect(postExpirySrc).toMatch(/LIMIT\s+\d+/i);
      expect(escrowSettlementSrc).toMatch(/LIMIT\s+\d+/i);
    });
  });
});

describe('Worker files — runtime import verification', () => {
  it('cronPostExpiry can be parsed without syntax errors', () => {
    const src = fs.readFileSync(
      path.join(WORKER_DIR, 'cronPostExpiry.js'),
      'utf-8'
    );
    // Check it's valid JavaScript by parsing
    expect(() => new Function(src)).not.toThrow();
  });

  it('cronEscrowSettlement can be parsed without syntax errors', () => {
    const src = fs.readFileSync(
      path.join(WORKER_DIR, 'cronEscrowSettlement.js'),
      'utf-8'
    );
    expect(() => new Function(src)).not.toThrow();
  });
});
