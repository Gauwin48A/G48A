import { readFile } from 'node:fs/promises';
import path from 'node:path';

const APP_FILE = path.resolve(process.cwd(), 'src/App.jsx');

const ROUTE_TARGETS = [
  {
    route: '/all-posts',
    file: 'src/pages/AllPosts.jsx',
    requiredStates: ['No results for the current filters', ') : error ? ('],
    requiredCtas: ['Clear all filters', 'Retry']
  },
  {
    route: '/home',
    file: 'src/pages/Home.jsx',
    requiredStates: ['if (error)', 'No Posts Yet'],
    requiredCtas: ['Reload Page', 'Open All Posts']
  },
  {
    route: '/search',
    file: 'src/pages/SearchPage.jsx',
    requiredStates: ['marker="loading"', 'marker="error"', 'marker="empty"'],
    requiredCtas: ['data-ux-action="search_clear_filters"', 'data-ux-action="search_browse_all_posts"']
  },
  {
    route: '/categories',
    file: 'src/pages/Categories.jsx',
    requiredStates: ['error && (', 'No categories match your search'],
    requiredCtas: ['Retry', 'Clear']
  },
  {
    route: '/channels',
    file: 'src/pages/ChannelsListPage.jsx',
    requiredStates: [') : error ? (', 'No channels yet'],
    requiredCtas: ['Create Channel', "t('retry') || 'Retry'"]
  },
  {
    route: '/channels/:id',
    file: 'src/pages/ChannelPage.jsx',
    requiredStates: ['if (loading)', 'No posts yet'],
    requiredCtas: ['Create Post', "t('retry') || 'Retry'"]
  },
  {
    route: '/tier-selection',
    file: 'src/pages/TierSelection.jsx',
    requiredStates: ['error && (', 'Failed to upgrade. Please try again.'],
    requiredCtas: ["returnTo: '/tier-selection'", 'Buy 1 Post Credit']
  },
  {
    route: '/dashboard',
    file: 'src/pages/Dashboard.jsx',
    requiredStates: ['if (error && !user)', 'We could not load profile metrics right now. Retry or continue with marketplace actions.'],
    requiredCtas: ['/login?returnTo=%2Fdashboard', "translatedFallback('retry', 'Retry')"]
  },
  {
    route: '/analytics',
    file: 'src/pages/Analytics.jsx',
    requiredStates: ['Loading analytics...', 'No post analytics yet. Publish your first listing to start tracking performance.'],
    requiredCtas: ['Retry now or return to posts.', '>Retry</Button>']
  },
  {
    route: '/admin-panel',
    file: 'src/pages/AdminPanel.jsx',
    requiredStates: ['Loading admin operations...', 'No recent admin activity available.'],
    requiredCtas: ['Retry', 'Clear User Filter']
  },
  {
    route: '/for-you',
    file: 'src/pages/ForYou.jsx',
    requiredStates: ['Could not load more recommendations. Please retry.', 'No matches found for your current filters.'],
    requiredCtas: ['Sign In to Continue', 'Retry']
  },
  {
    route: '/public-wall',
    file: 'src/pages/PublicWall.jsx',
    requiredStates: ['No public wall data yet', 'Public wall data is temporarily unavailable. Please retry.'],
    requiredCtas: ['Browse Marketplace', 'Retry']
  },
  {
    route: '/my-home',
    file: 'src/pages/MyHome.jsx',
    requiredStates: ['if (error && allPosts.length === 0)', 'Could not load your listings. Please retry.'],
    requiredCtas: ["state={{ returnTo: '/my-home' }}", 'Retry']
  },
  {
    route: '/profile',
    file: 'src/pages/Profile.jsx',
    requiredStates: ['marker="loading"', 'marker="error"', 'loading_profile'],
    requiredCtas: ['/login?returnTo=%2Fprofile', '/signup?returnTo=%2Fprofile']
  },
  {
    route: '/security',
    file: 'src/pages/SecuritySettings.jsx',
    requiredStates: ['marker="loading"', 'Could not refresh security status'],
    requiredCtas: ["returnTo: '/security'", 'Retry']
  },
  {
    route: '/feed',
    file: 'src/pages/FeedPage.jsx',
    requiredStates: ['Feed unavailable', 'No posts yet'],
    requiredCtas: ['Log in for full feed', 'Browse marketplace posts']
  },
  {
    route: '/feed/:id',
    file: 'src/pages/FeedPostDetail.jsx',
    requiredStates: ['We could not load this post right now. Please try again.', 'Post unavailable'],
    requiredCtas: ['Retry', 'Back to Feed']
  },
  {
    route: '/my-feed',
    file: 'src/pages/MyFeedPage.jsx',
    requiredStates: ['Unable to load your feed posts right now. Please retry.', "You haven't posted anything yet"],
    requiredCtas: ['/login?returnTo=%2Fmy-feed', 'Open public feed']
  },
  {
    route: '/buyer-view',
    file: 'src/pages/BuyerView.jsx',
    requiredStates: ['Buyer listings unavailable', 'No matching listings found'],
    requiredCtas: ['Clear filters', 'Browse all posts']
  },
  {
    route: '/reviews/:userId',
    file: 'src/pages/Reviews.jsx',
    requiredStates: ['Reviews unavailable', 'No reviews yet.'],
    requiredCtas: ['returnTo: `/reviews/${userId}`', 'Retry']
  },
  {
    route: '/kyc',
    file: 'src/pages/KYC/KycVerification.jsx',
    requiredStates: ['KYC status unavailable', 'Verification in progress'],
    requiredCtas: ["returnTo: '/kyc'", 'Refresh status']
  },
  {
    route: '/aadhaar-verify',
    file: 'src/pages/AadhaarVerify.jsx',
    requiredStates: ['Verification successful', 'Verification failed'],
    requiredCtas: ["returnTo: '/aadhaar-verify'", 'Upload and verify']
  }
];

const PANEL_CONTRACTS = [
  {
    panel: 'profile-preferences',
    file: 'src/pages/Profile.jsx',
    requiredStates: [
      'marker="profile-preferences-loading"',
      'marker="profile-preferences-error"',
      'marker="profile-categories-loading"',
      'marker="profile-categories-error"'
    ],
    requiredCtas: [
      'data-ux-action="profile_preferences_clear_error"',
      'data-ux-action="profile_categories_retry"'
    ]
  },
  {
    panel: 'profile-settings-contacts-sync',
    file: 'src/pages/Profile.jsx',
    requiredStates: [
      'marker="profile-settings-contacts-loading"',
      'marker="profile-settings-contacts-error"'
    ],
    requiredCtas: [
      'data-ux-action="profile_contacts_sync_start"',
      'data-ux-action="profile_contacts_sync_dismiss_error"'
    ]
  },
  {
    panel: 'security-status',
    file: 'src/pages/SecuritySettings.jsx',
    requiredStates: [
      'marker="loading"',
      'Could not refresh security status'
    ],
    requiredCtas: [
      'Retry',
      'returnTo: \'/security\''
    ]
  },
  {
    panel: 'security-2fa-action-outcomes',
    file: 'src/pages/SecuritySettings.jsx',
    requiredStates: [
      'marker="security-setup-loading"',
      'marker="security-setup-error"',
      'marker="security-verify-loading"',
      'marker="security-verify-error"',
      'marker="security-disable-loading"',
      'marker="security-disable-error"'
    ],
    requiredCtas: [
      'data-ux-action="security_setup_dismiss_error"',
      'data-ux-action="security_verify_clear_error"',
      'data-ux-action="security_disable_clear_error"'
    ]
  },
  {
    panel: 'feed-post-detail-recovery',
    file: 'src/pages/FeedPostDetail.jsx',
    requiredStates: [
      'marker="loading"',
      'marker="error"',
      'We could not load this post right now. Please try again.'
    ],
    requiredCtas: [
      'retryLabel="Retry"',
      'Back to Feed'
    ]
  }
];

const STATE_TOKENS = [
  'loading',
  'error',
  'retry',
  'empty',
  'no_',
  'no '
];

async function readText(filePath) {
  return readFile(filePath, 'utf8');
}

function compact(value) {
  return String(value || '').replace(/\s+/g, '');
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasRoute(appSource, route) {
  const routePattern = new RegExp(`path\\s*[:=]\\s*["']${escapeRegExp(route)}["']`);
  return routePattern.test(appSource);
}

function patternVariants(pattern) {
  const source = String(pattern || '');
  const variants = new Set([source]);
  variants.add(source.replace(/=\"/g, ':"').replace(/='/g, ":'"));
  variants.add(source.replace(/:\"/g, '="').replace(/:'/g, "='"));
  variants.add(source.replace(/"/g, "'"));
  variants.add(source.replace(/'/g, '"'));
  return [...variants];
}

function hasPattern(source, pattern) {
  const compactSource = compact(source).toLowerCase();
  const rawPattern = String(pattern || '');
  const attrValueMatch = rawPattern.match(/(?:data-ux-action|marker|retryLabel)\s*[:=]\s*["']([^"']+)["']/i);
  if (attrValueMatch && compactSource.includes(compact(attrValueMatch[1]).toLowerCase())) {
    return true;
  }

  const routeValueMatch = rawPattern.match(/\/[a-z0-9\-/:]+/i);
  if (routeValueMatch && compactSource.includes(compact(routeValueMatch[0]).toLowerCase())) {
    return true;
  }

  const quotedLiteralMatch = rawPattern.match(/["']([^"']{4,})["']/);
  if (quotedLiteralMatch && compactSource.includes(compact(quotedLiteralMatch[1]).toLowerCase())) {
    return true;
  }

  return patternVariants(pattern).some((candidate) => compactSource.includes(compact(candidate).toLowerCase()));
}

function countTokenHits(source) {
  const lowered = source.toLowerCase();
  return STATE_TOKENS.filter((token) => lowered.includes(token));
}

function findMissingPatterns(source, patterns = []) {
  if (!patterns.length) {
    return [];
  }
  return patterns.filter((pattern) => !hasPattern(source, pattern));
}

function hasAnyPattern(source, patterns = []) {
  if (!patterns.length) {
    return true;
  }
  return patterns.some((pattern) => hasPattern(source, pattern));
}

async function main() {
  const failures = [];
  const warnings = [];
  const appSource = await readText(APP_FILE);

  for (const target of ROUTE_TARGETS) {
    if (!hasRoute(appSource, target.route)) {
      failures.push(`Missing route in App.jsx: ${target.route}`);
      continue;
    }

    const filePath = path.resolve(process.cwd(), target.file);
    let pageSource = '';
    try {
      pageSource = await readText(filePath);
    } catch {
      failures.push(`Missing page file for ${target.route}: ${target.file}`);
      continue;
    }

    const hits = countTokenHits(pageSource);
    if (hits.length < 2) {
      warnings.push(`Weak state coverage signal on ${target.route} (${target.file})`);
    }

    const missingStates = findMissingPatterns(pageSource, target.requiredStates);
    if (target.requiredStates?.length && !hasAnyPattern(pageSource, target.requiredStates)) {
      failures.push(`Missing explicit state assertions on ${target.route}: ${target.requiredStates.join(', ')}`);
    }

    const missingCtas = findMissingPatterns(pageSource, target.requiredCtas);
    if (target.requiredCtas?.length && !hasAnyPattern(pageSource, target.requiredCtas)) {
      failures.push(`Missing key CTA assertions on ${target.route}: ${target.requiredCtas.join(', ')}`);
    }
  }

  for (const panel of PANEL_CONTRACTS) {
    const filePath = path.resolve(process.cwd(), panel.file);
    let panelSource = '';
    try {
      panelSource = await readText(filePath);
    } catch {
      failures.push(`Missing panel file for ${panel.panel}: ${panel.file}`);
      continue;
    }

    const missingPanelStates = findMissingPatterns(panelSource, panel.requiredStates);
    if (panel.requiredStates?.length && !hasAnyPattern(panelSource, panel.requiredStates)) {
      failures.push(`Missing panel-state assertions on ${panel.panel}: ${panel.requiredStates.join(', ')}`);
    }

    const missingPanelCtas = findMissingPatterns(panelSource, panel.requiredCtas);
    if (panel.requiredCtas?.length && !hasAnyPattern(panelSource, panel.requiredCtas)) {
      failures.push(`Missing panel CTA assertions on ${panel.panel}: ${panel.requiredCtas.join(', ')}`);
    }
  }

  if (warnings.length > 0) {
    console.log('[ux-smoke] WARNINGS');
    warnings.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item}`);
    });
  }

  if (failures.length > 0) {
    console.error('[ux-smoke] FAILURES');
    failures.forEach((item, index) => {
      console.error(`  ${index + 1}. ${item}`);
    });
    process.exit(1);
  }

  console.log(`[ux-smoke] Passed route smoke checks for ${ROUTE_TARGETS.length} major routes.`);
}

main().catch((error) => {
  console.error('[ux-smoke] Unexpected failure:', error?.message || error);
  process.exit(1);
});
