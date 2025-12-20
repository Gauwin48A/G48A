# MHub Client Demo Validation

## Prerequisites
- [ ] Run `seed_demo_data.sql` in PostgreSQL
- [ ] Restart server: `cd server && npm start`

---

## 1. Login & Dashboard (Critical)
- [ ] Login with: `client_demo@mhub.com` / `password123`
- [ ] **Result:** Dashboard loads. No "white screen".

## 2. My Home (Functionality)
- [ ] Navigate to "My Home"
- [ ] **Result:**
  - "Active" tab shows: *Apple MacBook Pro M2*
  - "Sold" tab shows: *Vintage Leather Sofa*
  - "Bought" tab shows: *Sony Noise Cancelling Headphones*

## 3. Rewards & Referrals
- [ ] Navigate to "Rewards"
- [ ] **Result:**
  - Rank is **GOLD**
  - Points: **1200**
  - Referral Tree shows: *Rahul_Ref* and *Priya_Ref*

## 4. Language & Search
- [ ] Change language to **Hindi**. Refresh Page.
  - **Result:** Text remains Hindi.
- [ ] Type "MacBook" in Navbar Search -> Enter
  - **Result:** Redirects to `/allposts` and shows MacBook.

## 5. Profile Page
- [ ] Navigate to "Profile"
- [ ] **Result:** Shows user info with:
  - Name: MHub Super User
  - Verified: TRUE
  - Location: Hyderabad, India

## 6. Location Capture
- [ ] Allow location permission when prompted
- [ ] **Result:** Location persisted in `user_locations` table
