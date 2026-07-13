const fs = require('fs');
const path = 'app/src/main/java/com/mhub/app/ui/home/PostDetailScreen.kt';
let content = fs.readFileSync(path, 'utf8');

let changes = 0;

// ============================================================
// 1. REMOVE the "Why trustworthy" panel (sec_why_trust)
// ============================================================
const whyTrustPattern = '// "Why trustworthy" panel (non-owner, 3-col) \u2014 web parity';
const whyTrustBlock = content.indexOf(whyTrustPattern);
if (whyTrustBlock >= 0) {
    const secTrustStart = content.indexOf('item(key = "sec_trust")', whyTrustBlock);
    if (secTrustStart > whyTrustBlock) {
        content = content.substring(0, whyTrustBlock) + content.substring(secTrustStart);
        changes++;
        console.log('1. Removed "Why trustworthy" panel');
    }
}

// ============================================================
// 2. REMOVE the "Delivery & Returns" card
// ============================================================
const deliveryPattern = '// Delivery Estimate Card';
const deliveryBlock = content.indexOf(deliveryPattern);
if (deliveryBlock >= 0) {
    const activityLogIdx = content.indexOf('// Activity Log', deliveryBlock);
    if (activityLogIdx > deliveryBlock) {
        content = content.substring(0, deliveryBlock) + content.substring(activityLogIdx);
        changes++;
        console.log('2. Removed "Delivery & Returns" card');
    }
}

// ============================================================
// 3. MAKE Safety Tips collapsible with highlight
// ============================================================
const safetyPattern = '// Safety Tips';
const safetyBlock = content.indexOf(safetyPattern);
if (safetyBlock >= 0) {
    const safetyGlanceStart = content.indexOf('// Safety at a Glance', safetyBlock);
    if (safetyGlanceStart > safetyBlock) {
        // Find the closing brace of the Safety Tips card (the last one before Safety at a Glance)
        const cardEnd = content.lastIndexOf('\n                            }\n', safetyGlanceStart - 1);
        if (cardEnd > safetyBlock) {
            const collapsibleCode = 
`// Safety Tips (collapsible with highlight)
                                Card(
                                    shape = RoundedCornerShape(12.dp),
                                    colors = CardDefaults.cardColors(containerColor = if (isDark) Color(0xFF1C1408) else Color(0xFFFEF3C7)),
                                    modifier = Modifier.fillMaxWidth(),
                                ) {
                                    var safetyExpanded by remember { mutableStateOf(false) }
                                    Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth().clickable { safetyExpanded = !safetyExpanded },
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically,
                                        ) {
                                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                                Text("\u26a0\ufe0f Safety Tips", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = if (isDark) Color(0xFFFCD34D) else Color(0xFF92400E))
                                                Surface(shape = RoundedCornerShape(10.dp), color = Color(0xFFF59E0B).copy(alpha = 0.2f)) {
                                                    Text("READ", fontSize = 8.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFFF59E0B), modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp))
                                                }
                                            }
                                            Text(if (safetyExpanded) "\u25b2 Less" else "\u25bc More", fontSize = 11.sp, color = if (isDark) Color(0xFFFCD34D) else Color(0xFF92400E), fontWeight = FontWeight.SemiBold)
                                        }
                                        if (safetyExpanded) {
                                            Text("\u2022 Meet in a public place for exchanges", fontSize = 12.sp, color = if (isDark) Color(0xFFFDE68A) else Color(0xFF78350F))
                                            Text("\u2022 Inspect the item thoroughly before paying", fontSize = 12.sp, color = if (isDark) Color(0xFFFDE68A) else Color(0xFF78350F))
                                            Text("\u2022 Don't share personal financial information", fontSize = 12.sp, color = if (isDark) Color(0xFFFDE68A) else Color(0xFF78350F))
                                            Text("\u2022 Use MHub secure payment when possible", fontSize = 12.sp, color = if (isDark) Color(0xFFFDE68A) else Color(0xFF78350F))
                                        }
                                    }
                                }`;
            
            content = content.substring(0, safetyBlock) + collapsibleCode + content.substring(cardEnd + 1);
            changes++;
            console.log('3. Made Safety Tips collapsible with highlight');
        }
    }
}

// ============================================================
// 4. REMOVE seller stats grid (completedSales, responseRate, memberSince)
// ============================================================
const statsPattern = '// Seller stats grid';
const statsBlock = content.indexOf(statsPattern);
if (statsBlock >= 0) {
    const farmPageIdx = content.indexOf("// Visit Seller's Farm Page", statsBlock);
    if (farmPageIdx > statsBlock) {
        content = content.substring(0, statsBlock) + content.substring(farmPageIdx);
        changes++;
        console.log('4. Removed seller stats grid');
    }
}

// ============================================================
// 5. ENHANCE recommended/boosted posts at bottom
// ============================================================
const sponsoredIdx = content.indexOf('// Sponsored / Premium Recommendations');
if (sponsoredIdx >= 0) {
    const secSellerIdx = content.indexOf('item(key = "sec_seller")', sponsoredIdx);
    if (secSellerIdx > sponsoredIdx) {
        const blockEnd = content.lastIndexOf('\n                            }\n', secSellerIdx - 2);
        if (blockEnd > sponsoredIdx) {
            const boostedSection = 
`// Boosted / Featured / Premium Recommendations
                                val premiumPosts = state.similarPosts.filter { p ->
                                    p.isPremium == true || p.boostLevel != null || p.promoLabel != null || 
                                    (p.tierPriority ?: 0) >= 2 || p.tier?.lowercase() in listOf("premium", "silver", "gold")
                                }
                                val boostedPosts = if (premiumPosts.isNotEmpty()) premiumPosts else state.similarPosts.takeLast(3)
                                if (boostedPosts.isNotEmpty()) {
                                    Spacer(Modifier.height(8.dp))
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text("\u26a1 Featured Posts", fontWeight = FontWeight.Bold, fontSize = 16.sp, modifier = Modifier.weight(1f))
                                        Surface(shape = RoundedCornerShape(4.dp), color = Color(0xFFF59E0B).copy(alpha = 0.2f)) {
                                            Text("BOOSTED", fontSize = 9.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFFF59E0B),
                                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                                        }
                                    }
                                    LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                        items(boostedPosts, key = { "feat_" + it.stableId }) { featPost ->
                                            Card(
                                                onClick = { onOpenPost(featPost.stableId) },
                                                shape = RoundedCornerShape(12.dp),
                                                modifier = Modifier.width(150.dp),
                                            ) {
                                                Column {
                                                    Box {
                                                        featPost.primaryImage?.let { img ->
                                                            AsyncImage(model = img, contentDescription = null, contentScale = ContentScale.Crop,
                                                                modifier = Modifier.fillMaxWidth().height(100.dp))
                                                        }
                                                        // Premium/Boosted badge overlay
                                                        Surface(
                                                            shape = RoundedCornerShape(bottomEnd = 8.dp),
                                                            color = when {
                                                                featPost.isPremium == true || featPost.tier?.lowercase() == "premium" -> Color(0xFF7C3AED).copy(alpha = 0.9f)
                                                                featPost.boostLevel != null -> Color(0xFF2563EB).copy(alpha = 0.9f)
                                                                else -> Color(0xFFF59E0B).copy(alpha = 0.9f)
                                                            },
                                                            modifier = Modifier.align(Alignment.TopStart),
                                                        ) {
                                                            val badgeText = when {
                                                                featPost.isPremium == true || featPost.tier?.lowercase() == "premium" -> "\ud83d\udc51"
                                                                featPost.boostLevel != null -> "\u26a1"
                                                                else -> "\u2b50"
                                                            }
                                                            Text(badgeText, fontSize = 12.sp, modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp))
                                                        }
                                                    }
                                                    Column(Modifier.padding(8.dp)) {
                                                        Text(featPost.displayTitle, maxLines = 1, overflow = TextOverflow.Ellipsis, fontSize = 12.sp, fontWeight = FontWeight.Medium)
                                                        featPost.price?.let { p ->
                                                            Text("\u20b9" + "%,.0f".format(p), fontSize = 12.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }`;

            content = content.substring(0, sponsoredIdx) + boostedSection + content.substring(blockEnd + 1);
            changes++;
            console.log('5. Enhanced boosted/featured posts section');
        }
    }
}

// ============================================================
// WRITE BACK
// ============================================================
fs.writeFileSync(path, content, 'utf8');
console.log('\nDone. ' + changes + ' changes made to PostDetailScreen.kt');
