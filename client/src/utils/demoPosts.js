/**
 * Demo / mock post data for testing the AllPosts page when the backend
 * is unavailable (e.g. during Demo Login).  These posts span multiple
 * categories, subcategories, prices, conditions, and locations so that
 * sorting / filtering / category selection can be exercised without a
 * live backend.
 */

const NOW = Date.now();
const DAY = 86_400_000;

const MOCK_CATEGORIES = {
  Electronics: { id: "1", name: "Electronics" },
  Mobiles:     { id: "2", name: "Mobiles" },
  Fashion:     { id: "3", name: "Fashion" },
  Furniture:   { id: "4", name: "Furniture" },
  Vehicles:    { id: "5", name: "Vehicles" },
  Books:       { id: "6", name: "Books" },
  Beauty:      { id: "7", name: "Beauty" },
  Sports:      { id: "8", name: "Sports" },
  "Home Appliances": { id: "9", name: "Home Appliances" },
  Grocery:     { id: "10", name: "Grocery" },
};

const MOCK_SUBCATEGORIES = {
  Electronics: [
    { id: "11",  name: "Laptops",         category_id: "1" },
    { id: "12",  name: "Headphones",      category_id: "1" },
    { id: "13",  name: "Cameras",         category_id: "1" },
  ],
  Mobiles: [
    { id: "14",  name: "Smartphones",     category_id: "2" },
    { id: "15",  name: "Accessories",     category_id: "2" },
    { id: "16",  name: "Tablets",         category_id: "2" },
  ],
  Fashion: [
    { id: "17",  name: "Men",             category_id: "3" },
    { id: "18",  name: "Women",           category_id: "3" },
    { id: "19",  name: "Kids",            category_id: "3" },
  ],
  Beauty: [
    { id: "20",  name: "Makeup",          category_id: "7" },
    { id: "21",  name: "Skincare",        category_id: "7" },
    { id: "22",  name: "Hair Care",       category_id: "7" },
  ],
};

const USERS = [
  { id: "u1", name: "Rahul Sharma",  phone: "9876543210", city: "Mumbai" },
  { id: "u2", name: "Priya Singh",   phone: "9988776655", city: "Delhi" },
  { id: "u3", name: "Amit Verma",    phone: "9123456789", city: "Bangalore" },
  { id: "u4", name: "Neha Gupta",    phone: "8877665544", city: "Pune" },
  { id: "u5", name: "Vikram Patel",  phone: "7766554433", city: "Chennai" },
];

const LOCATIONS = [
  "Mumbai, Maharashtra",
  "Delhi, Delhi",
  "Bangalore, Karnataka",
  "Pune, Maharashtra",
  "Chennai, Tamil Nadu",
  "Hyderabad, Telangana",
  "Kolkata, West Bengal",
  "Jaipur, Rajasthan",
  "Ahmedabad, Gujarat",
  "Lucknow, Uttar Pradesh",
];

const CONDITIONS = ["New", "Like New", "Good", "Fair"];

const TITLES_BY_CATEGORY = {
  Electronics: [
    "Dell XPS 15 Laptop – 2023 Model",
    "Sony WH-1000XM5 Wireless Headphones",
    "Canon EOS R6 Mirrorless Camera",
    "Samsung 27'' 4K Monitor",
    "Logitech MX Master 3S Mouse",
    "MacBook Air M2 – 16GB RAM",
    "Bose QuietComfort Earbuds II",
    "iPad Pro 12.9'' M2 Chip",
  ],
  Mobiles: [
    "iPhone 15 Pro Max 256GB – Deep Purple",
    "Samsung Galaxy S24 Ultra",
    "OnePlus 12 5G – 16GB RAM",
    "Google Pixel 8 Pro",
    "Nothing Phone 2",
    "Realme GT 5G",
    "Xiaomi 14 Pro",
    "Motorola Edge 40 Pro",
  ],
  Fashion: [
    "Levi's Denim Jacket – Size M",
    "Nike Air Force 1 – White",
    "H&M Linen Shirt – Size L",
    "Ray-Ban Aviator Sunglasses",
    "Zara Formal Blazer – Size 40",
    "Adidas Ultraboost Running Shoes",
    "Tommy Hilfiger Polo T-Shirt",
    "Titan Raga Gold Watch",
  ],
  Beauty: [
    "Maybelline Foundation – 128 Warm Nude",
    "L'Oreal Paris Serum – 30ml",
    "Nyx Professional Makeup Palette",
    "Cetaphil Gentle Skin Cleanser",
    "The Ordinary Niacinamide 10%",
    "M.A.C Lipstick – Ruby Woo",
    "Forest Essentials Face Wash",
    "Biotique Hair Oil – 200ml",
  ],
};

const PRICES = [
  { price: 89999,  min: 50000,  max: 150000 },
  { price: 24999,  min: 10000,  max: 50000 },
  { price: 159999, min: 100000, max: 300000 },
  { price: 34999,  min: 20000,  max: 60000 },
  { price: 7999,   min: 5000,   max: 15000 },
  { price: 124999, min: 80000,  max: 200000 },
  { price: 18999,  min: 10000,  max: 30000 },
  { price: 54999,  min: 30000,  max: 80000 },
  { price: 12999,  min: 5000,   max: 20000 },
  { price: 44999,  min: 25000,  max: 70000 },
  { price: 31999,  min: 15000,  max: 50000 },
  { price: 6999,   min: 3000,   max: 10000 },
];

let _postIdCounter = 1000;

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildMockPost(categoryKey) {
  const category = MOCK_CATEGORIES[categoryKey];
  const subcategories = MOCK_SUBCATEGORIES[categoryKey] || [];
  const subcategory = subcategories.length
    ? randomItem(subcategories)
    : null;
  const user = randomItem(USERS);
  const location = randomItem(LOCATIONS);
  const title = randomItem(
    TITLES_BY_CATEGORY[categoryKey] || ["Generic Item for Sale"],
  );
  const priceData = randomItem(PRICES);
  const daysAgo = randomInt(0, 60);
  const condition = randomItem(CONDITIONS);
  const views = randomInt(10, 5000);
  const likes = randomInt(0, 200);
  const isFeatured = Math.random() < 0.15;
  const isPremium = Math.random() < 0.1;

  _postIdCounter += 1;

  return {
    id: String(_postIdCounter),
    post_id: String(_postIdCounter),
    title,
    description: `${title} – Excellent condition. Used for ${randomInt(1, 12)} months. Original box included. Negotiable.`,
    price: priceData.price,
    price_value: priceData.price,
    price_inr: priceData.price,
    category_id: category.id,
    category: category.name,
    category_name: category.name,
    subcategory_id: subcategory?.id ?? "",
    subcategory: subcategory?.name ?? "",
    subcategory_name: subcategory?.name ?? "",
    location,
    city: location.split(",")[0],
    state: location.split(",")[1]?.trim() ?? "",
    condition,
    created_at: new Date(NOW - daysAgo * DAY).toISOString(),
    updated_at: new Date(NOW - daysAgo * DAY + 3600000).toISOString(),
    image_urls: [],
    images: [],
    stats: { views, likes },
    views,
    likes,
    is_featured: isFeatured,
    featured: isFeatured,
    is_premium: isPremium,
    premium: isPremium,
    is_verified: Math.random() < 0.4,
    verifiedOnly: Math.random() < 0.4,
    user_id: user.id,
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      city: user.city,
      location: user.city,
      avatar_url: "",
      isVerified: Math.random() < 0.4,
    },
    status: "active",
  };
}

/**
 * Returns an array of ~40 mock posts spanning all categories.
 * These are synthetically generated so sorting, filtering, and
 * category/subcategory selection can be tested without a live backend.
 */
export function getDemoPosts() {
  const posts = [];
  const categoryKeys = Object.keys(MOCK_CATEGORIES);

  // Generate 5 posts per category
  for (const key of categoryKeys) {
    for (let i = 0; i < 5; i += 1) {
      posts.push(buildMockPost(key));
    }
  }

  return posts;
}

/**
 * Returns the mock category list (with subcategories) used by the
 * CategoryBar and subcategory rail when the backend is unavailable.
 */
export function getDemoCategoryList() {
  return Object.entries(MOCK_CATEGORIES).map(([name, cat]) => ({
    name,
    category_id: cat.id,
    id: cat.id,
    subcategories: (MOCK_SUBCATEGORIES[name] || []).map((sub) => ({
      subcategory_id: sub.id,
      id: sub.id,
      name: sub.name,
      category_id: sub.category_id,
      post_count: randomInt(2, 30),
      display_order: Number(sub.id),
    })),
    post_count: randomInt(10, 80),
    display_order: Number(cat.id),
  }));
}
