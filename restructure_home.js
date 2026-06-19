const fs = require('fs');
const file = 'android-native/app/src/main/java/com/mhub/app/ui/home/HomeScreen.kt';
let content = fs.readFileSync(file, 'utf8');

// The QuickAccessRow implementation is broken because of incorrect remember scope fixes
// Let's find and replace it with a clean implementation

const cleanQuickAccess = `@Composable
fun QuickAccessRow(
    onOpenCart: () -> Unit,
    onOpenWishlist: () -> Unit,
    onOpenRecentlyViewed: () -> Unit,
    modifier: Modifier = Modifier,
    accentColor: Color = MaterialTheme.colorScheme.primary,
) {
    val items = listOf(
        Triple("Cart", Icons.Outlined.ShoppingCart, MaterialTheme.colorScheme.primary),
        Triple("Wishlist", Icons.Outlined.FavoriteBorder, MaterialTheme.colorScheme.secondary),
        Triple("History", Icons.Outlined.History, MaterialTheme.colorScheme.tertiary),
    )

    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        items.forEach { (label, icon, color) ->
            Card(
                onClick = {
                    when (label) {
                        "Cart" -> onOpenCart()
                        "Wishlist" -> onOpenWishlist()
                        "History" -> onOpenRecentlyViewed()
                    }
                },
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(
                    modifier = Modifier.padding(12.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Box(
                        modifier = Modifier.size(36.dp).clip(CircleShape).background(color.copy(alpha = 0.1f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(20.dp))
                    }
                    Spacer(Modifier.height(6.dp))
                    Text(label, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Medium)
                }
            }
        }
    }
}`;

// Also fix the promoSlides block near line 1220
const cleanPromo = `val promoSlides = listOf(
                                    Triple("🎁 Great Deals", "Up to 70% off today", MaterialTheme.colorScheme.primary),
                                    Triple("✨ New Arrivals", "Fresh listings every hour", Color(0xFF7C3AED)),
                                    Triple("📍 Near You", "Discover local sellers", MaterialTheme.colorScheme.tertiary),
                                )`;

content = content.replace(/@Composable\s*fun QuickAccessRow\([\s\S]*?\}\s*\}\s*\}/m, cleanQuickAccess);
content = content.replace(/val promoSlides = remember \{[\s\S]*?Triple\("🎁 Great Deals"[\s\S]*?\}\s*\)\s*\}/m, cleanPromo);

fs.writeFileSync(file, content);
console.log('Restructured HomeScreen.kt');
