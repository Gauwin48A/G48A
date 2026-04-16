import { Helmet } from "react-helmet-async";

const SITE_NAME = "MHub";
const DEFAULT_DESCRIPTION = "India's most trusted verified marketplace. Buy and sell with confidence.";
const DEFAULT_IMAGE = "/icons/og-image.png";

/**
 * Reusable SEO head component for dynamic page titles and meta tags.
 * @param {Object} props
 * @param {string} props.title - Page title
 * @param {string} [props.description] - Meta description
 * @param {string} [props.image] - OG image URL
 * @param {string} [props.url] - Canonical URL
 * @param {string} [props.type] - OG type (default: "website")
 */
export default function SEOHead({ title, description, image, url, type = "website" }) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const metaDescription = description || DEFAULT_DESCRIPTION;
  const ogImage = image || DEFAULT_IMAGE;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:type" content={type} />
      {url && <meta property="og:url" content={url} />}
      {url && <link rel="canonical" href={url} />}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}
