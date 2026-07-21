# Rewards Page Overhaul — Update Plan

> Based on your feedback: coins-only, user-friendly, remove broken features, fix referral tree

---

## 🔴 Critical Issues (Fix First)

### 1. Referral Network Tree Not Loading

**File:** `android-native/app/src/main/java/com/zaruda/app/ui/rewards/RewardsScreen.kt`
**File (standalone):** `android-native/app/src/main/java/com/zaruda/app/ui/rewards/DailyCodeAndReferralScreens.kt`

**Problem:** The referral tree loads via `rewardsRepository.referralTree()` → API `GET /api/referral/tree`. If the API returns empty or an error, the tree silently fails (loading spinner never resolves or shows "No referrals yet").

**Fix:**
- Check if `GET /api/referral/tree` endpoint exists on the server and returns valid data
- The `ReferralTreeResponse` DTO expects `tree: ReferralNode?` — if server returns a different shape, deserialization silently fails
- Add fallback: if the API fails, show mock referral tree data (like the overview fallback) so the UI isn't empty
- Log server response to debug: `AppLogger.debug("referralTree response: $response")`

**Severity:** 🔴 High — user cannot see their referral network

---

### 2. Naming Cleanup — Points → Coins Only

**Current Problem:** The UI uses a confusing mix of "points", "coins", "XP", "reward points", "chain points" all meaning different things.

| Term Used | Where | Should Be |
|-----------|-------|-----------|
| `Total Points` | Impact Dashboard card | `Total Coins` |
| `Success Rate` | Impact Dashboard | **Remove** (confusing metric) |
| `user.chainEarnedPoints` | Multiple places | `chainEarnedCoins` |
| `user.directPoints` | Network Stats | `directEarned` |
| `user.indirectPoints` | DTO field | Should be removed |
| `xpCurrent` / `xpRequired` | Progress bars, hero banner | Keep as XP (different from coins) |

**Action Items:**
1. Rename "Total Points" → "Total Coins" in Impact Dashboard
2. Remove "Success Rate" card — users don't understand what it measures
3. Remove "Share Post" earn playbook row (+3 coins for sharing)
4. Remove "Share Post" from challenges entirely

---

### 3. Simplify Earn Tab — Remove Spin & Scratch (Broken)

**Current:** Earn tab shows daily check-in canvas, **Spin Wheel**, **Scratch Card**, Daily Secret Code, Challenges, and Redeem Store.

**Decision:** Remove Spin Wheel & Scratch Card unless fully working.

**Why:**
- User confirmed: "spin scratch etc not fully setup and if its hard to maintain remove it"
- Both use API endpoints (`/api/coins/spin`, `/api/coins/scratch`) with fallback fallback handlers
- Canvas rendering code is complex (~100+ lines each)
- Backend may not reliably support these

**Replace With — Simple Daily Actions:**
| Action | Reward |
|--------|--------|
| ✅ Open app daily | **+2 coins** (auto-grant on app launch) |
| 👆 Tap check-in button | **+5 coins** (keep existing) |
| 📱 Visit 7 days streak | **+10 bonus coins** |

No wheel, no scratch, no complex animations. Just tap "Check In" → get coins.

---

## 🟡 High Priority Improvements

### 4. User-Friendly Tier Progression — Explain "Why Should I Care?"

**Current:** The Overview tab shows a "How Levels & XP Work" card and a tier carousel (Bronze → Silver → Gold) but it doesn't answer "what's in it for ME?"

**Proposed Replacement — "Your Benefits" Card:**
```
┌─────────────────────────────────────┐
│ 🎯 Your Benefits                     │
│                                      │
│ You are Level 2 (310 / 500 XP)       │
│ ████████████████░░░░░░░ 62%          │
│                                      │
│ Unlocked:                            │
│ ✓ Post up to 5 listings/day         │
│ ✓ Basic search visibility           │
│                                      │
│ Next at Level 3 (Gold):             │
│ 🔒 Post up to 10 listings/day       │
│ 🔒 2x search boost                  │
│ 🔒 Elite Seller Badge unlockable    │
│                                      │
│ How to earn XP:                      │
│ ┌────────────────────────────────┐  │
│ │ 📅 Daily visit        +2 XP   │  │
│ │ 📋 Complete listing    +5 XP   │  │
│ │ 👥 Refer a friend      +10 XP  │  │
│ │ 💰 Complete a sale     +25 XP  │  │
│ │ 🏆 Complete purchase   +25 XP  │  │
│ └────────────────────────────────┘  │
└─────────────────────────────────────┘
```

**Key Design Principle:** Every level/tier must show the **concrete benefit** to the user. Remove vague phrases like "Premium rewards", "Exclusive perks", "VIP events".

### 5. Coin Earning — Simple & Clear

**The entire coin economy should be:**
| Action | Coins | Notes |
|--------|-------|-------|
| Daily check-in | +5 | Keep existing |
| 7-day streak bonus | +10 | Keep existing |
| Complete a sale | +25 | **Already exists** (api/sync needed) |
| Complete a purchase | +25 | **New** |
| Refer a friend (direct) | +50 | Already exists depth=1 |
| Referral chain depth 2 | +25 | Already exists |
| Creating a listing | +5 | Keep existing |

**Things to REMOVE:**
- ❌ "Share Post" earn (+3 coins) — removes entirely, no mention anywhere
- ❌ Spin Wheel — remove if not reliable
- ❌ Scratch Card — remove if not reliable
- ❌ Daily Secret Code — simplify or remove (confusing UX)
- ❌ "Success Rate" metric — remove from dashboard
- ❌ "Total Points" → rename to "Total Coins"

---

## 🟢 Nice-to-Have Improvements

### 6. Activity Tab Simplification

**Current:** Activity tab (tab index 3) shows "My Rewards" card, Coin History, Leaderboard, and Milestone Badges.

**Issues:**
- "My Rewards" card duplicates info from Overview
- Filter chips in Coin History are broken (the "bonus" filter doesn't match "Spent", "Referrals", "Daily" labels)
- Leaderboard shows "refs" but doesn't clarify if it's referrals or coins

**Fix:**
- Simplify Coin History filters to: All / Earned / Spent / Referral
- Remove duplicate "My Rewards" card
- Leaderboard: show coin total, not just referral count
- Remove Milestone Badges that are always locked (confusing)

### 7. Redeem Store — Keep Essential Items Only

**Current items:**
| Item | Cost | Keep? |
|------|------|-------|
| Listing Boost (24h) | 100 | ✅ Yes |
| Elite Seller Badge | 1000 | ✅ Yes (renamed from Featured/Premium) |
| Top Placement (7d) | 500 | ❓ Depends on backend support |
| $5 Gift Card | 250 | ❌ Remove if not actually redeemable |
| $10 Voucher | 450 | ❌ Remove if not actually redeemable |
| Custom Theme | 150 | ❌ Remove (no custom themes exist) |
| Badge Pack | 80 | ❌ Remove (what is this?) |

**Simplified Store:**
```
┌─────────────────────────────────────┐
│ 🛒 Redeem Your Coins                │
│                                      │
│ 🚀 Boost Listing (24h)    100 🪙   │
│ ⭐ Elite Seller Badge    1000 🪙   │
│ 🔝 Top Placement (7d)     500 🪙   │
└─────────────────────────────────────┘
```

---

## 🛠️ Implementation Order

### Phase 1: Quick Fixes (1-2 days)
- [ ] Remove "Success Rate" from Impact Dashboard
- [ ] Rename "Total Points" → "Total Coins"
- [ ] Remove "Share Post" row from Earn challenges
- [ ] Remove Daily Secret Code section (or simplify)
- [ ] Fix Coin History filter chips (match labels to filter logic)

### Phase 2: Simplify Earn Tab (1-2 days)
- [ ] Remove Spin Wheel canvas + button
- [ ] Remove Scratch Card canvas + button
- [ ] Remove SpinStatus / ScratchStatus from DTOs
- [ ] Replace with simple "Visit daily +2 coins" incentive text
- [ ] Clean up unused ViewModel methods (spinWheel, scratchCard, etc.)

### Phase 3: Fix Referral Tree (2-3 days)
- [ ] Debug `GET /api/referral/tree` endpoint response
- [ ] Add fallback mock tree data when API fails
- [ ] Verify DTO deserialization matches server response
- [ ] Test tree renders correctly with real data

### Phase 4: Tier Progression UX (1-2 days)
- [ ] Rewrite "How Levels & XP Work" card as "Your Benefits" card
- [ ] Show concrete unlocked/locked features by level
- [ ] Replace vague tier perks with specific, verifiable benefits

### Phase 5: Clean Up (1 day)
- [ ] Remove unused DTO fields (indirectPoints, etc.)
- [ ] Remove Gift Cards, Custom Theme, Badge Pack from store
- [ ] Simplify "My Rewards" / Activity tab
- [ ] Remove unused ViewModel state fields

---

## 📊 After vs Before Layout

### Overview Tab (Before → After)
| Before | After |
|--------|-------|
| Hero Banner | ✅ Keep |
| How Levels & XP Work | → **Your Benefits card** (clear, user-focused) |
| Tier Progression (Bronze/Silver/Gold) | ✅ Keep but show **concrete unlocked features** |
| Impact Dashboard (Total Points, Chain Depth, Active Referrals, Success Rate) | → **Total Coins**, **Network Size**, **Referrals** (remove Success Rate) |
| Coin Balance | ✅ Keep |

### Earn Tab (Before → After)
| Before | After |
|--------|-------|
| Daily Check-in (7-day calendar) | ✅ Keep |
| Spin Wheel | ❌ **Remove** |
| Scratch Card | ❌ **Remove** |
| Daily Secret Code | ❌ **Remove or simplify** |
| 7 Challenge Types (includes Share Post) | → **5 challenges** (remove Share Post) |
| Redeem Store (7 items) | → **3 items** (Boost, Badge, Top Placement) |

### Referrals Tab (Before → After)
| Before | After |
|--------|-------|
| Referral Challenge | ✅ Keep |
| Quick Share (WhatsApp/Telegram/SMS) | ✅ Keep |
| Milestone Badges | ❌ Remove (confusing, always locked) |
| Network Stats (4 cards) | → **2 cards** (Direct Referrals, Total Network) |
| Referral Network Tree | 🔴 **Fix loading** — highest priority |

### Activity Tab (Before → After)
| Before | After |
|--------|-------|
| My Rewards (5 stat rows) | ❌ Remove (duplicates Overview) |
| Coin History (with broken filters) | ✅ Keep, fix filter logic |
| Leaderboard | ✅ Keep, show coins |
| Milestone Badges | ❌ Remove (duplicates Referral tab) |
