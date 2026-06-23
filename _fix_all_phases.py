#!/usr/bin/env python3
"""Apply all remaining changes for all 5 phases."""

import re
import os

os.chdir(r'C:\Users\laksh\GITHUB\1hub_rep2\G48A')

# ── Phase 1: ProfileScreen.kt — Add DailyCodeMiniCard ──
profile_path = 'android-native/app/src/main/java/com/mhub/app/ui/profile/ProfileScreen.kt'
with open(profile_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add loadDailyCode() call after loadTrustScore() in load()
content = content.replace(
    '            loadStats()\n            loadReferralCode()\n            loadTrustScore()\n        }\n    }\n\n    fun refresh()',
    '            loadStats()\n            loadReferralCode()\n            loadTrustScore()\n            loadDailyCode()\n        }\n    }\n\n    fun refresh()'
)

# Add loadDailyCode() call in refresh()
content = content.replace(
    '            loadStats()\n            loadReferralCode()\n            loadTrustScore()\n        }\n    }\n\n    private suspend fun loadStats',
    '            loadStats()\n            loadReferralCode()\n            loadTrustScore()\n            loadDailyCode()\n        }\n    }\n\n    private suspend fun loadStats'
)

# Add DailyCodeMiniCard invocation between UserIdSection and ReferralCodeBox
# Find "UserIdSection(userId = user?.stableId" and add after it
content = content.replace(
    'UserIdSection(userId = user?.stableId ?: user?.userId ?: "")\n\n                        // ─── Referral Code Box',
    'UserIdSection(userId = user?.stableId ?: user?.userId ?: "")\n\n                        // ─── Daily Security Code ───────────────────────────────────\n                        state.dailyCode?.let { code ->\n                            DailyCodeMiniCard(code = code, expiresAt = state.dailyCodeExpiresAt)\n                        }\n\n                        // ─── Referral Code Box'
)

# Add DailyCodeMiniCard composable function before ReferralCodeBox
content = content.replace(
    'private fun ReferralCodeBox(code: String)',
    '@Composable\nprivate fun DailyCodeMiniCard(code: String, expiresAt: String?) {\n    val darkTheme = isSystemInDarkTheme()\n    val clipboardManager = LocalClipboardManager.current\n    Card(\n        shape = RoundedCornerShape(20.dp),\n        colors = CardDefaults.cardColors(\n            containerColor = if (darkTheme) Color(0xFF0F172A).copy(alpha = 0.88f) else Color.White.copy(alpha = 0.92f),\n        ),\n        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),\n        modifier = Modifier\n            .fillMaxWidth()\n            .padding(horizontal = 16.dp)\n            .padding(top = 8.dp, bottom = 4.dp)\n            .border(\n                1.dp,\n                if (darkTheme) Color(0xFF94A3B8).copy(alpha = 0.22f) else Color(0xFFE2E8F0).copy(alpha = 0.7f),\n                RoundedCornerShape(20.dp),\n            ),\n    ) {\n        Row(\n            Modifier.fillMaxWidth().padding(14.dp),\n            verticalAlignment = Alignment.CenterVertically,\n            horizontalArrangement = Arrangement.spacedBy(12.dp),\n        ) {\n            Box(\n                modifier = Modifier\n                    .size(40.dp)\n                    .clip(RoundedCornerShape(12.dp))\n                    .background(if (darkTheme) Color(0xFF1D4ED8) else Color(0xFF2563EB)),\n                contentAlignment = Alignment.Center,\n            ) {\n                Text("\U0001f510", fontSize = 20.sp)\n            }\n            Column(Modifier.weight(1f)) {\n                Text(\n                    "Today\'s Security Code",\n                    style = MaterialTheme.typography.labelSmall,\n                    fontWeight = FontWeight.Bold,\n                    color = MaterialTheme.colorScheme.onSurfaceVariant,\n                    letterSpacing = 1.2.sp,\n                )\n                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {\n                    Text(\n                        text = code,\n                        style = MaterialTheme.typography.titleMedium,\n                        fontFamily = FontFamily.Monospace,\n                        fontWeight = FontWeight.Bold,\n                        color = if (darkTheme) Color(0xFF60A5FA) else Color(0xFF2563EB),\n                        letterSpacing = 2.sp,\n                    )\n                    IconButton(\n                        onClick = { clipboardManager.setText(AnnotatedString(code)) },\n                        modifier = Modifier.size(24.dp),\n                    ) {\n                        Icon(\n                            Icons.Default.ContentCopy,\n                            contentDescription = null,\n                            tint = MaterialTheme.colorScheme.onSurfaceVariant,\n                            modifier = Modifier.size(16.dp),\n                        )\n                    }\n                }\n                expiresAt?.let {\n                    Text(\n                        "Expires: ${it.take(10)}",\n                        style = MaterialTheme.typography.labelSmall,\n                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),\n                        fontSize = 10.sp,\n                    )\n                }\n            }\n        }\n    }\n}\n\nprivate fun ReferralCodeBox(code: String)'
)

with open(profile_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Phase 1: ProfileScreen DailyCodeMiniCard added")

# ── Phase 2: Server repost-bump endpoint ──
# Add to postController.js
controller_path = 'server/src/controllers/postController.js'
with open(controller_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add repostBump handler before the last module.exports
repost_bump_handler = '''
/**
 * POST /api/posts/:postId/repost-bump
 * Reactivate a recently undone post with a free 10-day visibility boost.
 * Only the post owner can repost-bump their own post.
 * The post must have been in 'undone' status within the last 30 days.
 */
exports.repostBump = async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const postId = parseOptionalStringScalar(req.params.postId);
  if (!userId) return res.status(401).json({ error: "Authentication required" });
  if (!postId) return res.status(400).json({ error: "Post ID required" });
  try {
    const ownerCheck = await runQuery(
      "SELECT post_id, user_id, status, updated_at FROM posts WHERE post_id = $1",
      [postId]
    );
    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: "Post not found" });
    }
    const post = ownerCheck.rows[0];
    if (String(post.user_id) !== String(userId)) {
      return res.status(403).json({ error: "You can only repost your own listings" });
    }
    if (post.status === "active") {
      return res.status(400).json({ error: "Post is already active" });
    }
    // Check the post was undone within the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const updatedAt = post.updated_at ? new Date(post.updated_at) : null;
    if (!updatedAt || updatedAt < thirtyDaysAgo) {
      return res.status(400).json({ error: "Free repost window has expired (30 days from sale undo)" });
    }
    // Set visibility boost: reactivate + add 10-day boost
    const boostExpiresAt = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    await runQuery(
      `UPDATE posts
       SET status = 'active',
           sold_at = NULL,
           visibility_boost_expires_at = $2,
           updated_at = NOW(),
           created_at = NOW()
       WHERE post_id = $1`,
      [postId, boostExpiresAt]
    );
    logInfo(`[RepostBump] Post ${postId} repost-bumped by user ${userId}, boost expires ${boostExpiresAt.toISOString()}`);
    return res.json({
      success: true,
      message: "Listing reposted with free 10-day visibility boost!",
      post_id: postId,
      status: "active",
      boost_expires_at: boostExpiresAt.toISOString(),
    });
  } catch (err) {
    logError("[RepostBump] Error:", err.message);
    return res.status(500).json({ error: "Failed to repost listing" });
  }
};
'''

# Insert before module.exports
content = content.replace(
    'module.exports = {',
    repost_bump_handler + '\nmodule.exports = {'
)

with open(controller_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Phase 2: Server postController.js — repostBump handler added")

# Add route to posts.js
posts_route_path = 'server/src/routes/posts.js'
with open(posts_route_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add repost-bump route after the reactivate route
content = content.replace(
    "router.post(\"/:postId/reactivate\", protect, postController.reactivatePost);",
    "router.post(\"/:postId/reactivate\", protect, postController.reactivatePost);\n\n/**\n * POST /:postId/repost-bump\n * Reactivate a recently undone post with a free 10-day visibility boost.\n */\nrouter.post(\"/:postId/repost-bump\", protect, postController.repostBump);"
)

with open(posts_route_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Phase 2: Server posts.js — repost-bump route added")

# ── Phase 3: Seller badges on AllPostCard (ExploreScreen.kt) ──
explore_path = 'android-native/app/src/main/java/com/mhub/app/ui/explore/ExploreScreen.kt'
with open(explore_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add seller badge in AllPostCard after the author row avatar
# Find the seller name in the author row and add a trust badge next to it
badge_code = '''                    )
                                }
                                // Seller trust badge
                                if (post.sellerVerified == true || post.tier?.contains("premium", ignoreCase = true) == true) {
                                    val badgeColor = if (post.sellerVerified == true) Color(0xFF22C55E) else Color(0xFF8B5CF6)
                                    val badgeLabel = if (post.sellerVerified == true) "Verified" else "Premium"
                                    val badgeIcon = if (post.sellerVerified == true) "\u2705" else "\U0001f48e"
                                    Surface(
                                        shape = RoundedCornerShape(6.dp),
                                        color = badgeColor.copy(alpha = 0.12f),
                                        border = BorderStroke(0.5.dp, badgeColor.copy(alpha = 0.4f)),
                                        modifier = Modifier.padding(start = 4.dp),
                                    ) {
                                        Row(
                                            Modifier.padding(horizontal = 4.dp, vertical = 1.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(2.dp),
                                        ) {
                                            Text(badgeIcon, fontSize = 9.sp)
                                            Text(badgeLabel, fontSize = 8.sp, color = badgeColor, fontWeight = FontWeight.SemiBold)
                                        }
                                    }
                                }
                            }
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                Text(
                                    text = post.location ?: "MHub network",'''

# Find the existing code that comes after the author row
old_code = """                                }
                            }
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                Text(
                                    text = post.location ?: "MHub network\","""

content = content.replace(old_code, badge_code)

with open(explore_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Phase 3: Seller badges added to AllPostCard")

# ── Phase 5: Fraud Prevention warning in SaleDoneScreen ──
saledone_path = 'android-native/app/src/main/java/com/mhub/app/ui/commerce/SaleDoneScreen.kt'
with open(saledone_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add risk warning banner at the top of the seller initiation form
# Find the seller initiation section and add a risk warning
risk_warning = '''                        // ─── Fraud Prevention Warning ────────────────────────────────────────
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = Color(0xFFFFF7ED),
                            border = BorderStroke(1.dp, Color(0xFFFBBF24)),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Row(
                                Modifier.padding(12.dp),
                                verticalAlignment = Alignment.Top,
                                horizontalArrangement = Arrangement.spacedBy(10.dp),
                            ) {
                                Text("\u26a0\ufe0f", fontSize = 18.sp)
                                Column {
                                    Text("Safety Check", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFF92400E))
                                    Text(
                                        "Verify the buyer\\'s User ID matches their profile. " +
                                        "Share the daily security code (found in your Profile) " +
                                        "with the buyer before completing the transaction. " +
                                        "Never share your OTP or password with anyone.",
                                        fontSize = 11.sp,
                                        color = Color(0xFF92400E).copy(alpha = 0.8f),
                                        lineHeight = 15.sp,
                                    )
                                }
                            }
                        }
                        // ─── End Fraud Prevention Warning ────────────────────────
                        MhubTextField(stringResource(R.string.commerce_field_post_id), state.postId, viewModel::setPostId)'''

# Find the seller initiation section
old_init_form = """                        MhubTextField(stringResource(R.string.commerce_field_post_id), state.postId, viewModel::setPostId)
                                MhubTextField(stringResource(R.string.commerce_field_buyer_id), state.buyerId, viewModel::setBuyerId)
                                MhubTextField(stringResource(R.string.commerce_field_sale_amount), state.saleAmount, viewModel::setSaleAmount)"""

content = content.replace(old_init_form, risk_warning + "\n                                " + old_init_form.replace("                        ", "").replace("\n", "\n                                ", 1))

with open(saledone_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Phase 5: Fraud Prevention warning added to SaleDoneScreen")

print("\n🎉 All phases applied successfully!")
