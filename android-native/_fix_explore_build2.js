const fs = require('fs');
const path = 'android-native/app/src/main/java/com/mhub/app/ui/explore/ExploreScreen.kt';
let content = fs.readFileSync(path, 'utf8');

// Fix ALL remaining Icons.Default.Map references
const beforeCount = (content.match(/Icons\.Default\.Map/g) || []).length;
content = content.replace(/Icons\.Default\.Map/g, 'Icons.Filled.Map');
const afterCount = (content.match(/Icons\.Default\.Map/g) || []).length;

// Fix ALL remaining Icons.Default.ViewList references
const beforeList = (content.match(/Icons\.Default\.ViewList/g) || []).length;
content = content.replace(/Icons\.Default\.ViewList/g, 'Icons.AutoMirrored.Filled.ViewList');
const afterList = (content.match(/Icons\.Default\.ViewList/g) || []).length;

fs.writeFileSync(path, content, 'utf8');
console.log(`Fixed ${beforeCount - afterCount} Icons.Default.Map references`);
console.log(`Fixed ${beforeList - afterList} Icons.Default.ViewList references`);
