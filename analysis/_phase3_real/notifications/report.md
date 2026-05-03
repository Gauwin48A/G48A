# Audit — notifications

- **Route:** `/notifications`
- **Logged in:** true
- **Viewport:** undefined×undefined
- **Scroll height:** 888px (NaN screens)
- **Score:** **9/10**

## Rubric
| Dimension | Score | Max |
|---|---|---|
| Layout | 2 | 2.0 |
| Typography | 0.5 | 1.5 |
| Touch | 1.5 | 1.5 |
| Spacing | 1.5 | 1.5 |
| Dark mode | 1 | 1.0 |
| Performance | 1.5 | 1.5 |
| Functionality | 1 | 1.0 |

## ⚠ Warnings
- 7 tiny fonts (<12px)

## Detail
- Total elements: 130
- Interactive: 11
- Text nodes: 37
- Images: 0 (0 broken)
- Cards detected: 0
- Hero block: false
- Bottom nav: yes

### Tiny fonts (<12px)
- `<span>` 11px — "Home" — `mhub-bottom-nav-label `
- `<span>` 11px — "All Posts" — `mhub-bottom-nav-label `
- `<span>` 11px — "For You" — `mhub-bottom-nav-label `
- `<span>` 11px — "Feed" — `mhub-bottom-nav-label `
- `<span>` 11px — "Rewards" — `mhub-bottom-nav-label `
- `<span>` 11px — "Profile" — `mhub-bottom-nav-label `
- `<span>` 11px — "More" — `mhub-bottom-nav-label `

### Console
- **debug**: [vite] connecting...
- **warning**: Something has shimmed the React DevTools global hook (__REACT_DEVTOOLS_GLOBAL_HOOK__). Fast Refresh is not compatible with this shim and will be disabled.
- **debug**: [vite] connected.
- **log**: i18next: languageChanged en-US
- **log**: i18next: initialized {debug: true, initAsync: true, ns: Array(1), defaultNS: Array(1), fallbackLng: Array(1)}
- **log**: [i18n] Language: en, Direction: ltr, Cached: true
- **log**: [MHub:api.js] module loaded; baseURL=/api
- **warning**: [Push] VITE_VAPID_PUBLIC_KEY is missing or placeholder. Push notifications disabled.
- **log**: i18next::backendConnector: loaded namespace translation for language hi {24_48_hours: 24-48 घंटे, 24_48h_response: 24-48 घंटे प्रतिक्रिया, 24h_validity: 24 घंटे वैधता, 2k_to_10k: ₹2K-₹10K, 500_to_2k: 
- **log**: i18next::backendConnector: loaded namespace translation for language te {24_48_hours: 24-48 గంటలు, 24_48h_response: 24-48 గంటల్లో ప్రతిస్పందన, 24h_validity: 24 గంటల వ్యాలిడిటీ, 2k_to_10k: ₹2K నుండి ₹1
- **log**: i18next::backendConnector: loaded namespace translation for language ta {24_48_hours: 24-48 மணி நேரம், 24_48h_response: 24-48 மணி நேர பதில், 24h_validity: 24 மணி நேர செல்லுபடி, 2k_to_10k: ₹2K-₹10K, 50
- **log**: i18next::backendConnector: loaded namespace translation for language kn {24_48_hours: 24-48 ಗಂಟೆಗಳು, 24_48h_response: 24-48 ಗಂಟೆಗಳಲ್ಲಿ ಪ್ರತಿಕ್ರಿಯೆ, 24h_validity: 24 ಗಂಟೆ ವ್ಯಾಲಿಡಿಟಿ, 2k_to_10k: ₹2K-₹10
- **log**: i18next::backendConnector: loaded namespace translation for language mr {24_48_hours: 24-48 तास, 24_48h_response: 24-48 तासांत प्रतिसाद, 24h_validity: 24 तास वैधता, 2k_to_10k: ₹2K-₹10K, 500_to_2k: ₹50
- **log**: i18next::backendConnector: loaded namespace translation for language bn {24_48_hours: 24-48 ঘন্টা, 24_48h_response: 24-48 ঘন্টার মধ্যে প্রতিক্রিয়া, 24h_validity: 24 ঘন্টা বৈধতা, 2k_to_10k: ₹2K-₹10K, 
- **log**: [LocationContext] Initializing location context
- **log**: [MHub:Interceptor] START /auth/session
- **log**: [MHub:Interceptor] baseURL /api
- **log**: [MHub:Interceptor] deviceId ok
- **log**: [MHub:Interceptor] nonce ok
- **log**: [MHub:Interceptor] DONE /auth/session
- **log**: [MHub:Interceptor] START /coins/engagement
- **log**: [MHub:Interceptor] baseURL /api
- **log**: [MHub:Interceptor] deviceId ok
- **log**: [MHub:Interceptor] nonce ok
- **log**: [MHub:Interceptor] DONE /coins/engagement
- **log**: [MHub:Interceptor] START /categories/with-subcategories
- **log**: [MHub:Interceptor] baseURL /api
- **log**: [MHub:Interceptor] deviceId ok
- **log**: [MHub:Interceptor] nonce ok
- **log**: [MHub:Interceptor] DONE /categories/with-subcategories

### Network failures
- 401 GET http://127.0.0.1:4173/api/coins/engagement
- 401 POST http://127.0.0.1:4173/api/auth/refresh-token
- 401 GET http://127.0.0.1:4173/api/notifications/unread-count
- 401 GET http://127.0.0.1:4173/api/cart?includeSaved=true
- 401 GET http://127.0.0.1:4173/api/notifications/unread-count
- 401 GET http://127.0.0.1:4173/api/notifications/unread-count

### Screenshots
- Full page: `notifications-full.png`
- `notifications-scroll00.png`
- `notifications-scroll01.png`