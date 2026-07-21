/**
 * Test script for Push Notification dispatch end-to-end
 * Usage: node scripts/test_push_dispatch.js <receiver_id> [title] [message] [type]
 */
require("dotenv").config();
const { emitNotification } = require("../src/services/notificationEmitter");
const pool = require("../src/config/db");

async function main() {
  const args = process.argv.slice(2);
  const receiverId = args[0] || 1;
  const title = args[1] || "Test Notification";
  const message = args[2] || "This is a test push notification from BullMQ + FCM";
  const type = args[3] || "system";

  console.log(`Sending test notification to User #${receiverId}...`);

  const success = await emitNotification(receiverId, {
    title,
    message,
    type,
    deep_link: "mhub://notifications",
    data: { test: "true", timestamp: Date.now() }
  });

  if (success) {
    console.log("✅ Notification successfully persisted in DB & enqueued to BullMQ worker!");
  } else {
    console.error("❌ Failed to send notification.");
  }

  // Allow worker 2 seconds to output job completion logs before exiting
  setTimeout(async () => {
    await pool.end();
    process.exit(0);
  }, 2000);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
