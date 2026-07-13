/**
 * Fix remaining errors - LF line endings version.
 */
const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, 'app/src/main/java/com/mhub/app/ui/profile/ProfileScreen.kt');
let content = fs.readFileSync(filePath, 'utf8');
let changes = 0;

// Check line endings
const hasCR = content.includes('\r\n');
console.log(`Line endings: ${hasCR ? 'CRLF' : 'LF'}`);
const EOL = hasCR ? '\r\n' : '\n';

// ─── Fix 1: Fix PreferencesEditDialog onSave call site ──────────────────
// The pattern with LF (or CRLF depending on file)
const oldCall = `            onDismiss = { showEditor = false },${EOL}            onSave = { loc, min, max ->${EOL}                onSave(loc, min, max)${EOL}                showEditor = false${EOL}            },`;
const newCall = `            onDismiss = { showEditor = false },${EOL}            onSave = { loc, min, max, cats ->${EOL}                onSave(loc, min, max, cats)${EOL}                showEditor = false${EOL}            },`;

if (content.includes(oldCall)) {
  content = content.replace(oldCall, newCall);
  changes++;
  console.log('✓ Fixed PreferencesEditDialog onSave call site');
} else {
  console.log('✗ Could not find onSave call pattern');
  // Try to find it by line
  const lines = content.split(EOL);
  const onSaveIdx = lines.findIndex(l => l.includes('onSave = { loc, min, max ->'));
  if (onSaveIdx >= 0) {
    console.log(`  Found at line ${onSaveIdx + 1}`);
    lines[onSaveIdx] = lines[onSaveIdx].replace(
      'onSave = { loc, min, max ->',
      'onSave = { loc, min, max, cats ->'
    );
    // Also fix the next line
    if (lines[onSaveIdx + 1] && lines[onSaveIdx + 1].includes('onSave(loc, min, max)')) {
      lines[onSaveIdx + 1] = lines[onSaveIdx + 1].replace(
        'onSave(loc, min, max)',
        'onSave(loc, min, max, cats)'
      );
    }
    content = lines.join(EOL);
    changes++;
    console.log('✓ Fixed via line-based approach');
  }
}

// ─── Fix 2: Add AvatarWithRing after ProfileLocationParts ──────────────
// Find the closing of ProfileLocationParts data class
const partsEnd = `${EOL}    val city: String = "",${EOL})${EOL}${EOL}private val profileCountryOptions`;
if (content.includes(partsEnd)) {
  const avatarFunc = `${EOL}@Composable
private fun AvatarWithRing(initial: Char, completionPercent: Int, size: Dp) {
    val ringColor = Color(0xFF34D399)
    val ringTrack = Color.White.copy(alpha = 0.25f)
    val sweepAngle = 360f * completionPercent / 100f

    Box(contentAlignment = Alignment.Center, modifier = Modifier.size(size + 8.dp)) {
        Canvas(modifier = Modifier.size(size)) {
            val strokeWidth = 4.dp.toPx()
            val inset = strokeWidth / 2f
            val arcSize = Size(this.size.width - strokeWidth, this.size.height - strokeWidth)
            val topLeft = Offset(inset, inset)
            drawArc(
                color = ringTrack,
                startAngle = -90f,
                sweepAngle = 360f,
                useCenter = false,
                topLeft = topLeft,
                size = arcSize,
                style = Stroke(width = strokeWidth, cap = StrokeCap.Round),
            )
            drawArc(
                color = ringColor,
                startAngle = -90f,
                sweepAngle = sweepAngle,
                useCenter = false,
                topLeft = topLeft,
                size = arcSize,
                style = Stroke(width = strokeWidth, cap = StrokeCap.Round),
            )
        }
        Box(
            modifier = Modifier
                .size(size - 12.dp)
                .clip(CircleShape)
                .background(
                    Brush.linearGradient(
                        listOf(Color(0xFF6366F1), Color(0xFF8B5CF6)),
                    ),
                ),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = initial.toString(),
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = Color.White,
            )
        }
    }
}

`;
  content = content.replace(partsEnd, partsEnd + avatarFunc);
  changes++;
  console.log('✓ Added AvatarWithRing function');
} else {
  console.log('✗ Could not find ProfileLocationParts end');
  const lines = content.split(EOL);
  const lppIdx = lines.findIndex((l, i) => i > 1940 && l.includes('val city: String = ""'));
  if (lppIdx >= 0) {
    console.log(`  Found ProfileLocationParts city line at ${lppIdx + 1}`);
    // Insert after next closing brace
    for (let i = lppIdx; i < lppIdx + 5; i++) {
      if (lines[i] && lines[i].trim() === ')') {
        console.log(`  Inserting after line ${i + 1}`);
        const avatarLines = [
          '',
          '@Composable',
          'private fun AvatarWithRing(initial: Char, completionPercent: Int, size: Dp) {',
          '    val ringColor = Color(0xFF34D399)',
          '    val ringTrack = Color.White.copy(alpha = 0.25f)',
          '    val sweepAngle = 360f * completionPercent / 100f',
          '',
          '    Box(contentAlignment = Alignment.Center, modifier = Modifier.size(size + 8.dp)) {',
          '        Canvas(modifier = Modifier.size(size)) {',
          '            val strokeWidth = 4.dp.toPx()',
          '            val inset = strokeWidth / 2f',
          '            val arcSize = Size(this.size.width - strokeWidth, this.size.height - strokeWidth)',
          '            val topLeft = Offset(inset, inset)',
          '            drawArc(',
          '                color = ringTrack,',
          '                startAngle = -90f,',
          '                sweepAngle = 360f,',
          '                useCenter = false,',
          '                topLeft = topLeft,',
          '                size = arcSize,',
          '                style = Stroke(width = strokeWidth, cap = StrokeCap.Round),',
          '            )',
          '            drawArc(',
          '                color = ringColor,',
          '                startAngle = -90f,',
          '                sweepAngle = sweepAngle,',
          '                useCenter = false,',
          '                topLeft = topLeft,',
          '                size = arcSize,',
          '                style = Stroke(width = strokeWidth, cap = StrokeCap.Round),',
          '            )',
          '        }',
          '        Box(',
          '            modifier = Modifier',
          '                .size(size - 12.dp)',
          '                .clip(CircleShape)',
          '                .background(',
          '                    Brush.linearGradient(',
          '                        listOf(Color(0xFF6366F1), Color(0xFF8B5CF6)),',
          '                    ),',
          '                ),',
          '            contentAlignment = Alignment.Center,',
          '        ) {',
          '            Text(',
          '                text = initial.toString(),',
          '                style = MaterialTheme.typography.headlineSmall,',
          '                fontWeight = FontWeight.Bold,',
          '                color = Color.White,',
          '            )',
          '        }',
          '    }',
          '}',
          '',
        ];
        lines.splice(i + 1, 0, ...avatarLines);
        content = lines.join(EOL);
        changes++;
        console.log('✓ Added AvatarWithRing via line-based approach');
        break;
      }
    }
  }
}

// ─── Write back ────────────────────────────────────────────────────────────
fs.writeFileSync(filePath, content, 'utf8');
console.log(`\n✅ Applied ${changes} changes`);
