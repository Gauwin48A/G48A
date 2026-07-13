const fs = require('fs');
const path = require('path');
const fp = path.join(__dirname, 'app/src/main/java/com/mhub/app/ui/profile/ProfileScreen.kt');
let c = fs.readFileSync(fp, 'utf8');

// Exact pattern from the file - match the unauthorized section
const oldStr = '                                // If we have cached data, keep showing it and don\'t show full-screen error\n                                if (cachedProfile?.user != null) {';
const newStr = '                                // Demo session check: populate with demo user data silently\n                                if (expired && repo.isDemoSession) {\n                                    val demoUser = createDemoUser()\n                                    _state.value = _state.value.copy(\n                                        loading = false, refreshing = false,\n                                        user = demoUser, error = null, isSessionExpired = false,\n                                    )\n                                    cachedProfile = _state.value\n                                } else if (cachedProfile?.user != null) {';

if (c.includes(oldStr)) {
    // Count braces before and after
    function braces(s) { let o=0,cl=0; for(let ch of s) { if(ch==='{') o++; if(ch==='}') cl++; } return o-cl; }
    const oldB = braces(oldStr);
    const newB = braces(newStr);
    console.log(`Old braces: ${oldB}, New braces: ${newB}`);
    
    if (oldB === newB) {
        c = c.replace(oldStr, newStr);
        fs.writeFileSync(fp, c, 'utf8');
        console.log('✅ createDemoUser wired into load()');
    } else {
        console.log('❌ Brace mismatch');
    }
} else {
    console.log('❌ Pattern not found in file');
}
