import re

with open('android-native/app/src/main/java/com/mhub/app/ui/explore/ExploreScreen.kt', 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')

# ─── Fix 1: Sort options LazyRow → Row with horizontalScroll + indicator ───

# Find the LazyRow for sort options (after "sortOptions" items)
sort_lazrow_start = None
sort_lazrow_end = None
for i, line in enumerate(lines):
    if 'LazyRow(' in line and 'sortOptions' not in line and i > 1660:
        # Check if this is the sort LazyRow by looking at context
        if any('horizontalArrangement' in lines[j] for j in range(i, min(i+5, len(lines)))):
            sort_lazrow_start = i
            break

if sort_lazrow_start:
    # Find the closing }) of the LazyRow
    depth = 0
    started = False
    for j in range(sort_lazrow_start, min(sort_lazrow_start + 30, len(lines))):
        if not started:
            if '{' in lines[j]:
                started = True
                depth += lines[j].count('{') - lines[j].count('}')
        else:
            depth += lines[j].count('{') - lines[j].count('}')
            if depth <= 0:
                sort_lazrow_end = j
                break

    if sort_lazrow_end:
        # Replace LazyRow with Box + scroll state
        indent = ' ' * (len(lines[sort_lazrow_start]) - len(lines[sort_lazrow_start].lstrip()))
        next_indent = indent + '    '
        
        # Build the new sort section
        new_lines = [
            f'{indent}val sortScrollState = rememberScrollState()',
            f'{indent}Box {{',
            f'{next_indent}Row(',
            f'{next_indent}    modifier = Modifier',
            f'{next_indent}        .fillMaxWidth()',
            f'{next_indent}        .horizontalScroll(sortScrollState)',
            f'{next_indent}        .padding(start = 16.dp, end = 16.dp, bottom = 6.dp),',
            f'{next_indent}    horizontalArrangement = Arrangement.spacedBy(8.dp),',
            f'{next_indent}) {{',
        ]
        
        # Copy the inner items code
        for k in range(sort_lazrow_start + 1, sort_lazrow_end):
            line = lines[k]
            if 'LazyRow(' in line or 'LazyRow ' in line:
                continue
            if line.strip().startswith('LazyRow'):
                continue
            if line.strip().startswith('items('):
                # Convert items() to forEach
                new_lines.append(line.replace('items(sortOptions.size, key = { sortOptions[it].first }) { idx ->', 'sortOptions.forEach { (key, label) ->'))
            elif line.strip() == 'val (key, label) = sortOptions[idx]':
                continue  # Remove this line since forEach gives us key, label directly
            else:
                new_lines.append(line)
        
        # Close the Row and add scroll indicator
        new_lines.append(f'{next_indent}}}')
        new_lines.append(f'{indent}    HorizontalScrollIndicator(scrollState = sortScrollState)')
        new_lines.append(f'{indent}}}')
        
        # Replace the original lines
        lines[sort_lazrow_start:sort_lazrow_end+1] = new_lines

# ─── Fix 2: Subcategory FlowRow → Row with horizontalScroll + indicator ───

for i, line in enumerate(lines):
    if '// Subcategory chips in a wrapping FlowRow' in line:
        flowrow_start = i
        break
else:
    # Try alternative
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith('FlowRow(') and 'ecosystemSubcategories' in content.split(line)[1][:200] if len(content.split(line)) > 1 else False:
            flowrow_start = i
            break
    else:
        flowrow_start = None

if flowrow_start:
    # Find the comment line and the actual FlowRow
    actual_flowrow_start = None
    for j in range(flowrow_start, min(flowrow_start + 5, len(lines))):
        if lines[j].strip().startswith('FlowRow('):
            actual_flowrow_start = j
            break
    
    if actual_flowrow_start is None:
        actual_flowrow_start = flowrow_start + 2  # skip comment
    
    # Find the closing }) of FlowRow
    depth = 0
    started = False
    for j in range(actual_flowrow_start, min(actual_flowrow_start + 40, len(lines))):
        if not started:
            if '{' in lines[j]:
                started = True
                depth += lines[j].count('{') - lines[j].count('}')
        else:
            depth += lines[j].count('{') - lines[j].count('}')
            if depth <= 0:
                flowrow_end = j
                break
    
    if actual_flowrow_start and flowrow_end:
        indent = ' ' * (len(lines[actual_flowrow_start]) - len(lines[actual_flowrow_start].lstrip()))
        next_indent = indent + '    '
        
        # Keep the comment
        comment_lines = []
        for j in range(flowrow_start, actual_flowrow_start):
            comment_lines.append(lines[j])
        
        # Build new category section: Column { Row(horizontalScroll...) + HorizontalScrollIndicator }
        new_lines = comment_lines + [
            f'{indent}val catScrollState = rememberScrollState()',
            f'{indent}Column {{',
            f'{next_indent}Row(',
            f'{next_indent}    modifier = Modifier',
            f'{next_indent}        .fillMaxWidth()',
            f'{next_indent}        .horizontalScroll(catScrollState)',
            f'{next_indent}        .padding(horizontal = 16.dp, vertical = 6.dp),',
            f'{next_indent}    horizontalArrangement = Arrangement.spacedBy(6.dp),',
            f'{next_indent}) {{',
        ]
        
        # Copy the inner chips code from original FlowRow
        for k in range(actual_flowrow_start + 1, flowrow_end):
            line = lines[k]
            if line.strip().startswith('FlowRow('):
                continue
            if line.strip().startswith('FlowRow '):
                continue
            new_lines.append(line)
        
        # Close Row and add scroll indicator, close Column
        new_lines.append(f'{next_indent}}}')
        new_lines.append(f'{indent}    HorizontalScrollIndicator(scrollState = catScrollState)')
        new_lines.append(f'{indent}}}')
        
        # Calculate range to replace
        replace_start = flowrow_start
        replace_end = flowrow_end
        
        lines[replace_start:replace_end+1] = new_lines

# Write back
result = '\n'.join(lines)
with open('android-native/app/src/main/java/com/mhub/app/ui/explore/ExploreScreen.kt', 'w', encoding='utf-8', newline='\n') as f:
    f.write(result)

print("Done! File updated.")
