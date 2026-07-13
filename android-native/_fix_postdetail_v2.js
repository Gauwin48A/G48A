/**
 * PostDetailScreen.kt fixes v2 - using anchor-based matching (no Unicode patterns)
 * 1. Enhance safety tips section with border glow
 * 2. Enhance safety-at-a-glance tiles
 */
const fs = require('fs');
const path = require('path');

const FILE = path.resolve(__dirname, 'app/src/main/java/com/mhub/app/ui/home/PostDetailScreen.kt');
let content = fs.readFileSync(FILE, 'utf8');
let lines = content.split(/\r?\n/);
let count = 0;

function log(msg) { console.log(msg); }

// ─── 1. Find and enhance Safety Tips section ────────────────────────
const safetyComment = '// Safety Tips (collapsible with highlight)';
const safetyGlanceComment = '// Safety at a Glance (3 emerald tiles';

const safetyLineIdx = lines.findIndex(l => l.includes(safetyComment));
if (safetyLineIdx >= 0) {
  // Find the "Safety at a Glance" section, which comes RIGHT AFTER safety tips
  // Safety tips ends when we hit the "Safety at a Glance" comment or another section
  // The safety tips Card structure: starts at safetyLineIdx + 1 with "Card("
  // We need to find the matching closing }) of the Card
  
  // Find the end of safety tips section = before safety-at-a-glance or next section
  let safetyEndLine = safetyLineIdx;
  for (let i = safetyLineIdx + 1; i < Math.min(safetyLineIdx + 50, lines.length); i++) {
    // Look for the next section header
    if (lines[i].trim().startsWith('//') && i > safetyLineIdx + 5) {
      safetyEndLine = i - 1;
      break;
    }
  }
  
  if (safetyEndLine > safetyLineIdx) {
    // Determine indentation from the first line
    const indent = lines[safetyLineIdx].match(/^(\s*)/)?.[1] || '                            ';
    const subIndent = indent + '    ';
    
    // Build replacement
    const newSection = [
      `${indent}// Safety Tips (collapsible with highlight & border glow)`,
      `${indent}Card(`,
      `${indent}    shape = RoundedCornerShape(14.dp),`,
      `${indent}    colors = CardDefaults.cardColors(containerColor = if (isDark) Color(0xFF1C1408) else Color(0xFFFEF3C7)),`,
      `${indent}    modifier = Modifier`,
      `${indent}        .fillMaxWidth()`,
      `${indent}        .border(2.dp, Brush.horizontalGradient(`,
      `${indent}            if (isDark) listOf(Color(0xFFF59E0B).copy(alpha = 0.6f), Color(0xFFFCD34D).copy(alpha = 0.3f))`,
      `${indent}            else listOf(Color(0xFFF59E0B).copy(alpha = 0.8f), Color(0xFFFDE68A).copy(alpha = 0.5f))`,
      `${indent}        ), RoundedCornerShape(14.dp)),`,
      `${indent}) {`,
      `${indent}    var safetyExpanded by remember { mutableStateOf(false) }`,
      `${indent}    Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {`,
      `${indent}        Row(`,
      `${indent}            modifier = Modifier.fillMaxWidth().clickable { safetyExpanded = !safetyExpanded },`,
      `${indent}            horizontalArrangement = Arrangement.SpaceBetween,`,
      `${indent}            verticalAlignment = Alignment.CenterVertically,`,
      `${indent}        ) {`,
      `${indent}            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {`,
      `${indent}                Text(if (safetyExpanded) "\uD83D\uDEE1️" else "⚠️", fontSize = 18.sp)`,
      `${indent}                Column {`,
      `${indent}                    Text("Safety Tips", fontWeight = FontWeight.ExtraBold, fontSize = 15.sp,`,
      `${indent}                        color = if (isDark) Color(0xFFFCD34D) else Color(0xFF92400E))`,
      `${indent}                    Text("Stay safe while trading", fontSize = 10.sp,`,
      `${indent}                        color = if (isDark) Color(0xFFFDE68A).copy(alpha = 0.7f) else Color(0xFF78350F).copy(alpha = 0.7f))`,
      `${indent}                }`,
      `${indent}            }`,
      `${indent}            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {`,
      `${indent}                Surface(`,
      `${indent}                    shape = RoundedCornerShape(8.dp),`,
      `${indent}                    color = Color(0xFFDC2626).copy(alpha = 0.9f),`,
      `${indent}                    shadowElevation = 4.dp,`,
      `${indent}                ) {`,
      `${indent}                    Text("READ", fontSize = 9.sp, fontWeight = FontWeight.ExtraBold,`,
      `${indent}                        color = Color.White, modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp))`,
      `${indent}                }`,
      `${indent}                Text(if (safetyExpanded) "\u25B2" else "\u25BC", fontSize = 12.sp,`,
      `${indent}                    color = if (isDark) Color(0xFFFCD34D) else Color(0xFF92400E), fontWeight = FontWeight.Bold)`,
      `${indent}            }`,
      `${indent}        }`,
      `${indent}        if (safetyExpanded) {`,
      `${indent}            HorizontalDivider(color = if (isDark) Color(0xFFFCD34D).copy(alpha = 0.2f) else Color(0xFF92400E).copy(alpha = 0.2f))`,
      `${indent}            Spacer(Modifier.height(2.dp))`,
      `${indent}            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {`,
      `${indent}                Text("\uD83D\uDCCD", fontSize = 14.sp)`,
      `${indent}                Text("Meet in a public place for exchanges", fontSize = 12.sp,`,
      `${indent}                    color = if (isDark) Color(0xFFFDE68A) else Color(0xFF78350F), fontWeight = FontWeight.Medium)`,
      `${indent}            }`,
      `${indent}            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {`,
      `${indent}                Text("\uD83D\uDD0D", fontSize = 14.sp)`,
      `${indent}                Text("Inspect the item thoroughly before paying", fontSize = 12.sp,`,
      `${indent}                    color = if (isDark) Color(0xFFFDE68A) else Color(0xFF78350F), fontWeight = FontWeight.Medium)`,
      `${indent}            }`,
      `${indent}            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {`,
      `${indent}                Text("\uD83D\uDCB3", fontSize = 14.sp)`,
      `${indent}                Text("Don't share personal financial information", fontSize = 12.sp,`,
      `${indent}                    color = if (isDark) Color(0xFFFDE68A) else Color(0xFF78350F), fontWeight = FontWeight.Medium)`,
      `${indent}            }`,
      `${indent}            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {`,
      `${indent}                Text("\uD83D\uDD12", fontSize = 14.sp)`,
      `${indent}                Text("Use MHub secure payment when possible", fontSize = 12.sp,`,
      `${indent}                    color = if (isDark) Color(0xFFFDE68A) else Color(0xFF78350F), fontWeight = FontWeight.Medium)`,
      `${indent}            }`,
      `${indent}            Spacer(Modifier.height(4.dp))`,
      `${indent}            Surface(`,
      `${indent}                shape = RoundedCornerShape(8.dp),`,
      `${indent}                color = if (isDark) Color(0xFFF59E0B).copy(alpha = 0.15f) else Color(0xFFF59E0B).copy(alpha = 0.1f),`,
      `${indent}                modifier = Modifier.fillMaxWidth(),`,
      `${indent}            ) {`,
      `${indent}                Text("Your safety matters! Always follow these guidelines.",`,
      `${indent}                    fontSize = 10.sp, color = if (isDark) Color(0xFFFCD34D) else Color(0xFF92400E),`,
      `${indent}                    fontWeight = FontWeight.SemiBold,`,
      `${indent}                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp))`,
      `${indent}            }`,
      `${indent}        }`,
      `${indent}    }`,
      `${indent}}`,
    ];
    
    // Replace the old section
    const removeCount = safetyEndLine - safetyLineIdx + 1;
    lines.splice(safetyLineIdx, removeCount, ...newSection);
    count++;
    log(`  OK : Enhanced safety tips section (replaced ${removeCount} lines with ${newSection.length} lines)`);
  } else {
    log('  FAIL: Could not find end of safety tips section');
  }
} else {
  log('  FAIL: Safety tips comment not found');
}

// ─── 2. Find and enhance Safety at a Glance tiles ────────────────────
const glanceLineIdx = lines.findIndex(l => l.includes(safetyGlanceComment));
if (glanceLineIdx >= 0) {
  // Find the end of the glance section (look for blank line or next section)
  let glanceEndLine = glanceLineIdx;
  for (let i = glanceLineIdx + 1; i < Math.min(glanceLineIdx + 30, lines.length); i++) {
    if (lines[i].trim() === '' || (lines[i].trim().startsWith('//') && i > glanceLineIdx + 5)) {
      glanceEndLine = i - 1;
      break;
    }
    // Also try finding the closing }) pattern
    if (lines[i].trim() === '}' && i > glanceLineIdx + 5) {
      glanceEndLine = i;
      break;
    }
  }
  
  if (glanceEndLine > glanceLineIdx) {
    // Find the original emerald tiles section and enhance it
    const indent = lines[glanceLineIdx].match(/^(\s*)/)?.[1] || '                            ';
    
    // Build the enhanced glance tiles
    const newGlance = [
      `${indent}// Safety at a Glance (3 highlighted tiles)`,
      `${indent}Row(`,
      `${indent}    modifier = Modifier.fillMaxWidth(),`,
      `${indent}    horizontalArrangement = Arrangement.spacedBy(8.dp),`,
      `${indent}) {`,
      `${indent}    val safetyItems = listOf(`,
      `${indent}        "\uD83E\uDD1D" to "Public Meetup",`,
      `${indent}        "\uD83D\uDCB0" to "No Pre-payment",`,
      `${indent}        "\uD83D\uDD0D" to "Verify Listing ID",`,
      `${indent}    )`,
      `${indent}    safetyItems.forEach { (emoji, label) ->`,
      `${indent}        Surface(`,
      `${indent}            shape = RoundedCornerShape(12.dp),`,
      `${indent}            color = if (isDark) Color(0xFF064E3B).copy(alpha = 0.6f) else Color(0xFFECFDF5),`,
      `${indent}            border = BorderStroke(1.dp, if (isDark) Color(0xFF10B981).copy(alpha = 0.5f) else Color(0xFF6EE7B7)),`,
      `${indent}            modifier = Modifier.weight(1f),`,
      `${indent}            shadowElevation = 2.dp,`,
      `${indent}        ) {`,
      `${indent}            Column(`,
      `${indent}                modifier = Modifier.padding(vertical = 12.dp),`,
      `${indent}                horizontalAlignment = Alignment.CenterHorizontally,`,
      `${indent}            ) {`,
      `${indent}                Text(emoji, fontSize = 22.sp)`,
      `${indent}                Spacer(Modifier.height(4.dp))`,
      `${indent}                Text(label, fontSize = 11.sp, color = if (isDark) Color(0xFF6EE7B7) else Color(0xFF065F46), fontWeight = FontWeight.SemiBold, textAlign = TextAlign.Center)`,
      `${indent}                Spacer(Modifier.height(2.dp))`,
      `${indent}                Text("\\u2713", fontSize = 9.sp, color = Color(0xFF10B981), fontWeight = FontWeight.Bold)`,
      `${indent}            }`,
      `${indent}        }`,
      `${indent}    }`,
      `${indent}}`,
    ];
    
    const removeCount = glanceEndLine - glanceLineIdx + 1;
    lines.splice(glanceLineIdx, removeCount, ...newGlance);
    count++;
    log(`  OK : Enhanced safety-at-a-glance tiles (replaced ${removeCount} lines with ${newGlance.length} lines)`);
  } else {
    log('  FAIL: Could not find end of glance section');
  }
} else {
  log('  FAIL: Safety at a Glance comment not found');
}

// ─── Write back ──────────────────────────────────────────────────────
content = lines.join('\n');
fs.writeFileSync(FILE, content, 'utf8');

const opens = (content.match(/{/g) || []).length;
const closes = (content.match(/}/g) || []).length;
log(`\nDone: ${count} changes. Lines: ${content.split('\n').length}. Braces: ${opens}/${closes} (diff=${opens - closes}).`);
