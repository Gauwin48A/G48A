/**
 * Minimal fix for remaining issues - CRLF aware.
 * Reads file raw, replaces exact CRLF patterns.
 */
const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, 'app/src/main/java/com/mhub/app/ui/profile/ProfileScreen.kt');
let content = fs.readFileSync(filePath, 'utf8');
const CR = '\r\n';

let changes = 0;

// ─── Fix 1: Replace broken action buttons ──────────────────────────────────
const brokenActions = 
`                        // ─── Action Buttons ────────────────────────────────────` + CR +
`                        var showMoreMenu by remember { mutableStateOf(false) }` + CR +
`                            if (state.isOwnProfile) {` + CR +
`                                // Empty for own profile — no action buttons` + CR +
`                            } else {`;

const fixedActions = 
`                        // ─── Action Buttons ────────────────────────────────────` + CR +
`                        Row(` + CR +
`                            modifier = Modifier` + CR +
`                                .fillMaxWidth()` + CR +
`                                .padding(horizontal = 14.dp, vertical = 10.dp),` + CR +
`                            horizontalArrangement = Arrangement.spacedBy(8.dp),` + CR +
`                            verticalAlignment = Alignment.CenterVertically,` + CR +
`                        ) {` + CR +
`                            if (state.isOwnProfile) {` + CR +
`                                // Empty for own profile — no action buttons` + CR +
`                            } else {`;

if (content.includes(brokenActions)) {
  content = content.replace(brokenActions, fixedActions);
  changes++;
  console.log('✓ Fixed action buttons: added Row wrapper');
} else {
  console.log('✗ Could not match broken action buttons');
}

// ─── Fix 2: Remove orphaned extra braces ──────────────────────────────────
const brokenEnd = `                                }` + CR +
`                            }` + CR +
`                            }` + CR +
`                        }` + CR +
`                        // ─── Profile Tabs`;
const fixedEnd = `                                }` + CR +
`                            }` + CR +
`                        }` + CR +
`                        // ─── Profile Tabs`;

if (content.includes(brokenEnd)) {
  content = content.replace(brokenEnd, fixedEnd);
  changes++;
  console.log('✓ Fixed extra braces');
} else {
  console.log('✗ Could not match extra braces');
}

// ─── Fix 3: Update PreferencesEditDialog onSave ──────────────────────────
const oldDialogCall = `            onSave = { loc, min, max ->` + CR +
`                onSave(loc, min, max)` + CR +
`                showEditor = false` + CR +
`            },` + CR +
`        )` + CR +
`    }` + CR +
`}` + CR +
`` + CR +
`@Composable` + CR +
`private fun PreferencesEditDialog(`;

const newDialogCall = `            onSave = { loc, min, max, cats ->` + CR +
`                onSave(loc, min, max, cats)` + CR +
`                showEditor = false` + CR +
`            },` + CR +
`        )` + CR +
`    }` + CR +
`}` + CR +
`` + CR +
`@Composable` + CR +
`private fun PreferencesEditDialog(`;

if (content.includes(oldDialogCall)) {
  content = content.replace(oldDialogCall, newDialogCall);
  changes++;
  console.log('✓ Updated PreferencesEditDialog onSave');
} else {
  console.log('✗ Could not match PreferencesEditDialog call');
}

// ─── Write back ────────────────────────────────────────────────────────────
fs.writeFileSync(filePath, content, 'utf8');
console.log(`\n✅ Applied ${changes} changes`);
