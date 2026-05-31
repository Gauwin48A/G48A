package com.mhub.app.ui.explore

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Compare
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.automirrored.filled.ViewList
import androidx.compose.material.icons.automirrored.outlined.Chat
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.outlined.Category
import androidx.compose.material.icons.outlined.ImageNotSupported
import androidx.compose.material.icons.outlined.LocalOffer
import androidx.compose.material.icons.outlined.NewReleases
import androidx.compose.material.icons.outlined.Star
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.IconButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.res.stringResource
import androidx.hilt.navigation.compose.hiltViewModel
import com.mhub.app.R
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
import com.mhub.app.core.ApiResult
import com.mhub.app.data.repository.CategoriesRepository
import com.mhub.app.data.repository.PostsRepository
import com.mhub.app.data.repository.RecommendationsRepository
import com.mhub.app.data.repository.WishlistRepository
import com.mhub.app.domain.model.Category
import com.mhub.app.domain.model.Post
import com.mhub.app.ui.components.AppEmptyState
import com.mhub.app.ui.components.SectionHeader
import com.mhub.app.ui.theme.CategoryTints
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import android.content.Intent
import androidx.compose.foundation.clickable
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.outlined.BookmarkBorder
import androidx.compose.material.icons.outlined.Flag
import androidx.compose.material.icons.outlined.Share
import androidx.compose.ui.platform.LocalContext
import kotlinx.coroutines.launch
import javax.inject.Inject
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.TextButton
import androidx.compose.foundation.BorderStroke
import androidx.compose.material.icons.outlined.ShoppingCart
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.filled.RemoveShoppingCart
import androidx.compose.material.icons.filled.Add
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.material3.ScrollableTabRow
import androidx.compose.material3.Tab
import androidx.compose.material3.HorizontalDivider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.snapshotFlow
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.material3.RadioButton
import com.mhub.app.ui.LocalActiveCategoryKey

private val MOCK_EXPLORE_POSTS = listOf(
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
            when (val result = postsRepo.feed(page = currentPage, categoryId = categoryKey, sort = sort, condition = condition, subcategory = subcategory)) {
                is ApiResult.Success -> {
                    val newPosts = result.data
                    // BUG-001 fix: if API returns success with 0 posts on reset, fall back to mocks
                    val s = _state.value
                    val mockFallback = if (reset && newPosts.isEmpty()) {
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
                    val mockFallback = if (reset && s.posts.isEmpty()) {
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
        if (current.contains(postId)) current.remove(postId) else current.add(postId)
        _state.value = _state.value.copy(cartItems = current)
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
        searchJob = viewModelScope.launch {
            delay(300)
            _state.value = _state.value.copy(isSearching = true)
            when (val result = postsRepo.feed(query = query)) {
                is ApiResult.Success -> _state.value = _state.value.copy(isSearching = false, searchResults = result.data)
                is ApiResult.Failure -> _state.value = _state.value.copy(isSearching = false)
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
        n.contains("electron") || n.contains("tech") || n.contains("gadget") -> "💻"
        n.contains("fashion") || n.contains("cloth") || n.contains("apparel") -> "👗"
        n.contains("vehicle") || n.contains("car") || n.contains("bike") || n.contains("motor") -> "🚗"
        n.contains("furniture") || n.contains("home") || n.contains("decor") -> "🏠"
        n.contains("book") || n.contains("education") || n.contains("study") -> "📚"
        n.contains("sport") || n.contains("fitness") || n.contains("gym") -> "⚽"
        n.contains("food") || n.contains("grocery") || n.contains("restaurant") -> "🍔"
        n.contains("job") || n.contains("service") || n.contains("freelan") -> "💼"
        n.contains("real estate") || n.contains("property") || n.contains("house") || n.contains("flat") -> "🏠"
        n.contains("toy") || n.contains("game") || n.contains("kid") -> "🎮"
        n.contains("health") || n.contains("beauty") || n.contains("cosmetic") -> "💄"
        n.contains("pet") || n.contains("animal") -> "🐾"
        n.contains("music") || n.contains("instrument") -> "🎵"
        n.contains("art") || n.contains("craft") || n.contains("handmade") -> "🎨"
        else -> "🏷️"
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExploreScreen(
    onOpenPost: (String) -> Unit,
    onOpenSearch: () -> Unit,
    onOpenCategories: () -> Unit,
    onOpenCompare: () -> Unit = {},
    onOpenCart: () -> Unit = {},
    onOpenNotifications: () -> Unit = {},
    onAddPost: () -> Unit = {},
    viewModel: ExploreViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    val wishlistedSet by viewModel.wishlisted.collectAsState()
    var showFilterSheet by remember { mutableStateOf(false) }
    val filterSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val focusManager = LocalFocusManager.current
    var showInterestModal by remember { mutableStateOf(false) }
    var interestPostId by remember { mutableStateOf("") }
    var interestPostTitle by remember { mutableStateOf("") }

    // Ecosystem from CompositionLocal — set when user enters a category from Home
    val ecosystemKey = LocalActiveCategoryKey.current
    val ecosystemLabel = when (ecosystemKey) {
        "electronics" -> "💻 Electronics"
        "fashion" -> "👗 Fashion"
        "vehicles" -> "🚗 Vehicles"
        "others" -> "✨ Others"
        else -> null
    }
    val ecosystemSubcategories: List<String> = when {
        state.subcategories.isNotEmpty() -> state.subcategories
        ecosystemKey == "electronics" -> listOf("Phones", "Laptops", "Tablets", "Cameras", "Audio", "Gaming", "Accessories")
        ecosystemKey == "fashion" -> listOf("Men's Clothing", "Women's Clothing", "Shoes", "Bags", "Watches", "Jewellery")
        ecosystemKey == "vehicles" -> listOf("Cars", "Motorcycles", "Bicycles", "Trucks", "Spare Parts", "Accessories")
        ecosystemKey == "others" -> listOf("Home & Furniture", "Books", "Sports", "Health & Beauty", "Toys", "Services")
        else -> emptyList()
    }

    // Draft filter state for the bottom sheet
    var draftCondition by remember(showFilterSheet) { mutableStateOf(state.filterCondition) }
    var draftSubcategory by remember(showFilterSheet) { mutableStateOf(state.filterSubcategory) }
    var draftPriceRange by remember(showFilterSheet) { mutableStateOf(state.filterMinPrice..state.filterMaxPrice) }

    // Sync ecosystem into ViewModel whenever it changes
    LaunchedEffect(ecosystemKey) { viewModel.setEcosystem(ecosystemKey) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column(verticalArrangement = Arrangement.Center) {
                        Text("All Posts", fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, color = MaterialTheme.colorScheme.primary)
                        if (ecosystemLabel != null) {
                            Text(ecosystemLabel, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                },
                actions = {
                    // Cart icon with badge
                    BadgedBox(badge = {
                        val cartCount = state.cartItems.size
                        if (cartCount > 0) Badge { Text("$cartCount") }
                    }) {
                        IconButton(onClick = onOpenCart) {
                            Icon(Icons.Outlined.ShoppingCart, contentDescription = "Cart")
                        }
                    }
                    // Notifications bell
                    BadgedBox(badge = { Badge() }) {
                        IconButton(onClick = onOpenNotifications) {
                            Icon(Icons.Outlined.Notifications, contentDescription = "Notifications")
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
            )
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            // Search bar + Filter button — always visible below TopAppBar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                OutlinedTextField(
                    value = state.searchQuery,
                    onValueChange = viewModel::onQueryChange,
                    singleLine = true,
                    placeholder = { Text("Search listings…", style = MaterialTheme.typography.bodyMedium) },
                    leadingIcon = { Icon(Icons.Default.Search, null, modifier = Modifier.size(20.dp)) },
                    trailingIcon = {
                        if (state.searchQuery.isNotBlank()) {
                            IconButton(onClick = { viewModel.clearSearch(); focusManager.clearFocus() }) {
                                Icon(Icons.Default.Close, null, modifier = Modifier.size(18.dp))
                            }
                        }
                    },
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                    keyboardActions = KeyboardActions(onSearch = { focusManager.clearFocus() }),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.weight(1f).height(48.dp),
                    textStyle = MaterialTheme.typography.bodyMedium,
                )
                // Filter button with active badge
                BadgedBox(badge = { if (state.hasActiveFilters) Badge(containerColor = Color(0xFFF59E0B)) }) {
                    FilledIconButton(
                        onClick = {
                            draftCondition = state.filterCondition
                            draftSubcategory = state.filterSubcategory
                            showFilterSheet = true
                        },
                        modifier = Modifier.size(48.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = IconButtonDefaults.filledIconButtonColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
                    ) {
                        Icon(Icons.Default.Tune, contentDescription = "Filters", tint = MaterialTheme.colorScheme.primary)
                    }
                }
            }

            Box(Modifier.fillMaxSize()) {
            PullToRefreshBox(
                isRefreshing = state.refreshing,
                onRefresh = { viewModel.refresh() },
                modifier = Modifier.fillMaxSize(),
            ) {
                AllPostsBrowse(
                    state = state,
                    wishlisted = wishlistedSet,
                    ecosystemSubcategories = ecosystemSubcategories,
                    onOpenPost = onOpenPost,
                    onToggleWishlist = viewModel::toggleWishlist,
                    onSetSort = viewModel::setSortBy,
                    onToggleCompare = viewModel::toggleCompare,
                    onToggleCart = viewModel::toggleCart,
                    onOpenCompare = onOpenCompare,
                    onSetQuickFilter = viewModel::setQuickFilter,
                    onToggleAutoRefresh = viewModel::toggleAutoRefresh,
                    onLoadMore = viewModel::loadMore,
                    onOpenSearch = onOpenSearch,
                    onSelectSubcategory = { sub ->
                        viewModel.setFilterSubcategory(if (state.filterSubcategory == sub) null else sub)
                    },
                    onInterested = { postId, postTitle ->
                        interestPostId = postId
                        interestPostTitle = postTitle
                        showInterestModal = true
                    },
                    onSetPriceRange = viewModel::setFilterPrice,
                )
            }
            // Free launch plan promo banner
            if (com.mhub.app.core.FreeLaunchPlan.isActive()) {
                Surface(
                    modifier = Modifier
                        .align(Alignment.TopCenter)
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    shape = RoundedCornerShape(12.dp),
                    color = Color(0xFFECFDF5),
                    shadowElevation = 4.dp,
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF10B981).copy(alpha = 0.4f)),
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        Text("🎉", fontSize = 18.sp)
                        Column(Modifier.weight(1f)) {
                            Text("Free Launch Offer", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFF065F46))
                            Text(
                                "Post & sell FREE until ${com.mhub.app.core.FreeLaunchPlan.endDateLabel()} — ${com.mhub.app.core.FreeLaunchPlan.daysRemaining()} days left!",
                                fontSize = 11.sp, color = Color(0xFF047857), lineHeight = 15.sp,
                            )
                        }
                        Surface(shape = RoundedCornerShape(8.dp), color = Color(0xFF059669)) {
                            Text("FREE", fontSize = 10.sp, fontWeight = FontWeight.ExtraBold, color = Color.White,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
                        }
                    }
                }
            }
            // Plan expiry / expired banner
            if (state.showPlanExpiryBanner) {
                val bannerColor = if (state.planExpired) Color(0xFFDC2626) else Color(0xFFF59E0B)
                val bannerBg = if (state.planExpired) Color(0xFFFEF2F2) else Color(0xFFFFFBEB)
                Surface(
                    modifier = Modifier
                        .align(Alignment.TopCenter)
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    shape = RoundedCornerShape(12.dp),
                    color = bannerBg,
                    shadowElevation = 6.dp,
                    border = androidx.compose.foundation.BorderStroke(1.dp, bannerColor.copy(alpha = 0.3f)),
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        Text(if (state.planExpired) "⚠️" else "🔔", fontSize = 18.sp)
                        Column(Modifier.weight(1f)) {
                            Text(
                                if (state.planExpired) "Your plan has expired" else "Plan expiring soon",
                                fontWeight = FontWeight.Bold, fontSize = 13.sp, color = bannerColor,
                            )
                            Text(
                                if (state.planExpired) "Renew your plan to post listings & access seller features."
                                else "Your plan expires on ${state.planExpiryDate}. Renew now to avoid interruption.",
                                fontSize = 11.sp, color = bannerColor.copy(alpha = 0.8f), lineHeight = 15.sp,
                            )
                        }
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp), horizontalAlignment = Alignment.End) {
                            Surface(shape = RoundedCornerShape(8.dp), color = bannerColor) {
                                Text("Renew", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp))
                            }
                            IconButton(onClick = viewModel::dismissPlanBanner, modifier = Modifier.size(20.dp)) {
                                Icon(Icons.Default.Close, null, tint = bannerColor.copy(alpha = 0.6f), modifier = Modifier.size(16.dp))
                            }
                        }
                    }
                }
            }
            // Error banner
            state.errorMessage?.let { err ->
                Surface(
                    modifier = Modifier
                        .align(Alignment.TopCenter)
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    shape = RoundedCornerShape(12.dp),
                    color = MaterialTheme.colorScheme.errorContainer,
                    shadowElevation = 4.dp,
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Text(err, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onErrorContainer, modifier = Modifier.weight(1f))
                        TextButton(onClick = { viewModel.retry() }) {
                            Text("Retry", color = MaterialTheme.colorScheme.error, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
            if (state.compareItems.isNotEmpty()) {
                Surface(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    shape = RoundedCornerShape(16.dp),
                    color = MaterialTheme.colorScheme.primaryContainer,
                    shadowElevation = 8.dp,
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Text(
                            "${state.compareItems.size} item${if (state.compareItems.size > 1) "s" else ""} selected",
                            style = MaterialTheme.typography.labelLarge,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onPrimaryContainer,
                        )
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedButton(onClick = viewModel::clearCompare) { Text("Clear") }
                            Button(
                                onClick = {
                                    state.compareItems.forEach { viewModel.addToCompare(it) }
                                    onOpenCompare()
                                },
                                enabled = state.compareItems.size >= 2,
                            ) { Text("Compare (${state.compareItems.size})") }
                        }
                    }
                }
            }
        }
        } // close inner Box
    } // close Column

    // Filter bottom sheet
    if (showFilterSheet) {
        ModalBottomSheet(
            onDismissRequest = { showFilterSheet = false },
            sheetState = filterSheetState,
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp)
                    .padding(bottom = 32.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Icon(Icons.Default.Tune, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(22.dp))
                        Text("Filters", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    }
                    if (state.hasActiveFilters) {
                        TextButton(onClick = { viewModel.clearFilters(); showFilterSheet = false }) {
                            Icon(Icons.Default.Close, null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("Clear All", style = MaterialTheme.typography.labelMedium)
                        }
                    }
                }
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)

                // Price range filter — enhanced with quick price chips
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    val minVal = draftPriceRange.start.toInt()
                    val maxVal = draftPriceRange.endInclusive.toInt()
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("💰 Price Range", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold)
                        Text("₹$minVal – ₹$maxVal", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary)
                    }
                    // Quick price chips
                    @OptIn(ExperimentalLayoutApi::class)
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        listOf("Under ₹1K" to (0f..1000f), "₹1K-5K" to (1000f..5000f), "₹5K-20K" to (5000f..20000f), "₹20K+" to (20000f..500000f)).forEach { (label, range) ->
                            val selected = draftPriceRange.start == range.start && draftPriceRange.endInclusive == range.endInclusive
                            FilterChip(
                                selected = selected,
                                onClick = { draftPriceRange = range },
                                label = { Text(label, fontSize = 10.sp) },
                                shape = RoundedCornerShape(16.dp),
                                modifier = Modifier.height(28.dp),
                            )
                        }
                    }
                    androidx.compose.material3.RangeSlider(
                        value = draftPriceRange,
                        onValueChange = { draftPriceRange = it },
                        valueRange = 0f..500000f,
                        steps = 99,
                    )
                }

                // Condition filter
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("📦 Condition", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold)
                    @OptIn(ExperimentalLayoutApi::class)
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        listOf("any" to "All", "new" to "Brand New", "like_new" to "Like New", "used" to "Used", "refurbished" to "Refurbished").forEach { (key, label) ->
                            FilterChip(
                                selected = draftCondition == key,
                                onClick = { draftCondition = key },
                                label = { Text(label, fontSize = 11.sp) },
                                colors = FilterChipDefaults.filterChipColors(selectedContainerColor = MaterialTheme.colorScheme.primary, selectedLabelColor = Color.White),
                                shape = RoundedCornerShape(16.dp),
                            )
                        }
                    }
                }

                // Posted within filter
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("🕐 Posted Within", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold)
                    @OptIn(ExperimentalLayoutApi::class)
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        listOf("any" to "Any time", "today" to "Today", "3d" to "3 days", "7d" to "This week", "30d" to "This month").forEach { (key, label) ->
                            FilterChip(
                                selected = false,
                                onClick = { if (key == "today") viewModel.setQuickFilter("today") },
                                label = { Text(label, fontSize = 11.sp) },
                                shape = RoundedCornerShape(16.dp),
                            )
                        }
                    }
                }

                // Seller type filter
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("👤 Seller Type", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("all" to "All Sellers", "verified" to "✓ Verified Only", "top_rated" to "⭐ Top Rated").forEach { (key, label) ->
                            FilterChip(
                                selected = false,
                                onClick = { if (key == "verified") viewModel.setQuickFilter("verified") },
                                label = { Text(label, fontSize = 11.sp) },
                                shape = RoundedCornerShape(16.dp),
                            )
                        }
                    }
                }

                // Location filter
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("📍 Location", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold)
                    var draftLocation by remember { mutableStateOf("") }
                    OutlinedTextField(
                        value = draftLocation,
                        onValueChange = { draftLocation = it },
                        placeholder = { Text("City or area…") },
                        singleLine = true,
                        leadingIcon = { Icon(Icons.Filled.LocationOn, null, modifier = Modifier.size(18.dp)) },
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth(),
                    )
                }

                // Subcategory filter (only when ecosystem is active)
                if (ecosystemSubcategories.isNotEmpty()) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("🏷️ Subcategory", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold)
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            items(ecosystemSubcategories.size) { idx ->
                                val sub = ecosystemSubcategories[idx]
                                FilterChip(
                                    selected = draftSubcategory == sub,
                                    onClick = { draftSubcategory = if (draftSubcategory == sub) null else sub },
                                    label = { Text(sub, style = MaterialTheme.typography.labelMedium) },
                                    colors = FilterChipDefaults.filterChipColors(selectedContainerColor = MaterialTheme.colorScheme.secondary, selectedLabelColor = Color.White),
                                    shape = RoundedCornerShape(16.dp),
                                )
                            }
                        }
                    }
                }

                Spacer(Modifier.height(4.dp))
                // Apply / Reset buttons row
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedButton(
                        onClick = { viewModel.clearFilters(); showFilterSheet = false },
                        modifier = Modifier.weight(1f).height(48.dp),
                        shape = RoundedCornerShape(12.dp),
                    ) {
                        Text("Reset", fontWeight = FontWeight.SemiBold)
                    }
                    Button(
                        onClick = {
                            viewModel.setFilterCondition(draftCondition)
                            viewModel.setFilterSubcategory(draftSubcategory)
                            viewModel.setFilterPrice(draftPriceRange.start, draftPriceRange.endInclusive)
                            showFilterSheet = false
                        },
                        modifier = Modifier.weight(2f).height(48.dp),
                        shape = RoundedCornerShape(12.dp),
                    ) {
                        Icon(Icons.Default.Check, null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Apply Filters", fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }
    }

    // Buyer Interest Modal (web parity: "Interested" button → contact seller)
    if (showInterestModal) {
        com.mhub.app.ui.components.BuyerInterestModal(
            postId = interestPostId,
            postTitle = interestPostTitle,
            onDismiss = { showInterestModal = false },
            onSubmit = { _, _, _ -> showInterestModal = false },
        )
    }
}

@Composable
private fun HeroPill(text: String) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(999.dp))
            .background(Color.White.copy(alpha = 0.18f))
            .padding(horizontal = 10.dp, vertical = 4.dp),
    ) {
        Text(text, color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Medium)
    }
}

private data class QuickFilterDef(val labelRes: Int, val icon: androidx.compose.ui.graphics.vector.ImageVector)

private val quickFilters = listOf(
    QuickFilterDef(R.string.explore_filter_new, Icons.Outlined.NewReleases),
    QuickFilterDef(R.string.explore_filter_trending, Icons.AutoMirrored.Filled.TrendingUp),
    QuickFilterDef(R.string.explore_filter_top_rated, Icons.Outlined.Star),
    QuickFilterDef(R.string.explore_filter_offers, Icons.Outlined.LocalOffer),
)

private data class BannerSlide(
    val gradientColors: List<Color>,
    val badge: String,
    val badgeIcon: String,
    val title: String,
    val subtitle: String,
    val ctaText: String,
    val emoji: String,
    val discount: String,
)

private val bannerSlides = listOf(
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
        gradientColors = listOf(Color(0xFF059669), Color(0xFF10B981), Color(0xFF34D399)),
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
)

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun GreatDealsBanner(onShopNow: () -> Unit) {
    val pagerState = rememberPagerState(pageCount = { bannerSlides.size })

    // Auto-scroll every 4 seconds
    LaunchedEffect(pagerState) {
        while (true) {
            kotlinx.coroutines.delay(4000)
            val nextPage = (pagerState.currentPage + 1) % bannerSlides.size
            pagerState.animateScrollToPage(nextPage)
        }
    }

    Column(
        modifier = Modifier.fillMaxWidth().padding(vertical = 10.dp),
    ) {
        HorizontalPager(
            state = pagerState,
            modifier = Modifier.fillMaxWidth(),
            pageSpacing = 12.dp,
            contentPadding = PaddingValues(horizontal = 16.dp),
        ) { page ->
            val slide = bannerSlides[page]
            Card(
                shape = RoundedCornerShape(20.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 6.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Brush.linearGradient(colors = slide.gradientColors))
                        .padding(20.dp),
                ) {
                    // Decorative circles
                    Box(
                        modifier = Modifier.size(80.dp).align(Alignment.TopEnd)
                            .offset(x = 20.dp, y = (-10).dp)
                            .background(Color.White.copy(alpha = 0.08f), CircleShape)
                    )
                    Box(
                        modifier = Modifier.size(50.dp).align(Alignment.BottomStart)
                            .offset(x = (-10).dp, y = 10.dp)
                            .background(Color.White.copy(alpha = 0.06f), CircleShape)
                    )
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(modifier = Modifier.weight(1f)) {
                            Surface(shape = RoundedCornerShape(20.dp), color = Color.White.copy(alpha = 0.15f)) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                                ) {
                                    Text(slide.badgeIcon, fontSize = 12.sp)
                                    Text(slide.badge, fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color.White, letterSpacing = 1.sp)
                                }
                            }
                            Spacer(Modifier.height(10.dp))
                            Text(slide.title, fontWeight = FontWeight.ExtraBold, fontSize = 22.sp, color = Color.White, lineHeight = 26.sp)
                            Spacer(Modifier.height(4.dp))
                            Text(slide.subtitle, fontSize = 13.sp, color = Color.White.copy(alpha = 0.85f), lineHeight = 18.sp)
                            Spacer(Modifier.height(14.dp))
                            Surface(onClick = onShopNow, shape = RoundedCornerShape(12.dp), color = Color.White, shadowElevation = 4.dp) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 18.dp, vertical = 10.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                                ) {
                                    Text(slide.ctaText, color = slide.gradientColors.first(), fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                    Icon(Icons.AutoMirrored.Filled.ArrowForward, null, modifier = Modifier.size(16.dp), tint = slide.gradientColors.first())
                                }
                            }
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(start = 12.dp)) {
                            Surface(shape = CircleShape, color = Color.White.copy(alpha = 0.15f), modifier = Modifier.size(72.dp)) {
                                Box(contentAlignment = Alignment.Center) { Text(slide.emoji, fontSize = 36.sp) }
                            }
                            Spacer(Modifier.height(6.dp))
                            Surface(shape = RoundedCornerShape(12.dp), color = Color(0xFFFBBF24)) {
                                Text(slide.discount, fontSize = 9.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFF78350F), modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
                            }
                        }
                    }
                }
            }
        }
        // Page indicators
        Row(
            modifier = Modifier.fillMaxWidth().padding(top = 10.dp),
            horizontalArrangement = Arrangement.Center,
        ) {
            repeat(bannerSlides.size) { idx ->
                val isSelected = pagerState.currentPage == idx
                Box(
                    modifier = Modifier
                        .padding(horizontal = 3.dp)
                        .size(if (isSelected) 8.dp else 6.dp)
                        .clip(CircleShape)
                        .background(if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant)
                )
            }
        }
    }
}


@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun AllPostsBrowse(
    state: ExploreState,
    wishlisted: Set<String>,
    ecosystemSubcategories: List<String>,
    onOpenPost: (String) -> Unit,
    onToggleWishlist: (String) -> Unit,
    onSetSort: (String) -> Unit,
    onToggleCompare: (String) -> Unit,
    onToggleCart: (String) -> Unit = {},
    onOpenCompare: () -> Unit = {},
    onSetQuickFilter: (String) -> Unit = {},
    onToggleAutoRefresh: () -> Unit = {},
    onLoadMore: () -> Unit,
    onOpenSearch: () -> Unit,
    onSelectSubcategory: (String) -> Unit = {},
    onInterested: (postId: String, postTitle: String) -> Unit = { _, _ -> },
    onSetPriceRange: (Float, Float) -> Unit = { _, _ -> },
) {
    val sortOptions = listOf(
        "newest" to "Newest", "popular" to "Popular",
        "price_asc" to "Price ↑", "price_desc" to "Price ↓",
    )
    var isGridView by remember { mutableStateOf(false) }
    val listState = rememberLazyListState()
    val shouldLoadMore by remember {
        derivedStateOf {
            val last = listState.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: return@derivedStateOf false
            last >= listState.layoutInfo.totalItemsCount - 3
        }
    }
    LaunchedEffect(shouldLoadMore) {
        if (shouldLoadMore && state.hasMore && !state.loadingMore && !state.loadingPosts && state.posts.isNotEmpty()) onLoadMore()
    }

    Box(Modifier.fillMaxSize()) {
    LazyColumn(state = listState, contentPadding = PaddingValues(bottom = if (state.compareItems.size >= 2) 150.dp else 100.dp)) {
        if (state.searchQuery.isNotBlank()) {
            if (state.isSearching) {
                item(key = "search_loading") {
                    Box(Modifier.fillMaxWidth().height(200.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                    }
                }
            } else if (state.searchResults.isEmpty()) {
                item(key = "search_empty") {
                    Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                        AppEmptyState(icon = Icons.Outlined.ImageNotSupported, title = "No results found", subtitle = "Try different keywords")
                    }
                }
            } else {
                items(state.searchResults, key = { it.stableId }) { post ->
                    AllPostCard(post = post, onClick = { onOpenPost(post.stableId) }, isWishlisted = wishlisted.contains(post.stableId), onToggleWishlist = { onToggleWishlist(post.stableId) }, isCompared = state.compareItems.contains(post.stableId), onToggleCompare = { onToggleCompare(post.stableId) }, isInCart = state.cartItems.contains(post.stableId), onToggleCart = { onToggleCart(post.stableId) }, onInterested = { onInterested(post.stableId, post.displayTitle) }, modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp).animateItem())
                }
            }
            return@LazyColumn
        }

        // Sticky sort + subcategory chips (don't scroll away)
        stickyHeader(key = "sticky_filters") {
            Surface(
                color = MaterialTheme.colorScheme.background,
                shadowElevation = 2.dp,
            ) {
                Column {
                    LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(vertical = 8.dp)) {
                        items(sortOptions.size) { idx ->
                            val (key, label) = sortOptions[idx]
                            val isSelected = state.sortBy == key
                            FilterChip(selected = isSelected, onClick = { onSetSort(key) }, label = { Text(label, style = MaterialTheme.typography.labelMedium) }, colors = FilterChipDefaults.filterChipColors(selectedContainerColor = MaterialTheme.colorScheme.primary, selectedLabelColor = Color.White), shape = RoundedCornerShape(20.dp))
                        }
                        item {
                            // Grid/List view toggle (web parity)
                            IconButton(onClick = { isGridView = !isGridView }, modifier = Modifier.size(32.dp)) {
                                Icon(if (isGridView) Icons.AutoMirrored.Filled.ViewList else Icons.Default.GridView, null, modifier = Modifier.size(20.dp), tint = MaterialTheme.colorScheme.primary)
                            }
                        }
                    }
                    if (ecosystemSubcategories.isNotEmpty()) {
                        LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(bottom = 6.dp)) {
                            items(ecosystemSubcategories.size) { idx ->
                                val sub = ecosystemSubcategories[idx]
                                val isSelected = state.filterSubcategory == sub
                                FilterChip(
                                    selected = isSelected,
                                    onClick = { onSelectSubcategory(sub) },
                                    label = { Text(sub, style = MaterialTheme.typography.labelMedium) },
                                    colors = FilterChipDefaults.filterChipColors(selectedContainerColor = MaterialTheme.colorScheme.secondary, selectedLabelColor = Color.White, containerColor = MaterialTheme.colorScheme.surface),
                                    border = FilterChipDefaults.filterChipBorder(borderColor = MaterialTheme.colorScheme.outlineVariant, enabled = true, selected = isSelected),
                                    shape = RoundedCornerShape(20.dp),
                                )
                            }
                        }
                    }
                }
            }
        }

        item(key = "quick_filters") {
            LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(bottom = 8.dp)) {
                items(quickFilters.size) { idx ->
                    val f = quickFilters[idx]
                    FilterChip(selected = false, onClick = { onOpenSearch() }, label = { Text(stringResource(f.labelRes), style = MaterialTheme.typography.labelMedium) }, leadingIcon = { Icon(f.icon, null, modifier = Modifier.size(16.dp), tint = Color(0xFF2563EB)) }, colors = FilterChipDefaults.filterChipColors(containerColor = Color.White), border = FilterChipDefaults.filterChipBorder(borderColor = Color(0xFFE2E8F0), enabled = true, selected = false), shape = RoundedCornerShape(20.dp))
                }
                val priceRanges = listOf(
                    Triple(R.string.explore_price_under_1k, 0f, 1000f),
                    Triple(R.string.explore_price_1k_5k, 1000f, 5000f),
                    Triple(R.string.explore_price_5k_20k, 5000f, 20000f),
                    Triple(R.string.explore_price_above_20k, 20000f, 500000f),
                )
                items(priceRanges.size) { idx ->
                    val (labelRes, minP, maxP) = priceRanges[idx]
                    val isActive = state.filterMinPrice == minP && state.filterMaxPrice == maxP
                    FilterChip(
                        selected = isActive,
                        onClick = { if (isActive) onSetPriceRange(0f, 500000f) else onSetPriceRange(minP, maxP) },
                        label = { Text(stringResource(labelRes), style = MaterialTheme.typography.labelSmall) },
                        leadingIcon = { Text("₹", style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold), color = if (isActive) Color.White else Color(0xFF22C55E)) },
                        colors = FilterChipDefaults.filterChipColors(containerColor = Color(0xFFF0FDF4), selectedContainerColor = Color(0xFF059669), selectedLabelColor = Color.White),
                        border = FilterChipDefaults.filterChipBorder(borderColor = Color(0xFFBBF7D0), enabled = true, selected = isActive),
                        shape = RoundedCornerShape(20.dp),
                    )
                }
                // Extra quick-filter chips: Latest 5, Latest 10, Posted Today, Near Me, Verified Only
                val extraFilters = listOf(
                    "latest5" to ("Latest 5" to "🕐"),
                    "latest10" to ("Latest 10" to "🕐"),
                    "today" to ("Posted Today" to "📅"),
                    "nearme" to ("Near Me" to "📍"),
                    "verified" to ("Verified Only" to "✅"),
                    "shuffle" to ("Shuffle" to "🔀"),
                )
                items(extraFilters.size) { idx ->
                    val (key, labelPair) = extraFilters[idx]
                    val (label, emoji) = labelPair
                    val isActive = state.quickFilter == key
                    FilterChip(
                        selected = isActive,
                        onClick = { onSetQuickFilter(key) },
                        label = { Text(label, style = MaterialTheme.typography.labelSmall) },
                        leadingIcon = { Text(emoji, fontSize = 12.sp) },
                        colors = FilterChipDefaults.filterChipColors(containerColor = Color(0xFFF8FAFC), selectedContainerColor = Color(0xFF3B82F6), selectedLabelColor = Color.White),
                        border = FilterChipDefaults.filterChipBorder(borderColor = if (isActive) Color(0xFF3B82F6) else Color(0xFFE2E8F0), enabled = true, selected = isActive),
                        shape = RoundedCornerShape(20.dp),
                    )
                }
            }
        }

        item(key = "banner") { GreatDealsBanner(onShopNow = onOpenSearch) }

        if (state.loadingPosts && state.posts.isEmpty()) {
            items(6, key = { "shimmer_$it" }) { i ->
                com.mhub.app.ui.components.ListCardShimmer(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp)
                )
            }
        } else if (!state.loadingPosts && state.posts.isEmpty()) {
            item(key = "empty") {
                Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                    AppEmptyState(icon = Icons.Outlined.ImageNotSupported, title = "No listings found", subtitle = "Try a different category or filter")
                }
            }
        } else {
            if (isGridView) {
                // 2-column grid view (web parity)
                val chunked = state.posts.chunked(2)
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
                                        // Wishlist icon overlay (top-right)
                                        val isWished = wishlisted.contains(post.stableId)
                                        Icon(
                                            if (isWished) Icons.Default.Favorite else Icons.Outlined.FavoriteBorder,
                                            contentDescription = null,
                                            tint = if (isWished) Color(0xFFEF4444) else androidx.compose.ui.graphics.Color.White,
                                            modifier = Modifier
                                                .align(Alignment.TopEnd)
                                                .padding(8.dp)
                                                .size(20.dp)
                                                .clickable { onToggleWishlist(post.stableId) },
                                        )
                                    }
                                    Column(Modifier.padding(8.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                        Text(post.displayTitle, maxLines = 2, overflow = TextOverflow.Ellipsis, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold)
                                        post.price?.let { Text("₹${"%,.0f".format(it)}", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = MaterialTheme.colorScheme.primary) }
                                        post.location?.let { loc ->
                                            Row(verticalAlignment = Alignment.CenterVertically) {
                                                Icon(Icons.Default.LocationOn, null, modifier = Modifier.size(10.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                                Text(loc, fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                            }
                                        }
                                        post.viewCount?.let { v ->
                                            Row(verticalAlignment = Alignment.CenterVertically) {
                                                Icon(Icons.Default.Visibility, null, modifier = Modifier.size(10.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                                Text(" $v views", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
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
                items(state.posts, key = { it.stableId }) { post ->
                    AllPostCard(post = post, onClick = { onOpenPost(post.stableId) }, isWishlisted = wishlisted.contains(post.stableId), onToggleWishlist = { onToggleWishlist(post.stableId) }, isCompared = state.compareItems.contains(post.stableId), onToggleCompare = { onToggleCompare(post.stableId) }, isInCart = state.cartItems.contains(post.stableId), onToggleCart = { onToggleCart(post.stableId) }, onInterested = { onInterested(post.stableId, post.displayTitle) }, modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp).animateItem())
                }
            }
            item(key = "load_more") {
                if (state.loadingMore) {
                    Box(Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(modifier = Modifier.size(24.dp), color = MaterialTheme.colorScheme.primary)
                    }
                } else if (!state.hasMore && state.posts.isNotEmpty()) {
                    Box(Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) {
                        Text("You've seen all listings", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
    }
    // Floating Compare Panel — appears when ≥2 items selected (web parity)
    if (state.compareItems.size >= 2) {
        Surface(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .padding(12.dp),
            shape = RoundedCornerShape(16.dp),
            color = Color(0xFF1E293B),
            shadowElevation = 8.dp,
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Column {
                    Text("${state.compareItems.size} items selected", fontWeight = FontWeight.SemiBold, color = Color.White, fontSize = 13.sp)
                    Text("Tap Compare to see side-by-side", fontSize = 11.sp, color = Color(0xFF94A3B8))
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(
                        onClick = { state.compareItems.forEach { onToggleCompare(it) } },
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
                        border = BorderStroke(1.dp, Color(0xFF475569)),
                    ) {
                        Text("Clear", fontSize = 12.sp)
                    }
                    Button(
                        onClick = onOpenCompare,
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6366F1)),
                    ) {
                        Text("Compare Now", fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }
    }
    } // end Box
}

@Composable
private fun CategoryCard(
    category: Category,
    tint: Color,
    emoji: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(
        onClick = onClick,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = tint),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        modifier = modifier,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Text(
                text = emoji,
                style = MaterialTheme.typography.headlineSmall,
            )
            Text(
                text = category.displayName,
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.SemiBold,
                textAlign = TextAlign.Center,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                color = MaterialTheme.colorScheme.onBackground,
            )
        }
    }
}

@Composable
private fun AllPostCard(
    post: Post,
    onClick: () -> Unit,
    isWishlisted: Boolean = false,
    onToggleWishlist: () -> Unit = {},
    isCompared: Boolean = false,
    onToggleCompare: () -> Unit = {},
    onInterested: () -> Unit = {},
    isOwner: Boolean = false,
    onPromote: () -> Unit = {},
    isInCart: Boolean = false,
    onToggleCart: () -> Unit = {},
    modifier: Modifier = Modifier,
) {
    var showFullDescription by remember { mutableStateOf(false) }
    var localLiked by remember { mutableStateOf(false) }
    val context = LocalContext.current

    Card(
        onClick = onClick,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        modifier = modifier.fillMaxWidth(),
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            // Author row
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                val initial = (post.userName?.firstOrNull() ?: post.sellerName?.firstOrNull() ?: 'M').uppercaseChar().toString()
                Box(
                    modifier = Modifier.size(40.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primaryContainer),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(initial, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary, fontSize = 16.sp)
                }
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = post.userName ?: post.sellerName ?: "Community member",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(
                            text = post.location ?: "MHub network",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        post.createdAt?.take(10)?.let { date ->
                            Text("·", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 10.sp)
                            Text(date, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                    // Seller rating stars — derived from likeCount as proxy
                    val likeRating = (post.likeCount ?: 0).coerceIn(0, 200)
                    if (likeRating > 0) {
                        val stars = ((likeRating / 40.0) + 3.0).coerceIn(3.0, 5.0)
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                            repeat(5) { star ->
                                Text(if (star < stars.toInt()) "★" else "☆", fontSize = 10.sp, color = if (star < stars.toInt()) Color(0xFFF59E0B) else Color(0xFFCBD5E1))
                            }
                            Text("${"%,.1f".format(stars)}", fontSize = 10.sp, color = Color(0xFF94A3B8), fontWeight = FontWeight.Medium)
                        }
                    }
                }
                // 3-dot menu (top right corner)
                var showPostMenu by remember { mutableStateOf(false) }
                Box {
                    IconButton(onClick = { showPostMenu = true }, modifier = Modifier.size(32.dp)) {
                        Icon(Icons.Default.MoreVert, contentDescription = "More options", tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(20.dp))
                    }
                    androidx.compose.material3.DropdownMenu(expanded = showPostMenu, onDismissRequest = { showPostMenu = false }) {
                        androidx.compose.material3.DropdownMenuItem(
                            text = { Text(if (isCompared) "Remove from Compare" else "Compare") },
                            leadingIcon = { Icon(Icons.Default.Compare, null, modifier = Modifier.size(18.dp)) },
                            onClick = { showPostMenu = false; onToggleCompare() },
                        )
                        androidx.compose.material3.DropdownMenuItem(
                            text = { Text(if (isWishlisted) "Remove from Wishlist" else "Add to Wishlist") },
                            leadingIcon = { Icon(if (isWishlisted) Icons.Default.Bookmark else Icons.Outlined.BookmarkBorder, null, modifier = Modifier.size(18.dp)) },
                            onClick = { showPostMenu = false; onToggleWishlist() },
                        )
                        androidx.compose.material3.DropdownMenuItem(
                            text = { Text("Share") },
                            leadingIcon = { Icon(Icons.Outlined.Share, null, modifier = Modifier.size(18.dp)) },
                            onClick = {
                                showPostMenu = false
                                val shareIntent = Intent(Intent.ACTION_SEND).apply { type = "text/plain"; putExtra(Intent.EXTRA_TEXT, "Check out ${post.displayTitle} on MHub!") }
                                context.startActivity(Intent.createChooser(shareIntent, "Share via"))
                            },
                        )
                        androidx.compose.material3.DropdownMenuItem(
                            text = { Text(if (isInCart) "Remove from Cart" else "Add to Cart") },
                            leadingIcon = { Icon(if (isInCart) Icons.Default.RemoveShoppingCart else Icons.Outlined.ShoppingCart, null, modifier = Modifier.size(18.dp), tint = if (isInCart) Color(0xFFEF4444) else MaterialTheme.colorScheme.onSurfaceVariant) },
                            onClick = { showPostMenu = false; onToggleCart() },
                        )
                        if (isOwner) {
                            androidx.compose.material3.DropdownMenuItem(
                                text = { Text("Promote") },
                                leadingIcon = { Icon(Icons.AutoMirrored.Filled.TrendingUp, null, modifier = Modifier.size(18.dp), tint = Color(0xFFF59E0B)) },
                                onClick = { showPostMenu = false; onPromote() },
                            )
                        }
                        androidx.compose.material3.DropdownMenuItem(
                            text = { Text("Report") },
                            leadingIcon = { Icon(Icons.Outlined.Flag, null, modifier = Modifier.size(18.dp)) },
                            onClick = { showPostMenu = false },
                        )
                    }
                }
            }

            // Title
            Text(
                text = post.displayTitle,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )

            // Category + subcategory tags
            if (!post.category.isNullOrBlank()) {
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Surface(shape = RoundedCornerShape(12.dp), color = Color(0xFF3B82F6).copy(alpha = 0.15f)) {
                        Text(post.category, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF3B82F6), modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
                    }
                    post.subcategory?.let { sub ->
                        Surface(shape = RoundedCornerShape(12.dp), color = Color(0xFF10B981).copy(alpha = 0.15f)) {
                            Text(sub, fontSize = 11.sp, fontWeight = FontWeight.Medium, color = Color(0xFF10B981), modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
                        }
                    }
                }
            }

            // Description
            if (!post.description.isNullOrBlank()) {
                Column {
                    Text(
                        text = post.description,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = if (showFullDescription) Int.MAX_VALUE else 3,
                        overflow = if (showFullDescription) TextOverflow.Visible else TextOverflow.Ellipsis,
                    )
                    if (post.description.length > 120) {
                        Text(
                            text = if (showFullDescription) "Show less" else "Read more",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.primary,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.clickable { showFullDescription = !showFullDescription }.padding(top = 4.dp),
                        )
                    }
                }
            }

            // Image with promo badges, price, HOT, condition overlays
            if (post.primaryImage != null) {
                Box(Modifier.fillMaxWidth().height(220.dp)) {
                    AsyncImage(
                        model = post.primaryImage,
                        contentDescription = post.displayTitle,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(12.dp)),
                    )
                    // Price badge — bottom-left
                    post.price?.let { price ->
                        Surface(
                            Modifier.align(Alignment.BottomStart).padding(8.dp),
                            shape = RoundedCornerShape(8.dp),
                            color = Color(0xFF1E293B).copy(alpha = 0.85f),
                        ) {
                            Column(Modifier.padding(horizontal = 10.dp, vertical = 4.dp)) {
                                Text("₹${"%,.0f".format(price)}", fontWeight = FontWeight.ExtraBold, fontSize = 14.sp, color = Color.White)
                                val origPrice = post.originalPrice
                                if (origPrice != null && origPrice > price) {
                                    val pct = ((origPrice - price) / origPrice * 100).toInt()
                                    Text("₹${"%,.0f".format(origPrice)}  -$pct%", fontSize = 10.sp, color = Color(0xFFFBBF24), textDecoration = androidx.compose.ui.text.style.TextDecoration.LineThrough.let { TextDecoration.None })
                                }
                            }
                        }
                    }
                    // HOT badge — top-right for high-view items
                    val viewCount = post.viewCount ?: 0
                    if (viewCount > 50) {
                        Surface(
                            Modifier.align(Alignment.TopEnd).padding(8.dp),
                            shape = RoundedCornerShape(8.dp),
                            color = Color(0xFFEF4444),
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(3.dp),
                            ) {
                                Text("🔥", fontSize = 10.sp)
                                Text("HOT", fontSize = 10.sp, fontWeight = FontWeight.ExtraBold, color = Color.White)
                            }
                        }
                    }
                    // Top-left badges column: Promo badge stacked above condition
                    Column(
                        Modifier.align(Alignment.TopStart).padding(8.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        // Tier badge (Premium/Silver/Standard)
                        val tierLabel = when {
                            post.isPremium == true || post.tierPriority != null && post.tierPriority!! >= 3
                                || post.tier?.lowercase() == "premium" -> "PREMIUM" to Color(0xFFF59E0B)
                            post.tier?.lowercase() == "silver" -> "SILVER" to Color(0xFF94A3B8)
                            else -> null
                        }
                        tierLabel?.let { (label, color) ->
                            Surface(shape = RoundedCornerShape(6.dp), color = color) {
                                Row(
                                    Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(3.dp),
                                ) {
                                    Text("👑", fontSize = 8.sp)
                                    Text(label, fontSize = 9.sp, fontWeight = FontWeight.ExtraBold, color = Color.White)
                                }
                            }
                        }
                        // Promo badge: Spotlight → Featured → Boosted → Sponsored
                        val boostLevel = post.boostLevel ?: 0
                        val promoLabel = post.promoLabel?.lowercase() ?: ""
                        val (promoBadgeLabel, promoBadgeColor) = when {
                            boostLevel >= 3 || promoLabel.contains("spotlight") ->
                                "⭐ SPOTLIGHT" to Color(0xFFF97316)
                            boostLevel == 2 || promoLabel.contains("featured") ->
                                "✨ FEATURED" to Color(0xFF7C3AED)
                            boostLevel == 1 || promoLabel.contains("boost") ->
                                "⚡ BOOSTED" to Color(0xFF10B981)
                            post.isPromoted == true || promoLabel.contains("sponsor") ->
                                "AD" to Color(0xFF2563EB)
                            else -> null to null
                        }
                        if (promoBadgeLabel != null && promoBadgeColor != null) {
                            Surface(shape = RoundedCornerShape(6.dp), color = promoBadgeColor.copy(alpha = 0.92f)) {
                                Text(promoBadgeLabel, fontSize = 9.sp, fontWeight = FontWeight.ExtraBold, color = Color.White, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                            }
                        }
                        // Condition badge
                        post.condition?.let { cond ->
                            val (condColor, condLabel) = when (cond.lowercase()) {
                                "new" -> Color(0xFF10B981) to "NEW"
                                "like new", "like_new" -> Color(0xFF3B82F6) to "LIKE NEW"
                                "good" -> Color(0xFFF59E0B) to "GOOD"
                                "fair" -> Color(0xFFEA580C) to "FAIR"
                                else -> Color(0xFF6366F1) to cond.uppercase().take(8)
                            }
                            Surface(shape = RoundedCornerShape(6.dp), color = condColor) {
                                Text(condLabel, fontSize = 9.sp, fontWeight = FontWeight.ExtraBold, color = Color.White, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                            }
                        }
                        // Flash Sale badge
                        if (post.isFlashSale == true) {
                            Surface(shape = RoundedCornerShape(6.dp), color = Color(0xFFDC2626)) {
                                Text("🔥 FLASH SALE", fontSize = 9.sp, fontWeight = FontWeight.ExtraBold, color = Color.White, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                            }
                        }
                        // Negotiable badge
                        if (post.isNegotiable == true || post.pricingType?.lowercase()?.contains("negoti") == true) {
                            Surface(shape = RoundedCornerShape(6.dp), color = Color(0xFF059669)) {
                                Text("✋ NEGOTIABLE", fontSize = 9.sp, fontWeight = FontWeight.ExtraBold, color = Color.White, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                            }
                        }
                    }
                }
            }

            // Engagement bar: pill-style (web parity)
            @OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)
            androidx.compose.foundation.layout.FlowRow(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                // Like pill
                Surface(shape = RoundedCornerShape(20.dp), color = if (localLiked) Color(0xFFEF4444).copy(alpha = 0.12f) else MaterialTheme.colorScheme.surfaceVariant, modifier = Modifier.clickable { localLiked = !localLiked }) {
                    Row(Modifier.padding(horizontal = 10.dp, vertical = 5.dp), horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(if (localLiked) Icons.Default.Favorite else Icons.Outlined.FavoriteBorder, null, tint = if (localLiked) Color(0xFFEF4444) else MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(14.dp))
                        Text(if (localLiked) "Liked" else "Like", fontSize = 11.sp, fontWeight = FontWeight.Medium, color = if (localLiked) Color(0xFFEF4444) else MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                // Interested pill (web parity: FaHandHoldingHeart "Interested" button)
                Surface(shape = RoundedCornerShape(20.dp), color = Color(0xFF059669).copy(alpha = 0.12f), modifier = Modifier.clickable { onInterested() }) {
                    Row(Modifier.padding(horizontal = 10.dp, vertical = 5.dp), horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Outlined.Star, null, tint = Color(0xFF059669), modifier = Modifier.size(14.dp))
                        Text("Interested", fontSize = 11.sp, fontWeight = FontWeight.Medium, color = Color(0xFF059669))
                    }
                }
                // Compare pill (web parity: CompareIcon "Compare" dropdown item)
                Surface(shape = RoundedCornerShape(20.dp), color = if (isCompared) Color(0xFF6366F1).copy(alpha = 0.18f) else MaterialTheme.colorScheme.surfaceVariant, modifier = Modifier.clickable { onToggleCompare() }) {
                    Row(Modifier.padding(horizontal = 10.dp, vertical = 5.dp), horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Compare, null, tint = if (isCompared) Color(0xFF6366F1) else MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(14.dp))
                        Text(if (isCompared) "In Compare" else "Compare", fontSize = 11.sp, fontWeight = FontWeight.Medium, color = if (isCompared) Color(0xFF6366F1) else MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                // Share pill
                Surface(shape = RoundedCornerShape(20.dp), color = MaterialTheme.colorScheme.surfaceVariant, modifier = Modifier.clickable {
                    val shareIntent = Intent(Intent.ACTION_SEND).apply { type = "text/plain"; putExtra(Intent.EXTRA_TEXT, "Check out ${post.displayTitle} on MHub!") }
                    context.startActivity(Intent.createChooser(shareIntent, "Share via"))
                }) {
                    Row(Modifier.padding(horizontal = 10.dp, vertical = 5.dp), horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Outlined.Share, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(14.dp))
                        Text("Share", fontSize = 11.sp, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                // Save pill
                Surface(shape = RoundedCornerShape(20.dp), color = if (isWishlisted) Color(0xFF6366F1).copy(alpha = 0.12f) else MaterialTheme.colorScheme.surfaceVariant, modifier = Modifier.clickable { onToggleWishlist() }) {
                    Row(Modifier.padding(horizontal = 10.dp, vertical = 5.dp), horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(if (isWishlisted) Icons.Default.Bookmark else Icons.Outlined.BookmarkBorder, null, tint = if (isWishlisted) Color(0xFF6366F1) else MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(14.dp))
                        Text(if (isWishlisted) "Saved" else "Save", fontSize = 11.sp, fontWeight = FontWeight.Medium, color = if (isWishlisted) Color(0xFF6366F1) else MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                // Views pill
                post.viewCount?.takeIf { it > 0 }?.let { v ->
                    Surface(shape = RoundedCornerShape(20.dp), color = MaterialTheme.colorScheme.surfaceVariant) {
                        Row(Modifier.padding(horizontal = 10.dp, vertical = 5.dp), horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Visibility, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(14.dp))
                            Text("$v", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
                Spacer(Modifier.weight(1f))
                // View Details CTA
                Surface(shape = RoundedCornerShape(20.dp), color = Color(0xFF6366F1).copy(alpha = 0.1f), modifier = Modifier.clickable(onClick = onClick)) {
                    Row(Modifier.padding(horizontal = 12.dp, vertical = 5.dp), horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Visibility, null, tint = Color(0xFF6366F1), modifier = Modifier.size(14.dp))
                        Text("View Details", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF6366F1))
                    }
                }
            }
        }
    }
}

@Composable
private fun TrendingCard(
    post: Post,
    onClick: () -> Unit,
    isWishlisted: Boolean = false,
    onToggleWishlist: () -> Unit = {},
    onAddToCompare: () -> Unit = {},
    modifier: Modifier = Modifier.width(170.dp),
) {
    Card(
        onClick = onClick,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp, pressedElevation = 1.dp),
        modifier = modifier,
    ) {
        Column {
            // Image with overlays
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(160.dp)
                    .clip(RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant),
                contentAlignment = Alignment.Center,
            ) {
                if (post.primaryImage != null) {
                    AsyncImage(
                        model = post.primaryImage,
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize(),
                    )
                } else {
                    Icon(Icons.Outlined.ImageNotSupported, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                // Price badge overlay
                post.price?.let {
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = Color(0xFF0F172A).copy(alpha = 0.82f),
                        modifier = Modifier.align(Alignment.BottomStart).padding(8.dp),
                    ) {
                        Text(
                            "₹${"%,.0f".format(it)}",
                            color = Color.White,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        )
                    }
                }
                // Condition badge (top-start)
                post.condition?.let { cond ->
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = if (cond.lowercase().contains("new")) Color(0xFF10B981).copy(alpha = 0.9f) else Color(0xFFF59E0B).copy(alpha = 0.9f),
                        modifier = Modifier.align(Alignment.TopStart).padding(8.dp),
                    ) {
                        Text(
                            cond,
                            color = Color.White,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                        )
                    }
                }
                // Heart + Compare overlay (top-end)
                Row(
                    modifier = Modifier.align(Alignment.TopEnd).padding(6.dp),
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    Surface(
                        shape = CircleShape,
                        color = Color.Black.copy(alpha = 0.5f),
                        modifier = Modifier.size(28.dp),
                        onClick = onToggleWishlist,
                    ) {
                        Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                            Icon(
                                if (isWishlisted) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder,
                                contentDescription = null,
                                tint = if (isWishlisted) Color(0xFFEF4444) else Color.White,
                                modifier = Modifier.size(14.dp),
                            )
                        }
                    }
                    Surface(
                        shape = CircleShape,
                        color = Color.Black.copy(alpha = 0.5f),
                        modifier = Modifier.size(28.dp),
                        onClick = onAddToCompare,
                    ) {
                        Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                            Icon(Icons.Filled.Compare, contentDescription = null, tint = Color.White, modifier = Modifier.size(14.dp))
                        }
                    }
                }
            }
            // Content area
            Column(
                modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Text(
                    text = post.displayTitle,
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    color = MaterialTheme.colorScheme.onSurface,
                )
                // Seller row
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    Surface(shape = CircleShape, color = Color(0xFF6366F1).copy(alpha = 0.15f), modifier = Modifier.size(18.dp)) {
                        Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                            Text((post.sellerName ?: post.userName ?: "?").take(1).uppercase(), fontSize = 9.sp, fontWeight = FontWeight.Bold, color = Color(0xFF6366F1))
                        }
                    }
                    Text(
                        post.sellerName ?: post.userName ?: "Seller",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f, fill = false),
                    )
                }
                // Location + views
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    post.location?.let { loc ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.LocationOn, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(10.dp))
                            Text(loc, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.widthIn(max = 70.dp))
                        }
                    }
                    post.viewCount?.let { views ->
                        if (views > 0) Text("$views views", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
    }
}

@Composable
private fun SearchResults(
    loading: Boolean,
    posts: List<Post>,
    onOpenPost: (String) -> Unit,
) {
    when {
        loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
        }
        posts.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            AppEmptyState(
                icon = Icons.Default.Search,
                title = "No results found",
                subtitle = "Try a shorter or different search term.",
            )
        }
        else -> LazyColumn(
            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            items(posts, key = { it.stableId }) { post ->
                SearchResultCard(post = post, onClick = { onOpenPost(post.stableId) })
            }
        }
    }
}

@Composable
private fun SearchResultCard(post: Post, onClick: () -> Unit) {
    Card(
        onClick = onClick,
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(12.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(72.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant),
                contentAlignment = Alignment.Center,
            ) {
                if (post.primaryImage != null) {
                    AsyncImage(
                        model = post.primaryImage,
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize(),
                    )
                } else {
                    Icon(Icons.Outlined.Category, contentDescription = null)
                }
            }
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(
                    text = post.displayTitle,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                post.price?.let {
                    Text(
                        text = "₹${"%,.0f".format(it)}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Bold,
                    )
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    post.categoryName?.let { cat ->
                        Surface(
                            shape = RoundedCornerShape(4.dp),
                            color = MaterialTheme.colorScheme.primaryContainer,
                        ) {
                            Text(
                                text = cat,
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onPrimaryContainer,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 1.dp),
                            )
                        }
                        Spacer(Modifier.width(6.dp))
                    }
                    post.location?.let { loc ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Default.LocationOn,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(12.dp),
                            )
                            Text(
                                text = loc,
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
            }
        }
    }
}
