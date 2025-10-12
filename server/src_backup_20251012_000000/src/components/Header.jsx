import React from "react";
import { Bell, Plus, Filter } from "lucide-react";

const Header = () => (
  <header className="sticky top-0 z-30 w-full bg-blue-600 shadow-md flex items-center px-4 py-2">
    <div className="flex items-center gap-2">
      <img src="/vite.svg" alt="Logo" className="h-8 w-8" />
      <span className="text-white font-bold text-xl ml-2">Shop</span>
    </div>
    <div className="flex-1 flex justify-center">
      <input
        className="w-full max-w-lg px-4 py-2 rounded-full bg-white text-gray-700 focus:outline-none"
        placeholder="Search for products, brands and more"
      />
    </div>
    <div className="flex items-center gap-4 ml-4">
      <button className="flex items-center gap-1 bg-white text-blue-600 px-3 py-1 rounded-full shadow hover:bg-blue-50">
        <Filter className="w-5 h-5" />
        <span className="hidden md:inline text-sm font-medium">Filter</span>
      </button>
      <button className="bg-white text-blue-600 rounded-full p-2 shadow hover:bg-blue-50">
        <Plus className="w-5 h-5" />
      </button>
      <button className="bg-white text-blue-600 rounded-full p-2 shadow hover:bg-blue-50">
        <Bell className="w-5 h-5" />
      </button>
    </div>
  </header>
);

export default Header;
