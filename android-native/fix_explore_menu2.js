const fs = require('fs');
const path = 'app/src/main/java/com/mhub/app/ui/explore/ExploreScreen.kt';
let content = fs.readFileSync(path, 'utf8');

// Find the AllPostCard function
const allPostCardStart = content.indexOf('fun AllPostCard(');
if (allPostCardStart < 0) { console.log('ERROR: AllPostCard not found'); process.exit(1); }

// Find where AllPostCard ends - look for next fun keyword
const cardEndSearch = content.indexOf('\nprivate fun ', allPostCardStart + 15);
const cardEnd = cardEndSearch > 0 ? cardEndSearch : content.indexOf('\n@Composable\n', allPostCardStart + 15);
const cardBody = content.substring(allPostCardStart, cardEnd);

// Find position to insert AlertDialog - after `showPostMenu` state, before Card
// Find the Card opening
const cardOpenIdx = cardBody.indexOf('Card(');
if (cardOpenIdx < 0) { console.log('ERROR: Card not found'); process.exit(1); }

// Find the closing of the function body - the last }
const lastBrace = cardBody.lastIndexOf('}');
// Find the last non-whitespace character before that
const bodyEnd = cardBody.substring(0, lastBrace).trimEnd();
const insertPos = bodyEnd.length;

const dialogCode = `
    // Post action dialog — uses AlertDialog instead of DropdownMenu for reliable touch handling
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
                        val shareIntent = Intent(Intent.ACTION_SEND).apply { type = "text/plain"; putExtra(Intent.EXTRA_TEXT, "Check out " + post.displayTitle + " on MHub!") }
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

const finalCardBody = cardBody.substring(0, insertPos) + dialogCode + '\n' + cardBody.substring(insertPos);
const newContent = content.substring(0, allPostCardStart) + finalCardBody + content.substring(cardEnd);
fs.writeFileSync(path, newContent);
console.log('SUCCESS: AlertDialog added to AllPostCard');
