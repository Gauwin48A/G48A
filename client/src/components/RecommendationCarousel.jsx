import React, { memo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import SmartImage from "@/components/SmartImage";

/**
 * RecommendationCarousel — horizontal swipeable card carousel
 * Per Deatiled_doc.txt: For You page needs horizontal carousels
 * with "Because you liked..." reason overlays.
 */
const RecommendationCarousel = memo(function RecommendationCarousel({
  title,
  subtitle,
  items = [],
  onItemClick,
}) {
  const navigate = useNavigate();
  const trackRef = useRef(null);

  const scroll = (direction) => {
    if (!trackRef.current) return;
    const amount = direction === "left" ? -160 : 160;
    trackRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  const handleClick = (item) => {
    if (onItemClick) {
      onItemClick(item);
    } else if (item.id || item.post_id) {
      navigate(`/post/${item.id || item.post_id}`);
    }
  };
  const handleKeyDown = (event, item) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleClick(item);
    }
  };

  if (!items.length) return null;

  return (
    <section className="mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[11px] text-gray-500 dark:text-slate-400">{subtitle}</p>
          )}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => scroll("left")}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-slate-300" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4 text-gray-600 dark:text-slate-300" />
          </button>
        </div>
      </div>

      {/* Carousel Track */}
      <div
        ref={trackRef}
        className="mhub-carousel flex gap-2 px-1"
      >
        {items.map((item, index) => {
          const price = item.price != null ? Number(item.price).toLocaleString("en-IN") : null;
          const imageUrl = item.image_url || item.images?.[0] || item.thumbnail || null;

          return (
            <div
              key={item.id || item.post_id || index}
              onClick={() => handleClick(item)}
              onKeyDown={(event) => handleKeyDown(event, item)}
              className="w-[140px] flex-shrink-0 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
              role="button"
              tabIndex={0}
              aria-label={item.title || "Recommended product"}
            >
              {/* Image with optional reason overlay */}
              <div className="relative h-[100px] bg-gray-100 dark:bg-slate-700">
                {imageUrl ? (
                  <SmartImage
                    src={imageUrl}
                    alt={item.title || "Product"}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-slate-600 text-2xl">
                    📦
                  </div>
                )}
                {item.reason && (
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 py-1">
                    <p className="text-[9px] text-white text-center leading-tight truncate">
                      {item.reason}
                    </p>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-1.5">
                <h4 className="text-[11px] font-semibold text-gray-900 dark:text-white line-clamp-2 leading-tight">
                  {item.title || "Untitled"}
                </h4>
                {price && (
                  <p className="text-xs font-bold text-green-600 dark:text-green-400 mt-0.5">
                    ₹{price}
                  </p>
                )}
                {item.interested_count > 0 && (
                  <p className="text-[9px] text-gray-400 dark:text-slate-500 mt-0.5">
                    👥 {item.interested_count} interested
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
});

export default RecommendationCarousel;
