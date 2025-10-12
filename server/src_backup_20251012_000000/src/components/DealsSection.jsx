import React from "react";
import ProductCard from "./ProductCard";

const products = [
  {
    id: 1,
    name: "iPhone 14 Pro",
    image: "/products/iphone14pro.png",
    price: 99999,
    rating: 4.8,
  },
  {
    id: 2,
    name: "Samsung Galaxy S23",
    image: "/products/galaxy-s23.png",
    price: 84999,
    rating: 4.7,
  },
  {
    id: 3,
    name: "Sony WH-1000XM5",
    image: "/products/sony-wh1000xm5.png",
    price: 29999,
    rating: 4.6,
  },
  {
    id: 4,
    name: "MacBook Air M2",
    image: "/products/macbook-air-m2.png",
    price: 109999,
    rating: 4.9,
  },
];

const DealsSection = () => (
  <section className="max-w-7xl mx-auto px-4 py-10" aria-label="Today's Deals">
    <h2 className="text-2xl font-bold mb-6 text-primary">Today's Deals</h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
      {Array.isArray(products) && products.length > 0
        ? products.map(product => <ProductCard key={product.id} product={product} />)
        : <div className="col-span-4 text-center text-gray-500">No deals available</div>}
    </div>
  </section>
);

export default DealsSection;
