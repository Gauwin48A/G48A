# Mhub Application - Comprehensive Test Cases

## Date: November 9, 2025
## Version: Production Ready (mhubmini branch)
## Author: QA Team

---

## 1. LOCATION FEATURE TEST CASES

### 1.1 Location Permission Flow
**TC-LOC-001: Successful Location Permission Grant**
- **Prerequisites**: User logged in, browser supports geolocation
- **Steps**:
  1. User logs in successfully  
  2. Navigate to /all-posts page
  3. Browser shows location permission popup
  4. User clicks "Allow"
- **Expected Result**: 
  - Loading screen shows "Requesting Location Permission"
  - Permission granted, location captured
  - City and country detected via reverse geocoding
  - AllPosts page content displays
  - Location data stored in database with permission_status='granted'
- **Priority**: P0 (Critical)

**TC-LOC-002: Location Permission Denied**
- **Prerequisites**: User logged in
- **Steps**:
  1. User logs in
  2. Navigate to /all-posts
  3. User clicks "Block" on permission popup
- **Expected Result**:
  - Permission denied screen shows
  - Message displays: "Location Permission Required"
  - "Retry" button available
  - Database stores permission_status='denied'
- **Priority**: P0 (Critical)

**TC-LOC-003: Location Permission Timeout**
- **Prerequisites**: User logged in, slow network
- **Steps**:
  1. User logs in
  2. Navigate to /all-posts
  3. Permission popup appears but no response for 15 seconds
- **Expected Result**:
  - Timeout error handled gracefully
  - Permission error screen shows
  - Database stores permission_status='timeout'
- **Priority**: P1 (High)

**TC-LOC-004: Reverse Geocoding Success**
- **Prerequisites**: Location permission granted
- **Steps**:
  1. Location coordinates captured (e.g., 28.6139, 77.2090)
  2. Backend calls Nominatim API
- **Expected Result**:
  - City name returned (e.g., "New Delhi")
  - Country name returned (e.g., "India")
  - Data stored in user_locations table
  - City and country visible in user profile
- **Priority**: P0 (Critical)

**TC-LOC-005: Reverse Geocoding API Failure**
- **Prerequisites**: Location granted, API down
- **Steps**:
  1. Location coordinates captured
  2. Nominatim API fails or times out (5s)
- **Expected Result**:
  - Coordinates still stored
  - City/country fields remain null
  - User can still access AllPosts page
  - Error logged for admin review
- **Priority**: P1 (High)

---

## 2. AUTHENTICATION TEST CASES

### 2.1 Email Login
**TC-AUTH-001: Valid Email Login**
- **Steps**: Enter valid email/password, click "Sign In"
- **Expected**: User authenticated, redirect to /all-posts, token stored
- **Priority**: P0

**TC-AUTH-002: Invalid Email Format**
- **Steps**: Enter "notanemail", click Sign In
- **Expected**: Error: "Invalid Email", no API call
- **Priority**: P1

**TC-AUTH-003: Wrong Password**
- **Steps**: Enter valid email, wrong password
- **Expected**: Error from backend: "Login failed"
- **Priority**: P0

**TC-AUTH-004: Test Email Blocked**
- **Steps**: Try login with test@test.com
- **Expected**: Error: "Test/dummy emails not allowed"
- **Priority**: P1

### 2.2 Phone OTP Login
**TC-AUTH-005: Valid OTP Login**
- **Steps**: Enter phone, receive OTP, verify OTP
- **Expected**: User authenticated, redirect to /all-posts
- **Priority**: P0

**TC-AUTH-006: Invalid Phone Number**
- **Steps**: Enter "1234567890"
- **Expected**: Error: "Test phone not allowed"
- **Priority**: P1

**TC-AUTH-007: Wrong OTP**
- **Steps**: Enter valid phone, wrong OTP
- **Expected**: Error: "Invalid OTP"
- **Priority**: P0

---

## 3. POSTS & FEED TEST CASES

### 3.1 All Posts Page
**TC-POSTS-001: Load All Posts**
- **Steps**: Navigate to /all-posts after login
- **Expected**: Posts display in grid, loading state, infinite scroll works
- **Priority**: P0

**TC-POSTS-002: Filter by Category**
- **Steps**: Click "Electronics" category
- **Expected**: Only electronics posts displayed
- **Priority**: P1

**TC-POSTS-003: Search Posts**
- **Steps**: Enter "iPhone" in search
- **Expected**: Posts matching "iPhone" in title/description shown
- **Priority**: P1

**TC-POSTS-004: Like Post**
- **Steps**: Click heart icon on post
- **Expected**: Like count increments, heart turns red, API call successful
- **Priority**: P1

**TC-POSTS-005: Share Post**
- **Steps**: Click share icon
- **Expected**: URL copied to clipboard, share count increments, toast shows "Link copied!"
- **Priority**: P2

**TC-POSTS-006: View Post Details**
- **Steps**: Click "View Details" button
- **Expected**: Navigate to /post/:id, view count increments, full details shown
- **Priority**: P0

**TC-POSTS-007: Infinite Scroll**
- **Steps**: Scroll to bottom of page
- **Expected**: Next 6 posts load automatically
- **Priority**: P1

### 3.2 Post Creation
**TC-POSTS-008: Create New Post**
- **Steps**: Navigate to /post-add, fill form, submit
- **Expected**: Post created, redirect to AllPosts, new post visible
- **Priority**: P0

**TC-POSTS-009: Post Validation**
- **Steps**: Try to submit empty form
- **Expected**: Validation errors shown for required fields
- **Priority**: P1

---

## 4. USER PROFILE TEST CASES

**TC-PROFILE-001: View Profile**
- **Steps**: Navigate to /profile
- **Expected**: User data displayed including city/country from location
- **Priority**: P0

**TC-PROFILE-002: Edit Profile**
- **Steps**: Update name, phone, submit
- **Expected**: Profile updated, success message shown
- **Priority**: P1

---

## 5. AADHAAR VERIFICATION TEST CASES

**TC-VERIFY-001: Aadhaar Verification Flow**
- **Steps**: Navigate to /aadhaar-verify, enter Aadhaar, verify
- **Expected**: Verification successful, user marked as verified
- **Priority**: P1

**TC-VERIFY-002: Invalid Aadhaar**
- **Steps**: Enter invalid format Aadhaar number
- **Expected**: Validation error shown
- **Priority**: P2

---

## 6. REWARDS & GAMIFICATION TEST CASES

**TC-REWARD-001: View Rewards Page**
- **Steps**: Navigate to /rewards
- **Expected**: User points, badges, leaderboard displayed
- **Priority**: P2

**TC-REWARD-002: Earn Points**
- **Steps**: Complete a sale transaction
- **Expected**: Points awarded, updated in rewards page
- **Priority**: P2

---

## 7. ADMIN PANEL TEST CASES

**TC-ADMIN-001: Access Admin Panel**
- **Prerequisites**: Admin user logged in
- **Steps**: Navigate to /admin-panel
- **Expected**: Admin dashboard with stats, user management visible
- **Priority**: P1

**TC-ADMIN-002: Manage Users**
- **Steps**: View users, edit user, disable user
- **Expected**: Changes applied successfully
- **Priority**: P1

**TC-ADMIN-003: View Location Analytics**
- **Steps**: Navigate to location analytics section
- **Expected**: Map view of users, city distribution, permission stats shown
- **Priority**: P2

---

## 8. ERROR HANDLING TEST CASES

**TC-ERROR-001: 404 Page**
- **Steps**: Navigate to /nonexistent-page
- **Expected**: 404 page displayed with back button
- **Priority**: P2

**TC-ERROR-002: Network Error**
- **Steps**: Disconnect network, try to load posts
- **Expected**: Error message: "Failed to fetch data"
- **Priority**: P1

**TC-ERROR-003: API Timeout**
- **Steps**: Simulate slow API response (>30s)
- **Expected**: Timeout error handled, retry option shown
- **Priority**: P1

---

## 9. RESPONSIVE DESIGN TEST CASES

**TC-RESPONSIVE-001: Mobile View (320px)**
- **Steps**: Resize browser to mobile width
- **Expected**: Layout adapts, buttons stack vertically, readable text
- **Priority**: P1

**TC-RESPONSIVE-002: Tablet View (768px)**
- **Steps**: Resize to tablet width  
- **Expected**: Grid adjusts to 2 columns, navigation optimized
- **Priority**: P2

**TC-RESPONSIVE-003: Desktop View (1920px)**
- **Steps**: View on large desktop
- **Expected**: Full layout, optimal spacing, max-width containers
- **Priority**: P2

---

## 10. PERFORMANCE TEST CASES

**TC-PERF-001: Page Load Time**
- **Expected**: AllPosts page loads in < 3 seconds on 4G
- **Priority**: P1

**TC-PERF-002: Location API Response**
- **Expected**: Reverse geocoding completes in < 5 seconds
- **Priority**: P1

**TC-PERF-003: Infinite Scroll Performance**
- **Expected**: Loading next page takes < 2 seconds
- **Priority**: P2

---

## 11. SECURITY TEST CASES

**TC-SEC-001: SQL Injection**
- **Steps**: Try SQL injection in search field
- **Expected**: Query sanitized, no database breach
- **Priority**: P0

**TC-SEC-002: XSS Attack**
- **Steps**: Try entering `<script>alert('xss')</script>` in post description
- **Expected**: Script sanitized, not executed
- **Priority**: P0

**TC-SEC-003: CSRF Protection**
- **Steps**: Try submitting form without CSRF token
- **Expected**: Request rejected
- **Priority**: P1

---

## 12. DATABASE TEST CASES

**TC-DB-001: Location Data Storage**
- **Steps**: Grant location permission
- **Expected**: Record created in user_locations with lat/lng, city, country, permission_status
- **Priority**: P0

**TC-DB-002: Migration Script**
- **Steps**: Run migration_add_location_columns.sql on existing database
- **Expected**: Columns added successfully, existing data unaffected
- **Priority**: P0

**TC-DB-003: Index Performance**
- **Steps**: Query users by city
- **Expected**: Query uses idx_user_locations_city, returns in < 100ms
- **Priority**: P1

---

## 13. INTEGRATION TEST CASES

**TC-INT-001: End-to-End User Flow**
- **Steps**:
  1. Sign up → Verify email → Login
  2. Grant location permission
  3. View AllPosts → Like → Share → Comment
  4. Create new post → View own posts
- **Expected**: All steps complete successfully
- **Priority**: P0

**TC-INT-002: Location → Profile Integration**
- **Steps**: Grant location, navigate to profile
- **Expected**: Profile shows city/country from location data
- **Priority**: P1

---

## 14. REGRESSION TEST CASES

**TC-REG-001: Previous Features Still Work**
- **Steps**: Test all major features after location integration
- **Expected**: No existing features broken
- **Priority**: P0

---

## TEST EXECUTION SUMMARY

### Critical (P0) Tests: 18
### High Priority (P1) Tests: 16  
### Medium Priority (P2) Tests: 11
### **Total Test Cases: 45**

---

## DEFECT SEVERITY CLASSIFICATION

- **Blocker**: App unusable (e.g., login broken)
- **Critical**: Major feature broken (e.g., location not captured)
- **Major**: Feature partially broken (e.g., city not displayed but lat/lng stored)
- **Minor**: UI issue (e.g., button misaligned)
- **Trivial**: Cosmetic (e.g., typo in label)

---

## TEST ENVIRONMENT

- **Browsers**: Chrome 119+, Firefox 119+, Safari 17+, Edge 119+
- **Devices**: Desktop (Windows, Mac), Mobile (iOS, Android)
- **Network**: 4G, WiFi, Slow 3G (throttled)
- **Database**: PostgreSQL 14+
- **API**: Node.js Express backend
- **Frontend**: React 18+ with Vite

---

## ACCEPTANCE CRITERIA

✅ All P0 tests pass  
✅ 95%+ P1 tests pass  
✅ No blocker/critical defects open  
✅ Location feature works on all major browsers  
✅ AllPosts page loads with location permission flow  
✅ No regression in existing features  

---

## NOTES

1. Location permission must be requested ONLY on /all-posts page after login
2. User can still use app if location is denied (limited features)
3. Location data stored for analytics and future recommendations
4. Test with real devices, not just emulators
5. Monitor Nominatim API rate limits (max 1 req/sec)
6. Privacy: User location data must be encrypted at rest

---

*Document End*
