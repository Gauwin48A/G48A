import React, { memo } from 'react';
import { FaStar } from 'react-icons/fa';


const GreenProductCard = memo(function GreenProductCard({ product }) { return (
  <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-900/30 p-4 flex flex-col items-center">
    <img src={product.image_url} alt={product.name} className="w-20 h-20 object-contain mb-3" onError={e => {e.target.src='/placeholder.svg';}} />
    <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-1 text-center">{product.name}</h3>
    <div className="flex items-center mb-1">
      {[...Array(5)].map((_, i) => (
        <FaStar key={i} className={i < Math.round(product.rating) ? "text-yellow-400" : "text-gray-300 dark:text-gray-600"} />
      ))}
    </div>
    <span className="text-lg font-bold text-gray-900 dark:text-white">₹{product.price}</span>
  </div>
); });

export default GreenProductCard;
