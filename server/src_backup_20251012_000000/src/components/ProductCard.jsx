import React from "react";
import { AiFillStar } from "react-icons/ai";

const ProductCard = ({ product }) => {
  // Defensive: Ensure product is a valid object
  if (!product || typeof product !== "object") {
    return <div className="bg-white p-4 rounded-xl">Invalid product data</div>;
  }

  // Defensive: Ensure rating is a number
  const rating = typeof product.rating === "number" ? product.rating : 0;

  // Helper to get full image URL
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  const getImageUrl = (img) => {
    if (!img) return '/placeholder.svg';
    if (img.startsWith('/uploads/')) return baseUrl + img;
    if (img.startsWith('http')) return img;
    return '/placeholder.svg';
  };

  return (
    <div
      className="bg-white rounded-xl shadow-card overflow-hidden flex flex-col hover:scale-105 hover:shadow-cardHover transition focus-within:ring-2 focus-within:ring-primary"
      tabIndex={0}
      role="article"
      aria-label={product.name}
    >
      <img
        src={getImageUrl(product.image_url || product.image)}
        alt={product.name}
        className="h-40 w-full object-contain bg-light"
        loading="lazy"
        onError={e => {
          e.target.onerror = null;
          e.target.src = "/placeholder.svg";
        }}
      />
      <div className="p-4 flex-1 flex flex-col justify-between">
        <h2 className="text-lg font-semibold mb-2 text-dark">{product.name}</h2>
        <div className="flex items-center mb-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i}>
              <AiFillStar className={`w-4 h-4 ${i < Math.round(rating) ? "text-primary" : "text-light"}`} />
            </span>
          ))}
          <span className="ml-2 text-sm text-dark">{Number(rating).toFixed(1)}</span>
        </div>
        <div className="flex items-center justify-between mt-auto">
          <span className="text-primary font-bold text-xl">₹{Number(product.price).toLocaleString()}</span>
          <button className="px-3 py-1 bg-primary text-white rounded-xl hover:bg-accent transition" aria-label="View Product">
            View
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
