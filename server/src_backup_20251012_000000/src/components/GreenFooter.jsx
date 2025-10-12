import React from 'react';

const GreenFooter = () => (
  <footer className="bg-primary text-white py-8 mt-12" role="contentinfo">
    <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
      <div>
        <h2 className="font-bold text-lg mb-2">GreenKart</h2>
        <p className="text-sm">Your trusted e-commerce platform for great deals.</p>
      </div>
      <div>
        <h2 className="font-bold text-lg mb-2">Quick Links</h2>
        <ul className="space-y-2">
          <li><a href="/" className="hover:underline">Home</a></li>
          <li><a href="/categories" className="hover:underline">Categories</a></li>
          <li><a href="/deals" className="hover:underline">Deals</a></li>
          <li><a href="/profile" className="hover:underline">Profile</a></li>
        </ul>
      </div>
      <div>
        <h2 className="font-bold text-lg mb-2">Follow Us</h2>
        <div className="flex gap-4">
          <a href="#" aria-label="Twitter" className="hover:text-secondary"><svg width="24" height="24" fill="currentColor"><circle cx="12" cy="12" r="10" /></svg></a>
          <a href="#" aria-label="Facebook" className="hover:text-secondary"><svg width="24" height="24" fill="currentColor"><rect x="4" y="4" width="16" height="16" /></svg></a>
          <a href="#" aria-label="Instagram" className="hover:text-secondary"><svg width="24" height="24" fill="currentColor"><ellipse cx="12" cy="12" rx="10" ry="8" /></svg></a>
        </div>
      </div>
    </div>
    <div className="text-center text-xs mt-8">© 2025 GreenKart. All rights reserved.</div>
  </footer>
);

export default GreenFooter;
