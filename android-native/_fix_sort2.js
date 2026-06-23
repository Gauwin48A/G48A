const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'app/src/main/java/com/mhub/app/ui/explore/ExploreScreen.kt');
let content = fs.readFileSync(filePath, 'utf8');

// Fix 1: Add back rememberScrollState import
// Check if it's already there
if (!content.includes('import androidx.compose.foundation.rememberScrollState')) {
    // Find a good place to add it (after horizontalScroll or next to it)
    const markers = [
        'import androidx.compose.foundation.layout.widthIn',
        'import androidx.compose.foundation.shape.CircleShape',
        'import androidx.compose.foundation.lazy.LazyColumn',
        'import androidx.compose.foundation.lazy.LazyRow',
    ];
    for (const marker of markers) {
        if (content.includes(marker)) {
            content = content.replace(marker, marker + '\nimport androidx.compose.foundation.rememberScrollState');
            console.log('Added rememberScrollState import after', marker);
            break;
        }
    }
}

// Fix 2: Replace the broken .let pattern with proper horizontal scroll
const oldPattern = `                    // Sort options in a horizontally scrollable row — all buttons visible
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        androidx.compose.foundation.horizontalScroll(rememberScrollState()).let { scrollModifier ->
                            Row(
                                modifier = Modifier.weight(1f).then(scrollModifier),
                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                sortOptions.forEach { (key, label) ->
                                    val isSelected = state.sortBy == key
                                    FilterChip(
                                        selected = isSelected,
                                        onClick = { onSetSort(key) },
                                        label = { Text(label, style = MaterialTheme.typography.labelSmall) },
                                        colors = FilterChipDefaults.filterChipColors(
                                            selectedContainerColor = MaterialTheme.colorScheme.primary,
                                            selectedLabelColor = Color.White,
                                        ),
                                        shape = RoundedCornerShape(20.dp),
                                    )
                                }
                            }
                        }
                        // Grid/List view toggle
                        Spacer(Modifier.width(4.dp))
                        IconButton(onClick = { isGridView = !isGridView }, modifier = Modifier.size(28.dp)) {
                            Icon(if (isGridView) Icons.AutoMirrored.Filled.ViewList else Icons.Default.GridView, null, modifier = Modifier.size(18.dp), tint = MaterialTheme.colorScheme.primary)
                        }
                    }`;

const newPattern = `                    // Sort options in a horizontally scrollable row — all buttons visible
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Row(
                            modifier = Modifier
                                .weight(1f)
                                .horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            sortOptions.forEach { (key, label) ->
                                val isSelected = state.sortBy == key
                                FilterChip(
                                    selected = isSelected,
                                    onClick = { onSetSort(key) },
                                    label = { Text(label, style = MaterialTheme.typography.labelSmall) },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = MaterialTheme.colorScheme.primary,
                                        selectedLabelColor = Color.White,
                                    ),
                                    shape = RoundedCornerShape(20.dp),
                                )
                            }
                        }
                        Spacer(Modifier.width(4.dp))
                        IconButton(onClick = { isGridView = !isGridView }, modifier = Modifier.size(28.dp)) {
                            Icon(if (isGridView) Icons.AutoMirrored.Filled.ViewList else Icons.Default.GridView, null, modifier = Modifier.size(18.dp), tint = MaterialTheme.colorScheme.primary)
                        }
                    }`;

if (content.includes(oldPattern)) {
    content = content.replace(oldPattern, newPattern);
    console.log('SUCCESS: Fixed sort options horizontal scroll pattern');
} else {
    console.log('ERROR: Could not find old pattern');
    // Debug: find where sort options starts
    const idx = content.indexOf('Sort options in a horizontally');
    if (idx >= 0) {
        console.log('Found at position', idx);
        console.log('Context:', content.substring(idx, idx + 200));
    } else {
        console.log('Could not find pattern marker at all');
        // Try finding the old pattern that might have been partially applied
        const idx2 = content.indexOf('rememberScrollState()).let {');
        if (idx2 >= 0) {
            console.log('Found .let pattern at', idx2);
        } else {
            console.log('No .let pattern found');
            // Original FlowRow might still exist
            const idx3 = content.indexOf('sortOptions.forEach');
            if (idx3 >= 0) {
                console.log('Found sortOptions at', idx3);
                console.log('Context:', content.substring(Math.max(0, idx3 - 100), idx3 + 100));
            }
        }
    }
    process.exit(1);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('File saved');
