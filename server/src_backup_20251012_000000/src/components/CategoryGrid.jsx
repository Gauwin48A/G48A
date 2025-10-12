import React from "react";

const categories = [
  { name: "Mobiles", icon: "/icons/mobile.svg" },
  { name: "Fashion", icon: "/icons/fashion.svg" },
  { name: "Electronics", icon: "/icons/electronics.svg" },
  { name: "Home", icon: "/icons/home.svg" },
];

const CategoryGrid = () => (
  <section className="max-w-7xl mx-auto px-4 py-10" aria-label="Popular Categories">
    <h2 className="text-2xl font-bold mb-6 text-primary">Popular Categories</h2>
    <div className="flex gap-6 overflow-x-auto">
      {Array.isArray(categories) && categories.length > 0
        ? categories.map(cat => (
            <div
              key={cat.name}
              className="min-w-[140px] bg-light rounded-xl shadow-card flex flex-col items-center justify-center p-4 hover:shadow-cardHover transition cursor-pointer focus-within:ring-2 focus-within:ring-primary"
              tabIndex={0}
              role="link"
              aria-label={cat.name}
            >
              <img
                src={cat.icon_url || cat.icon}
                alt={cat.name}
                className="h-10 w-10 mb-2"
                loading="lazy"
                onError={e => {
                  e.target.onerror = null;
                  e.target.src = "/placeholder.svg";
                }}
              />
              <span className="font-medium text-primary mb-1">{cat.name}</span>
            </div>
          ))
        : <div className="text-center text-gray-500">No categories available</div>}
    </div>
  </section>
);

export default CategoryGrid;
