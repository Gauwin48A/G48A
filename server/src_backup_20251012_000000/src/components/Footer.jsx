import React from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row items-center justify-between">
        <div className="flex items-center space-x-2 mb-2 md:mb-0">
          <Shield className="h-8 w-8 text-blue-600" />
          <span className="text-xl font-bold text-gray-900">MobileVerify</span>
        </div>
        <div className="flex gap-6">
          <Link to="/buyer-view" className="text-gray-600 hover:text-blue-600 font-semibold">Browse Phones</Link>
          <Link to="/add-post" className="text-gray-600 hover:text-blue-600 font-semibold">Sell Your Phone</Link>
          <Link to="/aadhaar-verify" className="text-gray-600 hover:text-blue-600 font-semibold">Get Verified</Link>
          <Link to="/rewards" className="text-gray-600 hover:text-blue-600 font-semibold">Rewards</Link>
        </div>
        <div className="text-gray-500 text-xs">© 2025 MobileVerify. All rights reserved.</div>
      </div>
    </footer>
  );
}
