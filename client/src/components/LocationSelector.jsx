import React, { useState, useEffect, useRef } from 'react';
import { FiMapPin, FiX, FiSearch, FiNavigation } from 'react-icons/fi';
import { useLocation } from '@/context/LocationContext';

/**
 * LocationSelector Modal
 * Allows users to manually enter their location when GPS is inaccurate
 * Similar to Swiggy/Flipkart location picker
 */

// Popular cities in Andhra Pradesh & Telangana
const POPULAR_CITIES = [
    { name: 'Tenali', state: 'Andhra Pradesh', lat: 16.2420, lng: 80.6399 },
    { name: 'Guntur', state: 'Andhra Pradesh', lat: 16.3067, lng: 80.4365 },
    { name: 'Vijayawada', state: 'Andhra Pradesh', lat: 16.5062, lng: 80.6480 },
    { name: 'Hyderabad', state: 'Telangana', lat: 17.3850, lng: 78.4867 },
    { name: 'Visakhapatnam', state: 'Andhra Pradesh', lat: 17.6868, lng: 83.2185 },
    { name: 'Tirupati', state: 'Andhra Pradesh', lat: 13.6288, lng: 79.4192 },
    { name: 'Rajahmundry', state: 'Andhra Pradesh', lat: 17.0005, lng: 81.8040 },
    { name: 'Kakinada', state: 'Andhra Pradesh', lat: 16.9891, lng: 82.2475 },
    { name: 'Nellore', state: 'Andhra Pradesh', lat: 14.4426, lng: 79.9865 },
    { name: 'Kurnool', state: 'Andhra Pradesh', lat: 15.8281, lng: 78.0373 },
    { name: 'Anantapur', state: 'Andhra Pradesh', lat: 14.6819, lng: 77.6006 },
    { name: 'Kadapa', state: 'Andhra Pradesh', lat: 14.4674, lng: 78.8241 },
    { name: 'Ongole', state: 'Andhra Pradesh', lat: 15.5057, lng: 80.0499 },
    { name: 'Eluru', state: 'Andhra Pradesh', lat: 16.7107, lng: 81.0952 },
    { name: 'Machilipatnam', state: 'Andhra Pradesh', lat: 16.1875, lng: 81.1389 },
    // Major metros
    { name: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lng: 72.8777 },
    { name: 'Delhi', state: 'Delhi', lat: 28.7041, lng: 77.1025 },
    { name: 'Bangalore', state: 'Karnataka', lat: 12.9716, lng: 77.5946 },
    { name: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707 },
    { name: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639 },
];

const LocationSelector = ({ isOpen, onClose }) => {
    const { city, retry: retryLocation, setManualLocation } = useLocation();
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredCities, setFilteredCities] = useState(POPULAR_CITIES.slice(0, 10));
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    useEffect(() => {
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            const matches = POPULAR_CITIES.filter(c =>
                c.name.toLowerCase().includes(query) ||
                c.state.toLowerCase().includes(query)
            );
            setFilteredCities(matches.slice(0, 10));
        } else {
            setFilteredCities(POPULAR_CITIES.slice(0, 10));
        }
    }, [searchQuery]);

    const handleSelectCity = (selectedCity) => {
        // Call the context function to set manual location
        if (setManualLocation) {
            setManualLocation({
                city: selectedCity.name,
                state: selectedCity.state,
                latitude: selectedCity.lat,
                longitude: selectedCity.lng,
                isManual: true
            });
        }

        // Also save to localStorage for persistence
        localStorage.setItem('mhub_manual_location', JSON.stringify({
            city: selectedCity.name,
            state: selectedCity.state,
            latitude: selectedCity.lat,
            longitude: selectedCity.lng,
            isManual: true,
            timestamp: Date.now()
        }));

        onClose();
    };

    const handleDetectLocation = () => {
        retryLocation();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-20 bg-black/50" onClick={onClose}>
            <div
                className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-blue-600 text-white">
                    <h2 className="font-semibold text-lg flex items-center gap-2">
                        <FiMapPin className="w-5 h-5" />
                        Select Location
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-blue-500 rounded">
                        <FiX className="w-5 h-5" />
                    </button>
                </div>

                {/* Search Box */}
                <div className="p-4 border-b dark:border-gray-700">
                    <div className="relative">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Search for your city..."
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Detect Location Button */}
                    <button
                        onClick={handleDetectLocation}
                        className="w-full mt-3 flex items-center justify-center gap-2 py-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition font-medium"
                    >
                        <FiNavigation className="w-5 h-5" />
                        Detect My Location (GPS)
                    </button>
                </div>

                {/* City List */}
                <div className="max-h-80 overflow-y-auto p-2">
                    <p className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">
                        {searchQuery ? 'Search Results' : 'Popular Cities'}
                    </p>

                    {filteredCities.length === 0 ? (
                        <p className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                            No cities found. Try a different search.
                        </p>
                    ) : (
                        filteredCities.map((c, idx) => (
                            <button
                                key={`${c.name}-${idx}`}
                                onClick={() => handleSelectCity(c)}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition text-left"
                            >
                                <FiMapPin className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                <div>
                                    <p className="font-medium text-gray-800 dark:text-white">{c.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{c.state}</p>
                                </div>
                            </button>
                        ))
                    )}
                </div>

                {/* Current Location Display */}
                {city && (
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-t dark:border-gray-600">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Current location:</p>
                        <p className="text-sm font-medium text-gray-800 dark:text-white">{city}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LocationSelector;
