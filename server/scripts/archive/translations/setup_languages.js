/**
 * Language Setup Script
 * Protocol: Tower of Babel
 * 
 * Creates folder structure and placeholder translation files
 * Run: node setup_languages.js
 */

import fs from 'fs';
import path from 'path';

// The WhatsApp-style Tier List (24 languages)
const languages = [
    // Tier 1: Global Giants
    'en', 'es', 'hi', 'pt', 'ru', 'ar',
    // Tier 2: European & Asian
    'de', 'fr', 'it', 'ja', 'ko', 'zh',
    // Tier 3: Regional & Emerging
    'id', 'tr', 'sw', 'vi', 'th', 'ur',
    // Indian Languages
    'te', 'ta', 'kn', 'mr', 'bn', 'gu', 'ml', 'pa'
];

// Base translation keys (English)
const baseTranslations = {
    // Common
    app_name: "MHub",
    welcome: "Welcome to MHub",
    loading: "Loading...",
    error: "Error",
    success: "Success",

    // Auth
    login: "Login",
    logout: "Logout",
    signup: "Sign Up",
    forgot_password: "Forgot Password?",

    // Navigation
    home: "Home",
    profile: "Profile",
    settings: "Settings",
    notifications: "Notifications",
    search: "Search",

    // Actions
    save: "Save",
    cancel: "Cancel",
    submit: "Submit",
    delete: "Delete",
    edit: "Edit",
    back: "Back",
    next: "Next",
    done: "Done",

    // Settings
    language: "Language",
    dark_mode: "Dark Mode",
    help: "Help",
    about: "About",
    contact_us: "Contact Us",
    privacy_policy: "Privacy Policy",
    terms: "Terms of Service",

    // Feed
    all_posts: "All Posts",
    nearby: "Nearby",
    for_you: "For You",
    no_results: "No results found",

    // Placeholders
    search_placeholder: "Search...",
    enter_email: "Enter email",
    enter_password: "Enter password",
};

const baseDir = path.join('client', 'public', 'locales');

// Ensure base directory exists
if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
    console.log('📁 Created locales directory');
}

let created = 0;
let skipped = 0;

languages.forEach(lang => {
    const dir = path.join(baseDir, lang);

    // Create language folder
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const filePath = path.join(dir, 'translation.json');

    if (!fs.existsSync(filePath)) {
        // Create placeholder with language code suffix
        const translations = Object.fromEntries(
            Object.entries(baseTranslations).map(([key, value]) => [
                key,
                lang === 'en' ? value : `${value} (${lang.toUpperCase()})`
            ])
        );

        fs.writeFileSync(filePath, JSON.stringify(translations, null, 2));
        console.log(`✅ Created: ${lang}/translation.json`);
        created++;
    } else {
        console.log(`⏭️  Skipped: ${lang}/translation.json (exists)`);
        skipped++;
    }
});

console.log('');
console.log('═══════════════════════════════════════');
console.log(`🎉 Language infrastructure ready!`);
console.log(`   Created: ${created} files`);
console.log(`   Skipped: ${skipped} files (already exist)`);
console.log(`   Total:   ${languages.length} languages`);
console.log('═══════════════════════════════════════');
console.log('');
console.log('Next steps:');
console.log('1. Use Google Sheets GOOGLETRANSLATE to generate translations');
console.log('2. Export as JSON and replace placeholder files');
console.log('');
