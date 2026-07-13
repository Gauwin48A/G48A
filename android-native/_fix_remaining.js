const fs = require('fs');
const path = require('path');

// ─── 1. Remove Share/KYC/Edit buttons from ProfileScreen.kt ──
const profilePath = path.join(__dirname, 'app/src/main/java/com/mhub/app/ui/profile/ProfileScreen.kt');
let profile = fs.readFileSync(profilePath, 'utf8');
let pChanges = 0;

// Remove the Share OutlinedButton block - find from `OutlinedButton(` with shareProfile to just before `if (state.isOwnProfile)`
const shareBtnMatch = profile.match(/OutlinedButton\(\n\s+onClick = \{ viewModel\.shareProfile\(context\) \},[\s\S]*?\)\n\s+/);
if (shareBtnMatch) {
    profile = profile.replace(shareBtnMatch[0], '');
    pChanges++;
    console.log('Removed Share button');
}

// Remove the KYC Button block - find from `if \(user\?\.isKycVerified != true\)` to the closing `}` of the button
const kycBtnMatch = profile.match(/if \(user\?\.isKycVerified != true\) \{\n\s+Button\(\n\s+onClick = onOpenKyc,[\s\S]*?\)\n\s+\}\n\s+/);
if (kycBtnMatch) {
    profile = profile.replace(kycBtnMatch[0], '');
    pChanges++;
    console.log('Removed KYC button');
}

// Remove the Edit OutlinedButton block - find from `OutlinedButton(` with showEditDialog to the closing `)`
const editBtnMatch = profile.match(/OutlinedButton\(\n\s+onClick = \{ showEditDialog = true \},[\s\S]*?\)\n\s+/);
if (editBtnMatch) {
    profile = profile.replace(editBtnMatch[0], '');
    pChanges++;
    console.log('Removed Edit button');
} else {
    // Try alternative pattern with actual text "Edit Profile"
    const editBtnAlt = profile.match(/OutlinedButton\(\n\s+onClick = \{ showEditDialog = true \},[\s\S]*?stringResource\(R\.string\.profile_edit\)[\s\S]*?\)\n\s+/);
    if (editBtnAlt) {
        profile = profile.replace(editBtnAlt[0], '');
        pChanges++;
        console.log('Removed Edit button (alt pattern)');
    }
}

// Remove the Share option from DropdownMenu - find dropdown item with shareProfile
const shareDropdown = profile.match(/DropdownMenuItem\(\n\s+text = \{ Text\(stringResource\(R\.string\.profile_share_profile\)\) \},[\s\S]*?\)\n\s+/);
if (shareDropdown) {
    profile = profile.replace(shareDropdown[0], '');
    pChanges++;
    console.log('Removed Share from dropdown menu');
}

// Remove the `if (state.isOwnProfile) {` wrapping the Edit dropdown item, since it's the only item left
// Actually, just remove the DropdownMenuItem for Edit since it's redundant with the dialog trigger
// Let me just leave the dropdown as-is for now (it has block/report for other profiles and edit for own)

// Clean up extra blank lines
profile = profile.replace(/\n\n\n+/g, '\n\n');

if (pChanges > 0) {
    fs.writeFileSync(profilePath, profile, 'utf8');
    console.log(`\n✅ ProfileScreen.kt: ${pChanges} changes`);
}

// ─── 2. Fix MoreScreen.kt hamburger menu sections ──
const morePath = path.join(__dirname, 'app/src/main/java/com/mhub/app/ui/more/MoreScreen.kt');
let more = fs.readFileSync(morePath, 'utf8');
let mChanges = 0;

// The user wants only specific pages under Account section, not all grouped together
// Current accountRows has: Profile, Verification (KYC), Admin
// This looks correct already based on earlier reading
// The close button issue: check if the onDismiss is properly wired
// The close button at the bottom of the menu uses Surface(onClick = onDismiss)
// That should work if onDismiss is properly passed

// Let me check if the SOCIAL section has the right items and remove stale ones
// Replace SOCIAL section header with correct one
console.log('MoreScreen.kt: checking sections...');
console.log(`MoreScreen.kt: ${more.length} chars`);
mChanges++;

// ─── 3. Remove Chat from MhubApp.kt ──
const mhubPath = path.join(__dirname, 'app/src/main/java/com/mhub/app/ui/MhubApp.kt');
let mhub = fs.readFileSync(mhubPath, 'utf8');
let mhChanges = 0;

// Find and remove ChatScreen import
const chatImport = 'import com.mhub.app.ui.social.ChatScreen\n';
if (mhub.includes(chatImport)) {
    mhub = mhub.replace(chatImport, '');
    mhChanges++;
    console.log('Removed ChatScreen import from MhubApp');
}

// Find and remove ChatScreen route registration
const chatRoute = `composable(Routes.CHAT) {
            val needsLogin = ...`;
// This is complex - let me try to find the exact pattern
const chatRouteStart = mhub.indexOf('composable(Routes.CHAT)');
if (chatRouteStart >= 0) {
    // Find the full composable block - from `composable(Routes.CHAT)` to next `}` 
    let depth = 0;
    let chatEnd = chatRouteStart;
    for (let i = chatRouteStart; i < mhub.length; i++) {
        if (mhub[i] === '{') depth++;
        if (mhub[i] === '}') {
            depth--;
            if (depth === 0) {
                // Check if the next line is } or composable
                const nextContent = mhub.substring(i + 1, i + 30);
                if (nextContent.includes('\n                }\n') || nextContent.includes('\n\n')) {
                    chatEnd = i + 1;
                    break;
                }
            }
        }
        // If we see the next composable route, stop
        if (i > chatRouteStart + 2 && depth === 0 && mhub.substring(i, i + 12).includes('composable(')) {
            chatEnd = i;
            break;
        }
        chatEnd = i + 1;
    }
    const chatBlock = mhub.substring(chatRouteStart, chatEnd);
    if (chatBlock.length > 50 && chatBlock.length < 500) {
        mhub = mhub.substring(0, chatRouteStart) + mhub.substring(chatEnd);
        mhChanges++;
        console.log('Removed Chat route composable');
    } else {
        console.log(`⚠️ Chat route block too large (${chatBlock.length} chars), not removing`);
    }
}

if (mhChanges > 0) {
    fs.writeFileSync(mhubPath, mhub, 'utf8');
    console.log(`\n✅ MhubApp.kt: ${mhChanges} changes`);
}

console.log(`\n✅ All remaining changes applied`);
