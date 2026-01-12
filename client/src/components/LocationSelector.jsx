import React, { useState, useEffect, useRef } from 'react';
import { FiMapPin, FiX, FiSearch, FiNavigation, FiLoader, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import { useLocation } from '@/context/LocationContext';
import { useTranslation } from 'react-i18next';

/**
 * LocationSelector Modal
 * Allows users to detect GPS location or manually select city
 * Banking-app grade location detection
 */

// Popular cities in India
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
    { name: 'Mangalagiri', state: 'Andhra Pradesh', lat: 16.4307, lng: 80.5682 },
    // Major metros
    { name: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lng: 72.8777 },
    { name: 'Delhi', state: 'Delhi', lat: 28.7041, lng: 77.1025 },
    { name: 'Bangalore', state: 'Karnataka', lat: 12.9716, lng: 77.5946 },
    { name: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707 },
    { name: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639 },
];

const LocationSelector = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    const { city, setManualLocation } = useLocation();
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredCities, setFilteredCities] = useState(POPULAR_CITIES.slice(0, 10));
    const inputRef = useRef(null);

    // GPS Detection State
    const [isDetecting, setIsDetecting] = useState(false);
    const [gpsError, setGpsError] = useState(null);
    const [detectedLocation, setDetectedLocation] = useState(null);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
        // Reset state when modal opens
        if (isOpen) {
            setIsDetecting(false);
            setGpsError(null);
            setDetectedLocation(null);
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

    /**
     * Reverse geocode coordinates to get city name
     */
    const reverseGeocode = async (lat, lng) => {
        try {
            const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en&zoom=18&addressdetails=1`;
            const response = await fetch(url, {
                headers: { 'User-Agent': 'MHub/1.0 (marketplace app)' }
            });

            if (!response.ok) throw new Error('Geocoding failed');

            const data = await response.json();
            const address = data.address || {};

            // Get the most specific location name
            const specificLocation = address.village ||
                address.suburb ||
                address.neighbourhood ||
                address.hamlet ||
                address.locality ||
                address.town ||
                address.city ||
                address.county ||
                'Unknown';

            return {
                city: specificLocation,
                state: address.state || '',
                country: address.country || 'India',
                displayName: data.display_name || '',
                district: address.county || address.state_district || ''
            };
        } catch (err) {
            console.error('[LocationSelector] Geocoding failed:', err);
            return null;
        }
    };

    /**
     * Use Global LocationContext for detection
     * This supports Native GPS + IP Fallback automatically
     */
    const { requestLocation } = useLocation();

    const handleDetectLocation = async () => {
        console.log('[LocationSelector] === STARTING SMART DETECTION ===');
        setIsDetecting(true);
        setGpsError(null);
        setDetectedLocation(null);

        try {
            // Call the robust detection from Context (Native -> GPS -> IP)
            const locationData = await requestLocation();

            if (locationData) {
                console.log('[LocationSelector] Detection success:', locationData.city);
                setDetectedLocation({
                    ...locationData,
                    isManual: false
                });

                // Show success briefly then close
                setTimeout(() => {
                    onClose();
                }, 1500);
            } else {
                // Should rarely happen as context handles fallback
                setGpsError('Could not auto-detect location. Please search manually.');
            }
        } catch (err) {
            console.error('[LocationSelector] Detection error:', err);
            setGpsError(err.message || 'Location detection failed.');
        } finally {
            setIsDetecting(false);
        }
    };

    const handleSelectCity = (selectedCity) => {
        if (setManualLocation) {
            setManualLocation({
                city: selectedCity.name,
                state: selectedCity.state,
                latitude: selectedCity.lat,
                longitude: selectedCity.lng,
                isManual: true
            });
        }

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

                {/* GPS Detection Section */}
                <div className="p-4 border-b dark:border-gray-700 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20">
                    <button
                        onClick={handleDetectLocation}
                        disabled={isDetecting}
                        className={`w-full flex items-center justify-center gap-2 py-4 rounded-lg font-medium transition ${isDetecting
                            ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-wait'
                            : 'bg-green-500 hover:bg-green-600 text-white shadow-lg hover:shadow-xl'
                            }`}
                    >
                        {isDetecting ? (
                            <>
                                <FiLoader className="w-5 h-5 animate-spin" />
                                <span>Detecting GPS... (up to 60 sec)</span>
                            </>
                        ) : (
                            <>
                                <FiNavigation className="w-5 h-5" />
                                <span>🛰️ Detect My Location (GPS)</span>
                            </>
                        )}
                    </button>

                    {/* GPS Error */}
                    {gpsError && (
                        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <div className="flex items-start gap-2">
                                <FiAlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-700 dark:text-red-400 whitespace-pre-line">{gpsError}</p>
                            </div>
                        </div>
                    )}

                    {/* GPS Success */}
                    {detectedLocation && (
                        <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                            <div className="flex items-start gap-2">
                                <FiCheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-green-700 dark:text-green-400">
                                        ✅ Location Detected: {detectedLocation.city}
                                    </p>
                                    <p className="text-xs text-green-600 dark:text-green-500">
                                        {detectedLocation.state}, {detectedLocation.country}
                                    </p>
                                    <p className="text-xs text-green-500 dark:text-green-600 mt-1">
                                        📍 Accuracy: ±{Math.round(detectedLocation.accuracy)}m |
                                        Coords: {detectedLocation.latitude.toFixed(4)}, {detectedLocation.longitude.toFixed(4)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Search Box */}
                <div className="p-4 border-b dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Or select manually:</p>
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
                </div>

                {/* City List */}
                <div className="max-h-60 overflow-y-auto p-2">
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

                {/* Current Location Footer */}
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
