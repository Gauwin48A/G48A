import React, { useState, useCallback, useRef } from "react";
import {
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
import SafeImage from "@/components/SafeImage";
import CardContextMenu from "@/components/CardContextMenu";

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
const MobilePostCard = React.memo(function MobilePostCard({
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
    <CardContextMenu onShare={() => navigator.share?.({ title, url: window.location.href }).catch(() => {})} onSave={() => {}} onReport={() => {}}>
    <article
      className="mhub-mobile-card mhub-grid-card group"
      onClick={() => onClick?.(post)}
    >
      {/* --- Image --- */}
      <div className="mhub-grid-card-media">
        <SafeImage
          src={imageList[0]}
          alt={title}
          loading="lazy"
          className={`mhub-grid-card-img ${imageList[0] === PLACEHOLDER ? "opacity-40 grayscale" : ""}`}
          fallbackSrc={PLACEHOLDER}
        />
        {/* Image count badge */}
        {imageList.length > 1 && (
          <span className="mhub-grid-card-img-count">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            {imageList.length}
          </span>
        )}
        {/* Wishlist save */}
        <button
          type="button"
          className="mhub-grid-card-heart"
          onClick={(e) => { e.stopPropagation(); onSave?.(post); }}
          aria-label={isSaved ? t("saved", "Saved") : t("save", "Save")}
        >
          {isSaved
            ? <FaBookmark className="w-4 h-4 text-indigo-500" />
            : <FaRegBookmark className="w-4 h-4" />
          }
        </button>
      </div>

      {/* --- Content --- */}
      <div className="mhub-grid-card-body">
        {priceLabel && (
          <p className="mhub-grid-card-price">{priceLabel}</p>
        )}
        <h3 className="mhub-grid-card-title">{title}</h3>
        {location && (
          <p className="mhub-grid-card-location">{location}</p>
        )}
        {condition && (
          <span className="mhub-grid-card-condition">{condition}</span>
        )}
      </div>
    </article>
    </CardContextMenu>
  );
});
