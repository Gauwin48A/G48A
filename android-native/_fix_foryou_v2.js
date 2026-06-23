const fs = require('fs');
const path = 'app/src/main/java/com/mhub/app/ui/foryou/ForYouScreen.kt';
let code = fs.readFileSync(path, 'utf-8');

// 1. Add import for AllPostCard from explore package
code = code.replace(
  'import com.mhub.app.ui.components.ImageZoomDialog\n',
  'import com.mhub.app.ui.components.ImageZoomDialog\nimport com.mhub.app.ui.explore.AllPostCard\n'
);

// 2. Remove unused variables
code = code.replace(
  '    var quickFilter by remember { mutableStateOf<String?>(null) }\n    var timeFilter by remember { mutableStateOf<String?>(null) }\n    var minPrice by remember { mutableStateOf("") }\n    var maxPrice by remember { mutableStateOf("") }\n    var verifiedOnly by remember { mutableStateOf(false) }',
  '    var quickFilter by remember { mutableStateOf<String?>(null) }'
);

// 3. Simplify displayed computation
code = code.replace(
  '    val displayed = remember(state.posts, state.selectedCategory, quickFilter, timeFilter, searchQuery, state.sortBy, state.sortAscending, minPrice, maxPrice, verifiedOnly, hiddenPostIds) {',
  '    val displayed = remember(state.posts, state.selectedCategory, quickFilter, searchQuery, state.sortBy, state.sortAscending, hiddenPostIds) {'
);

// Remove price range filter
code = code.replace(
  '            .let { list ->\n                // Price range filter (web parity)\n                val min = minPrice.toDoubleOrNull()\n                val max = maxPrice.toDoubleOrNull()\n                if (min != null || max != null) {\n                    list.filter { post ->\n                        val p = post.price ?: return@filter true\n                        (min == null || p >= min) && (max == null || p <= max)\n                    }\n                } else list\n            }',
  ''
);

// Remove verified-only filter
code = code.replace(
  '            .let { list ->\n                // Verified-only filter (web parity)\n                if (verifiedOnly) list.filter { it.sellerVerified == true } else list\n            }',
  ''
);

// Remove timeFilter block
code = code.replace(
  '            .let { list ->\n                if (timeFilter == null) list\n                else {\n                    val nowMs = System.currentTimeMillis()\n                    val cutoffMs = when (timeFilter) {\n                        "Today" -> nowMs - 24L * 60 * 60 * 1000\n                        "Week" -> nowMs - 7L * 24 * 60 * 60 * 1000\n                        "Month" -> nowMs - 30L * 24 * 60 * 60 * 1000\n                        else -> 0L\n                    }\n                    list.filter { post ->\n                        if (post.createdAt.isNullOrBlank()) true\n                        else try {\n                            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {\n                                java.time.Instant.parse(post.createdAt).toEpochMilli() >= cutoffMs\n                            } else true\n                        } catch (_: Exception) { true }\n                    }\n                }\n            }',
  ''
);

// 4. Replace sponsored + recommended header + AI insight card sections
// Using simple string patterns to avoid template literal issues
const sponsoredStart = '                    if (state.sponsored.isNotEmpty()) {';
const aiInsightEnd = '                        )\n                    }\n                    }';
const aiInsightFullEnd = '                            )\n                        }\n                    }\n                    }';

// Find the range from sponsored section through AI insight card
const sponsoredIdx = code.indexOf(sponsoredStart);
if (sponsoredIdx === -1) { console.log('ERROR: sponsored section not found'); process.exit(1); }

// Find the end of the AI insight card section
const aiInsightLoc = code.indexOf('item(key = "ai_insight")', sponsoredIdx);
if (aiInsightLoc === -1) { console.log('ERROR: ai_insight not found'); process.exit(1); }

// Find the end of AI insight card - it's followed by "if (displayed.isEmpty())"
const emptyStateLoc = code.indexOf('if (displayed.isEmpty())', aiInsightLoc);
if (emptyStateLoc === -1) { console.log('ERROR: empty state not found'); process.exit(1); }

// Extract what to remove
const toRemove = code.substring(sponsoredIdx, emptyStateLoc);
const recommendedHeader = 
`                    // Posts using AllPostCard (same as AllPosts pattern)
                    if (displayed.isNotEmpty()) {
                        item(key = "recommended_header") {
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                Icon(Icons.Default.AutoAwesome, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(18.dp))
                                Text(stringResource(com.mhub.app.R.string.foryou_recommended), fontWeight = FontWeight.Bold, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurface)
                                Spacer(Modifier.weight(1f))
                                Text("` + '${displayed.size}' + ` picks", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
`;

code = code.replace(toRemove, recommendedHeader);

// 5. Replace itemsIndexed section with AllPostCard + grid view
const itemsIndexedStart = '                    itemsIndexed(displayed, key = { _, post -> post.stableId }) { index, post ->';
const itemsIndexedIdx = code.indexOf(itemsIndexedStart);
if (itemsIndexedIdx === -1) { console.log('ERROR: itemsIndexed not found'); process.exit(1); }

// Find the end - it's the closing of the itemsIndexed block, before guest login
const guestLoginIdx = code.indexOf('if (isGuest && displayed.size >= 5)', itemsIndexedIdx);
if (guestLoginIdx === -1) { console.log('ERROR: guest login not found'); process.exit(1); }

// The itemsIndexed section ends just before guest login
// We need to find the last } before guestLoginIdx that closes the itemsIndexed block
// Looking backwards from guestLoginIdx, find the matching closing brace
let depth = 0;
let endIdx = -1;
for (let i = guestLoginIdx - 1; i >= itemsIndexedIdx; i--) {
  if (code[i] === '}') depth++;
  else if (code[i] === '{') depth--;
  if (depth === 0 && i > itemsIndexedIdx) {
    endIdx = i + 1; // include the brace
    break;
  }
}
if (endIdx === -1) { console.log('ERROR: could not find end of itemsIndexed'); process.exit(1); }

const itemsToRemove = code.substring(itemsIndexedIdx, endIdx);

const newItemsSection = 
`
                    if (isGridView) {
                        val chunked = displayed.chunked(2)
                        items(chunked.size, key = { "grid_row_$it" }) { rowIdx ->
                            val row = chunked[rowIdx]
                            Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                row.forEach { post ->
                                    Card(
                                        onClick = { onOpenPost(post.stableId) },
                                        shape = RoundedCornerShape(14.dp),
                                        modifier = Modifier.weight(1f),
                                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                                        elevation = CardDefaults.cardElevation(2.dp),
                                    ) {
                                        Column {
                                            Box(Modifier.fillMaxWidth().height(130.dp)) {
                                                if (post.primaryImage != null) {
                                                    AsyncImage(model = post.primaryImage, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(topStart = 14.dp, topEnd = 14.dp)))
                                                } else {
                                                    Box(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.surfaceVariant), contentAlignment = Alignment.Center) {
                                                        Icon(Icons.Outlined.ImageNotSupported, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(28.dp))
                                                    }
                                                }
                                            }
                                            Column(Modifier.padding(8.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                                Text(post.displayTitle, maxLines = 2, overflow = TextOverflow.Ellipsis, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold)
                                                post.price?.let { Text("₹" + "%,.0f".format(it), fontWeight = FontWeight.Bold, fontSize = 13.sp, color = MaterialTheme.colorScheme.primary) }
                                                post.location?.let { loc ->
                                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                                        Icon(Icons.Default.LocationOn, null, modifier = Modifier.size(10.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                                        Text(loc, fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                                    }
                                                }
                                                post.viewCount?.let { v ->
                                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                                        Icon(Icons.Default.Visibility, null, modifier = Modifier.size(10.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                                        Text(" " + v + " views", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                                if (row.size == 1) Spacer(Modifier.weight(1f))
                            }
                        }
                    } else {
                        items(displayed, key = { it.stableId }) { post ->
                            AllPostCard(
                                post = post,
                                onClick = { onOpenPost(post.stableId) },
                                isWishlisted = state.compareItems.contains(post.stableId),
                                onToggleWishlist = { viewModel.toggleBookmark(post.stableId) },
                                isCompared = state.compareItems.contains(post.stableId),
                                onToggleCompare = { viewModel.toggleCompare(post.stableId) },
                                isInCart = state.cartItems.contains(post.stableId),
                                onToggleCart = { viewModel.toggleCart(post.stableId) },
                                onInterested = { interestPostId = post.stableId; interestPostTitle = post.displayTitle; showInterestModal = true },
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                            )
                        }
                    }
`;

code = code.replace(itemsToRemove, newItemsSection);

// 6. Replace load more button
const oldLoadMore = '                    if (!isGuest && state.hasMorePosts && displayed.isNotEmpty()) {';
const loadMoreIdx = code.indexOf(oldLoadMore);
if (loadMoreIdx === -1) { console.log('ERROR: load more not found'); process.exit(1); }

// Find the closing of the load more block
let loadMoreEnd = code.indexOf('\n                    }\n\n                    }\n', loadMoreIdx);
if (loadMoreEnd === -1) loadMoreEnd = code.indexOf('\n                }\n                    if (state.compareItems.size >= 2)', loadMoreIdx);
if (loadMoreEnd === -1) { console.log('ERROR: could not find end of load more'); process.exit(1); }

// Find the actual end - search for the } that closes the load more item block
let lDepth = 0;
let lEnd = -1;
for (let i = loadMoreIdx; i < code.length; i++) {
  if (code[i] === '{') lDepth++;
  else if (code[i] === '}') {
    lDepth--;
    if (lDepth === 0) {
      lEnd = i + 1;
      break;
    }
  }
}
if (lEnd === -1) { console.log('ERROR: cannot find end of load more block'); process.exit(1); }

const loadMoreBlock = code.substring(loadMoreIdx, lEnd);

const newLoadMore = 
`                    // Load more / end indicator (AllPosts parity)
                    item {
                        if (state.hasMorePosts && !isGuest) {
                            Box(Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) {
                                Button(
                                    onClick = { viewModel.loadMore() },
                                    modifier = Modifier.fillMaxWidth(0.5f)
                                ) {
                                    Icon(Icons.Default.ExpandMore, null, modifier = Modifier.size(20.dp))
                                    Spacer(Modifier.width(8.dp))
                                    Text(stringResource(com.mhub.app.R.string.foryou_load_more))
                                }
                            }
                        } else if (displayed.isNotEmpty()) {
                            Box(Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) {
                                Text("You have seen all recommendations", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
`;

code = code.replace(loadMoreBlock, newLoadMore);

// 7. Remove AiSectionHeader function
const aiHeaderFunc = '/* ── AI Section header ───────────────────────────────────────────────────── */\n\n@Composable\nprivate fun AiSectionHeader(';
const aiHeaderIdx = code.indexOf(aiHeaderFunc);
if (aiHeaderIdx !== -1) {
  let aDepth = 0;
  let aFound = false;
  let aEnd = -1;
  for (let i = aiHeaderIdx; i < code.length; i++) {
    if (code[i] === '{') aDepth++;
    else if (code[i] === '}') {
      aDepth--;
      if (aDepth === 0 && aFound) { aEnd = i + 1; break; }
      if (aDepth === 0) aFound = true;
    }
  }
  if (aEnd !== -1) {
    code = code.substring(0, aiHeaderIdx) + code.substring(aEnd);
  }
}

// 8. Remove unused imports
code = code.replace('import com.mhub.app.ui.components.PromoBadgeRow\n', '');
code = code.replace('import com.mhub.app.ui.components.PostActionRow\n', '');
code = code.replace('import kotlinx.coroutines.flow.debounce\n', '');
code = code.replace('import kotlinx.coroutines.flow.distinctUntilChanged\n', '');
code = code.replace('import androidx.compose.ui.text.input.KeyboardType\n', '');

// 9. Remove unused icon imports
code = code.replace('import androidx.compose.material.icons.automirrored.filled.ArrowBack\n', '');
code = code.replace('import androidx.compose.material.icons.automirrored.filled.ArrowForward\n', '');
code = code.replace('import androidx.compose.material.icons.automirrored.filled.TrendingUp\n', '');

// 10. Remove duplicate grid/list toggle from TopAppBar actions
code = code.replace(
  '                actions = {\n                    IconButton(onClick = { isGridView = !isGridView }) {\n                        Icon(if (isGridView) Icons.Default.ViewList else Icons.Default.GridOn, contentDescription = if (isGridView) "List" else "Grid")\n                    }\n                },',
  ''
);

fs.writeFileSync(path, code);
console.log('DONE: ForYouScreen.kt updated');
