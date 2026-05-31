/**
 * Fix all U+FFFD replacement characters in Kotlin source files.
 * Replaces them with the contextually correct emoji/symbol.
 */
const fs = require('fs');
const FFFD = '\uFFFD';

function fix(filePath, replacements) {
  let text = fs.readFileSync(filePath, 'utf8');
  let changed = 0;
  for (const [from, to] of replacements) {
    const before = text;
    text = text.split(from).join(to);
    if (text !== before) changed++;
  }
  fs.writeFileSync(filePath, text, 'utf8');
  console.log(`Fixed ${filePath.split('\\').pop()}: ${changed} replacements`);
}

const BASE = 'C:/Users/laksh/GITHUB/1hub_rep2/G48A/android-native/app/src/main/java/com/mhub/app/ui';

// ─────────────────────────────────────────────────────────────
// ExploreScreen.kt
// ─────────────────────────────────────────────────────────────
fix(BASE + '/explore/ExploreScreen.kt', [
  // categoryEmoji function
  ['n.contains("electron") || n.contains("tech") || n.contains("gadget") -> "' + FFFD + '"', 'n.contains("electron") || n.contains("tech") || n.contains("gadget") -> "\uD83D\uDCBB"'],
  ['n.contains("fashion") || n.contains("cloth") || n.contains("apparel") -> "' + FFFD + '"', 'n.contains("fashion") || n.contains("cloth") || n.contains("apparel") -> "\uD83D\uDC57"'],
  ['n.contains("vehicle") || n.contains("car") || n.contains("bike") || n.contains("motor") -> "' + FFFD + '"', 'n.contains("vehicle") || n.contains("car") || n.contains("bike") || n.contains("motor") -> "\uD83D\uDE97"'],
  ['n.contains("furniture") || n.contains("home") || n.contains("decor") -> "' + FFFD + '\uFE0F"', 'n.contains("furniture") || n.contains("home") || n.contains("decor") -> "\uD83C\uDFE0"'],
  ['n.contains("book") || n.contains("education") || n.contains("study") -> "' + FFFD + '"', 'n.contains("book") || n.contains("education") || n.contains("study") -> "\uD83D\uDCDA"'],
  ['n.contains("food") || n.contains("grocery") || n.contains("restaurant") -> "' + FFFD + '"', 'n.contains("food") || n.contains("grocery") || n.contains("restaurant") -> "\uD83C\uDF54"'],
  ['n.contains("job") || n.contains("service") || n.contains("freelan") -> "' + FFFD + '"', 'n.contains("job") || n.contains("service") || n.contains("freelan") -> "\uD83D\uDCBC"'],
  ['n.contains("toy") || n.contains("game") || n.contains("kid") -> "' + FFFD + '"', 'n.contains("toy") || n.contains("game") || n.contains("kid") -> "\uD83C\uDFAE"'],
  ['n.contains("health") || n.contains("beauty") || n.contains("cosmetic") -> "' + FFFD + '"', 'n.contains("health") || n.contains("beauty") || n.contains("cosmetic") -> "\uD83D\uDC84"'],
  ['n.contains("pet") || n.contains("animal") -> "' + FFFD + '"', 'n.contains("pet") || n.contains("animal") -> "\uD83D\uDC3E"'],
  ['n.contains("music") || n.contains("instrument") -> "' + FFFD + '"', 'n.contains("music") || n.contains("instrument") -> "\uD83C\uDFB5"'],
  ['n.contains("art") || n.contains("craft") || n.contains("handmade") -> "' + FFFD + '"', 'n.contains("art") || n.contains("craft") || n.contains("handmade") -> "\uD83C\uDFA8"'],
  ['else -> "' + FFFD + '\uFE0F"', 'else -> "\uD83C\uDFF7\uFE0F"'],
  // category label strings
  ['"electronics" -> "' + FFFD + ' Electronics"', '"electronics" -> "\uD83D\uDCBB Electronics"'],
  ['"fashion" -> "' + FFFD + ' Fashion"', '"fashion" -> "\uD83D\uDC57 Fashion"'],
  ['"vehicles" -> "' + FFFD + ' Vehicles"', '"vehicles" -> "\uD83D\uDE97 Vehicles"'],
  // GreatDealsBanner
  ['badge = "LIMITED TIME", badgeIcon = "' + FFFD + '"', 'badge = "LIMITED TIME", badgeIcon = "\uD83D\uDD25"'],
  ['ctaText = "Shop Now", emoji = "' + FFFD + '"', 'ctaText = "Shop Now", emoji = "\uD83D\uDED2"'],
  ['ctaText = "Explore", emoji = "' + FFFD + '"', 'ctaText = "Explore", emoji = "\u2728"'],
  ['ctaText = "Browse", emoji = "' + FFFD + '\uFE0F"', 'ctaText = "Browse", emoji = "\uD83D\uDEE1\uFE0F"'],
  // HOT badge fire emoji
  ['Text("' + FFFD + '", fontSize = 10.sp)', 'Text("\uD83D\uDD25", fontSize = 10.sp)'],
]);

// ─────────────────────────────────────────────────────────────
// HomeScreen.kt
// ─────────────────────────────────────────────────────────────
fix(BASE + '/home/HomeScreen.kt', [
  ['"electronics", "Electronics", "' + FFFD + '"', '"electronics", "Electronics", "\uD83D\uDCBB"'],
  ['"fashion", "Fashion", "' + FFFD + '"', '"fashion", "Fashion", "\uD83D\uDC57"'],
  ['"vehicles", "Vehicles", "' + FFFD + '"', '"vehicles", "Vehicles", "\uD83D\uDE97"'],
  ['Text("' + FFFD + '", fontSize = 14.sp)', 'Text("\uD83D\uDCBB", fontSize = 14.sp)'],
  ['Triple("' + FFFD + '\uFE0F Great Deals"', 'Triple("\uD83C\uDF81 Great Deals"'],
  ['Triple("' + FFFD + ' Near You"', 'Triple("\uD83D\uDCCD Near You"'],
]);

// ─────────────────────────────────────────────────────────────
// RewardsScreen.kt
// ─────────────────────────────────────────────────────────────
fix(BASE + '/rewards/RewardsScreen.kt', [
  ['TierCard("Bronze ' + FFFD + '"', 'TierCard("Bronze \uD83E\uDD49"'],
  ['TierCard("Silver ' + FFFD + '"', 'TierCard("Silver \uD83E\uDD48"'],
  ['TierCard("Gold ' + FFFD + '"', 'TierCard("Gold \uD83E\uDD47"'],
  // Spin wheel
  ['Text("' + FFFD + '", modifier = Modifier.graphicsLayer(rotationZ = spinRot)', 'Text("\uD83C\uDFB0", modifier = Modifier.graphicsLayer(rotationZ = spinRot)'],
  ['Text(if (canSpin) "' + FFFD + ' Spin" else "' + FFFD + ' Spun', 'Text(if (canSpin) "\uD83C\uDFB0 Spin" else "\uD83C\uDFB0 Spun'],
  // Scratch card
  ['Text("' + FFFD + '", modifier = Modifier.graphicsLayer(scaleX = scratchScale', 'Text("\uD83C\uDFB4", modifier = Modifier.graphicsLayer(scaleX = scratchScale'],
  ['Text(if (canScratch) "' + FFFD + ' Scratch', 'Text(if (canScratch) "\uD83C\uDFB4 Scratch'],
  ['"' + FFFD + '" else "' + FFFD + ' None"', '"\uD83C\uDFB4" else "\uD83C\uDFB4 None"'],
  // Earn playbook rows
  ['EarnPlaybookRow("' + FFFD + '", "Invite Friends"', 'EarnPlaybookRow("\uD83D\uDC65", "Invite Friends"'],
  ['EarnPlaybookRow("' + FFFD + '", "Daily Visit"', 'EarnPlaybookRow("\uD83D\uDCC5", "Daily Visit"'],
  ['EarnPlaybookRow("' + FFFD + '", "Create Post"', 'EarnPlaybookRow("\u270D\uFE0F", "Create Post"'],
  ['EarnPlaybookRow("' + FFFD + '", "Share Post"', 'EarnPlaybookRow("\uD83D\uDCE4", "Share Post"'],
  ['EarnPlaybookRow("' + FFFD + '", "Complete Sale"', 'EarnPlaybookRow("\uD83D\uDCB0", "Complete Sale"'],
  ['EarnPlaybookRow("' + FFFD + '", "Make Purchase"', 'EarnPlaybookRow("\uD83D\uDED2", "Make Purchase"'],
  // Redeem cards
  ['RedeemCard("' + FFFD + '", "Listing Boost"', 'RedeemCard("\uD83D\uDE80", "Listing Boost"'],
  ['RedeemCard("' + FFFD + '", "Top Placement"', 'RedeemCard("\u2B50", "Top Placement"'],
  ['RedeemCard("' + FFFD + '", "$5 Gift Card"', 'RedeemCard("\uD83C\uDF81", "$5 Gift Card"'],
  ['RedeemCard("' + FFFD + '", "$10 Voucher"', 'RedeemCard("\uD83C\uDFAB", "$10 Voucher"'],
  ['RedeemCard("' + FFFD + '", "Custom Theme"', 'RedeemCard("\uD83C\uDFA8", "Custom Theme"'],
  ['RedeemCard("' + FFFD + '\uFE0F", "Badge Pack"', 'RedeemCard("\uD83C\uDFF7\uFE0F", "Badge Pack"'],
  // Locked / confetti / gift
  ['Text("' + FFFD + ' Locked"', 'Text("\uD83D\uDD12 Locked"'],
  ['Text("' + FFFD + '", style = MaterialTheme.typography.displayLarge', 'Text("\uD83C\uDF89", style = MaterialTheme.typography.displayLarge'],
  ['Text("' + FFFD + '", fontSize = 28.sp)', 'Text("\uD83C\uDF81", fontSize = 28.sp)'],
]);

// ─────────────────────────────────────────────────────────────
// FeedScreen.kt (remaining FFFD after prior partial fix)
// ─────────────────────────────────────────────────────────────
fix(BASE + '/feed/FeedScreen.kt', [
  ['"Shuffle" to "' + FFFD + ' Shuffle"', '"Shuffle" to "\uD83D\uDD00 Shuffle"'],
  ['"Recent" to "' + FFFD + ' Newest"', '"Recent" to "\uD83D\uDD52 Newest"'],
  ['"Updated" to "' + FFFD + ' Updated"', '"Updated" to "\u26A1 Updated"'],
  ['"Views" to "' + FFFD + ' Popular"', '"Views" to "\uD83D\uDC41 Popular"'],
  ['"Title" to "' + FFFD + ' Title"', '"Title" to "\uD83D\uDDD2 Title"'],
  ['"Great listing! ' + FFFD + '" to "User_A"', '"Great listing! \uD83D\uDC4D" to "User_A"'],
  ['"Amazing price ' + FFFD + '" to "User_C"', '"Amazing price \uD83D\uDCB0" to "User_C"'],
]);

console.log('\nDone. Verifying...');
const allFiles = [
  BASE + '/explore/ExploreScreen.kt',
  BASE + '/home/HomeScreen.kt',
  BASE + '/rewards/RewardsScreen.kt',
  BASE + '/feed/FeedScreen.kt',
];
allFiles.forEach(p => {
  const text = fs.readFileSync(p, 'utf8');
  const count = (text.match(/\uFFFD/g) || []).length;
  console.log(p.split('/').pop(), ':', count === 0 ? 'CLEAN' : count + ' FFFD remaining');
});
