import React, { memo } from 'react';
import { FaStar } from 'react-icons/fa';
import { getApiOriginBase } from '@/lib/networkConfig';

const resolveImageUrl = (url) => {
  if (!url) return '/placeholder.svg';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/uploads/')) return getApiOriginBase() + url;
  return '/placeholder.svg';
};

const GreenProductCard = memo(function GreenProductCard({ product }) {
  const price = product.price != null ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(product.price)) : '—';
  const rating = Math.round(Number(product.rating) || 0);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-900/30 p-4 flex flex-col items-center">
      <img
        src={resolveImageUrl(product.image_url)}
        alt={product.name}
        className="w-20 h-20 object-contain mb-3"
        loading="lazy"
        onError={e => { e.target.onerror = null; e.target.src = '/placeholder.svg'; }}
      />
      <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-1 text-center">{product.name}</h3>
      <div className="flex items-center mb-1" role="img" aria-label={`Rating: ${rating} out of 5`}>
        {[...Array(5)].map((_, i) => (
          <FaStar key={i} className={i < rating ? "text-yellow-400" : "text-gray-300 dark:text-gray-600"} />
        ))}
      </div>
      <span className="text-lg font-bold text-gray-900 dark:text-white">{price}</span>
    </div>
  );
});

export default GreenProductCard;
