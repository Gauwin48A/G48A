const fs = require('fs');
const path = 'app/src/main/java/com/mhub/app/ui/explore/ExploreScreen.kt';
let content = fs.readFileSync(path, 'utf8');

// Find and replace the sort chips section
const startMarker = '// Sort options in a wrapping FlowRow';
const endMarker = `Icon(if (isGridView) Icons.AutoMirrored.Filled.ViewList else Icons.Default.GridView, null, modifier = Modifier.size(18.dp), tint = MaterialTheme.colorScheme.primary)`;

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker, startIdx) + endMarker.length + 3; // +3 for \n  }

if (startIdx === -1 || endIdx === -1) {
  console.error('Could not find markers');
  process.exit(1);
}

const replacement = `// Grid/List toggle only
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 6.dp),
                        horizontalArrangement = Arrangement.End,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        IconButton(onClick = { isGridView = !isGridView }, modifier = Modifier.size(28.dp)) {
                            Icon(if (isGridView) Icons.AutoMirrored.Filled.ViewList else Icons.Default.GridView, null, modifier = Modifier.size(18.dp), tint = MaterialTheme.colorScheme.primary)
                        }
                    }`;

content = content.substring(0, startIdx) + replacement + content.substring(endIdx);
fs.writeFileSync(path, content, 'utf8');
console.log('Sticky header sort chips removed successfully');
