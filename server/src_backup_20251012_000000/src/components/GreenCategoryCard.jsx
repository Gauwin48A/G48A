import React from 'react';
import { FaMobileAlt, FaTshirt, FaLaptop, FaRegLightbulb } from "react-icons/fa";

const icons = {
  Mobiles: <FaMobileAlt className="text-blue-500 text-4xl mb-2" />,
  Fashion: <FaTshirt className="text-blue-500 text-4xl mb-2" />,
  Electronics: <FaLaptop className="text-blue-500 text-4xl mb-2" />,
  Home: <FaRegLightbulb className="text-blue-500 text-4xl mb-2" />,
};


const GreenCategoryCard = ({ category }) => (
  <div className="bg-white rounded-lg shadow p-4 flex flex-col items-center">
    {icons[category.name] || <img src={category.icon_url} alt={category.name} className="h-12 w-12 mb-2" onError={e => {e.target.src='/placeholder.svg';}} />}
    <span className="font-semibold text-gray-800 text-center">{category.name}</span>
    {category.product_count !== undefined && (
      <span className="text-xs text-gray-500 mt-1">{category.product_count} products</span>
    )}
  </div>
);

export default GreenCategoryCard;
