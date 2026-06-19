package com.mhub.app.ui.explore

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mhub.app.core.ApiResult
import com.mhub.app.data.repository.CategoriesRepository
import com.mhub.app.data.repository.PostsRepository
import com.mhub.app.data.repository.RecommendationsRepository
import com.mhub.app.data.repository.WishlistRepository
import com.mhub.app.data.repository.CartRepository
import com.mhub.app.domain.model.Post
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
val MOCK_EXPLORE_POSTS = listOf(
    // ── ELECTRONICS — Phones ──────────────────────────────────────────────────
    Post(id="mp-e1", title="iPhone 14 Pro Max 256GB – Deep Purple", description="1 year old, excellent condition. Original box, charger and earphones included. No scratches. Battery health 94%. Face ID working perfectly.", price=68000.0, originalPrice=89000.0, imageUrl="https://picsum.photos/seed/iph14pro/400/300", category="electronics", subcategory="Phones", brand="Apple", condition="Used", city="Mumbai", location="Mumbai, MH", sellerName="Rohit K.", viewCount=342, likeCount=28, interestedBuyers=12, createdAt="2024-01-20", sellerVerified=true, boostLevel=3, promoLabel="spotlight", tier="premium", isPremium=true, isNegotiable=true),
    Post(id="mp-e2", title="Samsung Galaxy S23 Ultra – Phantom Black 12/256GB", description="6 months old. 200MP camera, 12GB RAM. S-Pen included. Excellent condition. No dents or scratches. Full set with box.", price=82000.0, imageUrl="https://picsum.photos/seed/s23ultra/400/300", category="electronics", subcategory="Phones", brand="Samsung", condition="Like New", city="Bengaluru", location="Bengaluru, KA", sellerName="Priya S.", viewCount=215, likeCount=19, interestedBuyers=8, sellerVerified=true, boostLevel=2, promoLabel="featured", tier="silver"),
    Post(id="mp-e3", title="OnePlus 12 – Silky Black 16/512GB", description="3 months old. Snapdragon 8 Gen 3, 50W wireless charging. 100W wired. Pristine. Original box included.", price=59000.0, imageUrl="https://picsum.photos/seed/oneplus12/400/300", category="electronics", subcategory="Phones", brand="OnePlus", condition="Like New", city="Hyderabad", location="Hyderabad, TS", sellerName="Kiran R.", viewCount=189, likeCount=22, boostLevel=1, promoLabel="boost", isNegotiable=true),
    Post(id="mp-e4", title="Google Pixel 8 Pro – Bay Color 128GB", description="4 months old. Google AI features, best Android camera. 7 years of OS updates guaranteed. Mint condition.", price=72000.0, originalPrice=84999.0, imageUrl="https://picsum.photos/seed/pixel8pro/400/300", category="electronics", subcategory="Phones", brand="Google", condition="Like New", city="Delhi", location="Delhi, DL", sellerName="Sneha R.", viewCount=156, likeCount=17, isFlashSale=true),
    // ── ELECTRONICS — Laptops ──────────────────────────────────────────────────
    Post(id="mp-e5", title="MacBook Air M2 13\" – Starlight 8GB/256GB", description="4 months old, pristine. AppleCare+ valid till 2025. No dents. Original packaging. Perfect for students and professionals.", price=105000.0, imageUrl="https://picsum.photos/seed/macm2/400/300", category="electronics", subcategory="Laptops", brand="Apple", condition="Like New", city="Delhi", location="Delhi, DL", sellerName="Vikram T.", viewCount=490, likeCount=45, interestedBuyers=21, sellerVerified=true),
    Post(id="mp-e6", title="Dell XPS 15 – i7 13th Gen 16GB RAM 512GB SSD", description="8 months old, barely used. 15.6\" OLED display. Comes with original charger and sleeve. Perfect for designers.", price=95000.0, imageUrl="https://picsum.photos/seed/dellxps15/400/300", category="electronics", subcategory="Laptops", brand="Dell", condition="Like New", city="Hyderabad", location="Hyderabad, TS", sellerName="Arjun M.", viewCount=178, likeCount=22, interestedBuyers=6),
    Post(id="mp-e7", title="Lenovo ThinkPad X1 Carbon – i5 16GB 512GB", description="1 year old. Business ultrabook, very durable. Thunderbolt 4, backlit keyboard. No issues.", price=78000.0, imageUrl="https://picsum.photos/seed/thinkpadx1/400/300", category="electronics", subcategory="Laptops", brand="Lenovo", condition="Used", city="Pune", location="Pune, MH", sellerName="Anand K.", viewCount=134, likeCount=18),
    // ── ELECTRONICS — Audio ───────────────────────────────────────────────────
    Post(id="mp-e8", title="Sony WH-1000XM5 Noise Cancelling Headphones", description="6 months old. Best-in-class ANC, 30hr battery. Comes with carry case and cables. No ear pad wear.", price=22000.0, imageUrl="https://picsum.photos/seed/sonymxm5/400/300", category="electronics", subcategory="Audio", brand="Sony", condition="Used", city="Chennai", location="Chennai, TN", sellerName="Aditya B.", viewCount=156, likeCount=18),
    Post(id="mp-e9", title="Apple AirPods Pro 2nd Gen – Lightning", description="3 months old. Adaptive Transparency, H2 chip. Both earbuds and case in perfect condition. With original box.", price=18500.0, imageUrl="https://picsum.photos/seed/airpodspro2/400/300", category="electronics", subcategory="Audio", brand="Apple", condition="Like New", city="Mumbai", location="Mumbai, MH", sellerName="Ritika S.", viewCount=201, likeCount=24, interestedBuyers=9),
    // ── ELECTRONICS — Gaming ───────────────────────────────────────────────────
    Post(id="mp-e10", title="PlayStation 5 + 2 Controllers + 3 Top Games", description="Purchased 2023. God of War Ragnarok, FIFA 24, Spider-Man 2. All working perfectly. No disc scratches.", price=46000.0, imageUrl="https://picsum.photos/seed/ps5bundle/400/300", category="electronics", subcategory="Gaming", brand="Sony", condition="Used", city="Ahmedabad", location="Ahmedabad, GJ", sellerName="Rajan V.", viewCount=380, likeCount=52, interestedBuyers=19),
    Post(id="mp-e11", title="Xbox Series X 1TB – Black, With Controller", description="8 months old. 4K gaming, 120fps, Xbox Game Pass ready. One owner. Minimal use.", price=39000.0, imageUrl="https://picsum.photos/seed/xboxseriesx/400/300", category="electronics", subcategory="Gaming", brand="Microsoft", condition="Like New", city="Bengaluru", location="Bengaluru, KA", sellerName="Dev N.", viewCount=245, likeCount=31),
    // ── ELECTRONICS — Cameras ─────────────────────────────────────────────────
    Post(id="mp-e12", title="Canon EOS R50 Mirrorless – Body Only 24.2MP", description="3 months old. 4K 30fps video, eye-tracking AF. Perfect for content creators and vloggers.", price=55000.0, imageUrl="https://picsum.photos/seed/canonr50/400/300", category="electronics", subcategory="Cameras", brand="Canon", condition="Like New", city="Kolkata", location="Kolkata, WB", sellerName="Meena P.", viewCount=134, likeCount=15, interestedBuyers=5),
    Post(id="mp-e13", title="DJI Mini 3 Pro Drone – With RC Controller", description="5 months old. 4K/60fps, obstacle sensing, 34min flight time. All accessories included. No crashes.", price=72000.0, imageUrl="https://picsum.photos/seed/djimini3/400/300", category="electronics", subcategory="Cameras", brand="DJI", condition="Like New", city="Hyderabad", location="Hyderabad, TS", sellerName="Sunil V.", viewCount=298, likeCount=37, interestedBuyers=11, sellerVerified=true),
    // ── FASHION — Shoes ───────────────────────────────────────────────────────
    Post(id="mp-f1", title="Nike Air Jordan 1 Retro High OG – University Blue", description="Size UK 9. Worn twice. 100% authentic with original receipt. Comes with original box and lace bag.", price=14500.0, imageUrl="https://picsum.photos/seed/jordan1ub/400/300", category="fashion", subcategory="Shoes", brand="Nike", condition="Like New", city="Mumbai", location="Mumbai, MH", sellerName="Dev S.", viewCount=620, likeCount=74, interestedBuyers=33, sellerVerified=true),
    Post(id="mp-f2", title="Adidas Yeezy Boost 350 V2 – Zebra UK 10", description="Limited edition. Worn 3 times only. Purchased from Adidas official. Comes with box. No yellowing.", price=28000.0, imageUrl="https://picsum.photos/seed/yeezy350/400/300", category="fashion", subcategory="Shoes", brand="Adidas", condition="Like New", city="Delhi", location="Delhi, DL", sellerName="Rahul M.", viewCount=854, likeCount=96, interestedBuyers=41),
    Post(id="mp-f3", title="Puma RS-X Reinvention – White/Blue UK 8", description="1 month old. Worn twice for casual outings. Excellent cushioning, retro-style design.", price=4500.0, imageUrl="https://picsum.photos/seed/pumarsx/400/300", category="fashion", subcategory="Shoes", brand="Puma", condition="Like New", city="Pune", location="Pune, MH", sellerName="Ananya K.", viewCount=178, likeCount=21),
    // ── FASHION — Bags & Watches ─────────────────────────────────────────────
    Post(id="mp-f4", title="Louis Vuitton Neverfull MM Tote – Damier Ebene", description="Authentic, purchased from LV Paris. 2 years old. Excellent condition. Original dust bag and receipt.", price=145000.0, imageUrl="https://picsum.photos/seed/lvneverfull/400/300", category="fashion", subcategory="Bags", brand="Louis Vuitton", condition="Used", city="Delhi", location="Delhi, DL", sellerName="Priyanka N.", viewCount=890, likeCount=112, interestedBuyers=28, sellerVerified=true),
    Post(id="mp-f5", title="Rolex Submariner Date – 116610LN Black Dial", description="Purchased 2021. Full set with box and papers. Regular service done. Scratch-free case and bracelet.", price=1250000.0, imageUrl="https://picsum.photos/seed/rolexsub/400/300", category="fashion", subcategory="Watches", brand="Rolex", condition="Used", city="Hyderabad", location="Hyderabad, TS", sellerName="Suresh M.", viewCount=1450, likeCount=198, interestedBuyers=42, sellerVerified=true),
    Post(id="mp-f6", title="Titan Raga Women's Watch – Rose Gold", description="6 months old. Elegant design, water-resistant. Sapphire crystal glass. Comes with warranty card.", price=8500.0, imageUrl="https://picsum.photos/seed/titanraga/400/300", category="fashion", subcategory="Watches", brand="Titan", condition="Like New", city="Chennai", location="Chennai, TN", sellerName="Kavya R.", viewCount=123, likeCount=14),
    // ── FASHION — Clothing ────────────────────────────────────────────────────
    Post(id="mp-f7", title="Levi's 511 Slim Fit Jeans – Dark Blue W32 L30", description="Barely worn, original tags attached. Comfortable slim fit. Authentic Levi's from official store.", price=2200.0, imageUrl="https://picsum.photos/seed/levis511/400/300", category="fashion", subcategory="Men's Clothing", brand="Levi's", condition="Like New", city="Pune", location="Pune, MH", sellerName="Karan T.", viewCount=89, likeCount=8),
    Post(id="mp-f8", title="Fabindia Cotton Kurta Set – 3 Pcs, Size M", description="Beautiful embroidered kurta with matching pants and dupatta. Worn once for function. Perfect condition.", price=3500.0, imageUrl="https://picsum.photos/seed/fabindiaset/400/300", category="fashion", subcategory="Women's Clothing", brand="Fabindia", condition="Like New", city="Jaipur", location="Jaipur, RJ", sellerName="Sunita R.", viewCount=166, likeCount=21),
    Post(id="mp-f9", title="H&M Oversized Hoodie – Beige Size L", description="Brand new with tags. Never worn. Soft fleece interior. Perfect for winters.", price=1200.0, imageUrl="https://picsum.photos/seed/hmhoodie/400/300", category="fashion", subcategory="Women's Clothing", brand="H&M", condition="New", city="Mumbai", location="Mumbai, MH", sellerName="Shanya B.", viewCount=67, likeCount=9),
    // ── VEHICLES — Motorcycles & Scooters ────────────────────────────────────
    Post(id="mp-v1", title="Royal Enfield Classic 350 – Halcyon Black 2022", description="8,400 km driven. Single owner. All service at RE service centre. Clean RC transfer. No accidents.", price=155000.0, imageUrl="https://picsum.photos/seed/reclass350/400/300", category="vehicles", subcategory="Motorcycles", brand="Royal Enfield", condition="Used", city="Bengaluru", location="Bengaluru, KA", sellerName="Aryan D.", viewCount=542, likeCount=67, interestedBuyers=15, year=2022, mileage=8400, sellerVerified=true),
    Post(id="mp-v2", title="KTM Duke 390 – Orange 2023 Model", description="12,000 km. First owner. ABS, traction control, LED lights. Serviced at KTM authorised centre.", price=220000.0, imageUrl="https://picsum.photos/seed/ktmduke390/400/300", category="vehicles", subcategory="Motorcycles", brand="KTM", condition="Used", city="Pune", location="Pune, MH", sellerName="Rohan S.", viewCount=689, likeCount=81, interestedBuyers=22, year=2023, mileage=12000),
    Post(id="mp-v3", title="Honda Activa 6G – Pearl White 2023", description="6 months old, 2,200 km. First owner, all papers complete. Excellent condition. Accident free.", price=75000.0, imageUrl="https://picsum.photos/seed/activa6g/400/300", category="vehicles", subcategory="Scooters", brand="Honda", condition="Like New", city="Pune", location="Pune, MH", sellerName="Ravi S.", viewCount=318, likeCount=38, interestedBuyers=11, year=2023, mileage=2200),
    Post(id="mp-v4", title="Ather 450X Gen 3 Electric Scooter – Black", description="1 year old, 8,500 km. Fast charging installed at home. All service done at Ather grid. Great range.", price=130000.0, imageUrl="https://picsum.photos/seed/ather450x/400/300", category="vehicles", subcategory="Scooters", brand="Ather", condition="Used", city="Bengaluru", location="Bengaluru, KA", sellerName="Preethi K.", viewCount=445, likeCount=58, interestedBuyers=17, year=2023, mileage=8500),
    // ── VEHICLES — Cars ───────────────────────────────────────────────────────
    Post(id="mp-v5", title="Maruti Suzuki Swift VXi 2020 – Red", description="38,000 km. Single owner. Fully insured. New tyres fitted. All service done at Maruti authorised centre.", price=620000.0, imageUrl="https://picsum.photos/seed/swiftvxi/400/300", category="vehicles", subcategory="Cars", brand="Maruti Suzuki", condition="Used", city="Delhi", location="Delhi, DL", sellerName="Ankit G.", viewCount=725, likeCount=89, interestedBuyers=24, year=2020, mileage=38000, sellerVerified=true),
    Post(id="mp-v6", title="Hyundai Creta SX 2022 – Typhoon Silver", description="22,000 km. Second owner. Sunroof, touchscreen, BLIS. Full service history. Insurance valid.", price=1350000.0, imageUrl="https://picsum.photos/seed/cretasx/400/300", category="vehicles", subcategory="Cars", brand="Hyundai", condition="Used", city="Mumbai", location="Mumbai, MH", sellerName="Vikram N.", viewCount=1120, likeCount=134, interestedBuyers=38, year=2022, mileage=22000),
    Post(id="mp-v7", title="Tata Nexon EV Max – Pristine White 2022", description="18,000 km. Electric with 437km range. Sunroof. Fast charging cable included. Zero accidents.", price=1580000.0, imageUrl="https://picsum.photos/seed/nexonevmax/400/300", category="vehicles", subcategory="Cars", brand="Tata", condition="Used", city="Hyderabad", location="Hyderabad, TS", sellerName="Meera D.", viewCount=982, likeCount=118, interestedBuyers=29, year=2022, mileage=18000),
    // ── VEHICLES — Bicycles ───────────────────────────────────────────────────
    Post(id="mp-v8", title="Hero Cycle Sprint 26T Mountain Bike", description="1 year old. Front suspension, 21-speed Shimano gears. Dual disc brakes. Ideal for trails and daily use.", price=8500.0, imageUrl="https://picsum.photos/seed/herosprint/400/300", category="vehicles", subcategory="Bicycles", brand="Hero", condition="Used", city="Chennai", location="Chennai, TN", sellerName="Balaji K.", viewCount=142, likeCount=16),
    Post(id="mp-v9", title="Decathlon Btwin 340 Hybrid Bicycle – Blue", description="6 months old. Shimano 7-speed, front basket, mudguards. Perfect for city commuting.", price=12000.0, imageUrl="https://picsum.photos/seed/btwin340/400/300", category="vehicles", subcategory="Bicycles", brand="Decathlon", condition="Used", city="Bengaluru", location="Bengaluru, KA", sellerName="Sanjay M.", viewCount=98, likeCount=13),
    // ── OTHERS — Home & Furniture ─────────────────────────────────────────────
    Post(id="mp-o1", title="IKEA MALM Double Bed – White with 2 Storage Drawers", description="2 years old. White finish, sturdy. Minor surface wear. Dimensions 160x200cm. Self-collect only.", price=12000.0, imageUrl="https://picsum.photos/seed/ikeamalm/400/300", category="others", subcategory="Home & Furniture", brand="IKEA", condition="Used", city="Gurgaon", location="Gurgaon, HR", sellerName="Neha P.", viewCount=203, likeCount=22, interestedBuyers=7),
    Post(id="mp-o2", title="Godrej Interio Wardrobe – 3 Door Sliding Mirror", description="3 years old. Good condition. Internal shelves and hanging space. Minimal scratches. Dismantled for transport.", price=18000.0, imageUrl="https://picsum.photos/seed/godrejwardrobe/400/300", category="others", subcategory="Home & Furniture", brand="Godrej", condition="Used", city="Pune", location="Pune, MH", sellerName="Anjali T.", viewCount=156, likeCount=19, interestedBuyers=6),
    Post(id="mp-o3", title="Philips Air Fryer HD9200 4.1L 1400W", description="2 years old, works perfectly. Easy to clean. Original manual included. Upgrading to larger model.", price=3500.0, imageUrl="https://picsum.photos/seed/philipsaf/400/300", category="others", subcategory="Home & Furniture", brand="Philips", condition="Used", city="Bengaluru", location="Bengaluru, KA", sellerName="Divya M.", viewCount=187, likeCount=24, interestedBuyers=9),
    // ── OTHERS — Sports & Fitness ─────────────────────────────────────────────
    Post(id="mp-o4", title="Manduka PRO Yoga Mat 6mm + Strap + 2 Blocks", description="6 months used. Excellent cushioning, non-slip surface. Full yoga kit in great condition. Navy blue.", price=3800.0, imageUrl="https://picsum.photos/seed/mandukayoga/400/300", category="others", subcategory="Sports & Fitness", brand="Manduka", condition="Used", city="Mumbai", location="Mumbai, MH", sellerName="Kavita S.", viewCount=98, likeCount=11),
    Post(id="mp-o5", title="Cosco Badminton Racket Set – 2 Rackets + Net + Shuttle", description="3 months old. Premium carbon fibre rackets. Full set for backyard or indoor play. Excellent condition.", price=2400.0, imageUrl="https://picsum.photos/seed/coscobadminton/400/300", category="others", subcategory="Sports & Fitness", brand="Cosco", condition="Used", city="Delhi", location="Delhi, DL", sellerName="Arjun K.", viewCount=76, likeCount=9),
    // ── OTHERS — Books & Education ────────────────────────────────────────────
    Post(id="mp-o6", title="Harry Potter Complete 7-Book Set – UK Adult Edition", description="All 7 books. Good condition with minor spine wear. No torn pages or heavy marking.", price=1800.0, imageUrl="https://picsum.photos/seed/hpbooks/400/300", category="others", subcategory="Books & Education", brand="Bloomsbury", condition="Used", city="Kolkata", location="Kolkata, WB", sellerName="Soumya B.", viewCount=76, likeCount=14),
    Post(id="mp-o7", title="IIT JEE Advanced 2020-2024 Question Papers Collection", description="Set of 5 year question papers with solutions. Very useful for JEE preparation. Good condition.", price=600.0, imageUrl="https://picsum.photos/seed/iitjee/400/300", category="others", subcategory="Books & Education", brand="Arihant", condition="Used", city="Kota", location="Kota, RJ", sellerName="Raj T.", viewCount=212, likeCount=28),
    // ── OTHERS — Health & Beauty ─────────────────────────────────────────────
    Post(id="mp-o8", title="BoAt Airdopes 141 TWS Earbuds – Brand New Sealed", description="Unopened box. Received as gift but already have similar. Includes warranty card and all accessories.", price=950.0, imageUrl="https://picsum.photos/seed/boataird141/400/300", category="others", subcategory="Health & Beauty", brand="Boat", condition="New", city="Jaipur", location="Jaipur, RJ", sellerName="Rahul J.", viewCount=155, likeCount=18),
    Post(id="mp-o9", title="Philips Electric Shaver Series 7000 – S7783/50", description="1 year old. Wet & dry shaving, 5D pivot & flex head. Comes with travel case and charger. Works like new.", price=6500.0, imageUrl="https://picsum.photos/seed/philipsshaver/400/300", category="others", subcategory="Health & Beauty", brand="Philips", condition="Used", city="Hyderabad", location="Hyderabad, TS", sellerName="Manish K.", viewCount=89, likeCount=10),
    // ── OTHERS — Agriculture & Real Estate ───────────────────────────────────
    Post(id="mp-o10", title="Organic Honey 1kg – Pure Wild Forest Honey", description="100% natural, unprocessed. Sourced from Nilgiri Hills. No added sugar. Tested for purity. Bulk available.", price=850.0, imageUrl="https://picsum.photos/seed/organichoney/400/300", category="others", subcategory="Agriculture", brand="NilgiriNaturals", condition="New", city="Coimbatore", location="Coimbatore, TN", sellerName="Farmer Ravi", viewCount=234, likeCount=31),
    Post(id="mp-o11", title="2BHK Flat for Rent – Prime Location Koramangala", description="1200 sqft. 2 bedrooms, 2 bathrooms. Semi-furnished. Close to metro. Available from 1st Feb. Negotiable.", price=28000.0, imageUrl="https://picsum.photos/seed/koramangala2bhk/400/300", category="others", subcategory="Real Estate", brand=null, condition=null, city="Bengaluru", location="Koramangala, Bengaluru", sellerName="Suresh Property", viewCount=478, likeCount=45, interestedBuyers=18, sellerVerified=true),
)

data class ExploreState(
    val ecosystemKey: String? = null,
    val sortBy: String = "newest",
    val filterCondition: String = "any",  // "any" | "new" | "used"
    val filterSubcategory: String? = null,
    val filterMinPrice: Float = 0f,
    val filterMaxPrice: Float = 500000f,
    val hasActiveFilters: Boolean = false,
    val posts: List<Post> = emptyList(),
    val page: Int = 1,
    val hasMore: Boolean = true,
    val loadingPosts: Boolean = true,
    val loadingMore: Boolean = false,
    val errorMessage: String? = null,
    val compareItems: Set<String> = emptySet(),
    val cartItems: Set<String> = emptySet(),
    val searchQuery: String = "",
    val searchResults: List<Post> = emptyList(),
    val isSearching: Boolean = false,
    val refreshing: Boolean = false,
    val subcategories: List<String> = emptyList(),
    // Quick filter state
    val quickFilter: String? = null, // "latest5" | "latest10" | "today" | "nearme" | "verified"
    val autoRefresh: Boolean = false,
    // Plan expiry banner state
    val showPlanExpiryBanner: Boolean = false,
    val planExpiringSoon: Boolean = false,   // true = expiring within 7 days
    val planExpired: Boolean = false,        // true = already expired
    val planExpiryDate: String? = null,
)

@HiltViewModel
class ExploreViewModel @Inject constructor(
    private val postsRepo: PostsRepository,
    private val wishlistRepo: WishlistRepository,
    private val cartRepo: CartRepository,
    private val categoriesRepo: CategoriesRepository,
    private val tiersRepo: com.mhub.app.data.repository.TiersRepository,
    private val localeManager: com.mhub.app.core.LocaleManager,
) : ViewModel() {
    private val _state = MutableStateFlow(ExploreState())
    val state: StateFlow<ExploreState> = _state.asStateFlow()

    private var searchJob: Job? = null
    private var lastLocaleVersion = 0L

    init {
        loadPosts(reset = true)
        loadCart()
        checkPlanExpiry()
        viewModelScope.launch {
            localeManager.localeVersion.collect { version ->
                if (version > lastLocaleVersion && lastLocaleVersion > 0L) loadPosts(reset = true)
                lastLocaleVersion = version
            }
        }
    }

    fun dismissPlanBanner() {
        _state.value = _state.value.copy(showPlanExpiryBanner = false)
    }

    private fun checkPlanExpiry() {
        viewModelScope.launch {
            val result = kotlinx.coroutines.withTimeoutOrNull(4000L) { tiersRepo.mySubscription() }
                ?: return@launch
            if (result is com.mhub.app.core.ApiResult.Success) {
                val sub = result.data.subscription
                val expiresAt = sub?.expiresAt
                if (expiresAt != null) {
                    val now = System.currentTimeMillis()
                    val sevenDaysMs = 7L * 24 * 60 * 60 * 1000
                    val expMs = try {
                        java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", java.util.Locale.US)
                            .also { it.timeZone = java.util.TimeZone.getTimeZone("UTC") }
                            .parse(expiresAt)?.time ?: Long.MAX_VALUE
                    } catch (_: Exception) { Long.MAX_VALUE }
                    val expired = expMs < now
                    val expiringSoon = !expired && (expMs - now) < sevenDaysMs
                    if (expired || expiringSoon) {
                        _state.value = _state.value.copy(
                            showPlanExpiryBanner = true,
                            planExpired = expired,
                            planExpiringSoon = expiringSoon,
                            planExpiryDate = expiresAt.take(10),
                        )
                    }
                }
            }
        }
    }

    fun setEcosystem(key: String?) {
        if (_state.value.ecosystemKey == key) return
        _state.value = _state.value.copy(ecosystemKey = key)
        loadSubcategories(key)
        loadPosts(reset = true)
    }

    fun setFilterCondition(condition: String) {
        val newFilters = condition != "any" || _state.value.filterSubcategory != null
        _state.value = _state.value.copy(filterCondition = condition, hasActiveFilters = newFilters)
        loadPosts(reset = true)
    }

    fun setFilterSubcategory(sub: String?) {
        val newFilters = _state.value.filterCondition != "any" || sub != null
        _state.value = _state.value.copy(filterSubcategory = sub, hasActiveFilters = newFilters)
        loadPosts(reset = true)
    }

    fun setFilterPrice(min: Float, max: Float) {
        val newFilters = _state.value.filterCondition != "any" || _state.value.filterSubcategory != null || min > 0f || max < 500000f
        _state.value = _state.value.copy(filterMinPrice = min, filterMaxPrice = max, hasActiveFilters = newFilters)
        loadPosts(reset = true)
    }

    fun clearFilters() {
        _state.value = _state.value.copy(filterCondition = "any", filterSubcategory = null, filterMinPrice = 0f, filterMaxPrice = 500000f, hasActiveFilters = false, quickFilter = null)
        loadPosts(reset = true)
    }

    fun setQuickFilter(filter: String?) {
        val current = _state.value.quickFilter
        val newFilter = if (current == filter) null else filter
        _state.value = _state.value.copy(quickFilter = newFilter, sortBy = if (newFilter != null) "newest" else _state.value.sortBy)
        loadPosts(reset = true)
    }

    fun toggleAutoRefresh() {
        val newVal = !_state.value.autoRefresh
        _state.value = _state.value.copy(autoRefresh = newVal)
        if (newVal) startAutoRefresh() else autoRefreshJob?.cancel()
    }

    private var autoRefreshJob: Job? = null
    private fun startAutoRefresh() {
        autoRefreshJob?.cancel()
        autoRefreshJob = viewModelScope.launch {
            while (true) {
                delay(30_000L)
                if (_state.value.autoRefresh) refresh() else break
            }
        }
    }

    fun loadPosts(reset: Boolean = false) {
        val currentPage = if (reset) 1 else _state.value.page
        val categoryKey = _state.value.ecosystemKey
        val sort = _state.value.sortBy
        if (reset) {
            _state.value = _state.value.copy(loadingPosts = true, posts = emptyList(), page = 1, hasMore = true)
        } else {
            if (!_state.value.hasMore || _state.value.loadingMore) return
            _state.value = _state.value.copy(loadingMore = true)
        }
        viewModelScope.launch {
            val condition = _state.value.filterCondition.takeIf { it != "any" }
            val subcategory = _state.value.filterSubcategory
            when (val result = postsRepo.feed(
                page = currentPage,
                categoryId = categoryKey,
                query = _state.value.searchQuery.takeIf { it.isNotBlank() },
                sort = sort,
                condition = condition,
                subcategory = subcategory,
            )) {
                is ApiResult.Success -> {
                    val newPosts = result.data
                    // BUG-001 fix: if API returns success with 0 posts on reset, fall back to mocks
                    val s = _state.value
                    val mockFallback = if (com.mhub.app.BuildConfig.DEBUG && reset && newPosts.isEmpty()) {
                        var list = if (s.ecosystemKey != null) MOCK_EXPLORE_POSTS.filter {
                            it.category.equals(s.ecosystemKey, ignoreCase = true)
                        } else MOCK_EXPLORE_POSTS
                        if (!s.filterSubcategory.isNullOrBlank()) list = list.filter { it.subcategory.equals(s.filterSubcategory, ignoreCase = true) }
                        if (s.filterCondition != "any") list = list.filter { it.condition?.lowercase() == s.filterCondition }
                        list.ifEmpty { MOCK_EXPLORE_POSTS }
                    } else emptyList()
                    val finalPosts = applyQuickFilter(when {
                        mockFallback.isNotEmpty() -> mockFallback
                        reset -> newPosts
                        else -> _state.value.posts + newPosts
                    })
                    _state.value = _state.value.copy(
                        loadingPosts = false, loadingMore = false,
                        posts = finalPosts,
                        page = currentPage + 1,
                        hasMore = newPosts.size >= 20 && mockFallback.isEmpty(),
                    )
                }
                is ApiResult.Failure -> {
                    // Fall back to mock data so the screen is never empty
                    val s = _state.value
                    val mockFallback = if (com.mhub.app.BuildConfig.DEBUG && reset && s.posts.isEmpty()) {
                        var list = if (s.ecosystemKey != null) MOCK_EXPLORE_POSTS.filter { it.category == s.ecosystemKey } else MOCK_EXPLORE_POSTS
                        if (!s.filterSubcategory.isNullOrBlank()) list = list.filter { it.subcategory.equals(s.filterSubcategory, ignoreCase = true) }
                        if (s.filterCondition != "any") list = list.filter { it.condition?.lowercase() == s.filterCondition }
                        list.ifEmpty { MOCK_EXPLORE_POSTS }
                    } else emptyList()
                    val finalPosts = applyQuickFilter(if (mockFallback.isNotEmpty()) mockFallback else s.posts)
                    _state.value = s.copy(
                        loadingPosts = false, loadingMore = false,
                        posts = finalPosts,
                        hasMore = false,
                        errorMessage = if (com.mhub.app.BuildConfig.DEBUG) null else result.error.message,
                    )
                }
            }
        }
    }

    fun refresh() {
        _state.value = _state.value.copy(refreshing = true)
        viewModelScope.launch {
            loadPosts(reset = true)
            _state.value = _state.value.copy(refreshing = false)
        }
    }

    fun retry() {
        _state.value = _state.value.copy(errorMessage = null)
        loadPosts(reset = true)
    }

    private fun applyQuickFilter(posts: List<Post>): List<Post> {
        val qf = _state.value.quickFilter ?: return posts
        val now = System.currentTimeMillis()
        val todayStr = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(java.util.Date(now))
        return when (qf) {
            "latest5" -> posts.sortedByDescending { it.createdAt ?: "" }.take(5)
            "latest10" -> posts.sortedByDescending { it.createdAt ?: "" }.take(10)
            "today" -> posts.filter { it.createdAt?.startsWith(todayStr) == true }.ifEmpty { posts.take(5) }
            "nearme" -> posts.filter { it.sellerVerified == true } // approximation: show verified sellers nearby
            "verified" -> posts.filter { it.sellerVerified == true }
            "shuffle" -> posts.shuffled()
            else -> posts
        }
    }

    private fun loadSubcategories(key: String?) {
        if (key == null) {
            _state.value = _state.value.copy(subcategories = emptyList())
            return
        }
        viewModelScope.launch {
            when (val r = categoriesRepo.subcategories(key)) {
                is ApiResult.Success -> {
                    val names = r.data.mapNotNull { it.name }.take(10)
                    _state.value = _state.value.copy(subcategories = names)
                }
                is ApiResult.Failure -> {
                    // Keep hardcoded fallback
                    val fallback = when (key) {
                        "electronics" -> listOf("Phones", "Laptops", "Tablets", "Cameras", "Audio", "Gaming", "Accessories")
                        "fashion" -> listOf("Men's Clothing", "Women's Clothing", "Shoes", "Bags", "Watches", "Jewellery")
                        "vehicles" -> listOf("Cars", "Motorcycles", "Bicycles", "Trucks", "Spare Parts", "Accessories")
                        "others" -> listOf("Home & Furniture", "Books", "Sports", "Health & Beauty", "Toys", "Services")
                        else -> emptyList()
                    }
                    _state.value = _state.value.copy(subcategories = fallback)
                }
            }
        }
    }

    // Retained for back-compat but ecosystem is set via setEcosystem()
    fun setCategory(idx: Int) {
        // no-op: category is now locked by ecosystem from Home screen
        // Remove if no callers remain
        _state.value = _state.value.copy()
        loadPosts(reset = true)
    }

    fun setSortBy(sort: String) {
        if (_state.value.sortBy == sort) return
        _state.value = _state.value.copy(sortBy = sort)
        loadPosts(reset = true)
    }

    fun loadMore() = loadPosts(reset = false)

    fun toggleCompare(postId: String) {
        val current = _state.value.compareItems.toMutableSet()
        if (current.contains(postId)) current.remove(postId) else if (current.size < 4) current.add(postId)
        _state.value = _state.value.copy(compareItems = current)
    }

    fun toggleCart(postId: String) {
        val current = _state.value.cartItems.toMutableSet()
        val removing = current.contains(postId)
        if (removing) current.remove(postId) else current.add(postId)
        _state.value = _state.value.copy(cartItems = current)
        viewModelScope.launch {
            val result = if (removing) cartRepo.remove(postId) else cartRepo.add(postId)
            if (result is ApiResult.Failure) {
                val rollback = _state.value.cartItems.toMutableSet()
                if (removing) rollback.add(postId) else rollback.remove(postId)
                _state.value = _state.value.copy(cartItems = rollback)
            }
        }
    }

    private fun loadCart() {
        viewModelScope.launch {
            when (val result = cartRepo.get()) {
                is ApiResult.Success -> _state.value = _state.value.copy(
                    cartItems = result.data.items.mapNotNull { it.postId }.toSet(),
                )
                is ApiResult.Failure -> Unit
            }
        }
    }

    fun clearCompare() {
        _state.value = _state.value.copy(compareItems = emptySet())
        viewModelScope.launch { postsRepo.clearCompare() }
    }

    fun onQueryChange(query: String) {
        _state.value = _state.value.copy(searchQuery = query)
        searchJob?.cancel()
        if (query.isBlank()) {
            _state.value = _state.value.copy(searchResults = emptyList(), isSearching = false)
            return
        }
        // Web Parity: Comprehensive search across title, desc, cat, subcat, tags, and users
        val immediateMatches = _state.value.posts.filter { post ->
            listOf(
                post.title,
                post.description,
                post.category,
                post.categoryName,
                post.subcategory,
                post.subcategoryName,
                post.userName,
                post.userHandle,
                post.brand,
            ).any { it?.contains(query, ignoreCase = true) == true } ||
                post.tags.orEmpty().any { it.contains(query, ignoreCase = true) }
        }
        _state.value = _state.value.copy(searchResults = immediateMatches)
        searchJob = viewModelScope.launch {
            delay(400) // Debounce server call
            _state.value = _state.value.copy(isSearching = true)
            // Real-world: Server handles Title + Description + Subcategory indexing
            when (val result = postsRepo.feed(
                categoryId = _state.value.ecosystemKey,
                query = query,
                sort = _state.value.sortBy,
                condition = _state.value.filterCondition.takeIf { it != "any" },
                subcategory = _state.value.filterSubcategory,
            )) {
                is ApiResult.Success -> {
                    _state.value = _state.value.copy(isSearching = false, searchResults = result.data)
                }
                is ApiResult.Failure -> {
                    _state.value = _state.value.copy(isSearching = false)
                }
            }
        }
    }

    fun clearSearch() {
        searchJob?.cancel()
        _state.value = _state.value.copy(searchQuery = "", searchResults = emptyList(), isSearching = false)
    }

    private val _wishlisted = MutableStateFlow<Set<String>>(emptySet())
    val wishlisted: StateFlow<Set<String>> = _wishlisted.asStateFlow()

    fun toggleWishlist(postId: String) {
        val current = _wishlisted.value.toMutableSet()
        if (current.contains(postId)) current.remove(postId) else current.add(postId)
        _wishlisted.value = current
        viewModelScope.launch { postsRepo.toggleWishlist(postId) }
    }

    fun addToCompare(postId: String) {
        viewModelScope.launch { postsRepo.addToCompare(postId) }
    }
}

// Map category name → emoji for visual richness
private fun categoryEmoji(name: String): String {
    val n = name.lowercase()
    return when {
        n.contains("electron") || n.contains("tech") || n.contains("gadget") || n.contains("phone") -> "\uD83D\uDCBB"
        n.contains("fashion") || n.contains("cloth") || n.contains("apparel") || n.contains("wear") -> "\uD83D\uDC55"
        n.contains("vehicle") || n.contains("car") || n.contains("bike") || n.contains("motor") -> "\uD83D\uDE97"
        n.contains("furniture") || n.contains("home") || n.contains("decor") -> "\uD83E\uDE91"
        n.contains("book") || n.contains("education") || n.contains("study") || n.contains("learn") -> "\uD83D\uDCDA"
        n.contains("sport") || n.contains("fitness") || n.contains("gym") || n.contains("run") -> "\u26BD"
        n.contains("food") || n.contains("grocery") || n.contains("restaurant") -> "\uD83C\uDF54"
        n.contains("job") || n.contains("work") || n.contains("career") -> "\uD83D\uDCBC"
        n.contains("service") || n.contains("skill") || n.contains("freelan") -> "\uD83D\uDEE0\uFE0F"
        n.contains("real estate") || n.contains("property") || n.contains("house") || n.contains("flat") -> "\uD83D\uDCD8"
        n.contains("toy") || n.contains("game") || n.contains("kid") -> "\uD83E\uDDFB"
        n.contains("health") || n.contains("beauty") || n.contains("cosmetic") || n.contains("medi") -> "\uD83D\uDC84"
        n.contains("pet") || n.contains("animal") -> "\uD83D\uDC3E"
        n.contains("music") || n.contains("instrument") -> "\uD83C\uDFB5"
        n.contains("art") || n.contains("craft") || n.contains("handmade") -> "\uD83C\uDFA8"
        else -> "\uD83C\uDFF7\uFE0F"
    }
}
