import React, { useState, useCallback, useRef } from "react";
import {
  FaHeart,
  FaRegHeart,
  FaShare,
  FaEye,
  FaHandHoldingHeart,
  FaChevronLeft,
  FaChevronRight,
  FaEllipsisV,
  FaShoppingCart,
  FaCartPlus,
  FaBookmark,
  FaRegBookmark,
} from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { normalizeMediaList, resolveMediaUrl } from "@/lib/mediaUrl";

const PLACEHOLDER = "/placeholder.svg";

/**
 * Collects all image URLs from a post object, trying many field names.
 */
function collectImages(post) {
  if (!post) return [PLACEHOLDER];
  const urls = [];
  const push = (value) => {
    normalizeMediaList(value).forEach((item) => {
      const resolved = resolveMediaUrl(item, PLACEHOLDER);
      if (resolved) urls.push(resolved);
    });
  };
  const pushFrom = (obj) => {
    if (!obj) return;
    for (const key of [
      "images", "image_urls", "imageUrls", "image_url", "imageUrl",
      "image", "photo", "photos", "gallery", "media", "media_urls",
      "mediaUrls", "cover_image", "coverImage", "primary_image",
      "primaryImage", "thumbnail",
    ]) {
      push(obj[key]);
    }
  };
  pushFrom(post);
  pushFrom(post.post);
  pushFrom(post.listing);
  const unique = [...new Set(
    urls.map((u) => String(u || "").trim()).filter((u) => u && u !== PLACEHOLDER),
  )];
  return unique.length ? unique : [PLACEHOLDER];
}

/**
 * MobilePostCard — clean, mobile-first product card shared across pages.
 *
 * Props:
 *  post            - the post object
 *  onClick         - navigate to detail
 *  onLike          - toggle like
 *  onShare         - share post
 *  onSave          - toggle save/bookmark
 *  onInterested    - show buyer interest
 *  onCartToggle    - add/remove cart
 *  onMenuAction    - (action, post) for menu items like report/promote
 *  isLiked         - boolean
 *  isSaved         - boolean
 *  inCart           - boolean
 *  likeCount       - number
 *  viewCount       - number
 *  formatPrice     - (value) => string
 *  formatTime      - (dateStr) => string
 *  t               - translation fn (key, fallback) => string
 *  showSeller      - show seller row (default true)
 *  isOwner         - is this user's own post
 *  categoryLabel   - optional category badge
 *  subcategoryLabel - optional subcategory badge
 */
export default function MobilePostCard({
  post,
  onClick,
  onLike,
  onShare,
  onSave,
  onInterested,
  onCartToggle,
  onMenuAction,
  isLiked = false,
  isSaved = false,
  inCart = false,
  likeCount = 0,
  viewCount = 0,
  formatPrice,
  formatTime,
  t = (key, fb) => fb,
  showSeller = true,
  isOwner = false,
  categoryLabel,
  subcategoryLabel,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [carouselIdx, setCarouselIdx] = useState(0);
  const trackRef = useRef(null);

  const imageList = collectImages(post);
  const postId = post?.post_id ?? post?.id ?? "";
  const title = post?.title || t("untitled", "Untitled");
  const description = post?.description || "";
  const sellerName = post?.user?.name || post?.user_name || post?.username || "";
  const sellerVerified = post?.user?.is_verified || post?.user?.verified || false;
  const location = post?.location || post?.city || post?.area || "";
  const condition = post?.condition || post?.item_condition || "";
  const createdAt = post?.created_at || post?.createdAt || "";

  // Price
  const rawPrice = post?.price ?? post?.price_value ?? post?.selling_price ?? post?.asking_price ?? post?.amount ?? 0;
  const priceNum = typeof rawPrice === "number" ? rawPrice : Number(String(rawPrice).replace(/[^0-9.-]/g, "")) || 0;
  const priceLabel = priceNum > 0 && formatPrice ? formatPrice(priceNum) : priceNum > 0 ? `₹${priceNum.toLocaleString("en-IN")}` : null;
  const timeLabel = createdAt && formatTime ? formatTime(createdAt) : "";

  const scrollTo = useCallback((idx) => {
    const track = trackRef.current;
    if (!track) return;
    const clamped = ((idx % imageList.length) + imageList.length) % imageList.length;
    track.scrollTo({ left: track.clientWidth * clamped, behavior: "smooth" });
    setCarouselIdx(clamped);
  }, [imageList.length]);

  const handleScroll = useCallback((e) => {
    const el = e.currentTarget;
    const w = el.clientWidth || 1;
    const idx = Math.round(el.scrollLeft / w);
    setCarouselIdx(Math.max(0, Math.min(imageList.length - 1, idx)));
  }, [imageList.length]);

  return (
    <article
      className="mhub-mobile-card group"
      onClick={() => onClick?.(post)}
    >
      {/* --- Seller Row --- */}
      {showSeller && sellerName && (
        <div className="mhub-mobile-card-seller">
          <div className="mhub-mobile-card-avatar">
            {sellerName.charAt(0).toUpperCase()}
          </div>
          <div className="mhub-mobile-card-seller-info">
            <div className="mhub-mobile-card-seller-name">
              <span>{sellerName}</span>
              {sellerVerified && (
                <svg className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="mhub-mobile-card-seller-meta">
              {location && <span>{location}</span>}
              {timeLabel && <><span className="mhub-dot">·</span><span>{timeLabel}</span></>}
            </div>
          </div>
          {/* Menu trigger */}
          <button
            type="button"
            className="mhub-mobile-card-menu-btn"
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            aria-label={t("more_options", "More options")}
          >
            <FaEllipsisV className="w-4 h-4" />
          </button>
          {/* Dropdown menu */}
          {menuOpen && (
            <div
              className="mhub-mobile-card-menu"
              onClick={(e) => e.stopPropagation()}
            >
              <button type="button" onClick={() => { onShare?.(post); setMenuOpen(false); }}>
                {t("share", "Share")}
              </button>
              <button type="button" onClick={() => { onSave?.(post); setMenuOpen(false); }}>
                {isSaved ? t("saved", "Saved") : t("save", "Save")}
              </button>
              {isOwner && (
                <button type="button" onClick={() => { onMenuAction?.("promote", post); setMenuOpen(false); }}>
                  {t("promote", "Promote")}
                </button>
              )}
              <button type="button" onClick={() => { onCartToggle?.(post); setMenuOpen(false); }}>
                {inCart ? t("in_cart", "In Cart") : t("add_to_cart", "Add to Cart")}
              </button>
              <button
                type="button"
                className="mhub-mobile-card-menu-danger"
                onClick={() => { onMenuAction?.("report", post); setMenuOpen(false); }}
              >
                {t("report", "Report")}
              </button>
            </div>
          )}
        </div>
      )}

      {/* --- Image Carousel --- */}
      <div className="mhub-mobile-card-media">
        {/* Price badge overlay */}
        {priceLabel && (
          <div className="mhub-mobile-card-price-badge">
            {priceLabel}
          </div>
        )}

        {/* Category / subcategory badges */}
        {(categoryLabel || subcategoryLabel) && (
          <div className="mhub-mobile-card-category-badges">
            {categoryLabel && <span className="mhub-mobile-card-cat-badge">{categoryLabel}</span>}
            {subcategoryLabel && <span className="mhub-mobile-card-subcat-badge">{subcategoryLabel}</span>}
          </div>
        )}

        <div
          ref={trackRef}
          onScroll={handleScroll}
          className="mhub-mobile-card-carousel"
        >
          {imageList.map((src, idx) => (
            <div key={`${postId}-img-${idx}`} className="mhub-mobile-card-slide">
              <img
                src={src}
                alt={`${title} ${t("image", "image")} ${idx + 1}`}
                loading="lazy"
                className={`mhub-mobile-card-img ${src === PLACEHOLDER ? "opacity-40 grayscale" : ""}`}
                onError={(e) => { e.currentTarget.src = PLACEHOLDER; }}
              />
            </div>
          ))}
        </div>

        {/* Carousel controls */}
        {imageList.length > 1 && (
          <>
            <button
              type="button"
              className="mhub-mobile-card-nav mhub-mobile-card-nav-left"
              onClick={(e) => { e.stopPropagation(); scrollTo(carouselIdx - 1); }}
              aria-label={t("previous_image", "Previous image")}
            >
              <FaChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              className="mhub-mobile-card-nav mhub-mobile-card-nav-right"
              onClick={(e) => { e.stopPropagation(); scrollTo(carouselIdx + 1); }}
              aria-label={t("next_image", "Next image")}
            >
              <FaChevronRight className="w-4 h-4" />
            </button>
            <div className="mhub-mobile-card-dots">
              {imageList.map((_, idx) => (
                <button
                  key={`${postId}-dot-${idx}`}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); scrollTo(idx); }}
                  className={`mhub-mobile-card-dot ${idx === carouselIdx ? "active" : ""}`}
                  aria-label={`${t("go_to_image", "Go to image")} ${idx + 1}`}
                />
              ))}
            </div>
            <div className="mhub-mobile-card-counter">
              {carouselIdx + 1}/{imageList.length}
            </div>
          </>
        )}
      </div>

      {/* --- Content --- */}
      <div className="mhub-mobile-card-body">
        <h3 className="mhub-mobile-card-title">{title}</h3>

        {description && (
          <p className="mhub-mobile-card-desc">
            {description.length > 100 ? `${description.slice(0, 100)}...` : description}
          </p>
        )}

        {/* Meta chips: condition, location */}
        <div className="mhub-mobile-card-chips">
          {condition && (
            <span className="mhub-mobile-card-chip">{condition}</span>
          )}
          {location && (
            <span className="mhub-mobile-card-chip">{location}</span>
          )}
        </div>
      </div>

      {/* --- Action Bar --- */}
      <div className="mhub-mobile-card-actions">
        <button
          type="button"
          className="mhub-mobile-card-action"
          onClick={(e) => { e.stopPropagation(); onLike?.(post); }}
          aria-label={t("like", "Like")}
        >
          {isLiked
            ? <FaHeart className="w-5 h-5 text-red-500" />
            : <FaRegHeart className="w-5 h-5" />
          }
          {likeCount > 0 && <span>{likeCount}</span>}
        </button>

        <button
          type="button"
          className="mhub-mobile-card-action"
          onClick={(e) => { e.stopPropagation(); onShare?.(post); }}
          aria-label={t("share", "Share")}
        >
          <FaShare className="w-5 h-5" />
        </button>

        <button
          type="button"
          className="mhub-mobile-card-action"
          onClick={(e) => { e.stopPropagation(); onSave?.(post); }}
          aria-label={isSaved ? t("saved", "Saved") : t("save", "Save")}
        >
          {isSaved
            ? <FaBookmark className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            : <FaRegBookmark className="w-5 h-5" />
          }
        </button>

        <button
          type="button"
          className="mhub-mobile-card-action mhub-mobile-card-action-interest"
          onClick={(e) => { e.stopPropagation(); onInterested?.(post); }}
          aria-label={t("interested", "Interested")}
        >
          <FaHandHoldingHeart className="w-5 h-5" />
          <span className="hidden sm:inline">{t("interested", "Interested")}</span>
        </button>

        <span className="mhub-mobile-card-action mhub-mobile-card-views">
          <FaEye className="w-4 h-4" />
          <span>{viewCount}</span>
        </span>

        <Button
          size="sm"
          className="mhub-mobile-card-cta"
          onClick={(e) => { e.stopPropagation(); onClick?.(post); }}
        >
          {t("view_details", "View Details")}
        </Button>
      </div>
    </article>
  );
}
