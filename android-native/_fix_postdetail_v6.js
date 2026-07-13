const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/src/main/java/com/mhub/app/ui/home/PostDetailScreen.kt');
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

function countChar(s, c) { let n = 0; for (let i = 0; i < s.length; i++) if (s[i] === c) n++; return n; }
function braces(arr) { 
    let o = 0, c = 0; 
    for (const line of arr) { o += countChar(line, '{'); c += countChar(line, '}'); } 
    return o - c; 
}

// ─── 1. Safety Tips (lines 1184-1197, 0-indexed: 1183-1196) ──
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

const oldSafetyLines = lines.slice(1183, 1197);
const oldSafetyBraces = braces(oldSafetyLines);
const newSafetyBraces = braces(safetyNew);
console.log(`Safety Tips: old=${oldSafetyBraces}, new=${newSafetyBraces}, ${oldSafetyBraces === newSafetyBraces ? 'BALANCED' : 'FAIL'}`);
console.log(`Safety old lines: ${JSON.stringify(oldSafetyLines.map(l => l.trim()).slice(0, 3))}`);

if (oldSafetyBraces !== newSafetyBraces) {
    console.log('ERROR: Safety tips brace mismatch');
    process.exit(1);
}

lines.splice(1183, 14, ...safetyNew);

// ─── 2. Sponsored / Recommended section ──
// Find "Sponsored" comment
let sponsoredStart = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Sponsored / Premium')) { sponsoredStart = i; break; }
}

if (sponsoredStart === -1) {
    console.log('ERROR: Sponsored section not found');
    process.exit(1);
}

// Read 3 lines before and after to understand context
console.log(`Sponsored at line ${sponsoredStart+1}:`);
for (let i = Math.max(0, sponsoredStart-3); i < Math.min(lines.length, sponsoredStart+5); i++) {
    console.log(`  ${i+1}: ${lines[i].trim()}`);
}

// The old section starts with the comment and includes the LazyRow and its closing braces.
// Find where it ends - look for next blank line followed by item(key = "sec_seller")
let sellerStart = -1;
for (let i = sponsoredStart; i < lines.length; i++) {
    // Look for the next item(key = "sec_seller") outside the current block
    if (lines[i].includes('item(key = "sec_seller")')) {
        sellerStart = i;
        break;
    }
}

const oldSponsoredLines = lines.slice(sponsoredStart, sellerStart);
console.log(`Sponsored section: ${oldSponsoredLines.length} lines`);
console.log(`First 3: ${JSON.stringify(oldSponsoredLines.slice(0, 3).map(l => l.trim()))}`);
console.log(`Last 3: ${JSON.stringify(oldSponsoredLines.slice(-3).map(l => l.trim()))}`);

// Instead of full replacement, let me just enhance the header line
// Replace: '// Sponsored / Premium Recommendations' with enhanced header
const headerNew = '                                // \\u2B50 Recommended For You — Boosted & Premium Posts';
lines[sponsoredStart] = headerNew;

// Replace the line that says 'state.similarPosts.takeIf { it.size > 1 }' with a simpler version
// Find the line that uses sponsored posts
for (let i = sponsoredStart; i < Math.min(lines.length, sponsoredStart + 8); i++) {
    if (lines[i].includes('state.similarPosts.takeIf { it.size > 1 }')) {
        // Just update the header text and badge
        // The actual posts display logic is fine as-is
        console.log(`Found sponsored condition at line ${i+1}`);
    }
    if (lines[i].includes('stringResource(R.string.detail_recommended)')) {
        lines[i] = lines[i].replace(
            'stringResource(R.string.detail_recommended)',
            '"\\u2B50 Recommended For You"'
        );
        console.log(`Updated recommended header at line ${i+1}`);
    }
    if (lines[i].includes('detail_sponsored')) {
        lines[i] = lines[i].replace(
            'stringResource(R.string.detail_sponsored)',
            '"PREMIUM"'
        );
        console.log(`Updated sponsored badge at line ${i+1}`);
    }
}

// ─── Write ──
fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('\\n✅ PostDetailScreen.kt updated successfully');
