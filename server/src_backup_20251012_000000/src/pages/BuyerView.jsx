
import React, { useState } from 'react'
import { Search, Filter, MapPin, Phone, Heart } from 'lucide-react'

const BuyerView = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBrand, setSelectedBrand] = useState('')
  const [priceRange, setPriceRange] = useState('')

  // Mock data for mobile listings
  const mobileListings = [
    {
      id: 1,
      title: 'iPhone 13 Pro Max 128GB',
      brand: 'Apple',
      price: '₹75,000',
      condition: 'Like New',
      location: 'Mumbai, Maharashtra',
      seller: 'John Doe',
      verified: true,
      image: '/placeholder.svg',
      postedDate: '2 days ago'
    },
    {
      id: 2,
      title: 'Samsung Galaxy S21 256GB',
      brand: 'Samsung',
      price: '₹45,000',
      condition: 'Excellent',
      location: 'Delhi, NCR',
      seller: 'Sarah Khan',
      verified: true,
      image: '/placeholder.svg',
      postedDate: '1 week ago'
    },
    {
      id: 3,
      title: 'OnePlus 9 Pro 128GB',
      brand: 'OnePlus',
      price: '₹35,000',
      condition: 'Good',
      location: 'Bangalore, Karnataka',
      seller: 'Mike Wilson',
      verified: false,
      image: '/placeholder.svg',
      postedDate: '3 days ago'
    }
  ]

  const brands = ['Apple', 'Samsung', 'OnePlus', 'Xiaomi', 'Oppo', 'Vivo', 'Realme']

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 main-content">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Browse Mobile Phones</h1>
        <p className="text-gray-600">Find your perfect mobile phone from verified sellers</p>
      </div>

      {/* Search and Filters */}
      <div className="card mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search mobiles..."
              className="input pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="input"
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
          >
            <option value="">All Brands</option>
            {brands.map(brand => (
              <option key={brand} value={brand}>{brand}</option>
            ))}
          </select>
          <select
            className="input"
            value={priceRange}
            onChange={(e) => setPriceRange(e.target.value)}
          >
            <option value="">All Prices</option>
            <option value="0-25000">Under ₹25,000</option>
            <option value="25000-50000">₹25,000 - ₹50,000</option>
            <option value="50000-75000">₹50,000 - ₹75,000</option>
            <option value="75000+">Above ₹75,000</option>
          </select>
          <button className="btn btn-primary">
            <Filter className="w-4 h-4 mr-2" />
            Apply Filters
          </button>
        </div>
      </div>

      {/* Mobile Listings */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mobileListings.map((mobile) => (
          <div key={mobile.id} className="card hover:shadow-lg transition-shadow">
            <div className="relative">
              <img
                src={mobile.image || '/placeholder.svg'}
                onError={e => { e.target.onerror = null; e.target.src = '/placeholder.svg'; }}
                alt={mobile.title}
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
              <button className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md hover:bg-gray-50">
                <Heart className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{mobile.title}</h3>
                <p className="text-sm text-gray-500">{mobile.condition}</p>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-green-600">{mobile.price}</span>
                <span className="text-sm text-gray-500">{mobile.postedDate}</span>
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>{mobile.location}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Seller: {mobile.seller}</span>
                  {mobile.verified && (
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                      Verified
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex space-x-2 pt-2">
                <button className="btn btn-secondary flex-1">
                  <Phone className="w-4 h-4 mr-1" />
                  Contact
                </button>
                <button className="btn btn-primary flex-1">
                  View Details
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Load More */}
      <div className="text-center mt-8">
        <button className="btn btn-secondary">
          Load More Results
        </button>
      </div>
    </div>
  )
}

export default BuyerView
