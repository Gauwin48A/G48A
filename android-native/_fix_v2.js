const fs = require('fs');
let changes = 0;

// ============================================================
// 1. PostDetailScreen - Safety Tips collapsible
// ============================================================
let dp = 'app/src/main/java/com/mhub/app/ui/home/PostDetailScreen.kt';
let d = fs.readFileSync(dp, 'utf8');

const safeMarker = '                                // Safety Tips';
const safeIdx = d.indexOf(safeMarker);
const safetyGlance = '                                // Safety at a Glance';
const safeGlanceIdx = d.indexOf(safetyGlance);

if (safeIdx >= 0 && safeGlanceIdx > safeIdx && !d.includes('safetyExpanded')) {
    const before = d.substring(0, safeIdx);
    const after = d.substring(safeGlanceIdx);
    
    const collapsibleSection = 
'                                // Safety Tips (collapsible with highlight)\n' +
'                                Card(\n' +
'                                    shape = RoundedCornerShape(12.dp),\n' +
'                                    colors = CardDefaults.cardColors(containerColor = if (isDark) Color(0xFF1C1408) else Color(0xFFFEF3C7)),\n' +
'                                    modifier = Modifier.fillMaxWidth(),\n' +
'                                ) {\n' +
'                                    var safetyExpanded by remember { mutableStateOf(false) }\n' +
'                                    Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {\n' +
'                                        Row(\n' +
'                                            modifier = Modifier.fillMaxWidth().clickable { safetyExpanded = !safetyExpanded },\n' +
'                                            horizontalArrangement = Arrangement.SpaceBetween,\n' +
'                                            verticalAlignment = Alignment.CenterVertically,\n' +
'                                        ) {\n' +
'                                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {\n' +
'                                                Text(if (safetyExpanded) "\ud83d\udee1\ufe0f" else "\u26a0\ufe0f", fontSize = 14.sp)\n' +
'                                                Text("Safety Tips", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = if (isDark) Color(0xFFFCD34D) else Color(0xFF92400E))\n' +
'                                                Surface(shape = RoundedCornerShape(10.dp), color = Color(0xFFF59E0B).copy(alpha = 0.2f)) {\n' +
'                                                    Text("READ", fontSize = 8.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFFF59E0B), modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp))\n' +
'                                                }\n' +
'                                            }\n' +
'                                            Text(if (safetyExpanded) "\u25b2 Less" else "\u25bc More", fontSize = 11.sp, color = if (isDark) Color(0xFFFCD34D) else Color(0xFF92400E), fontWeight = FontWeight.SemiBold)\n' +
'                                        }\n' +
'                                        if (safetyExpanded) {\n' +
'                                            Text("\u2022 Meet in a public place for exchanges", fontSize = 12.sp, color = if (isDark) Color(0xFFFDE68A) else Color(0xFF78350F))\n' +
'                                            Text("\u2022 Inspect the item thoroughly before paying", fontSize = 12.sp, color = if (isDark) Color(0xFFFDE68A) else Color(0xFF78350F))\n' +
'                                            Text("\u2022 Don\'t share personal financial information", fontSize = 12.sp, color = if (isDark) Color(0xFFFDE68A) else Color(0xFF78350F))\n' +
'                                            Text("\u2022 Use MHub secure payment when possible", fontSize = 12.sp, color = if (isDark) Color(0xFFFDE68A) else Color(0xFF78350F))\n' +
'                                        }\n' +
'                                    }\n' +
'                                }\n';
    
    d = before + collapsibleSection + after;
    changes++;
    console.log('1. Safety Tips -> collapsible with highlight');
} else {
    console.log('1. Safety Tips: ' + (d.includes('safetyExpanded') ? 'already updated' : 'not found'));
}

// ============================================================
// 2. PostDetailScreen - Boosted / Featured Posts
// ============================================================
const sponsorMarker = '                                // Sponsored / Premium Recommendations';
const sponsorIdx = d.indexOf(sponsorMarker);
const secSellerMarker = '                        item(key = "sec_seller")';
const secSellerIdx = d.indexOf(secSellerMarker, sponsorIdx);

if (sponsorIdx >= 0 && secSellerIdx > sponsorIdx && !d.includes('premiumPosts')) {
    let blockEnd = d.lastIndexOf('\n                            }\n', secSellerIdx - 2);
    if (blockEnd < sponsorIdx) {
        blockEnd = d.lastIndexOf('\n                            }', secSellerIdx - 2);
    }
    
    if (blockEnd > sponsorIdx && blockEnd < secSellerIdx) {
        const before2 = d.substring(0, sponsorIdx);
        const after2 = d.substring(blockEnd + 1);
        
        const boostedSection = 
'                                // Boosted / Featured / Premium Recommendations\n' +
'                                run {\n' +
'                                    val premiumPosts = state.similarPosts.filter { p ->\n' +
'                                        p.isPremium == true || p.boostLevel != null || p.promoLabel != null || \n' +
'                                        (p.tierPriority ?: 0) >= 2 || p.tier?.lowercase() in listOf("premium", "silver", "gold")\n' +
'                                    }\n' +
'                                    val boostedPosts = if (premiumPosts.isNotEmpty()) premiumPosts else state.similarPosts.takeLast(3)\n' +
'                                    if (boostedPosts.isNotEmpty()) {\n' +
'                                        Spacer(Modifier.height(8.dp))\n' +
'                                        Row(verticalAlignment = Alignment.CenterVertically) {\n' +
'                                            Text("\u26a1 Featured Posts", fontWeight = FontWeight.Bold, fontSize = 16.sp, modifier = Modifier.weight(1f))\n' +
'                                            Surface(shape = RoundedCornerShape(4.dp), color = Color(0xFFF59E0B).copy(alpha = 0.2f)) {\n' +
'                                                Text("BOOSTED", fontSize = 9.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFFF59E0B),\n' +
'                                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))\n' +
'                                            }\n' +
'                                        }\n' +
'                                        LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {\n' +
'                                            items(boostedPosts, key = { "feat_" + it.stableId }) { featPost ->\n' +
'                                                Card(\n' +
'                                                    onClick = { onOpenPost(featPost.stableId) },\n' +
'                                                    shape = RoundedCornerShape(12.dp),\n' +
'                                                    modifier = Modifier.width(150.dp),\n' +
'                                                ) {\n' +
'                                                    Column {\n' +
'                                                        Box {\n' +
'                                                            featPost.primaryImage?.let { img ->\n' +
'                                                                AsyncImage(model = img, contentDescription = null, contentScale = ContentScale.Crop,\n' +
'                                                                    modifier = Modifier.fillMaxWidth().height(100.dp))\n' +
'                                                            }\n' +
'                                                            Surface(\n' +
'                                                                shape = RoundedCornerShape(bottomEnd = 8.dp),\n' +
'                                                                color = when {\n' +
'                                                                    featPost.isPremium == true || featPost.tier?.lowercase() == "premium" -> Color(0xFF7C3AED).copy(alpha = 0.9f)\n' +
'                                                                    featPost.boostLevel != null -> Color(0xFF2563EB).copy(alpha = 0.9f)\n' +
'                                                                    else -> Color(0xFFF59E0B).copy(alpha = 0.9f)\n' +
'                                                                },\n' +
'                                                                modifier = Modifier.align(Alignment.TopStart),\n' +
'                                                            ) {\n' +
'                                                                val badgeText = when {\n' +
'                                                                    featPost.isPremium == true || featPost.tier?.lowercase() == "premium" -> "\ud83d\udc51"\n' +
'                                                                    featPost.boostLevel != null -> "\u26a1"\n' +
'                                                                    else -> "\u2b50"\n' +
'                                                                }\n' +
'                                                                Text(badgeText, fontSize = 12.sp, modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp))\n' +
'                                                            }\n' +
'                                                        }\n' +
'                                                        Column(Modifier.padding(8.dp)) {\n' +
'                                                            Text(featPost.displayTitle, maxLines = 1, overflow = TextOverflow.Ellipsis, fontSize = 12.sp, fontWeight = FontWeight.Medium)\n' +
'                                                            featPost.price?.let { p ->\n' +
'                                                                Text("\u20b9" + "%,.0f".format(p), fontSize = 12.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)\n' +
'                                                            }\n' +
'                                                        }\n' +
'                                                    }\n' +
'                                                }\n' +
'                                            }\n' +
'                                        }\n' +
'                                    }\n' +
'                                }\n';
        
        d = before2 + boostedSection + after2;
        changes++;
        console.log('2. Boosted/Featured posts section updated');
    } else {
        console.log('2. ERROR: blockEnd=' + blockEnd);
    }
} else {
    console.log('2. Boosted posts: ' + (d.includes('premiumPosts') ? 'already updated' : 'sponsorIdx=' + sponsorIdx + ' secSellerIdx=' + secSellerIdx));
}

fs.writeFileSync(dp, d, 'utf8');

// ============================================================
// 3. ProfileScreen - Remove SettingsTab & SettingsRow dead code
// ============================================================
let pp = 'app/src/main/java/com/mhub/app/ui/profile/ProfileScreen.kt';
let p = fs.readFileSync(pp, 'utf8');

const settingsMarker = 'private fun SettingsTab(';
const settingsIdx = p.indexOf(settingsMarker);
const prefsMarker = 'PreferenceCategory';
const prefsIdx = p.indexOf(prefsMarker, settingsIdx);

if (settingsIdx >= 0 && prefsIdx > settingsIdx) {
    p = p.substring(0, settingsIdx) + '\n// SettingsTab removed - Settings accessed from drawer menu\n' + p.substring(prefsIdx);
    changes++;
    console.log('3. Removed SettingsTab/SettingsRow dead code');
} else {
    console.log('3. SettingsTab: ' + (p.indexOf('// SettingsTab removed') >= 0 ? 'already removed' : 'settingsIdx=' + settingsIdx + ' prefsIdx=' + prefsIdx));
}

fs.writeFileSync(pp, p, 'utf8');

console.log('\nDone. ' + changes + ' changes made.');
