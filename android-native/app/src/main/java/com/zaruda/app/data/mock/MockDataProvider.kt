package com.zaruda.app.data.mock

/**
 * Central mock data provider for all category app screens.
 * Used when backend API is unavailable or for offline demo mode.
 */
object MockDataProvider {

    data class MockProduct(
        val id: String,
        val title: String,
        val description: String,
        val price: Double,
        val originalPrice: Double,
        val imageUrl: String,
        val images: List<String>,
        val category: String,        // "electronics" | "fashion" | "grocery" | "furniture"
        val subcategory: String,
        val brand: String,
        val rating: Float,
        val reviewCount: Int,
        val colors: List<String>,    // Hex codes or color names
        val sizes: List<String>,     // S/M/L or storage sizes or weight
        val inStock: Boolean,
        val condition: String,       // New, Like New, Used, Refurbished
        val specs: Map<String, String>,
        val deliveryDays: Int,
        val freeShipping: Boolean,
        val isTrending: Boolean = false,
        val isNewArrival: Boolean = false,
        val isDeal: Boolean = false,
    ) {
        val discountPercent: Int get() =
            if (originalPrice > price) ((1 - price / originalPrice) * 100).toInt() else 0
    }

    data class MockSubcategory(
        val id: String,
        val name: String,
        val categoryKey: String,
        val imageUrl: String,
        val productCount: Int,
    )

    data class HeroBanner(
        val id: String,
        val title: String,
        val subtitle: String,
        val imageUrl: String,
        val categoryKey: String,
        val actionLabel: String = "Shop Now",
    )

    data class MockBrand(
        val id: String,
        val name: String,
        val logoUrl: String,
        val categoryKey: String,
    )

    data class MockReview(
        val id: String,
        val reviewerName: String,
        val rating: Float,
        val comment: String,
        val date: String,
        val helpfulCount: Int,
    )

    // ── Image helper ────────────────────────────────────────────────────────
    private fun img(seed: String, w: Int = 400, h: Int = 400) =
        "https://picsum.photos/seed/$seed/$w/$h"

    private fun banner(seed: String) = img(seed, 800, 400)

    // ── ELECTRONICS ─────────────────────────────────────────────────────────

    val electronicsSubcategories = listOf(
        MockSubcategory("e-phones",     "Smartphones",    "electronics", img("phone1"),    320),
        MockSubcategory("e-laptops",    "Laptops",        "electronics", img("laptop1"),   185),
        MockSubcategory("e-audio",      "Headphones",     "electronics", img("audio1"),    210),
        MockSubcategory("e-cameras",    "Cameras",        "electronics", img("camera1"),    95),
        MockSubcategory("e-tvs",        "Televisions",    "electronics", img("tv1"),       130),
        MockSubcategory("e-tablets",    "Tablets",        "electronics", img("tablet1"),   115),
        MockSubcategory("e-gaming",     "Gaming",         "electronics", img("gaming1"),   175),
        MockSubcategory("e-wearables",  "Wearables",      "electronics", img("watch1"),   145),
        MockSubcategory("e-smarthome",  "Smart Home",     "electronics", img("smart1"),    88),
        MockSubcategory("e-acc",        "Accessories",    "electronics", img("acc1"),     360),
    )

    val electronicsBanners = listOf(
        HeroBanner("eb1", "Flagship Phones",     "Up to 30% off on latest models",       banner("phone-banner"),    "electronics"),
        HeroBanner("eb2", "Laptop Deals",        "Work from anywhere — starting ₹35,999", banner("laptop-banner"),  "electronics"),
        HeroBanner("eb3", "Sound Experience",    "Premium audio, up to 40% off",          banner("audio-banner"),   "electronics"),
        HeroBanner("eb4", "Smart TV Bonanza",    "4K & OLED TVs at never-before prices",  banner("tv-banner"),      "electronics"),
        HeroBanner("eb5", "New Arrivals",        "Fresh tech, delivered fast",            banner("newtech-banner"), "electronics"),
    )

    val electronicsProducts = listOf(
        MockProduct(
            id = "ep001", title = "Samsung Galaxy S24 Ultra", brand = "Samsung",
            description = "Top-tier Android flagship with S-Pen, 200MP camera, and Snapdragon 8 Gen 3.",
            price = 124999.0, originalPrice = 139999.0,
            imageUrl = img("phone-samsung"), images = listOf(img("phone-samsung"), img("phone-samsung2"), img("phone-samsung3")),
            category = "electronics", subcategory = "e-phones",
            rating = 4.8f, reviewCount = 2341, colors = listOf("#2D3436","#6C5CE7","#00B894"),
            sizes = listOf("256GB","512GB","1TB"), inStock = true, condition = "New",
            specs = mapOf("Display" to "6.8\" QHD+ Dynamic AMOLED","Processor" to "Snapdragon 8 Gen 3","RAM" to "12GB","Battery" to "5000 mAh","Camera" to "200MP quad"),
            deliveryDays = 2, freeShipping = true, isTrending = true,
        ),
        MockProduct(
            id = "ep002", title = "iPhone 15 Pro Max", brand = "Apple",
            description = "Apple's most powerful iPhone with titanium build, Action Button, and ProRes video.",
            price = 134900.0, originalPrice = 159900.0,
            imageUrl = img("phone-iphone"), images = listOf(img("phone-iphone"), img("phone-iphone2")),
            category = "electronics", subcategory = "e-phones",
            rating = 4.9f, reviewCount = 4567, colors = listOf("#F5F5F0","#2C2C2E","#4A90D9"),
            sizes = listOf("256GB","512GB","1TB"), inStock = true, condition = "New",
            specs = mapOf("Display" to "6.7\" Super Retina XDR","Chip" to "A17 Pro","Camera" to "48MP + 12MP + 12MP","Battery" to "~29hrs video"),
            deliveryDays = 1, freeShipping = true, isTrending = true, isDeal = true,
        ),
        MockProduct(
            id = "ep003", title = "OnePlus 12 5G", brand = "OnePlus",
            description = "Blazing fast 100W SuperVOOC charging, Hasselblad camera tuning.",
            price = 64999.0, originalPrice = 74999.0,
            imageUrl = img("phone-oneplus"), images = listOf(img("phone-oneplus"), img("phone-oneplus2")),
            category = "electronics", subcategory = "e-phones",
            rating = 4.6f, reviewCount = 1123, colors = listOf("#1A1A2E","#2E8B57"),
            sizes = listOf("256GB","512GB"), inStock = true, condition = "New",
            specs = mapOf("Display" to "6.82\" LTPO AMOLED","Processor" to "Snapdragon 8 Gen 3","RAM" to "16GB","Battery" to "5400 mAh"),
            deliveryDays = 2, freeShipping = true,
        ),
        MockProduct(
            id = "ep004", title = "MacBook Pro 14\" M3 Pro", brand = "Apple",
            description = "Professional powerhouse with M3 Pro chip, Liquid Retina XDR display, 18-hour battery.",
            price = 188900.0, originalPrice = 199900.0,
            imageUrl = img("laptop-mac"), images = listOf(img("laptop-mac"), img("laptop-mac2")),
            category = "electronics", subcategory = "e-laptops",
            rating = 4.9f, reviewCount = 892, colors = listOf("#2C2C2E","#C0C0C0"),
            sizes = listOf("18GB/512GB","36GB/1TB"), inStock = true, condition = "New",
            specs = mapOf("Chip" to "Apple M3 Pro","RAM" to "18GB unified","Display" to "14.2\" Liquid Retina XDR","Battery" to "18 hours","Weight" to "1.61 kg"),
            deliveryDays = 3, freeShipping = true, isTrending = true,
        ),
        MockProduct(
            id = "ep005", title = "Dell XPS 15 OLED", brand = "Dell",
            description = "Ultra-thin powerhouse with OLED display, Intel Core i9, and NVIDIA RTX 4070.",
            price = 179990.0, originalPrice = 209990.0,
            imageUrl = img("laptop-dell"), images = listOf(img("laptop-dell"), img("laptop-dell2")),
            category = "electronics", subcategory = "e-laptops",
            rating = 4.7f, reviewCount = 543, colors = listOf("#2D2D2D","#F5F5F5"),
            sizes = listOf("32GB/1TB"), inStock = true, condition = "New",
            specs = mapOf("Processor" to "Intel Core i9-13900H","RAM" to "32GB DDR5","Display" to "15.6\" OLED 3.5K","GPU" to "NVIDIA RTX 4070"),
            deliveryDays = 4, freeShipping = true, isDeal = true,
        ),
        MockProduct(
            id = "ep006", title = "Sony WH-1000XM5", brand = "Sony",
            description = "Industry-leading noise cancellation, 30-hour battery, crystal clear calls.",
            price = 24999.0, originalPrice = 34990.0,
            imageUrl = img("headphone-sony"), images = listOf(img("headphone-sony"), img("headphone-sony2")),
            category = "electronics", subcategory = "e-audio",
            rating = 4.8f, reviewCount = 3201, colors = listOf("#2D2D2D","#F5F5F5"),
            sizes = listOf("One Size"), inStock = true, condition = "New",
            specs = mapOf("Type" to "Over-ear","NC" to "Industry-leading ANC","Battery" to "30 hours","Bluetooth" to "5.2"),
            deliveryDays = 2, freeShipping = true, isTrending = true, isDeal = true,
        ),
        MockProduct(
            id = "ep007", title = "Apple AirPods Pro (2nd Gen)", brand = "Apple",
            description = "Adaptive Audio, Personalized Spatial Audio, up to 2x more ANC.",
            price = 24900.0, originalPrice = 26900.0,
            imageUrl = img("airpods"), images = listOf(img("airpods"), img("airpods2")),
            category = "electronics", subcategory = "e-audio",
            rating = 4.8f, reviewCount = 5670, colors = listOf("#FFFFFF"),
            sizes = listOf("One Size"), inStock = true, condition = "New",
            specs = mapOf("Chip" to "H2","ANC" to "Adaptive Transparency","Battery" to "6h + 24h case","Connectivity" to "Lightning / USB-C"),
            deliveryDays = 1, freeShipping = true,
        ),
        MockProduct(
            id = "ep008", title = "Samsung 65\" 4K Neo QLED", brand = "Samsung",
            description = "Quantum Matrix Technology, 4K AI Upscaling, Dolby Atmos sound.",
            price = 129990.0, originalPrice = 169990.0,
            imageUrl = img("tv-samsung"), images = listOf(img("tv-samsung"), img("tv-samsung2")),
            category = "electronics", subcategory = "e-tvs",
            rating = 4.7f, reviewCount = 987, colors = listOf("#1A1A1A"),
            sizes = listOf("55\"","65\"","75\""), inStock = true, condition = "New",
            specs = mapOf("Resolution" to "4K UHD","Panel" to "Neo QLED","HDR" to "Quantum HDR+","Sound" to "60W Dolby Atmos","Smart" to "Tizen OS"),
            deliveryDays = 5, freeShipping = true, isDeal = true,
        ),
        MockProduct(
            id = "ep009", title = "Apple Watch Series 9", brand = "Apple",
            description = "Double Tap gesture, precision Finding for iPhone, always-on Retina display.",
            price = 41900.0, originalPrice = 44900.0,
            imageUrl = img("watch-apple"), images = listOf(img("watch-apple"), img("watch-apple2")),
            category = "electronics", subcategory = "e-wearables",
            rating = 4.8f, reviewCount = 2134, colors = listOf("#2C2C2E","#FF6B6B","#4A90D9","#FFD93D"),
            sizes = listOf("41mm","45mm"), inStock = true, condition = "New",
            specs = mapOf("Chip" to "S9 SiP dual-core","Display" to "Always-On Retina","Health" to "ECG, Blood O2, Temperature","Battery" to "18 hours"),
            deliveryDays = 2, freeShipping = true, isTrending = true,
        ),
        MockProduct(
            id = "ep010", title = "iPad Pro 12.9\" M4", brand = "Apple",
            description = "Ultra Retina XDR display with tandem OLED, M4 chip, Apple Pencil Pro support.",
            price = 119900.0, originalPrice = 129900.0,
            imageUrl = img("tablet-ipad"), images = listOf(img("tablet-ipad"), img("tablet-ipad2")),
            category = "electronics", subcategory = "e-tablets",
            rating = 4.9f, reviewCount = 765, colors = listOf("#2C2C2E","#F5F5F0"),
            sizes = listOf("256GB","512GB","1TB","2TB"), inStock = true, condition = "New",
            specs = mapOf("Chip" to "Apple M4","Display" to "12.9\" Ultra Retina XDR","Camera" to "12MP wide + 10MP ultrawide","Connectivity" to "Wi-Fi 6E + 5G"),
            deliveryDays = 2, freeShipping = true, isNewArrival = true,
        ),
        MockProduct(
            id = "ep011", title = "Sony PlayStation 5 Disc Edition", brand = "Sony",
            description = "Haptic feedback, adaptive triggers, ultra-high-speed SSD. 4K gaming at 120fps.",
            price = 54990.0, originalPrice = 54990.0,
            imageUrl = img("ps5"), images = listOf(img("ps5"), img("ps5-2")),
            category = "electronics", subcategory = "e-gaming",
            rating = 4.9f, reviewCount = 8901, colors = listOf("#FFFFFF"),
            sizes = listOf("825GB SSD"), inStock = false, condition = "New",
            specs = mapOf("GPU" to "AMD RDNA 2 10.28 TFLOPS","CPU" to "AMD Zen 2 3.5GHz","RAM" to "16GB GDDR6","Storage" to "825GB NVMe SSD"),
            deliveryDays = 7, freeShipping = true, isTrending = true,
        ),
        MockProduct(
            id = "ep012", title = "Anker 65W GaN Charger 4-port", brand = "Anker",
            description = "Charge 4 devices at once, intelligent power distribution, ultra-compact form.",
            price = 3499.0, originalPrice = 4999.0,
            imageUrl = img("charger-anker"), images = listOf(img("charger-anker")),
            category = "electronics", subcategory = "e-acc",
            rating = 4.7f, reviewCount = 1543, colors = listOf("#2D2D2D","#FFFFFF"),
            sizes = listOf("One Size"), inStock = true, condition = "New",
            specs = mapOf("Total Power" to "65W","Ports" to "2x USB-C + 2x USB-A","Tech" to "GaN III"),
            deliveryDays = 3, freeShipping = false, isNewArrival = true,
        ),
    )

    // ── FASHION ─────────────────────────────────────────────────────────────

    val fashionSubcategories = listOf(
        MockSubcategory("f-mens",     "Men's Clothing", "fashion", img("mens1"),   480),
        MockSubcategory("f-womens",   "Women's Clothing","fashion", img("womens1"), 620),
        MockSubcategory("f-shoes",    "Footwear",       "fashion", img("shoes1"),  350),
        MockSubcategory("f-watches",  "Watches",        "fashion", img("watch2"),  180),
        MockSubcategory("f-bags",     "Bags & Luggage", "fashion", img("bag1"),    290),
        MockSubcategory("f-jewelry",  "Jewellery",      "fashion", img("jewel1"),  410),
        MockSubcategory("f-sunglasses","Sunglasses",    "fashion", img("sunglass1"),  95),
        MockSubcategory("f-ethnic",   "Ethnic Wear",    "fashion", img("ethnic1"), 340),
        MockSubcategory("f-sports",   "Sports Wear",    "fashion", img("sport1"),  215),
        MockSubcategory("f-kids",     "Kids' Fashion",  "fashion", img("kids1"),   270),
    )

    val fashionBanners = listOf(
        HeroBanner("fb1", "Summer Collection", "Bright styles for every occasion",       banner("summer-fashion"),  "fashion"),
        HeroBanner("fb2", "Top Brands Sale",   "Nike, Adidas, Puma — flat 30% off",     banner("brands-fashion"),  "fashion"),
        HeroBanner("fb3", "Ethnic Essentials", "Kurtas, sarees & more for every festivity", banner("ethnic-ban"), "fashion"),
        HeroBanner("fb4", "Sneaker Fest",      "Limited edition kicks — don't miss out", banner("sneakers-ban"),   "fashion"),
        HeroBanner("fb5", "Handpicked Bags",   "Designer bags starting ₹1,499",          banner("bags-ban"),       "fashion"),
    )

    val fashionProducts = listOf(
        MockProduct(
            id = "fp001", title = "Nike Air Max 270", brand = "Nike",
            description = "All-day comfort with the tallest Air unit in heel. Breathable mesh upper.",
            price = 10995.0, originalPrice = 13995.0,
            imageUrl = img("nike-airmax"), images = listOf(img("nike-airmax"), img("nike-airmax2")),
            category = "fashion", subcategory = "f-shoes",
            rating = 4.6f, reviewCount = 3210, colors = listOf("#000000","#FFFFFF","#FF6B6B","#4A90D9"),
            sizes = listOf("UK 6","UK 7","UK 8","UK 9","UK 10","UK 11"), inStock = true, condition = "New",
            specs = mapOf("Upper" to "Mesh","Sole" to "Air Max","Closure" to "Lace-up","Use" to "Casual / Running"),
            deliveryDays = 3, freeShipping = true, isTrending = true,
        ),
        MockProduct(
            id = "fp002", title = "Levi's 511 Slim Jeans", brand = "Levi's",
            description = "Slim fit, sits below waist, tapered through thigh and knee. Iconic 5-pocket styling.",
            price = 2999.0, originalPrice = 3999.0,
            imageUrl = img("levis-jeans"), images = listOf(img("levis-jeans"), img("levis-jeans2")),
            category = "fashion", subcategory = "f-mens",
            rating = 4.5f, reviewCount = 2100, colors = listOf("#1A237E","#424242","#795548"),
            sizes = listOf("28","30","32","34","36","38"), inStock = true, condition = "New",
            specs = mapOf("Fit" to "Slim","Rise" to "Below waist","Material" to "99% Cotton, 1% Elastane","Wash" to "Machine washable"),
            deliveryDays = 4, freeShipping = true, isDeal = true,
        ),
        MockProduct(
            id = "fp003", title = "Van Heusen Formal Shirt", brand = "Van Heusen",
            description = "Anti-wrinkle, easy-iron formal shirt. Perfect for office wear.",
            price = 1299.0, originalPrice = 2199.0,
            imageUrl = img("vanheusen-shirt"), images = listOf(img("vanheusen-shirt"), img("vanheusen-shirt2")),
            category = "fashion", subcategory = "f-mens",
            rating = 4.4f, reviewCount = 876, colors = listOf("#FFFFFF","#90CAF9","#B0BEC5","#546E7A"),
            sizes = listOf("S","M","L","XL","XXL"), inStock = true, condition = "New",
            specs = mapOf("Fabric" to "Cotton blend","Collar" to "Spread","Sleeve" to "Full","Care" to "Easy iron"),
            deliveryDays = 3, freeShipping = true,
        ),
        MockProduct(
            id = "fp004", title = "Zara A-Line Floral Dress", brand = "Zara",
            description = "Elegant midi dress with floral print, adjustable strap, and flowy silhouette.",
            price = 3490.0, originalPrice = 4990.0,
            imageUrl = img("zara-dress"), images = listOf(img("zara-dress"), img("zara-dress2")),
            category = "fashion", subcategory = "f-womens",
            rating = 4.6f, reviewCount = 678, colors = listOf("#FFCDD2","#B2EBF2","#F3E5F5"),
            sizes = listOf("XS","S","M","L","XL"), inStock = true, condition = "New",
            specs = mapOf("Length" to "Midi","Neckline" to "V-neck","Sleeve" to "Sleeveless","Fabric" to "Polyester chiffon"),
            deliveryDays = 4, freeShipping = true, isNewArrival = true,
        ),
        MockProduct(
            id = "fp005", title = "Fossil Machine Chronograph Watch", brand = "Fossil",
            description = "Stainless steel case, multifunction chronograph, premium leather band.",
            price = 12995.0, originalPrice = 17995.0,
            imageUrl = img("fossil-watch"), images = listOf(img("fossil-watch"), img("fossil-watch2")),
            category = "fashion", subcategory = "f-watches",
            rating = 4.5f, reviewCount = 543, colors = listOf("#C0C0C0","#212121"),
            sizes = listOf("44mm"), inStock = true, condition = "New",
            specs = mapOf("Case" to "Stainless Steel 44mm","Band" to "Genuine Leather","Water Resistance" to "5 ATM","Movement" to "Quartz chronograph"),
            deliveryDays = 3, freeShipping = true, isDeal = true,
        ),
        MockProduct(
            id = "fp006", title = "Adidas Ultraboost 23", brand = "Adidas",
            description = "Responsive BOOST foam, PRIMEKNIT upper, Continental rubber outsole. Maximum energy return.",
            price = 14999.0, originalPrice = 19999.0,
            imageUrl = img("adidas-boost"), images = listOf(img("adidas-boost"), img("adidas-boost2")),
            category = "fashion", subcategory = "f-shoes",
            rating = 4.7f, reviewCount = 1890, colors = listOf("#000000","#FFFFFF","#FF6B6B"),
            sizes = listOf("UK 6","UK 7","UK 8","UK 9","UK 10","UK 11","UK 12"), inStock = true, condition = "New",
            specs = mapOf("Upper" to "PRIMEKNIT+","Midsole" to "BOOST","Outsole" to "Continental Rubber","Drop" to "10mm"),
            deliveryDays = 3, freeShipping = true, isTrending = true,
        ),
        MockProduct(
            id = "fp007", title = "Michael Kors Jet Set Tote Bag", brand = "Michael Kors",
            description = "Signature MK jacquard, zip closure, interior pockets, logo charm detail.",
            price = 14500.0, originalPrice = 22000.0,
            imageUrl = img("mk-bag"), images = listOf(img("mk-bag"), img("mk-bag2")),
            category = "fashion", subcategory = "f-bags",
            rating = 4.4f, reviewCount = 321, colors = listOf("#8B7355","#2D2D2D","#F5F5F0"),
            sizes = listOf("Medium","Large"), inStock = true, condition = "New",
            specs = mapOf("Material" to "Canvas + Leather trim","Closure" to "Zip","Handles" to "Dual","Interior" to "3 pockets"),
            deliveryDays = 5, freeShipping = true,
        ),
        MockProduct(
            id = "fp008", title = "Manyavar Kurta Set", brand = "Manyavar",
            description = "Festive silk blend kurta with matching churidar. Ideal for weddings and celebrations.",
            price = 4999.0, originalPrice = 7999.0,
            imageUrl = img("manyavar-kurta"), images = listOf(img("manyavar-kurta"), img("manyavar-kurta2")),
            category = "fashion", subcategory = "f-ethnic",
            rating = 4.6f, reviewCount = 432, colors = listOf("#B7950B","#784212","#1A5276"),
            sizes = listOf("S","M","L","XL","XXL","3XL"), inStock = true, condition = "New",
            specs = mapOf("Fabric" to "Silk Blend","Occasion" to "Festive / Wedding","Set Includes" to "Kurta + Churidar","Care" to "Dry clean"),
            deliveryDays = 4, freeShipping = true, isDeal = true,
        ),
    )

    // ── GROCERY ─────────────────────────────────────────────────────────────

    val grocerySubcategories = listOf(
        MockSubcategory("g-fruits",   "Fruits & Vegetables","grocery", img("fruits1"),  890),
        MockSubcategory("g-dairy",    "Dairy & Eggs",       "grocery", img("dairy1"),   340),
        MockSubcategory("g-bakery",   "Bakery & Breads",    "grocery", img("bakery1"),  220),
        MockSubcategory("g-snacks",   "Snacks & Namkeen",   "grocery", img("snacks1"),  560),
        MockSubcategory("g-beverages","Beverages",          "grocery", img("beverage1"),310),
        MockSubcategory("g-staples",  "Staples & Grains",   "grocery", img("staples1"), 420),
        MockSubcategory("g-frozen",   "Frozen Foods",       "grocery", img("frozen1"),  145),
        MockSubcategory("g-organic",  "Organic",            "grocery", img("organic1"), 190),
        MockSubcategory("g-meat",     "Meat & Seafood",     "grocery", img("meat1"),    275),
        MockSubcategory("g-baby",     "Baby Care",          "grocery", img("baby1"),    320),
    )

    val groceryBanners = listOf(
        HeroBanner("gb1", "Fresh Produce Daily",    "Farm-fresh fruits & veggies delivered by 7 AM", banner("fresh-fruit"),  "grocery"),
        HeroBanner("gb2", "Dairy Deals",            "Pure milk, cheese & more — flat 15% off",        banner("dairy-ban"),    "grocery"),
        HeroBanner("gb3", "Weekend Special",        "Snacks & beverages — buy 2 get 1 free",          banner("snack-ban"),    "grocery"),
        HeroBanner("gb4", "Organic Corner",         "Certified organic groceries at great prices",     banner("organic-ban"),  "grocery"),
        HeroBanner("gb5", "Meat & Seafood",         "Fresh cuts delivered in 2 hours",                banner("meat-ban"),     "grocery"),
    )

    val groceryProducts = listOf(
        MockProduct(
            id = "gp001", title = "Fresho Alphonso Mango (1 kg)", brand = "Fresho",
            description = "Premium Alphonso mangoes, hand-picked from Ratnagiri. Sweet, saffron-coloured pulp.",
            price = 349.0, originalPrice = 499.0,
            imageUrl = img("mango"), images = listOf(img("mango"), img("mango2")),
            category = "grocery", subcategory = "g-fruits",
            rating = 4.7f, reviewCount = 890, colors = listOf(), sizes = listOf("500g","1kg","2kg"),
            inStock = true, condition = "New",
            specs = mapOf("Type" to "Alphonso","Origin" to "Ratnagiri, Maharashtra","Grade" to "Premium A1","Shelf Life" to "3-5 days"),
            deliveryDays = 1, freeShipping = true, isTrending = true,
        ),
        MockProduct(
            id = "gp002", title = "Amul Gold Full Cream Milk (1 L)", brand = "Amul",
            description = "Amul Gold full cream milk, 6% fat, pasteurised. Rich, creamy taste.",
            price = 67.0, originalPrice = 67.0,
            imageUrl = img("amul-milk"), images = listOf(img("amul-milk")),
            category = "grocery", subcategory = "g-dairy",
            rating = 4.6f, reviewCount = 2340, colors = listOf(), sizes = listOf("500ml","1L","2L"),
            inStock = true, condition = "New",
            specs = mapOf("Fat" to "6%","Protein" to "3.2g per 100ml","Pasteurised" to "Yes","Shelf Life" to "2 days refrigerated"),
            deliveryDays = 1, freeShipping = true,
        ),
        MockProduct(
            id = "gp003", title = "Britannia Good Day Cashew Cookies (600g)", brand = "Britannia",
            description = "Crunchy butter cookies loaded with cashews. Perfect teatime snack for the family.",
            price = 165.0, originalPrice = 200.0,
            imageUrl = img("britannia-cookies"), images = listOf(img("britannia-cookies")),
            category = "grocery", subcategory = "g-snacks",
            rating = 4.5f, reviewCount = 1567, colors = listOf(), sizes = listOf("200g","600g","1kg"),
            inStock = true, condition = "New",
            specs = mapOf("Type" to "Cashew Cookies","Net Weight" to "600g","Veg" to "Yes","Shelf Life" to "6 months"),
            deliveryDays = 2, freeShipping = false, isDeal = true,
        ),
        MockProduct(
            id = "gp004", title = "Tata Tea Gold (500g)", brand = "Tata Tea",
            description = "Blend of fine Assam and Darjeeling tea leaves. Full-bodied, brisk taste.",
            price = 269.0, originalPrice = 310.0,
            imageUrl = img("tata-tea"), images = listOf(img("tata-tea")),
            category = "grocery", subcategory = "g-beverages",
            rating = 4.6f, reviewCount = 4321, colors = listOf(), sizes = listOf("250g","500g","1kg"),
            inStock = true, condition = "New",
            specs = mapOf("Blend" to "Assam + Darjeeling","Type" to "CTC Leaf","Caffeine" to "Moderate","Shelf Life" to "24 months"),
            deliveryDays = 2, freeShipping = false, isTrending = true,
        ),
        MockProduct(
            id = "gp005", title = "India Gate Basmati Rice (5 kg)", brand = "India Gate",
            description = "Premium aged basmati rice, long-grain, naturally aromatic. Perfect for biryani.",
            price = 640.0, originalPrice = 780.0,
            imageUrl = img("basmati-rice"), images = listOf(img("basmati-rice")),
            category = "grocery", subcategory = "g-staples",
            rating = 4.7f, reviewCount = 3456, colors = listOf(), sizes = listOf("1kg","5kg","10kg","25kg"),
            inStock = true, condition = "New",
            specs = mapOf("Type" to "Basmati","Grain Length" to "Extra Long","Aged" to "Yes","Use" to "Biryani / Pulao"),
            deliveryDays = 2, freeShipping = true, isDeal = true,
        ),
        MockProduct(
            id = "gp006", title = "Farm Fresh Organic Spinach (250g)", brand = "Organic India",
            description = "Certified organic baby spinach leaves. Pesticide-free, freshly harvested.",
            price = 79.0, originalPrice = 99.0,
            imageUrl = img("spinach"), images = listOf(img("spinach")),
            category = "grocery", subcategory = "g-organic",
            rating = 4.4f, reviewCount = 234, colors = listOf(), sizes = listOf("250g","500g"),
            inStock = true, condition = "New",
            specs = mapOf("Certification" to "NPOP Organic","Origin" to "Maharashtra","Shelf Life" to "3-4 days","Storage" to "Refrigerate"),
            deliveryDays = 1, freeShipping = true, isNewArrival = true,
        ),
    )

    // ── FURNITURE ───────────────────────────────────────────────────────────

    val furnitureSubcategories = listOf(
        MockSubcategory("fu-living",   "Living Room",  "furniture", img("living1"),  340),
        MockSubcategory("fu-bedroom",  "Bedroom",      "furniture", img("bedroom1"), 280),
        MockSubcategory("fu-dining",   "Dining",       "furniture", img("dining1"),  195),
        MockSubcategory("fu-office",   "Office",       "furniture", img("office1"),  310),
        MockSubcategory("fu-storage",  "Storage",      "furniture", img("storage1"), 240),
        MockSubcategory("fu-outdoor",  "Outdoor",      "furniture", img("outdoor1"), 120),
        MockSubcategory("fu-kids",     "Kids Room",    "furniture", img("kidsroom1"),160),
        MockSubcategory("fu-decor",    "Home Décor",   "furniture", img("decor1"),   450),
        MockSubcategory("fu-lighting", "Lighting",     "furniture", img("lighting1"),280),
        MockSubcategory("fu-bathroom", "Bathroom",     "furniture", img("bathroom1"),175),
    )

    val furnitureBanners = listOf(
        HeroBanner("fub1", "Living Room Makeover", "Sofas, coffee tables & more — up to 40% off",   banner("living-ban"),   "furniture"),
        HeroBanner("fub2", "Bedroom Sale",         "Beds, wardrobes & mattresses at flat prices",    banner("bedroom-ban"),  "furniture"),
        HeroBanner("fub3", "Home Office Ready",    "Ergonomic desks & chairs for work from home",    banner("office-ban"),   "furniture"),
        HeroBanner("fub4", "Decor Diaries",        "Make your home a haven with artful décor",       banner("decor-ban"),    "furniture"),
        HeroBanner("fub5", "New Arrivals",         "Just in — contemporary designs for modern homes", banner("furn-new-ban"), "furniture"),
    )

    val furnitureProducts = listOf(
        MockProduct(
            id = "fup001", title = "Duroflex Livein 3-Seater Sofa", brand = "Duroflex",
            description = "Premium fabric sofa with high-density foam cushions, solid wood frame, stain-resistant fabric.",
            price = 32990.0, originalPrice = 45990.0,
            imageUrl = img("sofa-duroflex"), images = listOf(img("sofa-duroflex"), img("sofa-duroflex2")),
            category = "furniture", subcategory = "fu-living",
            rating = 4.5f, reviewCount = 567, colors = listOf("#795548","#607D8B","#9E9E9E","#4CAF50"),
            sizes = listOf("3-Seater","L-Shape"), inStock = true, condition = "New",
            specs = mapOf("Frame" to "Solid Sheesham Wood","Cushion" to "High-density foam","Fabric" to "Microfiber","Assembly" to "Required","Warranty" to "2 years"),
            deliveryDays = 7, freeShipping = true, isTrending = true, isDeal = true,
        ),
        MockProduct(
            id = "fup002", title = "Peps Spine Guard King Bed", brand = "Peps",
            description = "Orthopedic bonnell spring mattress with pillow-top, ideal for back support.",
            price = 18990.0, originalPrice = 26990.0,
            imageUrl = img("bed-peps"), images = listOf(img("bed-peps"), img("bed-peps2")),
            category = "furniture", subcategory = "fu-bedroom",
            rating = 4.6f, reviewCount = 890, colors = listOf("#FAFAFA","#F5F5F5"),
            sizes = listOf("Single","Double","Queen","King"), inStock = true, condition = "New",
            specs = mapOf("Type" to "Bonnell Spring","Comfort Layer" to "Pillow-top","Thickness" to "6 inches","Washable Cover" to "Yes","Warranty" to "5 years"),
            deliveryDays = 5, freeShipping = true, isDeal = true,
        ),
        MockProduct(
            id = "fup003", title = "Godrej Interio 6-Seater Dining Set", brand = "Godrej",
            description = "Solid wood 6-seater dining table with cushioned chairs. Timeless design.",
            price = 42999.0, originalPrice = 59999.0,
            imageUrl = img("dining-godrej"), images = listOf(img("dining-godrej"), img("dining-godrej2")),
            category = "furniture", subcategory = "fu-dining",
            rating = 4.4f, reviewCount = 312, colors = listOf("#6D4C41","#37474F"),
            sizes = listOf("4-Seater","6-Seater","8-Seater"), inStock = true, condition = "New",
            specs = mapOf("Material" to "Solid Sheesham Wood","Chairs" to "6 cushioned","Table Size" to "180×90 cm","Assembly" to "Professional installed","Warranty" to "2 years"),
            deliveryDays = 10, freeShipping = true,
        ),
        MockProduct(
            id = "fup004", title = "Featherlite Ergonomic Office Chair", brand = "Featherlite",
            description = "Lumbar support, adjustable seat height, 360° swivel, breathable mesh back.",
            price = 13990.0, originalPrice = 18990.0,
            imageUrl = img("chair-featherlite"), images = listOf(img("chair-featherlite"), img("chair-featherlite2")),
            category = "furniture", subcategory = "fu-office",
            rating = 4.5f, reviewCount = 678, colors = listOf("#212121","#546E7A","#4CAF50"),
            sizes = listOf("Standard"), inStock = true, condition = "New",
            specs = mapOf("Back" to "Mesh","Arms" to "Adjustable 4D","Height" to "Adjustable pneumatic","Tilt" to "Synchro tilt","Load" to "120 kg","Warranty" to "3 years"),
            deliveryDays = 6, freeShipping = true, isTrending = true,
        ),
        MockProduct(
            id = "fup005", title = "Nilkamal Freedom Big Cabinet", brand = "Nilkamal",
            description = "4-door plastic storage cabinet with adjustable shelves. Damp-proof, termite-proof.",
            price = 6490.0, originalPrice = 8490.0,
            imageUrl = img("cabinet-nilkamal"), images = listOf(img("cabinet-nilkamal")),
            category = "furniture", subcategory = "fu-storage",
            rating = 4.3f, reviewCount = 1234, colors = listOf("#ECEFF1","#FFF8E1","#E8F5E9"),
            sizes = listOf("4-Door","2-Door"), inStock = true, condition = "New",
            specs = mapOf("Material" to "High-impact plastic","Shelves" to "Adjustable","Dimensions" to "182×91×46 cm","Assembly" to "Tools included"),
            deliveryDays = 5, freeShipping = true, isDeal = true,
        ),
        MockProduct(
            id = "fup006", title = "Philips Hue Starter Kit (3 bulbs + Bridge)", brand = "Philips",
            description = "Control 16 million colors from your smartphone. Compatible with Alexa, Google, Siri.",
            price = 9999.0, originalPrice = 12999.0,
            imageUrl = img("philips-hue"), images = listOf(img("philips-hue"), img("philips-hue2")),
            category = "furniture", subcategory = "fu-lighting",
            rating = 4.7f, reviewCount = 456, colors = listOf("#FFFFFF"),
            sizes = listOf("Starter Kit","Expansion Pack"), inStock = true, condition = "New",
            specs = mapOf("Colors" to "16 million","Control" to "App + Voice","Per Bulb" to "9W (60W equiv)","Connectivity" to "Zigbee via Bridge"),
            deliveryDays = 3, freeShipping = true, isNewArrival = true,
        ),
    )

    // ── REVIEWS ─────────────────────────────────────────────────────────────

    val sampleReviews = listOf(
        MockReview("r1", "Arjun Sharma",    4.5f, "Excellent product, very happy with the purchase. Delivery was quick too.", "12 Apr 2026", 34),
        MockReview("r2", "Priya Nair",      5.0f, "Absolutely love it! Exactly as described. Will definitely buy again.", "10 Apr 2026", 21),
        MockReview("r3", "Rahul Gupta",     4.0f, "Good quality for the price. Had a minor issue but customer care resolved it fast.", "8 Apr 2026", 12),
        MockReview("r4", "Sunita Reddy",    3.5f, "Decent product. Packaging could be better but item itself is fine.", "5 Apr 2026", 7),
        MockReview("r5", "Mohammed Khan",   4.8f, "Outstanding quality! Exceeded my expectations. Highly recommend.", "2 Apr 2026", 45),
        MockReview("r6", "Kavitha Iyer",    4.0f, "Nice item. Took 3 days for delivery instead of the promised 2, but overall ok.", "28 Mar 2026", 9),
    )

    // ── BRANDS per category ──────────────────────────────────────────────────

    val electronicsBrands = listOf(
        MockBrand("b-apple",   "Apple",   img("logo-apple"),   "electronics"),
        MockBrand("b-samsung", "Samsung", img("logo-samsung"), "electronics"),
        MockBrand("b-sony",    "Sony",    img("logo-sony"),    "electronics"),
        MockBrand("b-oneplus", "OnePlus", img("logo-oneplus"), "electronics"),
        MockBrand("b-dell",    "Dell",    img("logo-dell"),    "electronics"),
        MockBrand("b-lg",      "LG",      img("logo-lg"),      "electronics"),
    )

    val fashionBrands = listOf(
        MockBrand("b-nike",    "Nike",         img("logo-nike"),    "fashion"),
        MockBrand("b-adidas",  "Adidas",       img("logo-adidas"),  "fashion"),
        MockBrand("b-levis",   "Levi's",       img("logo-levis"),   "fashion"),
        MockBrand("b-zara",    "Zara",         img("logo-zara"),    "fashion"),
        MockBrand("b-hm",      "H&M",          img("logo-hm"),      "fashion"),
        MockBrand("b-manyavar","Manyavar",     img("logo-manyavar"),"fashion"),
    )

    // ── Aggregated helpers ───────────────────────────────────────────────────

    val vehiclesSubcategories = listOf(
        MockSubcategory("v-cars",      "Cars",            "vehicles", img("car1"),       1240),
        MockSubcategory("v-bikes",     "Bikes",           "vehicles", img("bike1"),      980),
        MockSubcategory("v-scooters",  "Scooters",        "vehicles", img("scooter1"),   560),
        MockSubcategory("v-trucks",    "Trucks & SUVs",   "vehicles", img("truck1"),     320),
        MockSubcategory("v-parts",     "Auto Parts",      "vehicles", img("autopart1"),  740),
        MockSubcategory("v-bicycle",   "Bicycles",        "vehicles", img("bicycle1"),   290),
        MockSubcategory("v-electric",  "Electric Vehicles","vehicles",img("ev1"),        410),
        MockSubcategory("v-rental",    "Rental Vehicles", "vehicles", img("rental1"),    180),
    )

    val vehiclesBanners = listOf(
        HeroBanner("vb1", "Top Deals on Cars",      "Buy & sell certified pre-owned cars",       banner("car-ban"),     "vehicles"),
        HeroBanner("vb2", "Bike Mela",              "Explore 100+ bikes from top brands",        banner("bike-ban"),    "vehicles"),
        HeroBanner("vb3", "EV Revolution",          "Electric vehicles at affordable prices",    banner("ev-ban"),      "vehicles"),
        HeroBanner("vb4", "Auto Parts Sale",        "Genuine spares & accessories — 20% off",   banner("parts-ban"),   "vehicles"),
    )

    val vehiclesProducts = listOf(
        MockProduct(
            id = "v1", title = "Maruti Suzuki Swift 2022", description = "Well-maintained petrol car, 18 km/l mileage, single owner.",
            price = 650000.0, originalPrice = 720000.0, imageUrl = img("swift1"), images = listOf(img("swift1"), img("swift2")),
            category = "vehicles", subcategory = "v-cars", brand = "Maruti", rating = 4.3f, reviewCount = 42,
            colors = listOf("White", "Red"), sizes = emptyList(), inStock = true, condition = "Used",
            specs = mapOf("Year" to "2022", "Mileage" to "28000 km", "Fuel" to "Petrol", "Transmission" to "Manual"),
            deliveryDays = 0, freeShipping = false, isTrending = true, isNewArrival = false, isDeal = true,
        ),
        MockProduct(
            id = "v2", title = "Royal Enfield Classic 350", description = "2021 model, ABS, all accessories, excellent condition.",
            price = 165000.0, originalPrice = 180000.0, imageUrl = img("re350_1"), images = listOf(img("re350_1")),
            category = "vehicles", subcategory = "v-bikes", brand = "Royal Enfield", rating = 4.5f, reviewCount = 78,
            colors = listOf("Gunmetal Grey"), sizes = emptyList(), inStock = true, condition = "Used",
            specs = mapOf("Year" to "2021", "Mileage" to "12000 km", "Fuel" to "Petrol", "Engine" to "349cc"),
            deliveryDays = 0, freeShipping = false, isTrending = true, isNewArrival = false, isDeal = false,
        ),
        MockProduct(
            id = "v3", title = "Honda Activa 6G", description = "2023 model, barely used, 55 km/l, with full service record.",
            price = 72000.0, originalPrice = 80000.0, imageUrl = img("activa1"), images = listOf(img("activa1")),
            category = "vehicles", subcategory = "v-scooters", brand = "Honda", rating = 4.4f, reviewCount = 55,
            colors = listOf("Pearl Precious White"), sizes = emptyList(), inStock = true, condition = "Used",
            specs = mapOf("Year" to "2023", "Mileage" to "3500 km", "Fuel" to "Petrol"),
            deliveryDays = 0, freeShipping = false, isTrending = false, isNewArrival = true, isDeal = true,
        ),
        MockProduct(
            id = "v4", title = "Tata Nexon EV 2023", description = "Electric SUV, 312 km range, fully loaded XZ+ trim.",
            price = 1450000.0, originalPrice = 1600000.0, imageUrl = img("nexonev1"), images = listOf(img("nexonev1")),
            category = "vehicles", subcategory = "v-electric", brand = "Tata", rating = 4.6f, reviewCount = 29,
            colors = listOf("Calgary White"), sizes = emptyList(), inStock = true, condition = "Used",
            specs = mapOf("Year" to "2023", "Range" to "312 km", "Mileage" to "8000 km", "Transmission" to "Automatic"),
            deliveryDays = 0, freeShipping = false, isTrending = true, isNewArrival = true, isDeal = false,
        ),
        MockProduct(
            id = "v5", title = "Shimano Mountain Bike", description = "21-speed gear, dual disc brakes, lightweight frame.",
            price = 18500.0, originalPrice = 22000.0, imageUrl = img("mtb1"), images = listOf(img("mtb1")),
            category = "vehicles", subcategory = "v-bicycle", brand = "Shimano", rating = 4.2f, reviewCount = 34,
            colors = listOf("Black/Green"), sizes = listOf("26 inch", "29 inch"), inStock = true, condition = "New",
            specs = mapOf("Gears" to "21-Speed", "Frame" to "Aluminium", "Brakes" to "Disc"),
            deliveryDays = 5, freeShipping = true, isTrending = false, isNewArrival = true, isDeal = true,
        ),
    )

    val othersSubcategories = listOf(
        MockSubcategory("o-books",     "Books & Stationery", "others", img("books1"),   540),
        MockSubcategory("o-sports",    "Sports & Fitness",   "others", img("sports1"),  670),
        MockSubcategory("o-toys",      "Toys & Games",       "others", img("toys1"),    420),
        MockSubcategory("o-music",     "Musical Instruments","others", img("music1"),   290),
        MockSubcategory("o-art",       "Art & Craft",        "others", img("art1"),     210),
        MockSubcategory("o-travel",    "Travel Accessories", "others", img("travel1"),  380),
        MockSubcategory("o-pet",       "Pet Supplies",       "others", img("pet1"),     310),
        MockSubcategory("o-health",    "Health & Wellness",  "others", img("health1"),  480),
    )

    val othersBanners = listOf(
        HeroBanner("ob1", "Book Fair",       "Thousands of books at flat Rs.99",           banner("book-ban"),   "others"),
        HeroBanner("ob2", "Sports Bonanza",  "Fitness equipment at never before prices",   banner("sport-ban"),  "others"),
        HeroBanner("ob3", "Toy Fiesta",      "Learning toys for kids of all ages",          banner("toy-ban"),    "others"),
        HeroBanner("ob4", "Pet Corner",      "Everything your furry friend needs",          banner("pet-ban"),    "others"),
    )

    val othersProducts = listOf(
        MockProduct(
            id = "oth1", title = "Yoga Mat Premium", description = "6mm thick non-slip yoga mat with carry strap, eco-friendly material.",
            price = 899.0, originalPrice = 1299.0, imageUrl = img("yogamat1"), images = listOf(img("yogamat1")),
            category = "others", subcategory = "o-sports", brand = "Decathlon", rating = 4.5f, reviewCount = 120,
            colors = listOf("Purple", "Blue", "Black"), sizes = emptyList(), inStock = true, condition = "New",
            specs = mapOf("Thickness" to "6mm", "Material" to "NBR Foam", "Size" to "183x61 cm"),
            deliveryDays = 3, freeShipping = true, isTrending = true, isNewArrival = false, isDeal = true,
        ),
        MockProduct(
            id = "oth2", title = "Casio SA-78 Mini Keyboard", description = "44 mini keys, 100 tones, 50 rhythms, battery powered.",
            price = 2499.0, originalPrice = 3200.0, imageUrl = img("keyboard1"), images = listOf(img("keyboard1")),
            category = "others", subcategory = "o-music", brand = "Casio", rating = 4.3f, reviewCount = 67,
            colors = listOf("White"), sizes = emptyList(), inStock = true, condition = "New",
            specs = mapOf("Keys" to "44", "Tones" to "100", "Rhythms" to "50", "Power" to "Battery/Adapter"),
            deliveryDays = 4, freeShipping = false, isTrending = false, isNewArrival = true, isDeal = true,
        ),
        MockProduct(
            id = "oth3", title = "LEGO Classic Bricks Set", description = "790-piece creative building blocks set for ages 4+.",
            price = 1899.0, originalPrice = 2499.0, imageUrl = img("lego1"), images = listOf(img("lego1")),
            category = "others", subcategory = "o-toys", brand = "LEGO", rating = 4.8f, reviewCount = 215,
            colors = listOf("Multicolor"), sizes = emptyList(), inStock = true, condition = "New",
            specs = mapOf("Pieces" to "790", "Age" to "4+", "Theme" to "Classic"),
            deliveryDays = 3, freeShipping = true, isTrending = true, isNewArrival = false, isDeal = false,
        ),
        MockProduct(
            id = "oth4", title = "Travel Neck Pillow", description = "Memory foam U-shaped travel pillow with snap button strap.",
            price = 599.0, originalPrice = 899.0, imageUrl = img("neckpillow1"), images = listOf(img("neckpillow1")),
            category = "others", subcategory = "o-travel", brand = "Generic", rating = 4.1f, reviewCount = 89,
            colors = listOf("Grey", "Blue"), sizes = emptyList(), inStock = true, condition = "New",
            specs = mapOf("Material" to "Memory Foam", "Weight" to "180g"),
            deliveryDays = 2, freeShipping = true, isTrending = false, isNewArrival = false, isDeal = true,
        ),
        MockProduct(
            id = "oth5", title = "Dog Harness Adjustable", description = "No-pull adjustable harness for medium dogs, reflective strap.",
            price = 749.0, originalPrice = 999.0, imageUrl = img("dogharness1"), images = listOf(img("dogharness1")),
            category = "others", subcategory = "o-pet", brand = "PetSafe", rating = 4.4f, reviewCount = 43,
            colors = listOf("Red", "Blue"), sizes = listOf("S", "M", "L"), inStock = true, condition = "New",
            specs = mapOf("Size" to "M", "Material" to "Nylon", "Feature" to "No-Pull"),
            deliveryDays = 3, freeShipping = false, isTrending = false, isNewArrival = true, isDeal = false,
        ),
    )

    val allProducts: List<MockProduct> get() =
        electronicsProducts + fashionProducts + groceryProducts + furnitureProducts + vehiclesProducts + othersProducts

    private fun resolveCategory(categoryKey: String): String = when (categoryKey) {
        "vehicles" -> "vehicles"
        "others"   -> "others"
        else -> categoryKey
    }

    fun productsForCategory(categoryKey: String): List<MockProduct> =
        allProducts.filter { it.category == resolveCategory(categoryKey) }

    fun productsForSubcategory(subcategoryId: String): List<MockProduct> =
        allProducts.filter { it.subcategory == subcategoryId }

    fun subcategoriesFor(categoryKey: String): List<MockSubcategory> = when (resolveCategory(categoryKey)) {
        "electronics" -> electronicsSubcategories
        "fashion"     -> fashionSubcategories
        "grocery"     -> grocerySubcategories
        "furniture"   -> furnitureSubcategories
        "vehicles"    -> vehiclesSubcategories
        "others"      -> othersSubcategories
        else          -> emptyList()
    }

    fun bannersFor(categoryKey: String): List<HeroBanner> = when (resolveCategory(categoryKey)) {
        "electronics" -> electronicsBanners
        "fashion"     -> fashionBanners
        "grocery"     -> groceryBanners
        "furniture"   -> furnitureBanners
        "vehicles"    -> vehiclesBanners
        "others"      -> othersBanners
        else          -> emptyList()
    }

    fun brandsFor(categoryKey: String): List<MockBrand> = when (resolveCategory(categoryKey)) {
        "electronics" -> electronicsBrands
        "fashion"     -> fashionBrands
        else          -> emptyList()
    }

    fun trendingFor(categoryKey: String): List<MockProduct> =
        productsForCategory(categoryKey).filter { it.isTrending }

    fun newArrivalsFor(categoryKey: String): List<MockProduct> =
        productsForCategory(categoryKey).filter { it.isNewArrival }

    fun dealsFor(categoryKey: String): List<MockProduct> =
        productsForCategory(categoryKey).filter { it.isDeal }

    fun findProduct(id: String): MockProduct? = allProducts.find { it.id == id }
}
