import React from "react";
import { Smartphone, Shirt, Monitor, Sofa } from "lucide-react";

const categories = [
  { label: "Electronics", icon: <Smartphone className="w-7 h-7 text-blue-500" /> },
  { label: "Fashion", icon: <Shirt className="w-7 h-7 text-pink-500" /> },
  { label: "Home", icon: <Sofa className="w-7 h-7 text-yellow-500" /> },
  { label: "Mobiles", icon: <Monitor className="w-7 h-7 text-green-500" /> },
];

// TODO: Replace hardcoded categories with DB-driven fetch

const CategoriesGrid = () => (
  <div className="w-full flex justify-center mt-6 mb-6">
    <div className="flex bg-white rounded-2xl shadow px-4 py-3 gap-8 max-w-3xl w-full items-center justify-center">
      {categories.map((cat) => (
        <div key={cat.label} className="flex flex-col items-center gap-1 cursor-pointer hover:bg-blue-50 rounded-xl px-2 py-1">
          {cat.icon}
          <span className="text-sm font-medium text-gray-700">{cat.label}</span>
        </div>
      ))}
    </div>
  </div>
);

export default CategoriesGrid;
