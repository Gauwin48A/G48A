import React from "react";
import heroImg from "../assets/devices-mockup.png"; // Add your device mockup image here

const HeroSection = () => (
  <section className="bg-blue-100 py-10 px-4 flex flex-col md:flex-row items-center justify-between rounded-lg max-w-6xl mx-auto mt-6">
    <div className="mb-6 md:mb-0">
      <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Great Deals on Electronics</h1>
      <p className="text-lg text-gray-700 mb-4">Up to 40% off</p>
      <button className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold shadow hover:bg-blue-700 transition" aria-label="Shop Now">
        Shop Now
      </button>
    </div>
    <img src={heroImg} alt="Electronics" className="w-64 h-auto" onError={e => { e.target.onerror = null; e.target.src = '/placeholder.svg'; }} />
  </section>
);

export default HeroSection;
