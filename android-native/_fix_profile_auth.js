const fs = require('fs');
const path = require('path');

const FILE = path.resolve(__dirname, 'app/src/main/java/com/mhub/app/ui/profile/ProfileScreen.kt');
let content = fs.readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n');

const oldBlock = `                    } else {
                        // Network/server error but we have cached data — show it with a banner
                        if (cachedProfile?.user != null) {
                            _state.value = _state.value.copy(
                                loading = false, refreshing = false,
                                error = meResult.error.userFacingMessage("refresh your profile"),
                            )
                        } else {
                            _state.value = _state.value.copy(
                                loading = false, refreshing = false,
                                error = meResult.error.userFacingMessage("load your profile"),
                            )
                        }
                    }
                }
            }
            // Fire stats, referral code, and trust score concurrently
            coroutineScope {`;

const newBlock = `                    } else {
                        // Network/server error — fall back to demo session if applicable
                        if (repo.isDemoSession) {
                            _state.value = _state.value.copy(
                                loading = false, refreshing = false,
                                user = createDemoUser(), error = null, isSessionExpired = false,
                            )
                            cachedProfile = _state.value
                        } else if (cachedProfile?.user != null) {
                            _state.value = _state.value.copy(
                                loading = false, refreshing = false,
                                error = meResult.error.userFacingMessage("refresh your profile"),
                            )
                        } else {
                            _state.value = _state.value.copy(
                                loading = false, refreshing = false,
                                error = meResult.error.userFacingMessage("load your profile"),
                            )
                        }
                    }
                }
            }
            // Fire stats, referral code, and trust score concurrently
            coroutineScope {`;

const idx = content.indexOf(oldBlock);
if (idx < 0) {
    console.log('ERROR: Could not find the network error block in ProfileScreen.kt!');
    process.exit(1);
}

content = content.substring(0, idx) + newBlock + content.substring(idx + oldBlock.length);

fs.writeFileSync(FILE, content, 'utf8');

const opens = (content.match(/{/g) || []).length;
const closes = (content.match(/}/g) || []).length;
console.log(`SUCCESS: Profile auth fix applied. Lines: ${content.split('\n').length}. Braces: ${opens}/${closes} (diff=${opens - closes}).`);
