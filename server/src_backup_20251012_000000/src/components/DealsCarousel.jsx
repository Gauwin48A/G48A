import React from "react";
import { Card } from "@/components/ui/card";

const DealsCarousel = ({ deals, onView }) => (
  <div className="w-full flex flex-col items-center mb-10">
    <h2 className="text-xl font-bold text-gray-900 mb-4">Today's Deals</h2>
    <div className="flex gap-6 w-full max-w-6xl overflow-x-auto scrollbar-hide px-2">
      {deals.length === 0 ? (
        <div className="text-center text-blue-400">No deals available right now.</div>
      ) : (
        deals.map(post => (
          <Card key={post.id} className="rounded-2xl shadow bg-white border-0 flex flex-col items-center p-4 min-w-[220px] max-w-[220px]">
            <div className="w-24 h-24 bg-gray-100 rounded mb-3 flex items-center justify-center">
              {/* Placeholder for image */}
              <span className="text-gray-400">Image</span>
            </div>
            <div className="font-semibold text-gray-800 text-base text-center mb-1">{post.title}</div>
            <div className="text-yellow-500 text-xs mb-1">★★★★★</div>
            <div className="text-blue-900 text-lg font-bold mb-1">₹{post.price}</div>
            <button className="bg-blue-600 text-white w-full mt-2 rounded-lg py-1" onClick={() => onView(post.id)}>View</button>
          </Card>
        ))
      )}
    </div>
  </div>
);

export default DealsCarousel;
