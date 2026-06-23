const fs = require('fs');
const path = 'android-native/app/src/main/java/com/mhub/app/ui/home/HomeScreen.kt';
let content = fs.readFileSync(path, 'utf-8');

// Check if imports already exist
if (!content.includes('import androidx.compose.foundation.layout.FlowRow')) {
  content = content.replace(
    'import androidx.compose.foundation.layout.fillMaxWidth\nimport androidx.compose.foundation.layout.height',
    'import androidx.compose.foundation.layout.fillMaxWidth\nimport androidx.compose.foundation.layout.ExperimentalLayoutApi\nimport androidx.compose.foundation.layout.FlowRow\nimport androidx.compose.foundation.layout.height'
  );
  console.log('Added FlowRow and ExperimentalLayoutApi imports');
} else {
  console.log('FlowRow import already present');
}

// Also check if the `import androidx.compose.material.icons.filled.Visibility` exists
if (!content.includes('import androidx.compose.material.icons.filled.Visibility')) {
  content = content.replace(
    'import androidx.compose.material.icons.filled.Compare',
    'import androidx.compose.material.icons.filled.Compare\nimport androidx.compose.material.icons.filled.Visibility'
  );
  console.log('Added Visibility icon import');
} else {
  console.log('Visibility import already present');
}

fs.writeFileSync(path, content, 'utf-8');
console.log('Done');
