const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/src/main/java/com/mhub/app/ui/home/PostDetailScreen.kt');
let content = fs.readFileSync(filePath, 'utf8');

function count(s, char) {
    let c = 0;
    for (let i = 0; i < s.length; i++) if (s[i] === char) c++;
    return c;
}

function braces(s) { return count(s, '{') - count(s, '}'); }

// ─── 1. Safety Tips Enhancement ───────────────────────────────────────
// Find the safety tips section
const safetyTipsComment = '// Safety Tips';
const safetyTipsIdx = content.indexOf(safetyTipsComment);
if (safetyTipsIdx === -1) {
    console.log('ERROR: Safety Tips comment not found');
    process.exit(1);
}

// Find the end of the safety tips card - look for the start of "// Safety at a Glance"
const glanceComment = '// Safety at a Glance';
const glanceIdx = content.indexOf(glanceComment, safetyTipsIdx);
if (glanceIdx === -1) {
    console.log('ERROR: Safety at a Glance comment not found');
    process.exit(1);
}

// Find the line start of the safety tips section (go back to find Card()
const beforeSafety = content.lastIndexOf('Card(', safetyTipsIdx);
if (beforeSafety === -1) {
    console.log('ERROR: Card( before safety tips not found');
    process.exit(1);
}

// Now get the old safety tips block: from the start of the Card to just before Safety at a Glance
const safetyBlockOld = content.substring(beforeSafety, glanceIdx);

// Build the enhanced safety tips block
const safetyBlockNew = `                // Safety Tips (collapsible with border glow & READ badge)
                                var safetyExpanded by remember { mutableStateOf(false) }
                                Card(
                                    shape = RoundedCornerShape(14.dp),
                                    colors = CardDefaults.cardColors(containerColor = if (isDark) Color(0xFF1C1408) else Color(0xFFFEF3C7)),
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable { safetyExpanded = !safetyExpanded }
                                        .then(
                                            Modifier.border(
                                                1.5.dp,
                                                if (safetyExpanded) Brush.horizontalGradient(listOf(Color(0xFFF97316), Color(0xFFEF4444)))
                                                else Color(0xFFFDE68A).copy(alpha = 0.5f),
                                                RoundedCornerShape(14.dp),
                                            )
                                        ),
                                ) {
                                    Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                            Text("\u26A0\uFE0F", fontSize = 18.sp)
                                            Text("Safety Tips", fontWeight = FontWeight.Bold, fontSize = 14.sp,
                                                color = if (isDark) Color(0xFFFCD34D) else Color(0xFF92400E),
                                                modifier = Modifier.weight(1f))
                                            Surface(shape = RoundedCornerShape(6.dp), color = Color(0xFFEF4444)) {
                                                Text("READ", fontSize = 9.sp, fontWeight = FontWeight.ExtraBold, color = Color.White,
                                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                                            }
                                            Text(if (safetyExpanded) "\u25B2" else "\u25BC", fontSize = 12.sp,
                                                color = if (isDark) Color(0xFFFDE68A) else Color(0xFF92400E))
                                        }
                                        if (safetyExpanded) {
                                            HorizontalDivider(color = if (isDark) Color(0xFFFDE68A).copy(alpha = 0.2f) else Color(0xFFD97706).copy(alpha = 0.2f))
                                            val safetyEmojiTips = listOf(
                                                "\uD83D\uDC6B" to "Meet in a public place for exchanges",
                                                "\uD83D\uDD0D" to "Inspect the item thoroughly before paying",
                                                "\uD83D\uDCB3" to "Use secure payment methods only",
                                                "\uD83D\uDD12" to "Don't share personal financial info",
                                                "\uD83D\uDCCD" to "Verify the listing ID with the seller",
                                            )
                                            safetyEmojiTips.forEach { (emoji, tip) ->
                                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                                    Text(emoji, fontSize = 14.sp)
                                                    Text(tip, fontSize = 12.sp, color = if (isDark) Color(0xFFFDE68A) else Color(0xFF78350F))
                                                }
                                            }
                                            Spacer(Modifier.height(4.dp))
                                            Surface(
                                                shape = RoundedCornerShape(8.dp),
                                                color = if (isDark) Color(0xFFEF4444).copy(alpha = 0.15f) else Color(0xFFFEE2E2),
                                                modifier = Modifier.fillMaxWidth(),
                                            ) {
                                                Row(Modifier.padding(8.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                                    Text("\uD83D\uDEE1\uFE0F", fontSize = 14.sp)
                                                    Text("Stay safe! MHub will never ask for your password or OTP.",
                                                        fontSize = 11.sp, color = if (isDark) Color(0xFFFCA5A5) else Color(0xFF991B1B))
                                                }
                                            }
                                        }
                                    }
                                }
                                `;

// Verify brace balance
const oldBraces = braces(safetyBlockOld);
const newBraces = braces(safetyBlockNew);
console.log(`Safety Tips: old=${oldBraces}, new=${newBraces}, ` +
    (oldBraces === newBraces ? 'BALANCED' : `MISMATCH (diff=${newBraces - oldBraces})`));

if (oldBraces !== newBraces) {
    console.log('ERROR: Brace mismatch in safety tips');
    process.exit(1);
}

content = content.substring(0, beforeSafety) + safetyBlockNew + content.substring(glanceIdx);

// ─── 2. Recommended / Sponsored Posts Enhancement ─────────────────────
// Find the "Sponsored / Premium Recommendations" section
const sponsoredComment = '// Sponsored / Premium Recommendations';
const sponsoredIdx = content.indexOf(sponsoredComment);
if (sponsoredIdx === -1) {
    console.log('ERROR: Sponsored comment not found');
    process.exit(1);
}

// Find where the sponsored section ends - look for the next `item(key = "sec_seller")`
const sellerItem = 'item(key = "sec_seller")';
const sellerIdx = content.indexOf(sellerItem, sponsoredIdx);
if (sellerIdx === -1) {
    console.log('ERROR: Seller section not found');
    process.exit(1);
}

const sponsoredBlockOld = content.substring(sponsoredIdx, sellerIdx);

// Build enhanced sponsored section
const sponsoredBlockNew = `                                // ⭐ Recommended For You — Boosted & Premium Posts
                                state.similarPosts.takeIf { it.isNotEmpty() }?.let { posts ->
                                    Spacer(Modifier.height(12.dp))
                                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        Text("\u2B50", fontSize = 16.sp)
                                        Text("Recommended For You", fontWeight = FontWeight.ExtraBold, fontSize = 17.sp,
                                            color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.weight(1f))
                                        Surface(shape = RoundedCornerShape(6.dp), color = Color(0xFF7C3AED).copy(alpha = 0.12f),
                                            border = BorderStroke(1.dp, Color(0xFF7C3AED).copy(alpha = 0.3f))) {
                                            Text("SPONSORED", fontSize = 9.sp, fontWeight = FontWeight.ExtraBold,
                                                color = Color(0xFF7C3AED),
                                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
                                        }
                                    }
                                    Text("Featured listings from top sellers", fontSize = 11.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        modifier = Modifier.padding(start = 2.dp))
                                    Spacer(Modifier.height(8.dp))
                                    LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                        items(posts.takeLast(5).shuffled().take(3), key = { "rec_\${it.stableId}" }) { recPost ->
                                            val isPremium = recPost.isPremium == true || (recPost.tierPriority ?: 0) >= 3
                                            val isBoosted = recPost.boostLevel != null || recPost.promoLabel != null
                                            Card(
                                                onClick = { onOpenPost(recPost.stableId) },
                                                shape = RoundedCornerShape(16.dp),
                                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                                                elevation = CardDefaults.cardElevation(
                                                    defaultElevation = if (isPremium) 8.dp else 4.dp
                                                ),
                                                border = if (isPremium) BorderStroke(
                                                    2.dp, Brush.horizontalGradient(listOf(Color(0xFFF59E0B), Color(0xFF8B5CF6)))
                                                ) else if (isBoosted) BorderStroke(
                                                    1.5.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.4f)
                                                ) else null,
                                                modifier = Modifier.width(160.dp),
                                            ) {
                                                Column {
                                                    Box(modifier = Modifier.fillMaxWidth().height(100.dp)) {
                                                        recPost.primaryImage?.let { img ->
                                                            AsyncImage(model = img, contentDescription = null,
                                                                contentScale = ContentScale.Crop,
                                                                modifier = Modifier.fillMaxSize())
                                                        } ?: Box(modifier = Modifier.fillMaxSize()
                                                            .background(MaterialTheme.colorScheme.surfaceVariant),
                                                            contentAlignment = Alignment.Center) {
                                                            Text("📷", fontSize = 24.sp)
                                                        }
                                                        // Premium / Boosted badge overlay
                                                        when {
                                                            isPremium -> Surface(
                                                                shape = RoundedCornerShape(topStart = 16.dp, bottomEnd = 12.dp),
                                                                color = Color(0xFFF59E0B).copy(alpha = 0.85f),
                                                            ) { Text("👑 PREMIUM", fontSize = 9.sp, fontWeight = FontWeight.ExtraBold,
                                                                color = Color.White,
                                                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)) }
                                                            isBoosted -> Surface(
                                                                shape = RoundedCornerShape(topStart = 16.dp, bottomEnd = 12.dp),
                                                                color = Color(0xFF3B82F6).copy(alpha = 0.8f),
                                                            ) { Text("⚡ FEATURED", fontSize = 9.sp, fontWeight = FontWeight.ExtraBold,
                                                                color = Color.White,
                                                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)) }
                                                        }
                                                    }
                                                    Column(Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                                        Text(recPost.displayTitle, maxLines = 1, overflow = TextOverflow.Ellipsis,
                                                            fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                                                        Row(verticalAlignment = Alignment.CenterVertically,
                                                            horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                                            recPost.price?.let { p ->
                                                                Text("\u20B9\${\"%,.0f\".format(p)}", fontSize = 14.sp,
                                                                    fontWeight = FontWeight.Bold,
                                                                    color = MaterialTheme.colorScheme.primary)
                                                            }
                                                            Spacer(Modifier.weight(1f))
                                                            if (isPremium) Text("⭐", fontSize = 12.sp)
                                                        }
                                                        recPost.location?.let { loc ->
                                                            Text(loc.take(20), fontSize = 10.sp,
                                                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                                maxLines = 1, overflow = TextOverflow.Ellipsis)
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }

                        `;

// Verify brace balance
const oldSponsoredBal = braces(sponsoredBlockOld);
const newSponsoredBal = braces(sponsoredBlockNew);
console.log(`Sponsored: old=${oldSponsoredBal}, new=${newSponsoredBal}, ` +
    (oldSponsoredBal === newSponsoredBal ? 'BALANCED' : `MISMATCH (diff=${newSponsoredBal - oldSponsoredBal})`));

if (oldSponsoredBal !== newSponsoredBal) {
    console.log('ERROR: Brace mismatch in sponsored section');
    process.exit(1);
}

content = content.substring(0, sponsoredIdx) + sponsoredBlockNew + content.substring(sellerIdx);

// ─── 3. Write the file ──────────────────────────────────────────────────
fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ PostDetailScreen.kt updated successfully');
