const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/src/main/java/com/mhub/app/ui/home/PostDetailScreen.kt');
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

// ─── 1. Replace Safety Tips (lines 1184-1197, 0-indexed: 1183-1196) ──
// Keep the same indentation level
const safetyNew = [
    '                                // Safety Tips (collapsible with border glow & READ badge)',
    '                                var safetyExpanded by remember { mutableStateOf(false) }',
    '                                Card(',
    '                                    shape = RoundedCornerShape(14.dp),',
    '                                    colors = CardDefaults.cardColors(containerColor = if (isDark) Color(0xFF1C1408) else Color(0xFFFEF3C7)),',
    '                                    modifier = Modifier',
    '                                        .fillMaxWidth()',
    '                                        .clickable { safetyExpanded = !safetyExpanded }',
    '                                        .then(',
    '                                            Modifier.border(',
    '                                                1.5.dp,',
    '                                                if (safetyExpanded) Brush.horizontalGradient(listOf(Color(0xFFF97316), Color(0xFFEF4444)))',
    '                                                else Color(0xFFFDE68A).copy(alpha = 0.5f),',
    '                                                RoundedCornerShape(14.dp),',
    '                                            )',
    '                                        ),',
    '                                ) {',
    '                                    Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {',
    '                                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {',
    '                                            Text("\\u26A0\\uFE0F", fontSize = 18.sp)',
    '                                            Text("Safety Tips", fontWeight = FontWeight.Bold, fontSize = 14.sp,',
    '                                                color = if (isDark) Color(0xFFFCD34D) else Color(0xFF92400E),',
    '                                                modifier = Modifier.weight(1f))',
    '                                            Surface(shape = RoundedCornerShape(6.dp), color = Color(0xFFEF4444)) {',
    '                                                Text("READ", fontSize = 9.sp, fontWeight = FontWeight.ExtraBold, color = Color.White,',
    '                                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))',
    '                                            }',
    '                                            Text(if (safetyExpanded) "\\u25B2" else "\\u25BC", fontSize = 12.sp,',
    '                                                color = if (isDark) Color(0xFFFDE68A) else Color(0xFF92400E))',
    '                                        }',
    '                                        if (safetyExpanded) {',
    '                                            HorizontalDivider(color = if (isDark) Color(0xFFFDE68A).copy(alpha = 0.2f) else Color(0xFFD97706).copy(alpha = 0.2f))',
    '                                            val safetyEmojiTips = listOf(',
    '                                                "\\uD83D\\uDC6B" to "Meet in a public place for exchanges",',
    '                                                "\\uD83D\\uDD0D" to "Inspect the item thoroughly before paying",',
    '                                                "\\uD83D\\uDCB3" to "Use secure payment methods only",',
    '                                                "\\uD83D\\uDD12" to "Don\'t share personal financial info",',
    '                                                "\\uD83D\\uDCCD" to "Verify the listing ID with the seller",',
    '                                            )',
    '                                            safetyEmojiTips.forEach { (emoji, tip) ->',
    '                                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {',
    '                                                    Text(emoji, fontSize = 14.sp)',
    '                                                    Text(tip, fontSize = 12.sp, color = if (isDark) Color(0xFFFDE68A) else Color(0xFF78350F))',
    '                                                }',
    '                                            }',
    '                                            Spacer(Modifier.height(4.dp))',
    '                                            Surface(',
    '                                                shape = RoundedCornerShape(8.dp),',
    '                                                color = if (isDark) Color(0xFFEF4444).copy(alpha = 0.15f) else Color(0xFFFEE2E2),',
    '                                                modifier = Modifier.fillMaxWidth(),',
    '                                            ) {',
    '                                                Row(Modifier.padding(8.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {',
    '                                                    Text("\\uD83D\\uDEE1\\uFE0F", fontSize = 14.sp)',
    '                                                    Text("Stay safe! MHub will never ask for your password or OTP.",',
    '                                                        fontSize = 11.sp, color = if (isDark) Color(0xFFFCA5A5) else Color(0xFF991B1B))',
    '                                                }',
    '                                            }',
    '                                        }',
    '                                    }',
    '                                }',
];

// Count braces for safety new block
function countChar(s, c) { let n = 0; for (let i = 0; i < s.length; i++) if (s[i] === c) n++; return n; }
function braces(arr) { 
    let o = 0, c = 0; 
    for (const line of arr) { o += countChar(line, '{'); c += countChar(line, '}'); } 
    return o - c; 
}

// Old safety lines (1184-1197, indices 1183-1196)
const oldSafetyLines = lines.slice(1183, 1197);
const oldSafetyBraces = braces(oldSafetyLines);
const newSafetyBraces = braces(safetyNew);
console.log(`Safety Tips: old braces=${oldSafetyBraces}, new braces=${newSafetyBraces}, ${oldSafetyBraces === newSafetyBraces ? 'BALANCED' : 'MISMATCH'}`);

// Replace
lines.splice(1183, 14, ...safetyNew);

// ─── 2. Replace Sponsored / Recommended section ────────────────────
// Find the line containing "// Sponsored / Premium Recommendations"
let sponsoredStart = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('// Sponsored / Premium Recommendations')) {
        sponsoredStart = i;
        break;
    }
}

if (sponsoredStart === -1) {
    console.log('ERROR: Sponsored section not found');
    process.exit(1);
}

// Find "// Seller" section after sponsored
let sellerStart = -1;
for (let i = sponsoredStart + 1; i < lines.length; i++) {
    if (lines[i].includes('item(key = "sec_seller")')) {
        sellerStart = i;
        break;
    }
}

if (sellerStart === -1) {
    console.log('ERROR: Seller section not found');
    process.exit(1);
}

const oldSponsoredLines = lines.slice(sponsoredStart, sellerStart);
const oldSponsoredBraces = braces(oldSponsoredLines);

const sponsoredNew = [
    '                                // \\u2B50 Recommended For You — Boosted & Premium Posts',
    '                                state.similarPosts.takeIf { it.isNotEmpty() }?.let { posts ->',
    '                                    Spacer(Modifier.height(12.dp))',
    '                                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {',
    '                                        Text("\\u2B50", fontSize = 16.sp)',
    '                                        Text("Recommended For You", fontWeight = FontWeight.ExtraBold, fontSize = 17.sp,',
    '                                            color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.weight(1f))',
    '                                        Surface(shape = RoundedCornerShape(6.dp), color = Color(0xFF7C3AED).copy(alpha = 0.12f),',
    '                                            border = BorderStroke(1.dp, Color(0xFF7C3AED).copy(alpha = 0.3f))) {',
    '                                            Text("SPONSORED", fontSize = 9.sp, fontWeight = FontWeight.ExtraBold,',
    '                                                color = Color(0xFF7C3AED),',
    '                                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))',
    '                                        }',
    '                                    }',
    '                                    Text("Featured listings from top sellers", fontSize = 11.sp,',
    '                                        color = MaterialTheme.colorScheme.onSurfaceVariant,',
    '                                        modifier = Modifier.padding(start = 2.dp))',
    '                                    Spacer(Modifier.height(8.dp))',
    '                                    LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {',
    '                                        items(posts.takeLast(5).shuffled().take(3), key = { "rec_${it.stableId}" }) { recPost ->',
    '                                            val isPremium = recPost.isPremium == true || (recPost.tierPriority ?: 0) >= 3',
    '                                            val isBoosted = recPost.boostLevel != null || recPost.promoLabel != null',
    '                                            Card(',
    '                                                onClick = { onOpenPost(recPost.stableId) },',
    '                                                shape = RoundedCornerShape(16.dp),',
    '                                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),',
    '                                                elevation = CardDefaults.cardElevation(',
    '                                                    defaultElevation = if (isPremium) 8.dp else 4.dp',
    '                                                ),',
    '                                                border = if (isPremium) BorderStroke(',
    '                                                    2.dp, Brush.horizontalGradient(listOf(Color(0xFFF59E0B), Color(0xFF8B5CF6)))',
    '                                                ) else if (isBoosted) BorderStroke(',
    '                                                    1.5.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.4f)',
    '                                                ) else null,',
    '                                                modifier = Modifier.width(160.dp),',
    '                                            ) {',
    '                                                Column {',
    '                                                    Box(modifier = Modifier.fillMaxWidth().height(100.dp)) {',
    '                                                        recPost.primaryImage?.let { img ->',
    '                                                            AsyncImage(model = img, contentDescription = null,',
    '                                                                contentScale = ContentScale.Crop,',
    '                                                                modifier = Modifier.fillMaxSize())',
    '                                                        } ?: Box(modifier = Modifier.fillMaxSize()',
    '                                                            .background(MaterialTheme.colorScheme.surfaceVariant),',
    '                                                            contentAlignment = Alignment.Center) {',
    '                                                            Text("\\uD83D\\uDCF7", fontSize = 24.sp)',
    '                                                        }',
    '                                                        when {',
    '                                                            isPremium -> Surface(',
    '                                                                shape = RoundedCornerShape(topStart = 16.dp, bottomEnd = 12.dp),',
    '                                                                color = Color(0xFFF59E0B).copy(alpha = 0.85f),',
    '                                                            ) { Text("\\uD83D\\uDC51 PREMIUM", fontSize = 9.sp, fontWeight = FontWeight.ExtraBold,',
    '                                                                color = Color.White,',
    '                                                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)) }',
    '                                                            isBoosted -> Surface(',
    '                                                                shape = RoundedCornerShape(topStart = 16.dp, bottomEnd = 12.dp),',
    '                                                                color = Color(0xFF3B82F6).copy(alpha = 0.8f),',
    '                                                            ) { Text("\\u26A1 FEATURED", fontSize = 9.sp, fontWeight = FontWeight.ExtraBold,',
    '                                                                color = Color.White,',
    '                                                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)) }',
    '                                                        }',
    '                                                    }',
    '                                                    Column(Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {',
    '                                                        Text(recPost.displayTitle, maxLines = 1, overflow = TextOverflow.Ellipsis,',
    '                                                            fontSize = 13.sp, fontWeight = FontWeight.SemiBold)',
    '                                                        Row(verticalAlignment = Alignment.CenterVertically,',
    '                                                            horizontalArrangement = Arrangement.spacedBy(4.dp)) {',
    '                                                            recPost.price?.let { p ->',
    '                                                                Text("\\u20B9\${\"%,.0f\".format(p)}", fontSize = 14.sp,',
    '                                                                    fontWeight = FontWeight.Bold,',
    '                                                                    color = MaterialTheme.colorScheme.primary)',
    '                                                            }',
    '                                                            Spacer(Modifier.weight(1f))',
    '                                                            if (isPremium) Text("\\u2B50", fontSize = 12.sp)',
    '                                                        }',
    '                                                        recPost.location?.let { loc ->',
    '                                                            Text(loc.take(20), fontSize = 10.sp,',
    '                                                                color = MaterialTheme.colorScheme.onSurfaceVariant,',
    '                                                                maxLines = 1, overflow = TextOverflow.Ellipsis)',
    '                                                        }',
    '                                                    }',
    '                                                }',
    '                                            }',
    '                                        }',
    '                                    }',
    '                                }',
    '',
    '                        ',
];

const newSponsoredBraces = braces(sponsoredNew);
console.log(`Sponsored: old braces=${oldSponsoredBraces}, new braces=${newSponsoredBraces}, ${oldSponsoredBraces === newSponsoredBraces ? 'BALANCED' : 'MISMATCH'}`);

if (oldSponsoredBraces !== newSponsoredBraces) {
    console.log('ERROR: Brace mismatch in sponsored section');
    process.exit(1);
}

lines.splice(sponsoredStart, sellerStart - sponsoredStart, ...sponsoredNew);

// ─── 3. Write file ──────────────────────────────────────────────────
// Recalculate sellerStart since indices shifted... but that's fine since we already captured sponsoredStart and sellerStart.

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('✅ PostDetailScreen.kt updated successfully');
