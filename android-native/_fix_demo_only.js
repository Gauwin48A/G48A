const fs = require('fs');
const path = require('path');
const fp = path.join(__dirname, 'app/src/main/java/com/mhub/app/ui/profile/ProfileScreen.kt');
let c = fs.readFileSync(fp, 'utf8');
let ok = true;

// ─── 1. Add createDemoUser function after logout() ──
const logoutEnd = '    fun logout(onDone: () -> Unit) {\n        viewModelScope.launch { repo.logout(); onDone() }\n    }';
const createDemoFunc = '\n\n    private fun createDemoUser(): User {\n        return User(\n            id = "demo_user",\n            userId = "demo_user",\n            fullName = "Demo User",\n            phone = "+91-9876543210",\n            email = "demo@mhub.app",\n            bio = "This is a demo account for preview purposes.",\n            username = "demo_user",\n            currentPlan = "premium",\n            kycStatus = null,\n            role = "seller",\n            pictureUrl = null,\n            coverImage = null,\n            rewardsRank = "DEMO",\n            isVerified = true,\n        )\n    }';

if (c.includes(logoutEnd)) {
    c = c.replace(logoutEnd, logoutEnd + createDemoFunc);
    console.log('✅ Added createDemoUser() function');
} else {
    console.log('❌ logout() pattern not found');
    ok = false;
}

// ─── 2. Wire createDemoUser into load() ──
const oldBlock = '                                val expired = retry.error is ApiError.Unauthorized || retry.error is ApiError.Forbidden\n                                // If we have cached data, keep showing it and don\'t show full-screen error\n                                if (cachedProfile?.user != null) {';
const newBlock = '                                val expired = retry.error is ApiError.Unauthorized || retry.error is ApiError.Forbidden\n                                // Demo session check: populate with demo user data silently\n                                if (expired && repo.isDemoSession) {\n                                    val demoUser = createDemoUser()\n                                    _state.value = _state.value.copy(\n                                        loading = false, refreshing = false,\n                                        user = demoUser, error = null, isSessionExpired = false,\n                                    )\n                                    cachedProfile = _state.value\n                                } else if (cachedProfile?.user != null) {';

if (c.includes(oldBlock)) {
    c = c.replace(oldBlock, newBlock);
    console.log('✅ Wired createDemoUser into load()');
} else {
    console.log('❌ Unauthorized block pattern not found');
    ok = false;
}

// Verify brace balance
function braces(s) { let o=0,cl=0; for(let ch of s) { if(ch==='{') o++; if(ch==='}') cl++; } return o-cl; }
const totalBraces = braces(c);
console.log(`Total brace balance: ${totalBraces} (should be 0)`);
if (totalBraces !== 0) {
    console.log('⚠️ Brace balance is off!');
    ok = false;
}

if (ok) {
    fs.writeFileSync(fp, c, 'utf8');
    console.log('\n✅ File written successfully');
} else {
    console.log('\n❌ Errors found - file NOT written');
}
