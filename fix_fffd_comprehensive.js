/**
 * fix_fffd_comprehensive.js
 * Fixes all remaining U+FFFD replacement chars across all Kotlin UI files.
 * Each replacement is keyed by a unique context string.
 */
const fs = require('fs');
const path = require('path');
const FFFD = '\uFFFD';

const BASE = 'C:/Users/laksh/GITHUB/1hub_rep2/G48A/android-native/app/src/main/java/com/mhub/app/ui';

function findFile(name, dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = dir + '/' + f;
    if (fs.statSync(full).isDirectory()) { const r = findFile(name, full); if (r) return r; }
    else if (f === name) return full;
  }
  return null;
}

function fixLines(filePath, lineReplacements) {
  let text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split('\n');
  let changed = 0;
  for (const [lineIdx, from, to] of lineReplacements) {
    const l = lines[lineIdx - 1]; // 1-based
    if (l === undefined) continue;
    if (l.includes(from)) {
      lines[lineIdx - 1] = l.replace(from, to);
      changed++;
    } else {
      console.warn(`  WARNING: line ${lineIdx} did not match "${from.substring(0, 40)}..." in ${path.basename(filePath)}`);
    }
  }
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  console.log(`${path.basename(filePath)}: ${changed} fixed`);
}

function fixText(filePath, replacements) {
  let text = fs.readFileSync(filePath, 'utf8');
  let changed = 0;
  for (const [from, to] of replacements) {
    const before = text;
    text = text.split(from).join(to);
    if (text !== before) changed++;
  }
  fs.writeFileSync(filePath, text, 'utf8');
  console.log(`${path.basename(filePath)}: ${changed} fixed`);
}

// ─── AccountScreens.kt ───────────────────────────────────────
const accPath = findFile('AccountScreens.kt', BASE);
if (accPath) fixLines(accPath, [
  [290, '1 -> "' + FFFD + '"', '1 -> "\uD83E\uDD47"'],  // 🥇
  [291, '2 -> "' + FFFD + '"', '2 -> "\uD83E\uDD48"'],  // 🥈
  [292, '3 -> "' + FFFD + '"', '3 -> "\uD83E\uDD49"'],  // 🥉
]);

// ─── CategoriesScreen.kt ──────────────────────────────────────
const catscPath = findFile('CategoriesScreen.kt', BASE);
if (catscPath) {
  let text = fs.readFileSync(catscPath, 'utf8');
  const lines = text.split('\n');
  let ch = 0;
  // GROUP_EMOJIS map - line 124 has multiple FFFD
  lines[123] = lines[123]
    .replace('"All" to "' + FFFD + '"', '"All" to "\uD83C\uDFEA"')
    .replace('"Electronics" to "' + FFFD + '"', '"Electronics" to "\uD83D\uDCBB"')
    .replace('"Fashion" to "' + FFFD + '"', '"Fashion" to "\uD83D\uDC57"')
    .replace('"Vehicles" to "' + FFFD + '"', '"Vehicles" to "\uD83D\uDE97"');
  // The "Others" part may be truncated — fix any remaining FFFD on that line
  lines[123] = lines[123].replace(new RegExp(FFFD, 'g'), '\uD83D\uDED2');
  ch++;
  // categoryEmoji when block (same pattern as ExploreScreen)
  const catEmojiMap = [
    [359, '"electron"', '\uD83D\uDCBB'],  // 💻
    [360, '"fashion"', '\uD83D\uDC57'],   // 👗
    [361, '"vehicle"', '\uD83D\uDE97'],   // 🚗
    [362, '"furniture"', '\uD83C\uDFE0'], // 🏠
    [363, '"book"', '\uD83D\uDCDA'],      // 📚
    [365, '"food"', '\uD83C\uDF54'],      // 🍔
    [366, '"job"', '\uD83D\uDCBC'],       // 💼
    [367, '"real estate"', '\uD83C\uDFE0'], // 🏠
    [368, '"toy"', '\uD83C\uDFAE'],       // 🎮
    [369, '"health"', '\uD83D\uDC84'],    // 💄
    [370, '"pet"', '\uD83D\uDC3E'],       // 🐾
    [371, '"music"', '\uD83C\uDFB5'],     // 🎵
    [372, '"art"', '\uD83C\uDFA8'],       // 🎨
    [373, 'else ->', '\uD83C\uDFF7\uFE0F'], // 🏷️
  ];
  for (const [lineIdx, keyword, emoji] of catEmojiMap) {
    const l = lines[lineIdx - 1];
    if (l && l.includes(keyword) && l.includes(FFFD)) {
      lines[lineIdx - 1] = l.replace(new RegExp(FFFD + '(\uFE0F)?', 'g'), emoji);
      ch++;
    }
  }
  fs.writeFileSync(catscPath, lines.join('\n'), 'utf8');
  console.log(`CategoriesScreen.kt: ${ch} fixed`);
}

// ─── CategoryAppShell.kt ──────────────────────────────────────
const casPath = findFile('CategoryAppShell.kt', BASE);
if (casPath) fixLines(casPath, [
  [94, '"electronics", "Electronics", "' + FFFD + '"', '"electronics", "Electronics", "\uD83D\uDCBB"'],
  [95, '"fashion",     "Fashion",     "' + FFFD + '"', '"fashion",     "Fashion",     "\uD83D\uDC57"'],
  [96, '"vehicles",    "Vehicles",    "' + FFFD + '"', '"vehicles",    "Vehicles",    "\uD83D\uDE97"'],
]);

// ─── CategoryHomeScreen.kt ────────────────────────────────────
const cthPath = findFile('CategoryHomeScreen.kt', BASE);
if (cthPath) fixText(cthPath, [
  ['"' + FFFD + ' Trending Now"', '"\uD83D\uDD25 Trending Now"'],
]);

// ─── ProductListingScreen.kt ─────────────────────────────────
const plsPath = findFile('ProductListingScreen.kt', BASE);
if (plsPath) {
  let text = fs.readFileSync(plsPath, 'utf8');
  const lines = text.split('\n');
  lines.forEach((l, i) => {
    if (l.includes(FFFD)) {
      if (l.includes('Great Deals')) lines[i] = l.replace(FFFD, '\uD83C\uDF89');       // 🎉
      else lines[i] = l.replace(new RegExp(FFFD + '(\uFE0F)?'), '\uD83D\uDCE6');       // 📦 empty state
    }
  });
  fs.writeFileSync(plsPath, lines.join('\n'), 'utf8');
  console.log('ProductListingScreen.kt: fixed');
}

// ─── ChannelScreens.kt ────────────────────────────────────────
const chPath = findFile('ChannelScreens.kt', BASE);
if (chPath) fixText(chPath, [
  ['"' + FFFD + ' $it"', '"\uD83D\uDCCD $it"'],  // 📍 location
]);

// ─── ChatScreen.kt ────────────────────────────────────────────
const chatPath = findFile('ChatScreen.kt', BASE);
if (chatPath) {
  const reactions = ['\uD83D\uDC4D', '\uD83D\uDE02', '\uD83D\uDE2E', '\uD83D\uDE22', '\uD83D\uDD25'];  // 👍😂😮😢🔥
  let text = fs.readFileSync(chatPath, 'utf8');
  const lines = text.split('\n');
  lines.forEach((l, i) => {
    if (!l.includes(FFFD)) return;
    if (l.includes('fontSize = 48.sp') || (l.trim().startsWith('Text("' + FFFD + '"') && lines[i+1]?.includes('48.sp'))) {
      lines[i] = l.replace(FFFD, '\uD83D\uDCAC'); // 💬 sign in empty state
    } else if (l.includes('Attachment')) {
      lines[i] = l.replace(FFFD, '\uD83D\uDCCE'); // 📎
    } else if (l.includes('listOf(') && l.includes('\u2764\uFE0F')) {
      // Reactions list: replace each FFFD in order
      let idx = 0;
      lines[i] = l.replace(new RegExp(FFFD, 'g'), () => reactions[idx++] || '\uD83D\uDCAD');
    } else if (l.includes('val reactions')) {
      let idx = 0;
      lines[i] = l.replace(new RegExp(FFFD, 'g'), () => reactions[idx++] || '\uD83D\uDCAD');
    } else {
      lines[i] = l.replace(FFFD, '\uD83D\uDCAC'); // fallback 💬
    }
  });
  fs.writeFileSync(chatPath, lines.join('\n'), 'utf8');
  console.log('ChatScreen.kt: fixed');
}

// ─── CommerceScreens.kt ──────────────────────────────────────
const commPath = findFile('CommerceScreens.kt', BASE);
if (commPath) {
  let text = fs.readFileSync(commPath, 'utf8');
  const lines = text.split('\n');
  lines.forEach((l, i) => {
    if (!l.includes(FFFD)) return;
    if (l.includes('"call" to "')) {
      lines[i] = l.replace(FFFD, '\uD83D\uDCDE'); // 📞 Call
    } else if (l.includes('"chat" to "')) {
      lines[i] = l.replace(FFFD, '\uD83D\uDCAC'); // 💬 Chat
    } else if (l.includes('Rewards Earned')) {
      lines[i] = l.replace(FFFD, '\uD83C\uDF89'); // 🎉
    } else if (l.includes('View your post')) {
      lines[i] = l.replace(FFFD, '\uD83D\uDCE6'); // 📦
    } else if (l.includes('List more items')) {
      lines[i] = l.replace(FFFD, '\uD83D\uDE80'); // 🚀
    } else if (l.includes('Safe Process')) {
      lines[i] = l.replace(FFFD, '\uD83D\uDEE1'); // 🛡️
    } else if (l.includes('Buyer Notified')) {
      lines[i] = l.replace(FFFD, '\uD83D\uDCE3'); // 📣
    } else if (l.includes('listing_reactivated') || l.includes('commerce_listing_reactivated')) {
      lines[i] = l.replace(FFFD, '\u2705'); // ✅
    } else if (l.includes('location')) {
      lines[i] = l.replace(FFFD, '\uD83D\uDCCD'); // 📍
    } else {
      lines[i] = l.replace(new RegExp(FFFD + '(\uFE0F)?', 'g'), '\u2705'); // ✅ fallback
    }
  });
  fs.writeFileSync(commPath, lines.join('\n'), 'utf8');
  console.log('CommerceScreens.kt: fixed');
}

// ─── SharedPostComponents.kt ─────────────────────────────────
const spcPath = findFile('SharedPostComponents.kt', BASE);
if (spcPath) {
  let text = fs.readFileSync(spcPath, 'utf8');
  const lines = text.split('\n');
  lines.forEach((l, i) => {
    if (!l.includes(FFFD)) return;
    if (l.includes('Hot Deal')) lines[i] = l.replace(FFFD, '\uD83D\uDD25'); // 🔥
    else if (l.includes('Just Listed')) lines[i] = l.replace(FFFD, '\u2728'); // ✨
    else lines[i] = l.replace(FFFD, '\uD83C\uDFF7\uFE0F'); // 🏷️ fallback
  });
  fs.writeFileSync(spcPath, lines.join('\n'), 'utf8');
  console.log('SharedPostComponents.kt: fixed');
}

// ─── ForYouScreen.kt ─────────────────────────────────────────
const fyPath = findFile('ForYouScreen.kt', BASE);
if (fyPath) {
  let text = fs.readFileSync(fyPath, 'utf8');
  const lines = text.split('\n');
  lines.forEach((l, i) => {
    if (!l.includes(FFFD)) return;
    if (l.includes('Near You')) lines[i] = l.replace(FFFD, '\uD83D\uDCCD');        // 📍
    else if (l.includes('Top Deals')) lines[i] = l.replace(FFFD, '\uD83D\uDD25');  // 🔥
    else if (l.includes('PRICE_ASC') || (l.includes('Price') && l.includes('\u2191'))) lines[i] = l.replace(FFFD, '\uD83D\uDCB0'); // 💰
    else if (l.includes('PRICE_DESC') || (l.includes('Price') && l.includes('\u2193'))) lines[i] = l.replace(FFFD, '\uD83D\uDCB0'); // 💰
    else if (l.includes('NEWEST') || l.includes('Newest')) lines[i] = l.replace(FFFD, '\uD83D\uDD52'); // 🕒
    else if (l.includes('POPULAR') || l.includes('Popular')) lines[i] = l.replace(FFFD, '\uD83D\uDC41'); // 👁
    else if (l.includes('TRENDING') || l.includes('Trending Near')) lines[i] = l.replace(FFFD, '\uD83D\uDD25'); // 🔥
    else if (l.includes('New Today')) lines[i] = l.replace(FFFD, '\u2728'); // ✨
    else if (l.includes('Based on Your Browsing') || l.includes('Browsing')) lines[i] = l.replace(FFFD, '\uD83E\uDDE0'); // 🧠
    else lines[i] = l.replace(new RegExp(FFFD + '(\uFE0F)?', 'g'), '\uD83D\uDD25'); // 🔥 fallback
  });
  fs.writeFileSync(fyPath, lines.join('\n'), 'utf8');
  console.log('ForYouScreen.kt: fixed');
}

// ─── CategoryDetailScreen.kt ─────────────────────────────────
const cdPath = findFile('CategoryDetailScreen.kt', BASE);
if (cdPath) {
  let text = fs.readFileSync(cdPath, 'utf8');
  text = text
    .replace('"electronics" to "' + FFFD + '"', '"electronics" to "\uD83D\uDCBB"')
    .replace('"fashion" to "' + FFFD + '"', '"fashion" to "\uD83D\uDC57"')
    .replace('"vehicles" to "' + FFFD + '"', '"vehicles" to "\uD83D\uDE97"')
    .replace(new RegExp(FFFD + '(\uFE0F)?', 'g'), '\uD83D\uDED2'); // 🛒 fallback
  fs.writeFileSync(cdPath, text, 'utf8');
  console.log('CategoryDetailScreen.kt: fixed');
}

// ─── CategoryHubScreen.kt ────────────────────────────────────
const chubPath = findFile('CategoryHubScreen.kt', BASE);
if (chubPath) {
  let text = fs.readFileSync(chubPath, 'utf8');
  const lines = text.split('\n');
  lines.forEach((l, i) => {
    if (!l.includes(FFFD)) return;
    if (l.includes('Welcome to MHub')) lines[i] = l.replace(FFFD, '\uD83C\uDF1F'); // 🌟
    else if (l.includes('hub_total_l') || l.includes('totalListings')) lines[i] = l.replace(FFFD, '\uD83D\uDCE6'); // 📦
    else if (l.includes('hub_new_today') || l.includes('newToday')) lines[i] = l.replace(FFFD, '\u2728'); // ✨
    else if (l.includes('categoryCount') || l.includes('categories')) lines[i] = l.replace(FFFD, '\uD83C\uDFF7\uFE0F'); // 🏷️
    else if (l.includes('TRENDING NOW')) lines[i] = l.replace(FFFD, '\uD83D\uDD25'); // 🔥
    else if (l.includes('fontSize = 64.sp')) lines[i] = l.replace(new RegExp(FFFD + '(\uFE0F)?'), '\uD83D\uDED2'); // 🛒
    else if (l.includes('"Offers"')) lines[i] = l.replace(FFFD, '\uD83C\uDF81');     // 🎁
    else if (l.includes('"Rewards"')) lines[i] = l.replace(FFFD, '\uD83E\uDE99');    // 🪙
    else if (l.includes('"Dashboard"')) lines[i] = l.replace(FFFD, '\uD83D\uDCCA'); // 📊
    else if (l.includes('"Saved"')) lines[i] = l.replace(FFFD, '\uD83D\uDD16');      // 🔖
    else if (l.includes('"Phones"')) lines[i] = l.replace(FFFD, '\uD83D\uDCF1');    // 📱
    else if (l.includes('"Cars"')) lines[i] = l.replace(FFFD, '\uD83D\uDE97');       // 🚗
    else if (l.includes('"Clothes"')) lines[i] = l.replace(FFFD, '\uD83D\uDC57');   // 👗
    else if (l.includes('"Laptops"')) lines[i] = l.replace(FFFD, '\uD83D\uDCBB');   // 💻
    else if (l.includes('"Bikes"')) lines[i] = l.replace(new RegExp(FFFD + '\uFE0F'), '\uD83C\uDFCD\uFE0F'); // 🏍️
    else if (l.includes('"Shoes"')) lines[i] = l.replace(FFFD, '\uD83D\uDC5F');     // 👟
    else if (l.includes('"Home"') && l.includes('TrendingCat')) lines[i] = l.replace(FFFD, '\uD83C\uDFE0'); // 🏠
    else if (l.includes('"Jobs"')) lines[i] = l.replace(FFFD, '\uD83D\uDCBC');      // 💼
    else if (l.includes('"Trending"') && l.includes('Text(')) lines[i] = l.replace(FFFD, '\uD83D\uDD25'); // 🔥
    else if (l.includes('"Secure"')) lines[i] = l.replace(FFFD, '\uD83D\uDEE1');    // 🛡️
    else if (l.includes('"Support"')) lines[i] = l.replace(FFFD, '\uD83D\uDCDE');   // 📞
    else lines[i] = l.replace(new RegExp(FFFD + '(\uFE0F)?', 'g'), '\uD83C\uDFEA'); // 🏪 fallback
  });
  fs.writeFileSync(chubPath, lines.join('\n'), 'utf8');
  console.log('CategoryHubScreen.kt: fixed');
}

// ─── CategoryModeScreen.kt ───────────────────────────────────
const cmPath = findFile('CategoryModeScreen.kt', BASE);
if (cmPath) {
  let text = fs.readFileSync(cmPath, 'utf8');
  const lines = text.split('\n');
  let card = 0;
  const cardEmojis = ['\uD83D\uDCBB', '\uD83D\uDC57', '\uD83D\uDE97']; // 💻 👗 🚗
  lines.forEach((l, i) => {
    if (l.includes(FFFD) && l.trim().startsWith('emoji =')) {
      lines[i] = l.replace(FFFD, cardEmojis[card] || '\uD83C\uDFEA');
      card++;
    }
  });
  fs.writeFileSync(cmPath, lines.join('\n'), 'utf8');
  console.log('CategoryModeScreen.kt: fixed');
}

// ─── PostDetailScreen.kt ─────────────────────────────────────
const pdPath = findFile('PostDetailScreen.kt', BASE);
if (pdPath) {
  let text = fs.readFileSync(pdPath, 'utf8');
  const lines = text.split('\n');
  lines.forEach((l, i) => {
    if (!l.includes(FFFD)) return;
    if (l.includes('detail_views') || l.includes('totalViews') || l.includes('"view"')) lines[i] = l.replace(FFFD, '\uD83D\uDC41'); // 👁
    else if (l.includes('detail_shares')) lines[i] = l.replace(FFFD, '\uD83D\uDCE4'); // 📤
    else if (l.includes('Delivery')) lines[i] = l.replace(FFFD, '\uD83D\uDCE6');       // 📦
    else if (l.includes('"offer"') || l.includes('totalOffers')) lines[i] = l.replace(FFFD, '\uD83D\uDCB0'); // 💰
    else if (l.includes('totalInquiries')) lines[i] = l.replace(FFFD, '\uD83D\uDCAC'); // 💬
    else if (l.includes('activeWatchers')) lines[i] = l.replace(FFFD, '\uD83D\uDC65'); // 👥
    else if (l.includes('spotlight')) lines[i] = l.replace(FFFD, '\uD83C\uDF1F');      // 🌟
    else lines[i] = l.replace(new RegExp(FFFD + '(\uFE0F)?', 'g'), '\u2B50');          // ⭐ fallback
  });
  fs.writeFileSync(pdPath, lines.join('\n'), 'utf8');
  console.log('PostDetailScreen.kt: fixed');
}

// ─── AadhaarVerifyScreen.kt ──────────────────────────────────
const aaPath = findFile('AadhaarVerifyScreen.kt', BASE);
if (aaPath) {
  let text = fs.readFileSync(aaPath, 'utf8');
  const lines = text.split('\n');
  lines.forEach((l, i) => {
    if (!l.includes(FFFD)) return;
    if (l.includes('fontSize = 26.sp')) lines[i] = l.replace(FFFD, '\uD83C\uDD94'); // 🆔
    else if (l.includes('Verified Badge')) lines[i] = l.replace(new RegExp(FFFD + '\uFE0F?'), '\uD83D\uDEE1\uFE0F'); // 🛡️
    else if (l.includes('Build Trust')) lines[i] = l.replace(FFFD, '\uD83E\uDD1D');  // 🤝
    else if (l.includes('Earn Coins')) lines[i] = l.replace(FFFD, '\uD83E\uDE99');   // 🪙
    else lines[i] = l.replace(FFFD, '\uD83D\uDEE1');                                 // 🛡️ fallback
  });
  fs.writeFileSync(aaPath, lines.join('\n'), 'utf8');
  console.log('AadhaarVerifyScreen.kt: fixed');
}

// ─── MyPostsScreen.kt ────────────────────────────────────────
const mpPath = findFile('MyPostsScreen.kt', BASE);
if (mpPath) {
  let text = fs.readFileSync(mpPath, 'utf8');
  const lines = text.split('\n');
  lines.forEach((l, i) => {
    if (!l.includes(FFFD)) return;
    if (l.includes('Promote Listing')) lines[i] = l.replace(FFFD, '\uD83D\uDE80'); // 🚀
    else lines[i] = l.replace(FFFD, '\uD83E\uDE99');                                // 🪙 coins
  });
  fs.writeFileSync(mpPath, lines.join('\n'), 'utf8');
  console.log('MyPostsScreen.kt: fixed');
}

// ─── ProfileScreen.kt ────────────────────────────────────────
const profPath = findFile('ProfileScreen.kt', BASE);
if (profPath) {
  let text = fs.readFileSync(profPath, 'utf8');
  const lines = text.split('\n');
  lines.forEach((l, i) => {
    if (!l.includes(FFFD)) return;
    if (l.includes('"twitter"')) lines[i] = l.replace(FFFD, '\uD83D\uDC26');         // 🐦
    else if (l.includes('"instagram"')) lines[i] = l.replace(FFFD, '\uD83D\uDCF8'); // 📸
    else if (l.includes('else ->')) lines[i] = l.replace(FFFD, '\uD83C\uDF10');      // 🌐
    else if (l.includes('fontSize = 20.sp')) lines[i] = l.replace(FFFD, '\uD83D\uDC64'); // 👤
    else if (l.includes('fontSize = 22.sp')) lines[i] = l.replace(FFFD, '\uD83C\uDFEA'); // 🏪
    else lines[i] = l.replace(FFFD, '\uD83C\uDF10');                                   // 🌐 fallback
  });
  fs.writeFileSync(profPath, lines.join('\n'), 'utf8');
  console.log('ProfileScreen.kt: fixed');
}

// ─── SocialScreens.kt ────────────────────────────────────────
const socPath = findFile('SocialScreens.kt', BASE);
if (socPath) {
  let text = fs.readFileSync(socPath, 'utf8');
  const lines = text.split('\n');
  lines.forEach((l, i) => {
    if (!l.includes(FFFD)) return;
    if (l.includes(' 50') || l.includes(' 150')) {
      lines[i] = l.replace(FFFD, '\uD83E\uDE99');               // 🪙 coins
    } else if (l.includes('Share anywhere')) {
      lines[i] = l.replace(FFFD, '\uD83D\uDCE4');               // 📤
    } else if (l.includes('Copy link')) {
      lines[i] = l.replace(FFFD, '\uD83D\uDD17');               // 🔗
    } else if (l.includes('Total Sales')) {
      lines[i] = l.replace(FFFD, '\uD83D\uDCCA');               // 📊
    } else if (l.includes('Active Buyers')) {
      lines[i] = l.replace(FFFD, '\uD83D\uDC65');               // 👥
    } else if (l.includes('Vol. Coins')) {
      lines[i] = l.replace(FFFD, '\uD83E\uDE99');               // 🪙
    } else if (l.includes('Top Sellers')) {
      lines[i] = l.replace(FFFD, '\uD83C\uDFC6');               // 🏆
    } else if (l.includes('Top Buyers')) {
      lines[i] = l.replace(new RegExp(FFFD + '\uFE0F?'), '\uD83D\uDED2'); // 🛒
    } else if (l.includes('"Gold"')) {
      lines[i] = l.replace(FFFD, '\uD83E\uDD47');               // 🥇
    } else if (l.includes('"Silver"')) {
      lines[i] = l.replace(FFFD, '\uD83E\uDD48');               // 🥈
    } else if (l.includes('"Bronze"')) {
      lines[i] = l.replace(FFFD, '\uD83E\uDD49');               // 🥉
    } else if (l.includes('"transaction"')) {
      lines[i] = l.replace(FFFD, '\uD83D\uDCB3');               // 💳
    } else if (l.includes('"quality"')) {
      lines[i] = l.replace(FFFD, '\u2B50');                     // ⭐
    } else if (l.includes('"communication"')) {
      lines[i] = l.replace(FFFD, '\uD83D\uDCAC');               // 💬
    } else if (l.includes('"delivery"')) {
      lines[i] = l.replace(FFFD, '\uD83D\uDE9A');               // 🚚
    } else if (l.includes('Secure')) {
      lines[i] = l.replace(FFFD, '\uD83D\uDEE1');               // 🛡️
    } else if (l.includes('Important Guidelines')) {
      lines[i] = l.replace(FFFD, '\u26A0\uFE0F');               // ⚠️
    } else if (l.includes('"bug"')) {
      lines[i] = l.replace(FFFD, '\uD83D\uDC1B');               // 🐛
    } else if (l.includes('"feature"')) {
      lines[i] = l.replace(FFFD, '\uD83D\uDCA1');               // 💡
    } else if (l.includes('"ui"')) {
      lines[i] = l.replace(FFFD, '\uD83C\uDFA8');               // 🎨
    } else if (l.includes('"general"')) {
      lines[i] = l.replace(FFFD, '\uD83D\uDCAC');               // 💬
    } else if (l.includes('Your Voice Matters')) {
      lines[i] = l.replace(FFFD, '\uD83D\uDCE2');               // 📢
    } else if (l.includes('We Listen')) {
      lines[i] = l.replace(FFFD, '\uD83D\uDC42');               // 👂
    } else if (l.includes('Continuous')) {
      lines[i] = l.replace(FFFD, '\uD83D\uDD04');               // 🔄
    } else if (l.includes('Why Your Feedback')) {
      lines[i] = l.replace(FFFD, '\uD83D\uDCA1');               // 💡
    } else if (l.includes('Shapes Features')) {
      lines[i] = l.replace(FFFD, '\uD83D\uDCA1');               // 💡
    } else if (l.includes('Improves Safety')) {
      lines[i] = l.replace(FFFD, '\uD83D\uDEE1');               // 🛡️
    } else if (l.includes('Grows Community')) {
      lines[i] = l.replace(FFFD, '\uD83C\uDF31');               // 🌱
    } else if (l.includes('Direct Contact')) {
      lines[i] = l.replace(FFFD, '\uD83D\uDCDE');               // 📞
    } else {
      lines[i] = l.replace(new RegExp(FFFD + '(\uFE0F)?', 'g'), '\uD83D\uDCAC'); // 💬 fallback
    }
  });
  fs.writeFileSync(socPath, lines.join('\n'), 'utf8');
  console.log('SocialScreens.kt: fixed');
}

// ─── StaticPages.kt ──────────────────────────────────────────
const spPath = findFile('StaticPages.kt', BASE);
if (spPath) fixText(spPath, [
  ['Text("' + FFFD + '", style = MaterialTheme.typography.displayMedium)', 'Text("\uD83D\uDD0D", style = MaterialTheme.typography.displayMedium)'], // 🔍
]);

// ─── Final verification ───────────────────────────────────────
console.log('\n=== Verification ===');
function walkKt(dir) {
  const files = [];
  for (const f of fs.readdirSync(dir)) {
    const full = dir + '/' + f;
    if (fs.statSync(full).isDirectory()) files.push(...walkKt(full));
    else if (f.endsWith('.kt')) files.push(full);
  }
  return files;
}
let total = 0;
walkKt(BASE).forEach(p => {
  const count = (fs.readFileSync(p, 'utf8').match(/\uFFFD/g) || []).length;
  if (count > 0) { console.log('  STILL HAS FFFD:', path.basename(p), count); total += count; }
});
console.log('Total FFFD remaining across all UI files:', total);
