"""Edit ExploreScreen.kt to add scrollbar indicators for sort and category sections."""
import re

file_path = "android-native/app/src/main/java/com/mhub/app/ui/explore/ExploreScreen.kt"

with open(file_path, 'r', encoding='utf-8', newline='') as f:
    content = f.read()

# Replacement 1: Sort options LazyRow -> Row with horizontalScroll
old_sort = (
    "                        LazyRow(\n"
    "                            modifier = Modifier\n"
    "                                .fillMaxWidth()\n"
    "                                .padding(start = 16.dp, end = 16.dp, bottom = 6.dp),\n"
    "                            horizontalArrangement = Arrangement.spacedBy(8.dp),\n"
    "                        ) {\n"
    "                            items(sortOptions.size, key = { sortOptions[it].first }) { idx ->\n"
    "                                val (key, label) = sortOptions[idx]"
)

new_sort = (
    "                        val sortScrollState = rememberScrollState()\n"
    "                        Box {\n"
    "                            Row(\n"
    "                                modifier = Modifier\n"
    "                                    .fillMaxWidth()\n"
    "                                    .horizontalScroll(sortScrollState)\n"
    "                                    .padding(start = 16.dp, end = 16.dp, bottom = 6.dp),\n"
    "                                horizontalArrangement = Arrangement.spacedBy(8.dp),\n"
    "                            ) {\n"
    "                                sortOptions.forEach { (key, label) ->"
)

if old_sort in content:
    content = content.replace(old_sort, new_sort, 1)
    print("Replacement 1 done: sort section")
else:
    # Try with \r\n
    old_sort_crlf = old_sort.replace('\n', '\r\n')
    if old_sort_crlf in content:
        new_sort_crlf = new_sort.replace('\n', '\r\n')
        content = content.replace(old_sort_crlf, new_sort_crlf, 1)
        print("Replacement 1 done (CRLF): sort section")
    else:
        print("Replacement 1 FAILED: sort section not found")
        # Find where it is
        idx = content.find("LazyRow(")
        if idx >= 0:
            print(f"Found LazyRow at position {idx}")
            print(repr(content[idx:idx+300]))

# Replacement 2: Add closing Box and scroll indicator after sort chips
# Find the closing of the chips section and add scroll indicator
old_close = (
    "                                )\n"
    "                            }\n"
    "                        }"
)
# We need a more precise match - find the specific closing braces for the sort section
# Actually, let's find: the RoundedCornerShape(20.dp) closing paren + 3 closing braces
old_chip_close = (
    "                                    shape = RoundedCornerShape(20.dp),\n"
    "                                )\n"
    "                            }\n"
    "                        }"
)

new_chip_close = (
    "                                    shape = RoundedCornerShape(20.dp),\n"
    "                                )\n"
    "                            }\n"
    "                            HorizontalScrollIndicator(\n"
    "                                scrollState = sortScrollState,\n"
    "                                modifier = Modifier.align(Alignment.BottomCenter),\n"
    "                            )\n"
    "                        }"
)

if old_chip_close in content:
    content = content.replace(old_chip_close, new_chip_close, 1)
    print("Replacement 2 done: scroll indicator added")
else:
    old_chip_close_crlf = old_chip_close.replace('\n', '\r\n')
    if old_chip_close_crlf in content:
        new_chip_close_crlf = new_chip_close.replace('\n', '\r\n')
        content = content.replace(old_chip_close_crlf, new_chip_close_crlf, 1)
        print("Replacement 2 done (CRLF): scroll indicator added")
    else:
        print("Replacement 2 FAILED: chip close pattern not found")

# Replacement 3: Change subcategory FlowRow to horizontally scrollable Row
old_flow = (
    "                        // Subcategory chips in a wrapping FlowRow\n"
    "                        FlowRow(\n"
    "                            modifier = Modifier\n"
    "                                .fillMaxWidth()\n"
    "                                .padding(horizontal = 16.dp, vertical = 6.dp),\n"
    "                            horizontalArrangement = Arrangement.spacedBy(6.dp),\n"
    "                            verticalArrangement = Arrangement.spacedBy(6.dp),\n"
    "                        ) {"
)

new_flow = (
    "                        // Subcategory chips in a single-line horizontal scroll row\n"
    "                        val catScrollState = rememberScrollState()\n"
    "                        Box {\n"
    "                            Row(\n"
    "                                modifier = Modifier\n"
    "                                    .fillMaxWidth()\n"
    "                                    .horizontalScroll(catScrollState)\n"
    "                                    .padding(horizontal = 16.dp, vertical = 6.dp),\n"
    "                                horizontalArrangement = Arrangement.spacedBy(6.dp),\n"
    "                            ) {"
)

if old_flow in content:
    content = content.replace(old_flow, new_flow, 1)
    print("Replacement 3 done: subcategory scroll changed")
else:
    old_flow_crlf = old_flow.replace('\n', '\r\n')
    if old_flow_crlf in content:
        new_flow_crlf = new_flow.replace('\n', '\r\n')
        content = content.replace(old_flow_crlf, new_flow_crlf, 1)
        print("Replacement 3 done (CRLF): subcategory scroll changed")
    else:
        print("Replacement 3 FAILED: subcategory FlowRow not found")

# Replacement 4: Close the Box for subcategories (after the FlowRow/Row closing brace)
# The FlowRow closing structure is: }) after ecosystemSubcategories.forEach
# We need to find: the closing of the chips section in the subcategories area
# Looking for: a closing }) followed by spacer which comes after subcategories
old_sub_close = (
    "                                        )\n"
    "                                    }\n"
    "                                }\n"
    "                            }"
)

# Actually, the subcategory chips close after the last FilterChip, then 3 braces close:
# 1. The forEach lambda
# 2. The Row/FlowRow
# 3. The Box we're adding

# Let's find the specific closing: after the subcategory emoji row
old_sub_chip_close = (
    "                                            label = { Text(sub, fontSize = 11.sp) },\n"
    "                                            colors = FilterChipDefaults.filterChipColors(selectedContainerColor = MaterialTheme.colorScheme.secondary, selectedLabelColor = Color.White),\n"
    "                                            shape = RoundedCornerShape(20.dp),\n"
    "                                        )\n"
    "                                    }\n"
    "                                }\n"
    "                            }"
)

new_sub_chip_close = (
    "                                            label = { Text(sub, fontSize = 11.sp) },\n"
    "                                            colors = FilterChipDefaults.filterChipColors(selectedContainerColor = MaterialTheme.colorScheme.secondary, selectedLabelColor = Color.White),\n"
    "                                            shape = RoundedCornerShape(20.dp),\n"
    "                                        )\n"
    "                                    }\n"
    "                                }\n"
    "                                HorizontalScrollIndicator(\n"
    "                                    scrollState = catScrollState,\n"
    "                                    modifier = Modifier.align(Alignment.BottomCenter),\n"
    "                                )\n"
    "                            }"
)

if old_sub_chip_close in content:
    content = content.replace(old_sub_chip_close, new_sub_chip_close, 1)
    print("Replacement 4 done: subcategory scroll indicator added")
else:
    old_sub_chip_close_crlf = old_sub_chip_close.replace('\n', '\r\n')
    if old_sub_chip_close_crlf in content:
        new_sub_chip_close_crlf = new_sub_chip_close.replace('\n', '\r\n')
        content = content.replace(old_sub_chip_close_crlf, new_sub_chip_close_crlf, 1)
        print("Replacement 4 done (CRLF): subcategory scroll indicator added")
    else:
        print("Replacement 4 FAILED: subcategory chip close not found")

# Write the modified content back
with open(file_path, 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print("\nAll replacements completed!")
