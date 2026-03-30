/**
 * Accessibility Utilities for MHub
 * 
 * Provides helpers for WCAG compliance, keyboard navigation,
 * screen reader support, and accessibility auditing.
 */

/**
 * WCAG contrast ratio calculator
 * @param {string} foreground - Hex color (e.g., "#ffffff")
 * @param {string} background - Hex color (e.g., "#000000")
 * @returns {number} Contrast ratio (e.g., 21 for black on white)
 */
export function calculateContrastRatio(foreground, background) {
  const getLuminance = (hex) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return 0;
    
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((c) => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Convert hex to RGB
 * @param {string} hex - Hex color
 * @returns {Object|null} RGB object or null
 */
export function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Check if contrast meets WCAG standards
 * @param {number} ratio - Contrast ratio
 * @param {string} level - 'AA' or 'AAA'
 * @param {boolean} largeText - Whether text is large (>= 18px or 14px bold)
 * @returns {boolean}
 */
export function meetsWcagContrast(ratio, level = 'AA', largeText = false) {
  const thresholds = {
    AA: largeText ? 3 : 4.5,
    AAA: largeText ? 4.5 : 7
  };
  return ratio >= thresholds[level];
}

/**
 * Generate accessible color suggestion
 * @param {string} background - Background hex color
 * @param {string} level - 'AA' or 'AAA'
 * @returns {Object} Suggested foreground colors
 */
export function suggestAccessibleColors(background, level = 'AA') {
  const bgLuminance = calculateContrastRatio('#ffffff', background) > 
                      calculateContrastRatio('#000000', background)
                      ? 'light' : 'dark';
  
  return {
    primary: bgLuminance === 'light' ? '#1a1a1a' : '#ffffff',
    secondary: bgLuminance === 'light' ? '#4a4a4a' : '#e2e8f0',
    muted: bgLuminance === 'light' ? '#666666' : '#94a3b8',
  };
}

/**
 * Keyboard navigation trap for modals
 * @param {HTMLElement} container - Modal container element
 */
export function trapFocus(container) {
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];
  
  const handleKeydown = (e) => {
    if (e.key !== 'Tab') return;
    
    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
      }
    }
  };
  
  container.addEventListener('keydown', handleKeydown);
  firstFocusable?.focus();
  
  return () => container.removeEventListener('keydown', handleKeydown);
}

/**
 * Announce message to screen readers
 * @param {string} message - Message to announce
 * @param {string} priority - 'polite' or 'assertive'
 */
export function announceToScreenReader(message, priority = 'polite') {
  const announcer = document.createElement('div');
  announcer.setAttribute('aria-live', priority);
  announcer.setAttribute('aria-atomic', 'true');
  announcer.setAttribute('class', 'sr-only');
  announcer.style.cssText = `
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  `;
  
  document.body.appendChild(announcer);
  
  // Delay to ensure screen reader picks up the change
  setTimeout(() => {
    announcer.textContent = message;
  }, 100);
  
  // Clean up after announcement
  setTimeout(() => {
    announcer.remove();
  }, 1000);
}

/**
 * Check if user prefers reduced motion
 * @returns {boolean}
 */
export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Run basic accessibility audit on current page
 * @returns {Object} Audit results
 */
export function runAccessibilityAudit() {
  const issues = [];
  const warnings = [];
  const passes = [];

  // Check for missing alt text
  const imagesWithoutAlt = document.querySelectorAll('img:not([alt])');
  if (imagesWithoutAlt.length > 0) {
    issues.push({
      type: 'missing-alt',
      count: imagesWithoutAlt.length,
      message: `${imagesWithoutAlt.length} images missing alt text`,
      elements: Array.from(imagesWithoutAlt)
    });
  } else {
    passes.push('All images have alt text');
  }

  // Check for missing form labels
  const inputsWithoutLabels = document.querySelectorAll(
    'input:not([aria-label]):not([aria-labelledby]):not([type="hidden"]):not([type="submit"]):not([type="button"])'
  );
  const unlabeledInputs = Array.from(inputsWithoutLabels).filter(input => {
    const id = input.id;
    return !id || !document.querySelector(`label[for="${id}"]`);
  });
  
  if (unlabeledInputs.length > 0) {
    issues.push({
      type: 'missing-label',
      count: unlabeledInputs.length,
      message: `${unlabeledInputs.length} form inputs missing labels`,
      elements: unlabeledInputs
    });
  } else {
    passes.push('All form inputs have labels');
  }

  // Check for buttons without accessible names
  const buttonsWithoutNames = Array.from(document.querySelectorAll('button')).filter(btn => {
    const hasText = btn.textContent.trim().length > 0;
    const hasAriaLabel = btn.getAttribute('aria-label');
    const hasAriaLabelledBy = btn.getAttribute('aria-labelledby');
    return !hasText && !hasAriaLabel && !hasAriaLabelledBy;
  });
  
  if (buttonsWithoutNames.length > 0) {
    warnings.push({
      type: 'button-no-name',
      count: buttonsWithoutNames.length,
      message: `${buttonsWithoutNames.length} buttons may lack accessible names`,
      elements: buttonsWithoutNames
    });
  } else {
    passes.push('All buttons have accessible names');
  }

  // Check heading hierarchy
  const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
  let lastLevel = 0;
  const headingIssues = [];
  
  headings.forEach(heading => {
    const level = parseInt(heading.tagName[1]);
    if (level > lastLevel + 1) {
      headingIssues.push({
        element: heading,
        issue: `Skipped from h${lastLevel} to h${level}`
      });
    }
    lastLevel = level;
  });
  
  if (headingIssues.length > 0) {
    warnings.push({
      type: 'heading-hierarchy',
      count: headingIssues.length,
      message: `${headingIssues.length} heading hierarchy issues`,
      details: headingIssues
    });
  } else {
    passes.push('Heading hierarchy is correct');
  }

  // Check for focus-visible styles
  const interactiveElements = document.querySelectorAll('a, button, input, select, textarea');
  const hasFocusStyles = Array.from(interactiveElements).some(el => {
    const styles = window.getComputedStyle(el, ':focus-visible');
    return styles.outline !== 'none' || styles.boxShadow !== 'none';
  });
  
  if (hasFocusStyles) {
    passes.push('Focus styles are present');
  } else {
    warnings.push({
      type: 'focus-styles',
      message: 'Focus styles may not be visible on interactive elements'
    });
  }

  return {
    issues,
    warnings,
    passes,
    summary: {
      issueCount: issues.length,
      warningCount: warnings.length,
      passCount: passes.length,
      score: Math.round((passes.length / (passes.length + issues.length + warnings.length)) * 100)
    }
  };
}

/**
 * React hook for accessibility announcements
 */
export function useAccessibilityAnnounce() {
  return {
    announce: announceToScreenReader,
    announcePolite: (msg) => announceToScreenReader(msg, 'polite'),
    announceAssertive: (msg) => announceToScreenReader(msg, 'assertive')
  };
}

export default {
  calculateContrastRatio,
  hexToRgb,
  meetsWcagContrast,
  suggestAccessibleColors,
  trapFocus,
  announceToScreenReader,
  prefersReducedMotion,
  runAccessibilityAudit,
  useAccessibilityAnnounce
};
