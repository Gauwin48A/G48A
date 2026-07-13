/**
 * Fix remaining build errors:
 * 1. Remove @Composable on ProfileLocationParts data class
 * 2. Fix PreferencesEditDialog onSave call site (3 params -> 4 params)
 * 3. Add back AvatarWithRing function
 */
const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, 'app/src/main/java/com/mhub/app/ui/profile/ProfileScreen.kt');
let content = fs.readFileSync(filePath, 'utf8');
let changes = 0;

// ─── Fix 1: Remove @Composable from ProfileLocationParts ────────────────
const composableDataClass = '@Composable\r\nprivate data class ProfileLocationParts(';
if (content.includes(composableDataClass)) {
  content = content.replace(composableDataClass, 'private data class ProfileLocationParts(');
  changes++;
  console.log('✓ Removed @Composable annotation from ProfileLocationParts data class');
} else {
  // Try with \n (LF)
  const composableDataClassLF = '@Composable\nprivate data class ProfileLocationParts(';
  if (content.includes(composableDataClassLF)) {
    content = content.replace(composableDataClassLF, 'private data class ProfileLocationParts(');
    changes++;
    console.log('✓ Removed @Composable annotation from ProfileLocationParts (LF)');
  } else {
    console.log('✗ Could not find @Composable on ProfileLocationParts');
  }
}

// ─── Fix 2: Fix PreferencesEditDialog onSave call site ──────────────────
const oldOnSave = `            onSave = { loc, min, max ->
                onSave(loc, min, max)
                showEditor = false
            },`;
const newOnSave = `            onSave = { loc, min, max, cats ->
                onSave(loc, min, max, cats)
                showEditor = false
            },`;

if (content.includes(oldOnSave)) {
  content = content.replace(oldOnSave, newOnSave);
  changes++;
  console.log('✓ Fixed PreferencesEditDialog onSave call site');
} else {
  console.log('✗ Could not find old onSave pattern');
  // Try without CR
  const oldOnSaveLF = `            onSave = { loc, min, max ->
                onSave(loc, min, max)
                showEditor = false
            },`;
  if (content.includes(oldOnSaveLF)) {
    content = content.replace(oldOnSaveLF, newOnSave);
    changes++;
    console.log('✓ Fixed PreferencesEditDialog onSave call site (LF)');
  } else {
    console.log('✗ Still could not find old onSave pattern');
  }
}

// ─── Fix 3: Add back AvatarWithRing function ────────────────────────────
// Find the ProfileLocationParts data class and insert AvatarWithRing after it
const locationPartsEnd = '    val city: String = "",\n)\n\nprivate fun parseProfileLocation';
const locationPartsEndCR = '    val city: String = "",\r\n)\r\n\r\nprivate fun parseProfileLocation';

const avatarFunc = `
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

if (content.includes(locationPartsEnd)) {
  content = content.replace(locationPartsEnd, locationPartsEnd + avatarFunc);
  changes++;
  console.log('✓ Added AvatarWithRing function after ProfileLocationParts');
} else if (content.includes(locationPartsEndCR)) {
  content = content.replace(locationPartsEndCR, locationPartsEndCR + avatarFunc);
  changes++;
  console.log('✓ Added AvatarWithRing function after ProfileLocationParts (CR)');
} else {
  console.log('✗ Could not find ProfileLocationParts end marker');
}

// ─── Write back ────────────────────────────────────────────────────────────
fs.writeFileSync(filePath, content, 'utf8');
console.log(`\n✅ Applied ${changes} changes`);
