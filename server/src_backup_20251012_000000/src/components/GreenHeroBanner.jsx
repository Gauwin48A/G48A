import React, { useEffect, useState } from 'react';

const GreenHeroBanner = () => {
  const [banner, setBanner] = useState({ headline: '', subtext: '', image: '', button: '' });
  useEffect(() => {
    const fetchBanner = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        const res = await fetch(`${baseUrl}/api/banner`);
        const data = await res.json();
        setBanner({
          headline: data.headline || 'Great Deals on Electronics',
          subtext: data.subtext || 'Up to 40% off',
          image: data.image || '/electronics.png',
          button: data.button || 'Shop Now',
        });
      } catch {
        setBanner({ headline: 'Great Deals on Electronics', subtext: 'Up to 40% off', image: '/electronics.png', button: 'Shop Now' });
      }
    };
    fetchBanner();
  }, []);
  return (
    <section className="w-full h-64 md:h-96 bg-gradient-to-r from-blue-100 to-blue-300 flex items-center justify-center text-text" role="banner">
      <div className="flex flex-col md:flex-row items-center gap-8 max-w-6xl w-full px-4">
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{banner.headline}</h1>
          <p className="text-lg md:text-2xl mb-6">{banner.subtext}</p>
          <button className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition" aria-label="Shop Now">{banner.button}</button>
        </div>
        <img src={banner.image} alt="Banner" className="w-56 h-40 object-contain" />
      </div>
    </section>
  );
};

export default GreenHeroBanner;
