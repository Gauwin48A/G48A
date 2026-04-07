import DOMPurify from "dompurify";

/**
 * Sanitize user-generated HTML content to prevent XSS.
 * Use this for any UGC rendered as HTML (descriptions, bios, comments).
 *
 * @param {string} dirty - Raw HTML string from user input
 * @param {Object} [options] - DOMPurify configuration overrides
 * @returns {string} Sanitized HTML string
 */
export function sanitizeHTML(dirty, options = {}) {
  if (!dirty || typeof dirty !== "string") return "";
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      "b", "i", "em", "strong", "a", "p", "br", "ul", "ol", "li",
      "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "code", "pre",
      "span", "div", "img",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "src", "alt", "class", "title"],
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ["target"],
    FORBID_TAGS: ["style", "script", "iframe", "form", "input", "textarea", "select", "button", "object", "embed"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur"],
    ...options,
  });
}

/**
 * Strip ALL HTML tags, returning plain text only.
 * Use for search previews, notifications, meta descriptions.
 *
 * @param {string} dirty - Raw HTML/text
 * @returns {string} Plain text with no HTML
 */
export function stripHTML(dirty) {
  if (!dirty || typeof dirty !== "string") return "";
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

export default { sanitizeHTML, stripHTML };
