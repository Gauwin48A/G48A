/**
 * SEO Head Manager — dynamic meta tags for social sharing
 * Injects OG/Twitter/JSON-LD per page for rich previews when shared
 * Call updateSEO() on route change or data load
 */

const DEFAULT_TITLE = 'MHub - Verified Marketplace';
const DEFAULT_DESC = 'Explore trusted listings, discover nearby deals, and buy or sell confidently on MHub.';
const DEFAULT_IMAGE = '/pwa-512x512.png';
const SITE_NAME = 'MHub';

function setMeta(property, content, isName) {
  const attr = isName ? 'name' : 'property';
  let el = document.querySelector(`meta[${attr}="${property}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, property);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/**
 * Update page SEO meta tags
 * @param {Object} opts
 * @param {string} opts.title - Page title
 * @param {string} opts.description - Page description
 * @param {string} opts.image - OG image URL
 * @param {string} opts.url - Canonical URL
 * @param {string} opts.type - OG type (website|product|article)
 * @param {Object} opts.product - Product data for schema {name, price, currency, image, condition, availability, seller}
 */
export function updateSEO({ title, description, image, url, type, product } = {}) {
  const t = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
  const d = description || DEFAULT_DESC;
  const img = image || DEFAULT_IMAGE;
  const u = url || window.location.href;

  // Title
  document.title = t;

  // Standard
  setMeta('description', d, true);

  // Open Graph
  setMeta('og:title', t);
  setMeta('og:description', d);
  setMeta('og:image', img);
  setMeta('og:url', u);
  setMeta('og:type', type || 'website');
  setMeta('og:site_name', SITE_NAME);

  // Twitter
  setMeta('twitter:title', t, true);
  setMeta('twitter:description', d, true);
  setMeta('twitter:image', img, true);

  // Canonical
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }
  canonical.setAttribute('href', u);

  // Product structured data
  if (product) {
    injectProductSchema(product);
  }
}

/**
 * Inject Product JSON-LD for Google rich results
 */
function injectProductSchema(p) {
  // Remove existing product schema
  const existing = document.querySelector('script[data-seo="product"]');
  if (existing) existing.remove();

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name || '',
    description: p.description || '',
    image: p.image || DEFAULT_IMAGE,
    offers: {
      '@type': 'Offer',
      price: p.price || 0,
      priceCurrency: p.currency || 'INR',
      availability: p.availability || 'https://schema.org/InStock',
      itemCondition: p.condition === 'new'
        ? 'https://schema.org/NewCondition'
        : 'https://schema.org/UsedCondition',
    },
  };

  if (p.seller) {
    schema.offers.seller = { '@type': 'Person', name: p.seller };
  }

  if (p.rating) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: p.rating,
      reviewCount: p.reviewCount || 1,
    };
  }

  if (p.category) {
    schema.category = p.category;
  }

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.setAttribute('data-seo', 'product');
  script.textContent = JSON.stringify(schema);
  document.head.appendChild(script);
}

/**
 * Inject BreadcrumbList schema
 * @param {Array<{name: string, url: string}>} items
 */
export function updateBreadcrumbs(items) {
  const existing = document.querySelector('script[data-seo="breadcrumb"]');
  if (existing) existing.remove();

  if (!items || items.length === 0) return;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.setAttribute('data-seo', 'breadcrumb');
  script.textContent = JSON.stringify(schema);
  document.head.appendChild(script);
}

/** Reset to defaults (call on unmount/route change) */
export function resetSEO() {
  updateSEO();
  const productSchema = document.querySelector('script[data-seo="product"]');
  if (productSchema) productSchema.remove();
  const breadcrumbSchema = document.querySelector('script[data-seo="breadcrumb"]');
  if (breadcrumbSchema) breadcrumbSchema.remove();
}
