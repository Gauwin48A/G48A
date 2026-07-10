const fs = require('fs');
const path = 'app/src/main/java/com/mhub/app/ui/social/SocialScreens.kt';
let c = fs.readFileSync(path, 'utf8');

// Add missing imports for the new FeedCard
const newImports = 
  'import android.content.Intent\r\n' +
  'import androidx.compose.animation.core.animateFloatAsState\r\n' +
  'import androidx.compose.animation.core.spring\r\n' +
  'import androidx.compose.animation.core.Spring\r\n' +
  'import androidx.compose.ui.draw.scale\r\n' +
  'import androidx.compose.ui.hapticfeedback.HapticFeedbackType\r\n' +
  'import androidx.compose.ui.platform.LocalHapticFeedback\r\n';

if (!c.includes('import android.content.Intent')) {
  // Insert after the last import line
  const lastImportIdx = c.lastIndexOf('\r\nimport ');
  const endIdx = c.indexOf('\r\n', lastImportIdx + 1) + 2;
  c = c.substring(0, endIdx) + newImports + c.substring(endIdx);
  console.log('Added missing imports');
} else {
  console.log('Imports already exist');
}

// Fix: Color(0xFFE5E7EB) in search textfield -> MaterialTheme color
c = c.replace(
  'unfocusedBorderColor = Color(0xFFE5E7EB), focusedContainerColor = Color.White, unfocusedContainerColor = Color.White',
  'unfocusedBorderColor = MaterialTheme.colorScheme.outline, focusedContainerColor = MaterialTheme.colorScheme.surface, unfocusedContainerColor = MaterialTheme.colorScheme.surface'
);

// Fix density toggle: Color(0xFF2563EB) -> MaterialTheme.colorScheme.primary
c = c.replace(
  'color = if (sel) Color(0xFF2563EB) else Color.Transparent) {\n                    Text(icon, fontSize = 14.sp, color = if (sel) Color.White else Color(0xFF94A3B8)',
  'color = if (sel) MaterialTheme.colorScheme.primary else Color.Transparent) {\n                    Text(icon, fontSize = 14.sp, color = if (sel) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant'
);

// Fix sort chips: Color(0xFF2563EB) -> MaterialTheme.colorScheme.primary
c = c.replace(
  'color = if (sel) Color(0xFF2563EB) else Color.Transparent) {\n                                    Text(label, fontSize = 11.sp, color = if (sel) Color.White else Color(0xFF64748B)',
  'color = if (sel) MaterialTheme.colorScheme.primary else Color.Transparent) {\n                                    Text(label, fontSize = 11.sp, color = if (sel) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant'
);

// Fix density label color
c = c.replace(
  'Text(stringResource(R.string.social_density), fontSize = 11.sp, color = Color(0xFF94A3B8)',
  'Text(stringResource(R.string.social_density), fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant'
);

fs.writeFileSync(path, c);
console.log('Done');
