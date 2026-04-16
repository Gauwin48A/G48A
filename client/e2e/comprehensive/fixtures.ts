export const MOCK_USER = {
  id: "user-1",
  user_id: "user-1",
  name: "E2E User",
  fullName: "E2E User",
  email: "e2e.user@mhub.test",
  role: "user",
  avatar: "/placeholder.svg",
  city: "Hyderabad",
  state: "Telangana"
};

export const MOCK_CATEGORIES = [
  {
    category_id: 101,
    name: "Mobiles",
    category_group: "electronics",
    product_count: 128,
    subcategories: [
      { subcategory_id: 1001, name: "Android Phones", post_count: 44, category_id: 101, category_name: "Mobiles" },
      { subcategory_id: 1002, name: "iPhones", post_count: 32, category_id: 101, category_name: "Mobiles" }
    ]
  },
  {
    category_id: 102,
    name: "Laptops",
    category_group: "electronics",
    product_count: 64,
    subcategories: [
      { subcategory_id: 1003, name: "Ultrabooks", post_count: 18, category_id: 102, category_name: "Laptops" },
      { subcategory_id: 1004, name: "Gaming Laptops", post_count: 12, category_id: 102, category_name: "Laptops" }
    ]
  },
  {
    category_id: 201,
    name: "Men's Fashion",
    category_group: "fashion",
    product_count: 92,
    subcategories: [
      { subcategory_id: 2001, name: "Sneakers", post_count: 26, category_id: 201, category_name: "Men's Fashion" },
      { subcategory_id: 2002, name: "Watches", post_count: 14, category_id: 201, category_name: "Men's Fashion" }
    ]
  },
  {
    category_id: 301,
    name: "Cars",
    category_group: "vehicles",
    product_count: 38,
    subcategories: [
      { subcategory_id: 3001, name: "Sedans", post_count: 8, category_id: 301, category_name: "Cars" },
      { subcategory_id: 3002, name: "SUVs", post_count: 12, category_id: 301, category_name: "Cars" }
    ]
  },
  {
    category_id: 401,
    name: "Home",
    category_group: "others",
    product_count: 75,
    subcategories: [
      { subcategory_id: 4001, name: "Furniture", post_count: 21, category_id: 401, category_name: "Home" },
      { subcategory_id: 4002, name: "Decor", post_count: 12, category_id: 401, category_name: "Home" }
    ]
  }
];

export const MOCK_POSTS = [
  {
    post_id: "post-1",
    title: "Vintage Camera",
    price: 2500,
    currency: "INR",
    category_id: 101,
    category_name: "Mobiles",
    category_group: "electronics",
    subcategory_name: "Android Phones",
    location: "Hyderabad",
    city: "Hyderabad",
    condition: "Used",
    images: ["/placeholder.svg", "/placeholder.svg"],
    user: { id: "seller-1", name: "Arjun Rao" },
    created_at: "2026-04-12T10:00:00.000Z",
    views: 120,
    likes: 4
  },
  {
    post_id: "post-2",
    title: "Gaming Laptop Pro",
    price: 68000,
    currency: "INR",
    category_id: 102,
    category_name: "Laptops",
    category_group: "electronics",
    subcategory_name: "Gaming Laptops",
    location: "Bengaluru",
    city: "Bengaluru",
    condition: "Like New",
    images: ["/placeholder.svg", "/placeholder.svg"],
    user: { id: "seller-2", name: "Meera Singh" },
    created_at: "2026-04-11T08:30:00.000Z",
    views: 88,
    likes: 8
  },
  {
    post_id: "post-3",
    title: "Leather Sneakers",
    price: 4200,
    currency: "INR",
    category_id: 201,
    category_name: "Men's Fashion",
    category_group: "fashion",
    subcategory_name: "Sneakers",
    location: "Mumbai",
    city: "Mumbai",
    condition: "New",
    images: ["/placeholder.svg"],
    user: { id: "seller-3", name: "Nisha Kapoor" },
    created_at: "2026-04-10T14:15:00.000Z",
    views: 63,
    likes: 2
  },
  {
    post_id: "post-4",
    title: "Compact SUV 2018",
    price: 650000,
    currency: "INR",
    category_id: 301,
    category_name: "Cars",
    category_group: "vehicles",
    subcategory_name: "SUVs",
    location: "Delhi",
    city: "Delhi",
    condition: "Used",
    images: ["/placeholder.svg", "/placeholder.svg", "/placeholder.svg"],
    user: { id: "seller-4", name: "Rahul Verma" },
    created_at: "2026-04-09T09:45:00.000Z",
    views: 155,
    likes: 11
  },
  {
    post_id: "post-5",
    title: "Designer Sofa Set",
    price: 32000,
    currency: "INR",
    category_id: 401,
    category_name: "Home",
    category_group: "others",
    subcategory_name: "Furniture",
    location: "Chennai",
    city: "Chennai",
    condition: "Used",
    images: ["/placeholder.svg"],
    user: { id: "seller-5", name: "Sara Ali" },
    created_at: "2026-04-08T16:00:00.000Z",
    views: 44,
    likes: 1
  },
  {
    post_id: "post-6",
    title: "Smartwatch Series 5",
    price: 9000,
    currency: "INR",
    category_id: 201,
    category_name: "Men's Fashion",
    category_group: "fashion",
    subcategory_name: "Watches",
    location: "Pune",
    city: "Pune",
    condition: "Like New",
    images: ["/placeholder.svg"],
    user: { id: "seller-6", name: "Kunal Mehta" },
    created_at: "2026-04-07T12:20:00.000Z",
    views: 30,
    likes: 0
  }
];

export const MOCK_POST_DETAIL = {
  post_id: "post-1",
  title: "Vintage Camera",
  description: "A well-maintained vintage camera with lens kit.",
  price: 2500,
  currency: "INR",
  category_id: 101,
  category_name: "Mobiles",
  category_group: "electronics",
  subcategory_name: "Android Phones",
  condition: "Used",
  location: "Hyderabad",
  city: "Hyderabad",
  area: "Bachupally",
  latitude: 17.385,
  longitude: 78.4867,
  images: ["/placeholder.svg", "/placeholder.svg", "/placeholder.svg"],
  seller: {
    id: "seller-1",
    name: "Arjun Rao",
    location: "Hyderabad",
    trust: { score: 82, level: "gold", label: "Trusted" }
  },
  user: {
    id: "seller-1",
    name: "Arjun Rao",
    trust: { score: 82, level: "gold", label: "Trusted" }
  },
  created_at: "2026-04-12T10:00:00.000Z",
  views: 120,
  likes: 4,
  shares: 1,
  is_saved: false
};

export const MOCK_CART_ITEMS = [
  {
    id: "post-2",
    post_id: "post-2",
    title: "Gaming Laptop Pro",
    price: 68000,
    currency: "INR",
    image_url: "/placeholder.svg",
    seller_name: "Meera Singh",
    qty: 1,
    category_name: "Laptops",
    category_id: 102,
    category_group: "electronics",
    availability_status: "available"
  },
  {
    id: "post-3",
    post_id: "post-3",
    title: "Leather Sneakers",
    price: 4200,
    currency: "INR",
    image_url: "/placeholder.svg",
    seller_name: "Nisha Kapoor",
    qty: 2,
    category_name: "Men's Fashion",
    category_id: 201,
    category_group: "fashion",
    availability_status: "available"
  }
];

export const MOCK_WISHLIST_ITEMS = [
  {
    post_id: "post-4",
    id: "post-4",
    title: "Compact SUV 2018",
    price: 650000,
    currency: "INR",
    image_url: "/placeholder.svg",
    category_name: "Cars",
    category_group: "vehicles",
    saved_at: "2026-04-13T11:00:00.000Z"
  },
  {
    post_id: "post-5",
    id: "post-5",
    title: "Designer Sofa Set",
    price: 32000,
    currency: "INR",
    image_url: "/placeholder.svg",
    category_name: "Home",
    category_group: "others",
    saved_at: "2026-04-12T09:00:00.000Z"
  }
];

export const MOCK_NOTIFICATIONS = [
  {
    id: "notif-1",
    title: "Price drop alert",
    message: "Your saved item dropped in price.",
    created_at: "2026-04-13T10:30:00.000Z",
    read: false,
    icon: "trending",
    sender_name: "MHub"
  },
  {
    id: "notif-2",
    title: "New message",
    message: "A buyer sent you a message.",
    created_at: "2026-04-12T08:15:00.000Z",
    read: true,
    icon: "message",
    sender_name: "MHub"
  }
];

export const MOCK_FEED_POSTS = [
  {
    id: "feed-1",
    title: "Marketplace update",
    content: "New categories have arrived in Electronics.",
    created_at: "2026-04-12T09:00:00.000Z",
    likes: 3,
    shares: 1,
    user: { id: "user-9", name: "MHub Team", avatar: "/placeholder.svg" }
  },
  {
    id: "feed-2",
    title: "Safety tips",
    content: "Meet in public places for exchanges.",
    created_at: "2026-04-11T12:30:00.000Z",
    likes: 5,
    shares: 0,
    user: { id: "user-10", name: "Support", avatar: "/placeholder.svg" }
  }
];

export const MOCK_RECENTLY_VIEWED = [
  {
    post_id: "post-1",
    title: "Vintage Camera",
    price: 2500,
    status: "active",
    source: "allposts",
    image_url: "/placeholder.svg",
    viewed_at: "2026-04-13T08:20:00.000Z"
  }
];

export const MOCK_COMPARE_ITEMS = [
  {
    id: "post-2",
    post_id: "post-2",
    title: "Gaming Laptop Pro",
    price: 68000,
    condition: "Like New",
    brand: "Raptor",
    location: "Bengaluru",
    images: ["/placeholder.svg"],
    attributes: { ram: "16GB", storage: "512GB SSD" }
  },
  {
    id: "post-4",
    post_id: "post-4",
    title: "Compact SUV 2018",
    price: 650000,
    condition: "Used",
    brand: "AutoMax",
    location: "Delhi",
    images: ["/placeholder.svg"],
    attributes: { mileage: "45,000 km", fuel: "Petrol" }
  },
  {
    id: "post-5",
    post_id: "post-5",
    title: "Designer Sofa Set",
    price: 32000,
    condition: "Used",
    brand: "Casa",
    location: "Chennai",
    images: ["/placeholder.svg"],
    attributes: { material: "Leather", seats: "3" }
  }
];

export const MOCK_REVIEWS = [
  {
    id: "review-1",
    rating: 5,
    comment: "Great seller, smooth transaction.",
    created_at: "2026-04-10T10:00:00.000Z",
    user: { id: "buyer-1", name: "Kiran" }
  },
  {
    id: "review-2",
    rating: 4,
    comment: "Item as described.",
    created_at: "2026-04-09T09:00:00.000Z",
    user: { id: "buyer-2", name: "Asha" }
  }
];

export const MOCK_CHANNELS = [
  {
    channel_id: "channel-1",
    id: "channel-1",
    name: "MHub Electronics",
    description: "Latest electronics deals and tips.",
    owner_name: "MHub Team",
    follower_count: 120,
    is_following: false,
    cover_url: "/placeholder.svg"
  },
  {
    channel_id: "channel-2",
    id: "channel-2",
    name: "Auto Enthusiasts",
    description: "Talk about cars, bikes, and more.",
    owner_name: "Rahul Verma",
    follower_count: 80,
    is_following: true,
    cover_url: "/placeholder.svg"
  }
];

export const MOCK_DASHBOARD = {
  user: { id: "user-1", name: "E2E User" },
  quickStats: [
    { labelKey: "active_listings", value: 4, trend: "+Active" },
    { labelKey: "total_sales", value: 2, trend: "+Sold" },
    { labelKey: "total_views", value: 128, trend: "+Views" },
    { labelKey: "coins_earned", value: 240, trend: "+Coins" }
  ],
  recentActivity: [
    { id: "activity-1", title: "Listing approved" },
    { id: "activity-2", title: "New buyer message" }
  ],
  topSellers: []
};

export const MOCK_ANALYTICS = {
  stats: {
    totalViews: 1200,
    totalLeads: 18,
    totalSales: 4
  },
  posts: [],
  categories: []
};

export const MOCK_REWARDS = {
  user: {
    user_id: "user-1",
    totalCoins: 320,
    trustScore: 78,
    referralCode: "E2E123"
  }
};

export const MOCK_TIER_PLANS = [
  {
    id: "silver",
    name: "Silver",
    price: 199,
    interval: "month",
    features: ["Boosted visibility", "Priority support"]
  },
  {
    id: "gold",
    name: "Gold",
    price: 399,
    interval: "month",
    features: ["Top placement", "Analytics"]
  }
];

export const MOCK_SAVED_SEARCHES = [
  {
    id: "search-1",
    query: "vintage camera",
    created_at: "2026-04-12T10:00:00.000Z",
    alerts_enabled: true
  }
];
