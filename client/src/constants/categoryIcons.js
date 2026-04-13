/**
 * Comprehensive Category and Subcategory Icon Mappings
 * 
 * This file provides centralized icon mappings for all 13 categories
 * and their 90+ subcategories used throughout the MHub application.
 */

import {
  // Electronics
  Monitor,
  Smartphone,
  Laptop,
  Tablet,
  Headphones,
  Camera,
  Gamepad,
  Watch,
  Tv,
  Speaker,
  Printer,
  
  // Vehicles
  Car,
  Bike,
  Truck,
  
  // Fashion
  Shirt,
  
  // Home & Living
  Home,
  Sofa,
  Lamp,
  
  // Real Estate
  Building,
  Building2,
  MapPin,
  
  // Jobs & Services
  Briefcase,
  Wrench,
  UserCheck,
  
  // Books & Education
  Book,
  GraduationCap,
  
  // Sports & Fitness
  Dumbbell,
  Activity,
  
  // Kids & Baby
  Baby,
  
  // Beauty & Personal Care
  Sparkles,
  Heart,
  
  // Agriculture
  Leaf,
  Tractor,
  
  // Food & Grocery
  UtensilsCrossed,
  Apple,
  
  // Hobbies & Collectibles
  Palette,
  Music,
  Gift,
  
  // General / Fallbacks
  Package,
  LayoutGrid,
  Tag,
  ShoppingBag,
  Star,
  CircleDot,
} from "lucide-react";

/**
 * Main category icon mappings
 * Maps category names to Lucide React icons
 */
export const CATEGORY_ICON_MAP = {
  // Default / All
  All: LayoutGrid,
  
  // Main Categories (from seed_sample_data.sql)
  Electronics: Monitor,
  Vehicles: Car,
  "Real Estate": Building,
  Jobs: Briefcase,
  Services: Wrench,
  Fashion: Shirt,
  "Home & Living": Sofa,
  "Home Appliances": Tv,
  Books: Book,
  Sports: Dumbbell,
  "Kids & Baby": Baby,
  Beauty: Sparkles,
  Agriculture: Leaf,
  "Food & Grocery": UtensilsCrossed,
  "Hobbies & Collectibles": Palette,
  
  // Alternative names
  Mobiles: Smartphone,
  Home: Home,
  Furniture: Sofa,
  Gaming: Gamepad,
  Audio: Headphones,
  Laptops: Laptop,
  Watches: Watch,
  Cameras: Camera,
  Education: GraduationCap,
  Fitness: Dumbbell,
};

/**
 * Subcategory icon mappings
 * More specific icons for subcategories
 */
export const SUBCATEGORY_ICON_MAP = {
  // Electronics Subcategories
  "Mobile Phones": Smartphone,
  Mobiles: Smartphone,
  Smartphones: Smartphone,
  Laptops: Laptop,
  "Laptop Computers": Laptop,
  Tablets: Tablet,
  iPads: Tablet,
  Accessories: Watch,
  "Phone Accessories": Watch,
  "Laptop Accessories": Watch,
  Cameras: Camera,
  "Digital Cameras": Camera,
  DSLR: Camera,
  Audio: Headphones,
  Headphones: Headphones,
  Speakers: Speaker,
  "Bluetooth Speakers": Speaker,
  Earphones: Headphones,
  Gaming: Gamepad,
  "Gaming Consoles": Gamepad,
  PlayStation: Gamepad,
  Xbox: Gamepad,
  Wearables: Watch,
  Smartwatches: Watch,
  "Smart Watches": Watch,
  Televisions: Tv,
  TVs: Tv,
  "Smart TV": Tv,
  Monitors: Monitor,
  Printers: Printer,
  
  // Vehicles Subcategories
  Cars: Car,
  Sedans: Car,
  SUVs: Car,
  Hatchbacks: Car,
  "Luxury Cars": Car,
  Bikes: Bike,
  Motorcycles: Bike,
  Scooters: Bike,
  "Electric Bikes": Bike,
  Trucks: Truck,
  Vans: Truck,
  "Commercial Vehicles": Truck,
  "Auto Parts": Wrench,
  "Spare Parts": Wrench,
  
  // Fashion Subcategories
  Men: Shirt,
  "Men's Fashion": Shirt,
  "Men's Clothing": Shirt,
  Women: Shirt,
  "Women's Fashion": Shirt,
  "Women's Clothing": Shirt,
  Kids: Shirt,
  "Kids Fashion": Shirt,
  "Children's Clothing": Shirt,
  Footwear: Shirt,
  Shoes: Shirt,
  Bags: ShoppingBag,
  Handbags: ShoppingBag,
  Jewelry: Sparkles,
  Jewellery: Sparkles,
  Watches: Watch,
  
  // Home & Living Subcategories
  Furniture: Sofa,
  Sofas: Sofa,
  Beds: Sofa,
  Tables: Sofa,
  Chairs: Sofa,
  Kitchen: UtensilsCrossed,
  "Kitchen Appliances": UtensilsCrossed,
  Cookware: UtensilsCrossed,
  "Home Decor": Lamp,
  Decor: Lamp,
  Lighting: Lamp,
  Lamps: Lamp,
  Gardening: Leaf,
  "Garden Tools": Leaf,
  
  // Real Estate Subcategories
  Houses: Building,
  Apartments: Building2,
  Flats: Building2,
  Villas: Building,
  Lands: MapPin,
  Plots: MapPin,
  "Commercial Property": Building,
  "Office Space": Building,
  "Shop Space": Building,
  "PG/Hostel": Building2,
  Rentals: Building2,
  
  // Jobs Subcategories
  "IT Jobs": Briefcase,
  "Software Jobs": Briefcase,
  "Part Time": Briefcase,
  "Part-Time": Briefcase,
  "Full Time": Briefcase,
  "Full-Time": Briefcase,
  Internships: GraduationCap,
  "Work from Home": Briefcase,
  Remote: Briefcase,
  Fresher: UserCheck,
  "Entry Level": UserCheck,
  
  // Services Subcategories
  Electrician: Wrench,
  Plumber: Wrench,
  Carpenter: Wrench,
  "Home Services": Wrench,
  Cleaning: Wrench,
  Repair: Wrench,
  "AC Repair": Wrench,
  "Appliance Repair": Wrench,
  Movers: Truck,
  "Packers & Movers": Truck,
  Tutoring: GraduationCap,
  "Home Tutors": GraduationCap,
  "Beauty Services": Sparkles,
  "Salon Services": Sparkles,
  
  // Books Subcategories
  Textbooks: Book,
  "School Books": Book,
  "College Books": Book,
  Novels: Book,
  Fiction: Book,
  "Non-Fiction": Book,
  Comics: Book,
  Magazines: Book,
  "Educational Materials": GraduationCap,
  
  // Sports Subcategories
  Cricket: Activity,
  Football: Activity,
  Badminton: Activity,
  Tennis: Activity,
  Gym: Dumbbell,
  "Gym Equipment": Dumbbell,
  Fitness: Dumbbell,
  Yoga: Activity,
  Cycling: Bike,
  Swimming: Activity,
  
  // Kids & Baby Subcategories
  Toys: Gift,
  "Baby Care": Baby,
  "Baby Products": Baby,
  "Kids Clothing": Shirt,
  Strollers: Baby,
  "Baby Food": Apple,
  
  // Beauty Subcategories
  Makeup: Sparkles,
  Cosmetics: Sparkles,
  Skincare: Heart,
  "Skin Care": Heart,
  Haircare: Sparkles,
  "Hair Care": Sparkles,
  Perfumes: Sparkles,
  Fragrances: Sparkles,
  "Personal Care": Heart,
  
  // Agriculture Subcategories
  Seeds: Leaf,
  Fertilizers: Leaf,
  "Farm Equipment": Tractor,
  Tractors: Tractor,
  "Farm Tools": Wrench,
  Livestock: Leaf,
  "Organic Products": Leaf,
  
  // Food & Grocery Subcategories
  Groceries: Apple,
  Vegetables: Leaf,
  Fruits: Apple,
  "Organic Food": Leaf,
  Snacks: UtensilsCrossed,
  Beverages: UtensilsCrossed,
  "Home Cooked": UtensilsCrossed,
  
  // Hobbies & Collectibles Subcategories
  "Art & Craft": Palette,
  Art: Palette,
  Antiques: Gift,
  Collectibles: Star,
  Coins: CircleDot,
  Stamps: Tag,
  "Musical Instruments": Music,
  Music: Music,
  Photography: Camera,
  "DIY Kits": Package,
};

/**
 * Get icon for a category by name
 * @param {string} categoryName - The category name
 * @param {React.ComponentType} fallback - Fallback icon component
 * @returns {React.ComponentType} The icon component
 */
export function getCategoryIcon(categoryName, fallback = Package) {
  if (!categoryName || typeof categoryName !== "string") {
    return fallback;
  }
  
  const normalized = categoryName.trim();
  
  // Check exact match first
  if (CATEGORY_ICON_MAP[normalized]) {
    return CATEGORY_ICON_MAP[normalized];
  }
  
  // Check case-insensitive match
  const lowerName = normalized.toLowerCase();
  for (const [key, icon] of Object.entries(CATEGORY_ICON_MAP)) {
    if (key.toLowerCase() === lowerName) {
      return icon;
    }
  }
  
  return fallback;
}

/**
 * Get icon for a subcategory by name
 * @param {string} subcategoryName - The subcategory name
 * @param {string} parentCategory - Optional parent category for context
 * @param {React.ComponentType} fallback - Fallback icon component
 * @returns {React.ComponentType} The icon component
 */
export function getSubcategoryIcon(subcategoryName, parentCategory = null, fallback = Package) {
  if (!subcategoryName || typeof subcategoryName !== "string") {
    // If no subcategory but parent exists, return parent icon
    if (parentCategory) {
      return getCategoryIcon(parentCategory, fallback);
    }
    return fallback;
  }
  
  const normalized = subcategoryName.trim();
  
  // Check exact match first
  if (SUBCATEGORY_ICON_MAP[normalized]) {
    return SUBCATEGORY_ICON_MAP[normalized];
  }
  
  // Check case-insensitive match
  const lowerName = normalized.toLowerCase();
  for (const [key, icon] of Object.entries(SUBCATEGORY_ICON_MAP)) {
    if (key.toLowerCase() === lowerName) {
      return icon;
    }
  }
  
  // Fall back to parent category icon if available
  if (parentCategory) {
    return getCategoryIcon(parentCategory, fallback);
  }
  
  return fallback;
}

/**
 * Get all available category names
 * @returns {string[]} Array of category names
 */
export function getCategoryNames() {
  return Object.keys(CATEGORY_ICON_MAP).filter(name => name !== "All");
}

/**
 * Get all available subcategory names
 * @returns {string[]} Array of subcategory names
 */
export function getSubcategoryNames() {
  return Object.keys(SUBCATEGORY_ICON_MAP);
}

export default {
  CATEGORY_ICON_MAP,
  SUBCATEGORY_ICON_MAP,
  getCategoryIcon,
  getSubcategoryIcon,
  getCategoryNames,
  getSubcategoryNames,
};
