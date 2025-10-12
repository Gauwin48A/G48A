import React from 'react';
import { FaStar } from 'react-icons/fa';


const GreenProductCard = ({ product }) => (
  <div className="bg-white rounded-lg shadow p-4 flex flex-col items-center">
    <img src={product.image_url} alt={product.name} className="w-20 h-20 object-contain mb-3" onError={e => {e.target.src='/placeholder.svg';}} />
    <h3 className="font-semibold text-gray-800 mb-1 text-center">{product.name}</h3>
    <div className="flex items-center mb-1">
      {[...Array(5)].map((_, i) => (
        <FaStar key={i} className={i < Math.round(product.rating) ? "text-yellow-400" : "text-gray-300"} />
      ))}
    </div>
    <span className="text-lg font-bold text-gray-900">₹{product.price}</span>
  </div>
);

export default GreenProductCard;
