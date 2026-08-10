const fs = require('fs');

const exploreFile = 'android-native/app/src/main/java/com/mhub/app/ui/explore/ExploreScreen.kt';
let exploreContent = fs.readFileSync(exploreFile, 'utf8');

// The file has a duplicate/messy section near the end of bannerSlides
// Let's replace the whole bannerSlides definition cleanly

const bannerSlidesDefinition = `private val bannerSlides = listOf(
    BannerSlide(
        gradientColors = listOf(Color(0xFF1E40AF), Color(0xFF3B82F6), Color(0xFF6366F1)),
        badge = "LIMITED TIME", badgeIcon = "🔥",
        title = "Great Deals Await!", subtitle = "Discover unbeatable offers on top brands",
        ctaText = "Shop Now", emoji = "🛒", discount = "UP TO 60% OFF",
    ),
    BannerSlide(
        gradientColors = listOf(Color(0xFF7C3AED), Color(0xFFA855F7), Color(0xFFD946EF)),
        badge = "NEW ARRIVALS", badgeIcon = "✨",
        title = "Fresh Listings Daily", subtitle = "Be the first to grab new items near you",
        ctaText = "Explore", emoji = "✨", discount = "JUST LISTED",
    ),
    BannerSlide(
        gradientColors = listOf(Color(0xFF10B981), Color(0xFF10B981), Color(0xFF10B981)),
        badge = "VERIFIED SELLERS", badgeIcon = "✅",
        title = "Shop with Confidence", subtitle = "Trusted sellers with top ratings & reviews",
        ctaText = "Browse", emoji = "🛡️", discount = "100% TRUSTED",
    ),
    BannerSlide(
        gradientColors = listOf(Color(0xFFEA580C), Color(0xFFF97316), Color(0xFFFBBF24)),
        badge = "FLASH SALE", badgeIcon = "⚡",
        title = "Flash Sale Live!", subtitle = "Limited stock at incredible prices — hurry!",
        ctaText = "Grab Now", emoji = "⚡", discount = "UP TO 80% OFF",
    ),
)`;

exploreContent = exploreContent.replace(/private val bannerSlides = listOf\([\s\S]*?@OptIn/m, bannerSlidesDefinition + '\n\n@OptIn');
fs.writeFileSync(exploreFile, exploreContent);

const homeFile = 'android-native/app/src/main/java/com/mhub/app/ui/home/HomeScreen.kt';
let homeContent = fs.readFileSync(homeFile, 'utf8');

// Remove the private keyword from inside the function and fix spacing
homeContent = homeContent.replace(/private fun CategoriesStrip/g, 'fun CategoriesStrip');

fs.writeFileSync(homeFile, homeContent);
console.log('Cleaned up syntax errors and duplicate blocks');
