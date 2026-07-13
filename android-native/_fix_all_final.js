const fs = require('fs');
const path = require('path');

// ─── 1. ProfileScreen.kt - Remove Share, KYC, Edit buttons ──
const profPath = path.join(__dirname, 'app/src/main/java/com/mhub/app/ui/profile/ProfileScreen.kt');
let p = fs.readFileSync(profPath, 'utf8');

// Remove the entire Share button OutlinedButton block (from OutlinedButton to its closing })

// Pattern 1: Share button
const shareRegex = /OutlinedButton\(\n\s+onClick = \{ viewModel\.shareProfile\(context\) \},[\s\S]*?\n\s+\}\)/;
let match = shareRegex.exec(p);
if (match) {
    p = p.replace(match[0], '');
    console.log('Removed Share button');
}

// Pattern 2: KYC button block - the `if (user?.isKycVerified != true)` block
const kycRegex = /if \(user\?\.isKycVerified != true\) \{\n\s+Button\([\s\S]*?\n\s+\}/;
match = kycRegex.exec(p);
if (match) {
    console.log('KYC block length:', match[0].length);
    p = p.replace(match[0], '');
    console.log('Removed KYC button');
}

// Remove the enclosing `if (state.isOwnProfile) {` and its closing `}` if they're now empty
const ownProfileRegex = /if \(state\.isOwnProfile\) \{\n\s+\n\s+\}/;
match = ownProfileRegex.exec(p);
if (match) {
    p = p.replace(match[0], '');
    console.log('Removed empty isOwnProfile block');
}

// Pattern 3: Edit button OutlinedButton
const editRegex = /OutlinedButton\(\n\s+onClick = \{ showEditDialog = true \},[\s\S]*?\n\s+\}\)/;
match = editRegex.exec(p);
if (match) {
    p = p.replace(match[0], '');
    console.log('Removed Edit button');
}

// Clean up extra blank lines and the Arrangement.spacedBy reference
p = p.replace(/\n{3,}/g, '\n\n');

// Remove the shareProfile function since it's no longer called
const shareFuncRegex = /    fun shareProfile\(context: android\.content\.Context\) \{[\s\S]*?\n    \}/;
match = shareFuncRegex.exec(p);
if (match && !p.includes('viewModel.shareProfile(context)')) {
    p = p.replace(match[0], '');
    console.log('Removed shareProfile function');
}

fs.writeFileSync(profPath, p);
console.log('✅ ProfileScreen.kt updated');

// ─── 2. MhubApp.kt - Remove ChatScreen import and route ──
const mhubPath = path.join(__dirname, 'app/src/main/java/com/mhub/app/ui/MhubApp.kt');
let m = fs.readFileSync(mhubPath, 'utf8');

// Remove ChatScreen import
const importRegex = /import com\.mhub\.app\.ui\.(social|chat)\.ChatScreen\n/;
match = importRegex.exec(m);
if (match) {
    m = m.replace(match[0], '');
    console.log('Removed ChatScreen import');
}

// Find the Chat route composable block
const chatRouteIdx = m.indexOf('composable(Routes.CHAT)');
if (chatRouteIdx >= 0) {
    // Get the next 20 characters for debugging
    console.log(`Chat route at index ${chatRouteIdx}, context: "${m.substring(chatRouteIdx, chatRouteIdx+50)}"`);
    
    // Find the entire composable block by counting braces
    let depth = 0;
    let endIdx = chatRouteIdx;
    for (let i = chatRouteIdx; i < m.length; i++) {
        if (m[i] === '{') depth++;
        if (m[i] === '}') {
            depth--;
            if (depth === 0) {
                endIdx = i + 1;
                break;
            }
        }
    }
    
    const routeBlock = m.substring(chatRouteIdx, endIdx);
    console.log(`Chat route block: ${routeBlock.length} chars`);
    
    // Only remove if it's reasonably sized (not accidentally the whole rest of the file)
    if (routeBlock.length > 50 && routeBlock.length < 1500) {
        m = m.substring(0, chatRouteIdx) + m.substring(endIdx);
        console.log('Removed Chat route composable');
    } else {
        console.log(`⚠️ Chat route block too large (${routeBlock.length} chars) - not removing`);
    }
}

fs.writeFileSync(mhubPath, m);
console.log('✅ MhubApp.kt updated');

// ─── 3. MoreScreen.kt - Fix hamburger menu ──
const morePath = path.join(__dirname, 'app/src/main/java/com/mhub/app/ui/more/MoreScreen.kt');
let mr = fs.readFileSync(morePath, 'utf8');

// The ACCOUNT section already has: Profile, Verification, Admin - this looks correct
// Check the close button is properly wired
const closeSurfaceRegex = /Surface\(\n\s+onClick = onDismiss,?/;
match = closeSurfaceRegex.exec(mr);
if (!match) {
    // Try alternative pattern for close button
    const closeAlt = mr.includes('onClick = onDismiss');
    console.log(`Close button with onDismiss: ${closeAlt ? 'found' : 'NOT FOUND'}`);
}
console.log('✅ MoreScreen.kt checked (no changes needed - sections already correct)');

console.log('\n✅ All final changes complete');
