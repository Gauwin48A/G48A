const fs = require('fs');
const path = 'android-native/app/src/main/java/com/mhub/app/ui/explore/ExploreScreen.kt';
const content = fs.readFileSync(path, 'utf8');

// Split into lines (handle both CRLF and LF)
const lines = content.split(/\r?\n/);

// Find the exact line numbers
let mockStart = -1, stateStart = -1, viewModelStart = -1, viewModelEnd = -1;

for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t === 'val MOCK_EXPLORE_POSTS = listOf(' && mockStart === -1) {
        mockStart = i;
    }
    if (t.startsWith('data class ExploreState(') && stateStart === -1) {
        stateStart = i;
    }
    if (t === '@HiltViewModel' && viewModelStart === -1) {
        viewModelStart = i;
    }
    // Find where ExploreViewModel ends - after the last closing brace of the class
    if (viewModelStart !== -1 && viewModelEnd === -1 && t === '}' && i > viewModelStart + 10) {
        // Check if the next non-empty line is a @Composable or @OptIn annotation
        let nextNonEmpty = '';
        for (let j = i + 1; j < lines.length; j++) {
            if (lines[j].trim().length > 0) {
                nextNonEmpty = lines[j].trim();
                break;
            }
        }
        // The class ends when we find a top-level closing brace followed by a composable
        // Actually, we need to count braces to find the end of the class
        // Let's find the class definition line first
        if (t === '}' && lines[i-1] && lines[i-1].trim() === '' && viewModelEnd === -1) {
            // Find how many braces deep we are
            let braceDepth = 1;
            let foundClassOpening = false;
            for (let k = viewModelStart; k < lines.length; k++) {
                if (k <= i) {
                    // Count braces
                    for (const ch of lines[k]) {
                        if (ch === '{') braceDepth++;
                        if (ch === '}') braceDepth--;
                    }
                    if (lines[k].includes('class ExploreViewModel')) foundClassOpening = true;
                }
                if (foundClassOpening && braceDepth === 0) {
                    viewModelEnd = k;
                    break;
                }
            }
            if (viewModelEnd === -1) viewModelEnd = i;
        }
    }
}

// If we didn't find the exact end via brace counting, find it differently
if (viewModelEnd === -1) {
    // Search for the beginning of @Composable fun ExploreScreen
    for (let i = viewModelStart + 1; i < lines.length; i++) {
        if (lines[i].trim().includes('fun ExploreScreen(')) {
            // The ViewModel block ends before this, at the previous blank line
            let prev = i - 1;
            while (prev > 0 && lines[prev].trim() === '') prev--;
            viewModelEnd = prev;
            break;
        }
    }
}

console.log('MOCK_EXPLORE_POSTS start line:', mockStart + 1);
console.log('ExploreState start line:', stateStart + 1);
console.log('ExploreViewModel start line:', viewModelStart + 1);
console.log('ExploreViewModel end line:', viewModelEnd + 1);

// Extract imports needed by the ViewModel (first block until package)
const packageLine = lines[0];
const importEndLine = -1;
let importBlockEnd = mockStart - 1; // imports end right before MOCK_EXPLORE_POSTS

// Create the ViewModel file content
const vmImports = [
    'package com.mhub.app.ui.explore',
    '',
    'import androidx.lifecycle.ViewModel',
    'import androidx.lifecycle.viewModelScope',
    'import com.mhub.app.core.ApiResult',
    'import com.mhub.app.data.repository.CategoriesRepository',
    'import com.mhub.app.data.repository.PostsRepository',
    'import com.mhub.app.data.repository.RecommendationsRepository',
    'import com.mhub.app.data.repository.WishlistRepository',
    'import com.mhub.app.domain.model.Post',
    'import dagger.hilt.android.lifecycle.HiltViewModel',
    'import kotlinx.coroutines.Job',
    'import kotlinx.coroutines.delay',
    'import kotlinx.coroutines.flow.MutableStateFlow',
    'import kotlinx.coroutines.flow.StateFlow',
    'import kotlinx.coroutines.flow.asStateFlow',
    'import kotlinx.coroutines.launch',
    'import javax.inject.Inject',
    'import java.text.SimpleDateFormat',
    'import java.util.Date',
    'import java.util.Locale',
    'import java.util.TimeZone',
    '',
];

// Lines for ViewModel file
const vmLines = lines.slice(mockStart, viewModelEnd + 1);

// Write ExploreViewModel.kt
const vmFilePath = 'android-native/app/src/main/java/com/mhub/app/ui/explore/ExploreViewModel.kt';
const vmContent = vmImports.join('\n') + vmLines.join('\n') + '\n';
fs.writeFileSync(vmFilePath, vmContent, 'utf8');
console.log('Created ExploreViewModel.kt with', vmLines.length, 'lines');

// Now modify ExploreScreen.kt to remove MOCK_EXPLORE_POSTS, ExploreState, and ExploreViewModel
// Keep: package + imports + the rest of the file
const screenLines = [
    ...lines.slice(0, mockStart),                    // package + imports before MOCK
    ...lines.slice(viewModelEnd + 1, lines.length),  // everything after ViewModel
];

// Fix up imports: add import for ExploreState (same package, no import needed)
// Remove unused imports that were only needed by ViewModel
// The remaining file needs: all current imports minus ViewModel-specific ones

// Write ExploreScreen.kt
fs.writeFileSync(path, screenLines.join('\n'), 'utf8');
console.log('Updated ExploreScreen.kt from', lines.length, 'to', screenLines.length, 'lines');
console.log('Done!');
