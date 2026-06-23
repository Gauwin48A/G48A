import re

path = "android-native/app/src/main/java/com/mhub/app/ui/home/HomeScreen.kt"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

changes = []

# 1. Add MOST_VIEWED to SortOption enum
if "MOST_VIEWED" not in content:
    content = content.replace(
        "    NEWEST(\"New\"),\n    POPULAR(\"Popular\"),\n    PRICE_ASC(\"Price low-high\"),\n    PRICE_DESC(\"Price high-low\"),",
        "    NEWEST(\"New\"),\n    POPULAR(\"Popular\"),\n    MOST_VIEWED(\"Most Viewed\"),\n    PRICE_ASC(\"Price low-high\"),\n    PRICE_DESC(\"Price high-low\"),"
    )
    changes.append("Added MOST_VIEWED to SortOption enum")
else:
    changes.append("MOST_VIEWED already in SortOption enum")

# 2. Update sort logic for POPULAR and add MOST_VIEWED
old_sort = """                    SortOption.NEWEST -> list
                    SortOption.POPULAR -> list.sortedByDescending { it.viewCount ?: 0 }
                    SortOption.PRICE_ASC -> list.sortedBy { it.price ?: Double.MAX_VALUE }
                    SortOption.PRICE_DESC -> list.sortedByDescending { it.price ?: 0.0 }"""

new_sort = """                    SortOption.NEWEST -> list
                    SortOption.POPULAR -> list.sortedByDescending { (it.likeCount ?: 0) + (it.viewCount ?: 0) * 2 }
                    SortOption.MOST_VIEWED -> list.sortedByDescending { it.viewCount ?: 0 }
                    SortOption.PRICE_ASC -> list.sortedBy { it.price ?: Double.MAX_VALUE }
                    SortOption.PRICE_DESC -> list.sortedByDescending { it.price ?: 0.0 }"""

if old_sort in content:
    content = content.replace(old_sort, new_sort)
    changes.append("Updated sort logic with MOST_VIEWED")
else:
    changes.append("Sort logic: exact match not found, trying fuzzy")
    # Try to find and replace just the POPULAR line
    if "SortOption.POPULAR -> list.sortedByDescending { it.viewCount ?: 0 }" in content:
        content = content.replace(
            "SortOption.POPULAR -> list.sortedByDescending { it.viewCount ?: 0 }",
            "SortOption.POPULAR -> list.sortedByDescending { (it.likeCount ?: 0) + (it.viewCount ?: 0) * 2 }"
        )
        # Add MOST_VIEWED after POPULAR
        content = content.replace(
            "SortOption.POPULAR -> list.sortedByDescending { (it.likeCount ?: 0) + (it.viewCount ?: 0) * 2 }\n                    SortOption.PRICE_ASC",
            "SortOption.POPULAR -> list.sortedByDescending { (it.likeCount ?: 0) + (it.viewCount ?: 0) * 2 }\n                    SortOption.MOST_VIEWED -> list.sortedByDescending { it.viewCount ?: 0 }\n                    SortOption.PRICE_ASC"
        )
        changes.append("Added MOST_VIEWED sort logic (fuzzy)")
    else:
        changes.append("Could not find POPULAR sort logic line")

# 3. Replace the sort chips LazyRow with FlowRow and move above subcategories
old_sort_chips = """                    item {
                        LazyRow(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 6.dp),
                        ) {
                            items(SortOption.entries, key = { it.name }) { option ->
                                FilterChip(
                                    selected = sortBy == option,
                                    onClick = { sortBy = option },
                                    label = { Text(option.label, style = MaterialTheme.typography.labelMedium) },
                                    leadingIcon = when (option) {
                                        SortOption.POPULAR -> ({ Icon(Icons.AutoMirrored.Filled.TrendingUp, contentDescription = null, modifier = Modifier.size(14.dp)) })
                                        SortOption.NEWEST -> ({ Icon(Icons.AutoMirrored.Filled.Sort, contentDescription = null, modifier = Modifier.size(14.dp)) })
                                        else -> null
                                    },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = MaterialTheme.colorScheme.primary,
                                        selectedLabelColor = MaterialTheme.colorScheme.onPrimary,
                                        selectedLeadingIconColor = MaterialTheme.colorScheme.onPrimary,
                                    ),
                                )
                            }
                        }
                    }"""

new_sort_chips = """                    // Sort chips — visible above subcategories with FlowRow wrapping
                    item {
                        @OptIn(ExperimentalLayoutApi::class)
                        FlowRow(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 6.dp),
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp),
                        ) {
                            SortOption.entries.forEach { option ->
                                FilterChip(
                                    selected = sortBy == option,
                                    onClick = { sortBy = option },
                                    label = { Text(option.label, style = MaterialTheme.typography.labelSmall) },
                                    leadingIcon = when (option) {
                                        SortOption.POPULAR -> ({ Icon(Icons.AutoMirrored.Filled.TrendingUp, contentDescription = null, modifier = Modifier.size(12.dp)) })
                                        SortOption.NEWEST -> ({ Icon(Icons.AutoMirrored.Filled.Sort, contentDescription = null, modifier = Modifier.size(12.dp)) })
                                        SortOption.MOST_VIEWED -> ({ Icon(Icons.Default.Visibility, contentDescription = null, modifier = Modifier.size(12.dp)) })
                                        else -> null
                                    },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = MaterialTheme.colorScheme.primary,
                                        selectedLabelColor = MaterialTheme.colorScheme.onPrimary,
                                        selectedLeadingIconColor = MaterialTheme.colorScheme.onPrimary,
                                    ),
                                )
                            }
                        }
                    }"""

if old_sort_chips in content:
    content = content.replace(old_sort_chips, new_sort_chips)
    changes.append("Replaced sort chips LazyRow with FlowRow")
else:
    changes.append("Sort chips: exact match not found — trying trimmed whitespace")
    # Try with different whitespace
    old_trimmed = old_sort_chips.replace("                    ", "\t")
    if old_trimmed in content:
        content = content.replace(old_trimmed, new_sort_chips)
        changes.append("Replaced sort chips (tab-indented)")
    else:
        changes.append("Could not find sort chips block — checking...")
        # Check if FlowRow already used
        if "FlowRow" in content[content.find("SortOption.entries"):] if "SortOption.entries" in content else False:
            changes.append("FlowRow already in sort chips area")
        else:
            # Count occurrences
            count_lazyrow = content.count("LazyRow(")
            changes.append(f"Total LazyRow occurrences in file: {count_lazyrow}")

# 4. Move sort chips ABOVE subcategories/categories strip
# The current order is: subcategories then sort chips
# We need: sort chips then subcategories
# Find the subcategories block and the sort chips block, swap them

# The subcategories block starts with:
# "// Subcategory chips (category app) or category chips (all-posts)"
sub_start = content.find("// Subcategory chips (category app) or category chips (all-posts)")
if sub_start > 0:
    changes.append(f"Found subcategories block at position {sub_start}")
    # Find the sort chips block (it appears after subcategories)
    # Look for "// Sort chips" comment we just added
    sort_comment = "// Sort chips"
    sort_pos = content.find(sort_comment, sub_start)
    if sort_pos > 0:
        changes.append(f"Found sort chips comment at position {sort_pos}")
        
        # Find the end of the sort chips item
        # After the closing } of item { ... }
        # Find the subcategories block and sort block
        
        # Subcategories block: starts at "// Subcategory chips..."
        # Need to find where the subcategories `item` block ends
        # And where the sort `item` block ends, then swap them
        
        # Actually, let me find both blocks and swap them
        # Subcategories block starts at sub_start
        # It's inside an `item { ... }`
        # Find the next `item {` after sub_start (should be the sort chips item)
        
        sub_block_end = sort_pos  # sort chips start right after subcategories item
        
        # Find where sort chips item ends (the next `item` or other block)
        # After sort chips, the next block is quick filter chips
        quick_filter_start = content.find("// Quick filter chips", sub_start)
        if quick_filter_start < 0:
            quick_filter_start = content.find("// Price filter row", sub_start)
        
        if quick_filter_start > sort_pos:
            # Extract both blocks and swap
            sub_block = content[sub_start:sub_block_end]
            sort_block = content[sub_block_end:quick_filter_start]
            
            # Check that sort_block contains SortOption
            if "SortOption" in sort_block:
                # Swap: put sort_block before sub_block
                new_section = f"// Sort chips moved above subcategories\n{sort_block}\n\n{sub_block}"
                content = content[:sub_start] + new_section + content[quick_filter_start:]
                changes.append("Swapped sort chips above subcategories")
            else:
                changes.append("Sort block doesn't contain SortOption — skipping swap")
        else:
            changes.append(f"Quick filter start at {quick_filter_start} not after sort at {sort_pos}")
    
    # Alternate approach: find the subcategories item block by counting braces
    if "Swapped" not in str(changes):
        changes.append("Using alternate approach: find and swap item blocks")
        # Find all item { ... } blocks between sub_start and where quick filters start
        # Extract the full subcategories item
        # The subcategories code is within a LazyColumn item { }
        # Let's find the closing } of the subcategories item block
        idx = sub_start
        brace_count = 0
        started = False
        for i in range(idx, min(idx + 3000, len(content))):
            c = content[i]
            if c == '{':
                brace_count += 1
                started = True
            elif c == '}':
                brace_count -= 1
                if started and brace_count == 0:
                    changes.append(f"Subcategories block ends at position {i+1}")
                    break
else:
    changes.append("Could not find subcategories block")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("=== Changes applied ===")
for c in changes:
    print(f"  • {c}")
