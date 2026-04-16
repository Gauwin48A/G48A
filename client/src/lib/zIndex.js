/**
 * Centralized z-index tokens to prevent z-index wars.
 * Import and use these constants instead of arbitrary z-[N] values.
 * 
 * Layer stack (bottom to top):
 *   base         → default content
 *   dropdown     → dropdowns, popovers, tooltips  
 *   sticky       → sticky headers, bottom nav
 *   overlay      → backdrop overlays, dim layers
 *   modal        → modals, dialogs, sheets
 *   toast        → toast notifications
 *   tooltip      → tooltips on top of everything
 *   max          → emergency override (e.g., location banner)
 */

export const Z_INDEX = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  bottomNav: 30,
  overlay: 40,
  modal: 50,
  toast: 60,
  tooltip: 70,
  locationBanner: 80,
  max: 100,
};

// Tailwind class map for use in className strings
export const Z_CLASS = {
  base: "z-0",
  dropdown: "z-10",
  sticky: "z-20",
  bottomNav: "z-30",
  overlay: "z-40",
  modal: "z-50",
  toast: "z-[60]",
  tooltip: "z-[70]",
  locationBanner: "z-[80]",
  max: "z-[100]",
};
