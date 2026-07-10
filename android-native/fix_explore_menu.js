const fs = require('fs');
const path = 'app/src/main/java/com/mhub/app/ui/explore/ExploreScreen.kt';
let content = fs.readFileSync(path, 'utf8');

// Find the AllPostCard function
const allPostCardStart = content.indexOf('fun AllPostCard(');
if (allPostCardStart < 0) { console.log('ERROR: AllPostCard not found'); process.exit(1); }

// Find where AllPostCard ends - look for next fun keyword or end of file
const cardEndSearch = content.indexOf('\nfun ', allPostCardStart + 15);
const cardEnd = cardEndSearch > 0 ? cardEndSearch : content.length;
const cardBody = content.substring(allPostCardStart, cardEnd);

// Find the 3-dot menu section
const menuStart = cardBody.indexOf('// 3-dot menu');
if (menuStart < 0) { console.log('ERROR: 3-dot menu not found'); process.exit(1); }

// Find the end of this section - look for the last } that closes the Box, followed by a newline and } that closes the Column
const menuSection = cardBody.substring(menuStart);
// Find: after the last `}\n                }\n            }\n\n            // Title`
const menuCloseMarker = menuSection.indexOf('            // Title');
if (menuCloseMarker < 0) { console.log('ERROR: Title marker not found after menu'); process.exit(1); }

// The menu section starts at menuStart and ends at the blank line before // Title
// The closing `}` at menuCloseMarker-1 is actually the `}` that closes the Column wrapping the author row
// Let me find the exact ending
const sectionEnd = menuCloseMarker; // Position relative to menuSection

// Extract the exact menu block
const menuBlock = menuSection.substring(0, sectionEnd);
const lastNewlineBeforeTitle = menuBlock.lastIndexOf('\n            // Title');
const actualMenuEnd = lastNewlineBeforeTitle >= 0 ? lastNewlineBeforeTitle : sectionEnd;
const menuTextToReplace = menuSection.substring(0, actualMenuEnd);

const replacementText = `                // 3-dot menu — uses AlertDialog for reliable touch handling in scrollable context
                var showPostMenu by remember { mutableStateOf(false) }
                IconButton(onClick = { showPostMenu = true }, modifier = Modifier.size(32.dp)) {
                    Icon(Icons.Default.MoreVert, contentDescription = "More options", tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(20.dp))
                }`;

// Do the replacement
const beforeMenu = cardBody.substring(0, menuStart);
const afterMenu = cardBody.substring(menuStart + menuTextToReplace.length);
const newCardBody = beforeMenu + replacementText + afterMenu;

// Now add AlertDialog at the end of the Card, before the fun ends
// Find where the Card's Column closes and Card closes
const cardColumnEnd = newCardBody.lastIndexOf('        }');
// Add AlertDialog after the Card's last content
const dialogCode = `\n    // Post action dialog — uses AlertDialog instead of DropdownMenu for reliable touch handling
    if (showPostMenu) {
        AlertDialog(
            onDismissRequest = { showPostMenu = false },
            title = { Text("Post Actions", fontWeight = FontWeight.Bold) },
            text = {
                Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Surface(onClick = { showPostMenu = false; onToggleCompare() }, shape = RoundedCornerShape(12.dp)) {
                        Row(Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Icon(Icons.Default.Compare, null, modifier = Modifier.size(20.dp))
                            Column { Text(if (isCompared) "Remove from Compare" else "Compare", fontWeight = FontWeight.Medium) }
                        }
                    }
                    Surface(onClick = { showPostMenu = false; onToggleWishlist() }, shape = RoundedCornerShape(12.dp)) {
                        Row(Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Icon(if (isWishlisted) Icons.Default.Bookmark else Icons.Outlined.BookmarkBorder, null, modifier = Modifier.size(20.dp), tint = if (isWishlisted) Color(0xFF6366F1) else MaterialTheme.colorScheme.onSurface)
                            Column { Text(if (isWishlisted) "Remove from Wishlist" else "Save to Wishlist", fontWeight = FontWeight.Medium) }
                        }
                    }
                    Surface(onClick = {
                        showPostMenu = false
                        val shareIntent = Intent(Intent.ACTION_SEND).apply { type = "text/plain"; putExtra(Intent.EXTRA_TEXT, "Check out ${post.displayTitle} on MHub!") }
                        context.startActivity(Intent.createChooser(shareIntent, "Share via"))
                    }, shape = RoundedCornerShape(12.dp)) {
                        Row(Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Icon(Icons.Outlined.Share, null, modifier = Modifier.size(20.dp))
                            Column { Text("Share", fontWeight = FontWeight.Medium) }
                        }
                    }
                    Surface(onClick = { showPostMenu = false; onToggleCart() }, shape = RoundedCornerShape(12.dp)) {
                        Row(Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Icon(if (isInCart) Icons.Default.RemoveShoppingCart else Icons.Outlined.ShoppingCart, null, modifier = Modifier.size(20.dp), tint = if (isInCart) Color(0xFFEF4444) else MaterialTheme.colorScheme.onSurface)
                            Column { Text(if (isInCart) "Remove from Cart" else "Add to Cart", fontWeight = FontWeight.Medium) }
                        }
                    }
                    if (isOwner) {
                        Surface(onClick = { showPostMenu = false; onPromote() }, shape = RoundedCornerShape(12.dp)) {
                            Row(Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                Icon(Icons.AutoMirrored.Filled.TrendingUp, null, modifier = Modifier.size(20.dp), tint = Color(0xFFF59E0B))
                                Column { Text("Promote", fontWeight = FontWeight.Medium) }
                            }
                        }
                    }
                    Surface(onClick = { showPostMenu = false }, shape = RoundedCornerShape(12.dp)) {
                        Row(Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Icon(Icons.Outlined.Flag, null, modifier = Modifier.size(20.dp))
                            Column { Text("Report", fontWeight = FontWeight.Medium) }
                        }
                    }
                }
            },
            confirmButton = { TextButton(onClick = { showPostMenu = false }) { Text("Cancel") } },
            shape = RoundedCornerShape(22.dp),
        )
    }`;

const insertPos = newCardBody.lastIndexOf('}');
if (insertPos > 0) {
    const finalCardBody = newCardBody.substring(0, insertPos) + dialogCode + '\n' + newCardBody.substring(insertPos);
    
    // Reconstruct the full file
    const newContent = content.substring(0, allPostCardStart) + finalCardBody + content.substring(cardEnd);
    fs.writeFileSync(path, newContent);
    console.log('SUCCESS: ExploreScreen.kt updated with AlertDialog replacing DropdownMenu');
} else {
    console.log('ERROR: Could not find insertion point');
}
