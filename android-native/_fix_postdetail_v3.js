/**
 * PostDetailScreen v3 - exact string matching from HEAD
 * 1. Fix safety tips section comment + border glow
 * 2. Fix safety-at-a-glance tiles  
 */
const fs = require('fs');
const path = require('path');

const FILE = path.resolve(__dirname, 'app/src/main/java/com/mhub/app/ui/home/PostDetailScreen.kt');
let content = fs.readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n');
let count = 0;

function replace(oldStr, newStr, desc) {
  const idx = content.indexOf(oldStr);
  if (idx < 0) { console.log(`  FAIL: ${desc}`); return false; }
  content = content.substring(0, idx) + newStr + content.substring(idx + oldStr.length);
  count++;
  console.log(`  OK : ${desc}`);
  return true;
}

// ─── 0. Add HorizontalDivider import if missing ──────────────────────
if (!content.includes('import androidx.compose.material3.HorizontalDivider')) {
  replace(
    'import androidx.compose.material3.HorizontalDivider\n',
    '', // No-op - it's already there or doesn't exist
    'HorizontalDivider import check'
  );
}
// Actually add it if truly missing
if (!content.includes('HorizontalDivider')) {
  // Find a material3 import to add after
  const m3Idx = content.indexOf('import androidx.compose.material3.');
  if (m3Idx >= 0) {
    const endOfLine = content.indexOf('\n', m3Idx);
    if (endOfLine >= 0) {
      content = content.substring(0, endOfLine + 1) + 'import androidx.compose.material3.HorizontalDivider\n' + content.substring(endOfLine + 1);
      count++;
      console.log('  OK : Added HorizontalDivider import');
    }
  }
}

// ─── 1. Enhance Safety Tips section ──────────────────────────────────
// Extract the exact safety tips section from file
const safetyComment = '        // Safety Tips (collapsible with highlight)';
const sIdx = content.indexOf(safetyComment);
if (sIdx >= 0) {
  // Find where this ends - the Card structure should end before "Safety at a Glance"
  const glanceComment = '                        // Safety at a Glance (3 emerald tiles';
  const gIdx = content.indexOf(glanceComment);
  
  if (gIdx > sIdx) {
    // Extract the full safety tips block (from comment to just before glance section)
    const block = content.substring(sIdx, gIdx);
    
    // Count braces in old block
    const oldOpen = (block.match(/{/g) || []).length;
    const oldClose = (block.match(/}/g) || []).length;
    console.log(`  Debug: old safety block length=${block.length}, {=${oldOpen}, }=${oldClose}, diff=${oldOpen - oldClose}`);
    
    // Build new block with same brace balance
    const indent = '        ';
    const subIndent = indent + '    ';
    
    const newBlockParts = [
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
      `${indent}                Text(if (safetyExpanded) "🛡️" else "⚠️", fontSize = 18.sp)`,
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
      `${indent}                ) {`,
      `${indent}                    Text("READ", fontSize = 9.sp, fontWeight = FontWeight.ExtraBold,`,
      `${indent}                        color = Color.White, modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp))`,
      `${indent}                }`,
      `${indent}                Text(if (safetyExpanded) "▲" else "▼", fontSize = 12.sp,`,
      `${indent}                    color = if (isDark) Color(0xFFFCD34D) else Color(0xFF92400E), fontWeight = FontWeight.Bold)`,
      `${indent}            }`,
      `${indent}        }`,
      `${indent}        if (safetyExpanded) {`,
      `${indent}            HorizontalDivider(color = if (isDark) Color(0xFFFCD34D).copy(alpha = 0.2f) else Color(0xFF92400E).copy(alpha = 0.2f))`,
      `${indent}            Spacer(Modifier.height(2.dp))`,
      `${indent}            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {`,
      `${indent}                Text("📍", fontSize = 14.sp)`,
      `${indent}                Text("Meet in a public place for exchanges", fontSize = 12.sp,`,
      `${indent}                    color = if (isDark) Color(0xFFFDE68A) else Color(0xFF78350F), fontWeight = FontWeight.Medium)`,
      `${indent}            }`,
      `${indent}            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {`,
      `${indent}                Text("🔍", fontSize = 14.sp)`,
      `${indent}                Text("Inspect the item thoroughly before paying", fontSize = 12.sp,`,
      `${indent}                    color = if (isDark) Color(0xFFFDE68A) else Color(0xFF78350F), fontWeight = FontWeight.Medium)`,
      `${indent}            }`,
      `${indent}            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {`,
      `${indent}                Text("💳", fontSize = 14.sp)`,
      `${indent}                Text("Don't share personal financial information", fontSize = 12.sp,`,
      `${indent}                    color = if (isDark) Color(0xFFFDE68A) else Color(0xFF78350F), fontWeight = FontWeight.Medium)`,
      `${indent}            }`,
      `${indent}            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {`,
      `${indent}                Text("🔒", fontSize = 14.sp)`,
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
      `\n`,
    ];
    const newBlock = newBlockParts.join('\n');
    
    const newOpen = (newBlock.match(/{/g) || []).length;
    const newClose = (newBlock.match(/}/g) || []).length;
    console.log(`  Debug: new safety block {=${newOpen}, }=${newClose}, diff=${newOpen - newClose}`);
    
    if (oldOpen - oldClose === newOpen - newClose) {
      replace(block, newBlock, 'Enhance safety tips section');
    } else {
      console.log(`  FAIL: Brace balance mismatch old(${oldOpen - oldClose}) vs new(${newOpen - newClose})`);
    }
  } else {
    console.log('  FAIL: Could not find glance section after safety tips');
  }
} else {
  console.log('  FAIL: Safety tips comment not found');
}

// ─── 2. Enhance Safety at a Glance tiles ────────────────────────────
const glanceOld = content.substring(
  content.indexOf('                        // Safety at a Glance (3 emerald tiles'),
  content.indexOf('\n\n', content.indexOf('                        // Safety at a Glance (3 emerald tiles')) + 1
);

if (glanceOld && glanceOld.length > 20) {
  // Count braces
  const oldGOpen = (glanceOld.match(/{/g) || []).length;
  const oldGClose = (glanceOld.match(/}/g) || []).length;
  console.log(`  Debug: old glance {=${oldGOpen}, }=${oldGClose}, diff=${oldGOpen - oldGClose}`);
  
  const indent = '                        ';
  const newGlance = 
    `${indent}// Safety at a Glance (3 highlighted tiles)\n` +
    `${indent}Row(\n` +
    `${indent}    modifier = Modifier.fillMaxWidth(),\n` +
    `${indent}    horizontalArrangement = Arrangement.spacedBy(8.dp),\n` +
    `${indent}) {\n` +
    `${indent}    val safetyItems = listOf(\n` +
    `${indent}        "🤝" to "Public Meetup",\n` +
    `${indent}        "💰" to "No Pre-payment",\n` +
    `${indent}        "🔍" to "Verify Listing ID",\n` +
    `${indent}    )\n` +
    `${indent}    safetyItems.forEach { (emoji, label) ->\n` +
    `${indent}        Surface(\n` +
    `${indent}            shape = RoundedCornerShape(12.dp),\n` +
    `${indent}            color = if (isDark) Color(0xFF064E3B).copy(alpha = 0.6f) else Color(0xFFECFDF5),\n` +
    `${indent}            border = BorderStroke(1.dp, if (isDark) Color(0xFF10B981).copy(alpha = 0.5f) else Color(0xFF6EE7B7)),\n` +
    `${indent}            modifier = Modifier.weight(1f),\n` +
    `${indent}        ) {\n` +
    `${indent}            Column(\n` +
    `${indent}                modifier = Modifier.padding(vertical = 12.dp),\n` +
    `${indent}                horizontalAlignment = Alignment.CenterHorizontally,\n` +
    `${indent}            ) {\n` +
    `${indent}                Text(emoji, fontSize = 22.sp)\n` +
    `${indent}                Spacer(Modifier.height(4.dp))\n` +
    `${indent}                Text(label, fontSize = 11.sp, color = if (isDark) Color(0xFF6EE7B7) else Color(0xFF065F46), fontWeight = FontWeight.SemiBold, textAlign = TextAlign.Center)\n` +
    `${indent}            }\n` +
    `${indent}        }\n` +
    `${indent}    }\n` +
    `${indent}}`;
    
  const newGOpen = (newGlance.match(/{/g) || []).length;
  const newGClose = (newGlance.match(/}/g) || []).length;
  console.log(`  Debug: new glance {=${newGOpen}, }=${newGClose}, diff=${newGOpen - newGClose}`);
  
  if (oldGOpen - oldGClose === newGOpen - newGClose) {
    replace(glanceOld, newGlance, 'Enhance safety-at-a-glance tiles');
  } else {
    console.log(`  FAIL: Glance brace balance mismatch old(${oldGOpen - oldGClose}) vs new(${newGOpen - newGClose})`);
  }
} else {
  console.log('  FAIL: Glance section not found');
}

// ─── Write back ──────────────────────────────────────────────────────
fs.writeFileSync(FILE, content, 'utf8');

const opens = (content.match(/{/g) || []).length;
const closes = (content.match(/}/g) || []).length;
console.log(`\nDone: ${count} changes. Lines: ${content.split('\n').length}. Braces: ${opens}/${closes} (diff=${opens - closes}).`);
