/**
 * PostDetailScreen.kt improvements:
 * 1. Enhance safety tips section with better visual highlighting
 * 2. Improve safety-at-a-glance tiles
 * 3. Ensure recommended/featured posts work well
 */
const fs = require('fs');
const path = require('path');

const FILE = path.resolve(__dirname, 'app/src/main/java/com/mhub/app/ui/home/PostDetailScreen.kt');
let content = fs.readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n');
let count = 0;

function replaceExact(oldStr, newStr, desc) {
  const idx = content.indexOf(oldStr);
  if (idx < 0) { 
    console.log(`  FAIL: ${desc} - pattern not found`); 
    console.log(`    Searching for: ${JSON.stringify(oldStr.substring(0, 60))}...`);
    return false; 
  }
  content = content.substring(0, idx) + newStr + content.substring(idx + oldStr.length);
  count++;
  console.log(`  OK : ${desc}`);
  return true;
}

// ─── 1. Enhance Safety Tips section ──────────────────────────────────
const oldSafetyTips = `        // Safety Tips (collapsible with highlight)
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
                                        Text(if (safetyExpanded) "\uD83D\uDEE1\uFE0F" else "⚠\uFE0F", fontSize = 14.sp)
                                        Text("Safety Tips", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = if (isDark) Color(0xFFFCD34D) else Color(0xFF92400E))
                                        Surface(shape = RoundedCornerShape(10.dp), color = Color(0xFFF59E0B).copy(alpha = 0.2f)) {
                                            Text("READ", fontSize = 8.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFFF59E0B), modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp))
                                        }
                                    }
                                    Text(if (safetyExpanded) "\u25B2 Less" else "\u25BC More", fontSize = 11.sp, color = if (isDark) Color(0xFFFCD34D) else Color(0xFF92400E), fontWeight = FontWeight.SemiBold)
                                }
                                if (safetyExpanded) {
                                    Text("\u2022 Meet in a public place for exchanges", fontSize = 12.sp, color = if (isDark) Color(0xFFFDE68A) else Color(0xFF78350F))
                                    Text("\u2022 Inspect the item thoroughly before paying", fontSize = 12.sp, color = if (isDark) Color(0xFFFDE68A) else Color(0xFF78350F))
                                    Text("\u2022 Don't share personal financial information", fontSize = 12.sp, color = if (isDark) Color(0xFFFDE68A) else Color(0xFF78350F))
                                    Text("\u2022 Use MHub secure payment when possible", fontSize = 12.sp, color = if (isDark) Color(0xFFFDE68A) else Color(0xFF78350F))
                                }
                            }
                        }`;

const newSafetyTips = `        // Safety Tips (collapsible with highlight & border glow)
                        Card(
                            shape = RoundedCornerShape(14.dp),
                            colors = CardDefaults.cardColors(containerColor = if (isDark) Color(0xFF1C1408) else Color(0xFFFEF3C7)),
                            modifier = Modifier
                                .fillMaxWidth()
                                .border(
                                    2.dp,
                                    Brush.horizontalGradient(
                                        if (isDark) listOf(Color(0xFFF59E0B).copy(alpha = 0.6f), Color(0xFFFCD34D).copy(alpha = 0.3f))
                                        else listOf(Color(0xFFF59E0B).copy(alpha = 0.8f), Color(0xFFFDE68A).copy(alpha = 0.5f))
                                    ),
                                    RoundedCornerShape(14.dp),
                                ),
                        ) {
                            var safetyExpanded by remember { mutableStateOf(false) }
                            Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth().clickable { safetyExpanded = !safetyExpanded },
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        Text(if (safetyExpanded) "\uD83D\uDEE1\uFE0F" else "⚠\uFE0F", fontSize = 18.sp)
                                        Column {
                                            Text("Safety Tips", fontWeight = FontWeight.ExtraBold, fontSize = 15.sp,
                                                color = if (isDark) Color(0xFFFCD34D) else Color(0xFF92400E))
                                            Text("Stay safe while trading", fontSize = 10.sp,
                                                color = if (isDark) Color(0xFFFDE68A).copy(alpha = 0.7f) else Color(0xFF78350F).copy(alpha = 0.7f))
                                        }
                                    }
                                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        Surface(
                                            shape = RoundedCornerShape(8.dp),
                                            color = Color(0xFFDC2626).copy(alpha = 0.9f),
                                            shadowElevation = 4.dp,
                                        ) {
                                            Text("READ", fontSize = 9.sp, fontWeight = FontWeight.ExtraBold,
                                                color = Color.White, modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp))
                                        }
                                        Text(if (safetyExpanded) "\u25B2" else "\u25BC", fontSize = 12.sp,
                                            color = if (isDark) Color(0xFFFCD34D) else Color(0xFF92400E), fontWeight = FontWeight.Bold)
                                    }
                                }
                                if (safetyExpanded) {
                                    HorizontalDivider(color = if (isDark) Color(0xFFFCD34D).copy(alpha = 0.2f) else Color(0xFF92400E).copy(alpha = 0.2f))
                                    Spacer(Modifier.height(2.dp))
                                    safetyTipsList.forEach { (icon, tip) ->
                                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                            Text(icon, fontSize = 14.sp)
                                            Text(tip, fontSize = 12.sp,
                                                color = if (isDark) Color(0xFFFDE68A) else Color(0xFF78350F),
                                                fontWeight = FontWeight.Medium)
                                        }
                                    }
                                    Spacer(Modifier.height(4.dp))
                                    Surface(
                                        shape = RoundedCornerShape(8.dp),
                                        color = if (isDark) Color(0xFFF59E0B).copy(alpha = 0.15f) else Color(0xFFF59E0B).copy(alpha = 0.1f),
                                        modifier = Modifier.fillMaxWidth(),
                                    ) {
                                        Text("\uD83D\uDC4A Your safety matters! Always follow these guidelines.",
                                            fontSize = 10.sp, color = if (isDark) Color(0xFFFCD34D) else Color(0xFF92400E),
                                            fontWeight = FontWeight.SemiBold,
                                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp))
                                    }
                                }
                            }
                        }`;

replaceExact(oldSafetyTips, newSafetyTips, 'Enhanced safety tips section with border glow');

// ─── 2. Enhance Safety at a Glance tiles ──────────────────────────────
const oldGlance = `                        // Safety at a Glance (3 emerald tiles - web parity)
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            val safetyItems = listOf(
                                "\uD83E\uDD1D" to "Public Meetup",
                                "\uD83D\uDCB0" to "No Pre-payment",
                                "\uD83D\uDD0D" to "Verify Listing ID",
                            )
                            safetyItems.forEach { (emoji, label) ->
                                Surface(
                                    shape = RoundedCornerShape(12.dp),
                                    color = if (isDark) Color(0xFF064E3B).copy(alpha = 0.6f) else Color(0xFFECFDF5),
                                    border = BorderStroke(1.dp, if (isDark) Color(0xFF10B981).copy(alpha = 0.3f) else Color(0xFFA7F3D0)),
                                    modifier = Modifier.weight(1f),
                                ) {
                                    Column(
                                        modifier = Modifier.padding(vertical = 10.dp),
                                        horizontalAlignment = Alignment.CenterHorizontally,
                                    ) {
                                        Text(emoji, fontSize = 20.sp)
                                        Spacer(Modifier.height(4.dp))
                                        Text(label, fontSize = 10.sp, color = if (isDark) Color(0xFF6EE7B7) else Color(0xFF065F46), fontWeight = FontWeight.Medium, textAlign = TextAlign.Center)
                                    }
                                }
                            }
                        }`;

const newGlance = `                        // Safety at a Glance (3 highlighted tiles)
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            val safetyItems = listOf(
                                "\uD83E\uDD1D" to "Public Meetup",
                                "\uD83D\uDCB0" to "No Pre-payment",
                                "\uD83D\uDD0D" to "Verify Listing ID",
                            )
                            safetyItems.forEach { (emoji, label) ->
                                Surface(
                                    shape = RoundedCornerShape(12.dp),
                                    color = if (isDark) Color(0xFF064E3B).copy(alpha = 0.6f) else Color(0xFFECFDF5),
                                    border = BorderStroke(1.dp, if (isDark) Color(0xFF10B981).copy(alpha = 0.5f) else Color(0xFF6EE7B7)),
                                    modifier = Modifier.weight(1f),
                                    shadowElevation = 2.dp,
                                ) {
                                    Column(
                                        modifier = Modifier.padding(vertical = 12.dp),
                                        horizontalAlignment = Alignment.CenterHorizontally,
                                    ) {
                                        Text(emoji, fontSize = 22.sp)
                                        Spacer(Modifier.height(4.dp))
                                        Text(label, fontSize = 11.sp, color = if (isDark) Color(0xFF6EE7B7) else Color(0xFF065F46), fontWeight = FontWeight.SemiBold, textAlign = TextAlign.Center)
                                        Spacer(Modifier.height(2.dp))
                                        Text("✓", fontSize = 9.sp, color = Color(0xFF10B981), fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }`;

replaceExact(oldGlance, newGlance, 'Enhanced safety-at-a-glance tiles');

// ─── 3. Add safetyTipsList if not present ────────────────────────────
if (!content.includes('safetyTipsList')) {
  // Add the safety tips list definition before the Safety Tips section
  const safetyComment = '        // Safety Tips (collapsible with highlight & border glow)';
  const tipsListVars = 
    `    val safetyTipsList = listOf(
        "\uD83D\uDCCD" to "Meet in a public place for exchanges",
        "\uD83D\uDD0D" to "Inspect the item thoroughly before paying",
        "\uD83D\uDCB3" to "Don't share personal financial information",
        "\uD83D\uDD12" to "Use MHub secure payment when possible",
    )
    
    `;
  const idx = content.indexOf(safetyComment);
  if (idx >= 0) {
    // Find the composable function body to add the val inside
    // Look backward for the function declaration
    const funcStart = content.lastIndexOf('@Composable', idx);
    // Find the opening { of the function
    if (funcStart >= 0) {
      const braceIdx = content.indexOf('{', funcStart);
      const beforeClose = content.lastIndexOf(')', braceIdx);
      const insertPoint = content.indexOf('\n', beforeClose) + 1;
      if (insertPoint > 0 && insertPoint < idx) {
        content = content.substring(0, insertPoint) + tipsListVars + content.substring(insertPoint);
        count++;
        console.log('  OK : Added safetyTipsList definition');
      }
    }
  } else {
    console.log('  FAIL: Could not find insertion point for safetyTipsList');
  }
}

// ─── Write back ──────────────────────────────────────────────────────
fs.writeFileSync(FILE, content, 'utf8');

const opens = (content.match(/{/g) || []).length;
const closes = (content.match(/}/g) || []).length;
console.log(`\nDone: ${count} changes. Lines: ${content.split('\n').length}. Braces: ${opens}/${closes} (diff=${opens - closes}).`);
