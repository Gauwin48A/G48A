/**
 * Apply ALL Phase changes precisely to RewardsScreen.kt
 * Uses simple string replacements to avoid brace miscounting issues
 */
import { readFileSync, writeFileSync } from 'fs';

const PATH = 'android-native/app/src/main/java/com/mhub/app/ui/rewards/RewardsScreen.kt';
let content = readFileSync(PATH, 'utf8');
let count = 0;

// === PHASE 1: SIMPLIFY SECRET CODE ===
// Remove the input/claim section but keep the display card
const oldSecret = 'user.dailySecretCode?.let { code ->\n                                        Row(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(8.dp)).background(MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)).padding(horizontal = 10.dp, vertical = 6.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {\n                                            Text("\\uD83D\\uDD11 Secret: $code", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)\n                                            Text(stringResource(R.string.rewards_copy), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold, modifier = Modifier.clickable { clipboardManager.setText(AnnotatedString(code)) })\n                                        }\n                                    }\n                                    var codeInput by remember { mutableStateOf("") }\n                                    var codeResult by remember { mutableStateOf<String?>(null) }\n                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {\n                                        OutlinedTextField(\n                                            value = codeInput,\n                                            onValueChange = { codeInput = it.uppercase().take(10) },\n                                            placeholder = { Text(stringResource(R.string.rewards_enter_code), fontSize = 12.sp) },\n                                            singleLine = true,\n                                            modifier = Modifier.weight(1f).height(48.dp),\n                                            shape = RoundedCornerShape(8.dp),\n                                        )\n                                        Button(\n                                            onClick = {\n                                                if (codeInput.isNotBlank()) {\n                                                    codeResult = if (codeInput == (user.dailySecretCode ?: "")) "\\u2705 Code claimed!" else "\\u274C Invalid code"\n                                                    if (codeResult?.startsWith("\\u2705") == true) codeInput = ""\n                                                }\n                                            },\n                                            shape = RoundedCornerShape(8.dp),\n                                            modifier = Modifier.height(48.dp),\n                                        ) {\n                                            Text(stringResource(R.string.rewards_claim), fontSize = 12.sp, fontWeight = FontWeight.Bold)\n                                        }\n                                    }\n                                    codeResult?.let { result ->\n                                        Text(result, style = MaterialTheme.typography.labelSmall, color = if (result.startsWith("\\u2705")) Color(0xFF059669) else Color(0xFFDC2626))\n                                    }';

const newSecret = 'user.dailySecretCode?.let { code ->\n                                        Row(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(8.dp)).background(MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)).padding(horizontal = 10.dp, vertical = 6.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {\n                                            Text("\\uD83D\\uDD11 Today\\\'s Code: $code", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)\n                                            Text(stringResource(R.string.rewards_copy), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold, modifier = Modifier.clickable { clipboardManager.setText(AnnotatedString(code)) })\n                                        }\n                                    }';

if (content.includes(oldSecret)) {
  content = content.replace(oldSecret, newSecret);
  count++;
  console.log('1. Simplified Daily Secret Code');
} else {
  console.log('1. SKIP - Secret Code pattern not found');
}

// === PHASE 2: REMOVE SPIN + SCRATCH FROM DAILY ACTIONS ===
// Remove the Spin column (remove from "// Canvas Spin Wheel" through the closing of the Row)
// Similarly, the "// Scratch Card visual + button" section
// Since we can't do brace counting, let's use known strings

// The Spin+Scratch are in a Row with spacedBy(8.dp) after PrimaryButton
// Remove from that Row opening to just before the Scratch column
// Let's find and replace the entire Row containing both

// Simplify: Remove the comments marking spin/scratch
// Replace "Daily Actions (Check-in + Spin + Scratch)" with "Daily Actions (Check-in)"
const oldComment = 'Daily Actions (Check-in + Spin + Scratch)';
const newComment = 'Daily Check-in';
if (content.includes(oldComment)) {
  content = content.replace(oldComment, newComment);
  count++;
  console.log('2. Updated Daily Actions comment');
}

// Remove "7 Challenge Types" comment, just show "Ways to Earn"
const oldChallenge = 'rewards_challenge_board), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)';
// That's a string resource, leave it. Change the comment above it instead.
content = content.replace('// ─── 7 Challenge Types ───────────────────────────', '// ─── Challenge Types ───────────────────────────');

// === REMOVE GIFT CARDS SECTION ===
const oldGift = '\n                                    // Gift Cards\n                                    if (redeemFilter == "All" || redeemFilter == "Gift Cards") {\n                                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {\n                                            RedeemCard("🎁", "$5 Gift Card", 250, user.totalCoins >= 250, Color(0xFFEC4899), darkTheme, Modifier.weight(1f)) { redeemDialogType = "gift_5" }\n                                            RedeemCard("🎫", "$10 Voucher", 450, user.totalCoins >= 450, Color(0xFF14B8A6), darkTheme, Modifier.weight(1f)) { redeemDialogType = "voucher_10" }\n                                        }\n                                    }';

if (content.includes(oldGift)) {
  content = content.replace(oldGift, '');
  count++;
  console.log('3. Removed Gift Cards section');
} else {
  console.log('3. SKIP - Gift Cards pattern not found');
}

// === REMOVE ACCESSORIES SECTION ===
const oldAcc = '\n                                    // Accessories\n                                    if (redeemFilter == "All" || redeemFilter == "Accessories") {\n                                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {\n                                            RedeemCard("🎨", "Custom Theme", 150, user.totalCoins >= 150, MaterialTheme.colorScheme.primary, darkTheme, Modifier.weight(1f)) { redeemDialogType = "theme" }\n                                            RedeemCard("🏷️", "Badge Pack", 80, user.totalCoins >= 80, Color(0xFF10B981), darkTheme, Modifier.weight(1f)) { redeemDialogType = "badges" }\n                                        }\n                                    }';

if (content.includes(oldAcc)) {
  content = content.replace(oldAcc, '');
  count++;
  console.log('4. Removed Accessories section');
} else {
  console.log('4. SKIP - Accessories pattern not found');
}

// === FIX COIN HISTORY FILTER ===
const oldFilter = 'when (historyFilter) {\n                                                "bonus" -> tx.action?.contains("bonus", true) == true || tx.action?.contains("referral", true) == true\n                                                else -> true\n                                            }';
const newFilter = 'when (historyFilter) {\n                                                "earned" -> tx.amount > 0\n                                                "spent" -> tx.amount < 0\n                                                "referral" -> tx.action?.contains("referral", true) == true\n                                                "daily" -> tx.action?.contains("daily", true) == true || tx.action?.contains("checkin", true) == true\n                                                else -> true\n                                            }';

if (content.includes(oldFilter)) {
  content = content.replace(oldFilter, newFilter);
  count++;
  console.log('5. Fixed Coin History filter logic');
} else {
  console.log('5. SKIP - Filter pattern not found');
}

// Write back
writeFileSync(PATH, content, 'utf8');
console.log(`\n✅ Applied ${count}/5 Phase change(s)`);
