const fs = require('fs');
const path = 'android-native/app/src/main/java/com/mhub/app/ui/commerce/CommerceScreens.kt';
let content = fs.readFileSync(path, 'utf8');

// Remove BOM
if (content.charCodeAt(0) === 0xFEFF) {
    content = content.substring(1);
}

// Fix CompareScreen to accept onOpenPost
const oldSig = 'fun CompareScreen(onBack: () -> Unit, viewModel: CompareViewModel = hiltViewModel())';
const newSig = 'fun CompareScreen(onBack: () -> Unit, onOpenPost: (String) -> Unit = {}, viewModel: CompareViewModel = hiltViewModel())';

if (content.includes(oldSig)) {
    content = content.replace(oldSig, newSig);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Fixed CompareScreen signature successfully');
} else {
    console.log('ERROR: Could not find CompareScreen signature');
    process.exit(1);
}
