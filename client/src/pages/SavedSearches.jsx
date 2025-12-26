import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Search, Trash2, Bell, BellOff, Plus,
    ArrowLeft, Filter, MapPin, Edit2, Save
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

const SavedSearches = () => {
    const navigate = useNavigate();
    const [searches, setSearches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [toast, setToast] = useState(null);

    const [newSearch, setNewSearch] = useState({
        name: '',
        searchQuery: '',
        location: '',
        minPrice: '',
        maxPrice: ''
    });

    useEffect(() => {
        fetchSearches();
    }, []);

    const fetchSearches = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await api.get('/saved-searches', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSearches(response.data.searches || []);
        } catch (err) {
            console.error('Failed to fetch searches:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!newSearch.name || !newSearch.searchQuery) {
            showToast('Name and search query required', 'error');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            await api.post('/saved-searches', newSearch, {
                headers: { Authorization: `Bearer ${token}` }
            });
            showToast('Search saved!');
            setShowAddForm(false);
            setNewSearch({ name: '', searchQuery: '', location: '', minPrice: '', maxPrice: '' });
            fetchSearches();
        } catch (err) {
            showToast('Failed to save', 'error');
        }
    };

    const handleDelete = async (searchId) => {
        if (!window.confirm('Delete this saved search?')) return;

        try {
            const token = localStorage.getItem('token');
            await api.delete(`/saved-searches/${searchId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSearches(searches.filter(s => s.search_id !== searchId));
            showToast('Search deleted');
        } catch (err) {
            showToast('Failed to delete', 'error');
        }
    };

    const toggleNotifications = async (searchId) => {
        try {
            const token = localStorage.getItem('token');
            await api.put(`/saved-searches/${searchId}/toggle-notifications`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSearches(searches.map(s =>
                s.search_id === searchId
                    ? { ...s, notification_enabled: !s.notification_enabled }
                    : s
            ));
            showToast('Notifications updated');
        } catch (err) {
            showToast('Failed to update', 'error');
        }
    };

    const runSearch = (search) => {
        const params = new URLSearchParams();
        if (search.search_query) params.set('q', search.search_query);
        if (search.location) params.set('location', search.location);
        if (search.min_price) params.set('minPrice', search.min_price);
        if (search.max_price) params.set('maxPrice', search.max_price);
        navigate(`/all-posts?${params.toString()}`);
    };

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-lg border-b border-gray-700">
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(-1)}
                            className="text-gray-300 hover:text-white"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-xl font-bold text-white flex items-center gap-2">
                                <Search className="h-5 w-5 text-purple-400" />
                                Saved Searches
                            </h1>
                            <p className="text-xs text-gray-400">{searches.length} saved</p>
                        </div>
                    </div>
                    <Button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="bg-purple-600 hover:bg-purple-700"
                        size="sm"
                    >
                        <Plus className="h-4 w-4 mr-1" />
                        New
                    </Button>
                </div>

                {/* Add Form */}
                {showAddForm && (
                    <div className="p-4 bg-gray-800 border-b border-gray-700">
                        <div className="space-y-3">
                            <Input
                                placeholder="Search name (e.g., 'Cheap iPhones')"
                                value={newSearch.name}
                                onChange={(e) => setNewSearch({ ...newSearch, name: e.target.value })}
                                className="bg-gray-700 border-gray-600 text-white"
                            />
                            <Input
                                placeholder="Search keywords (e.g., 'iPhone 14')"
                                value={newSearch.searchQuery}
                                onChange={(e) => setNewSearch({ ...newSearch, searchQuery: e.target.value })}
                                className="bg-gray-700 border-gray-600 text-white"
                            />
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Location"
                                    value={newSearch.location}
                                    onChange={(e) => setNewSearch({ ...newSearch, location: e.target.value })}
                                    className="bg-gray-700 border-gray-600 text-white"
                                />
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    placeholder="Min price"
                                    value={newSearch.minPrice}
                                    onChange={(e) => setNewSearch({ ...newSearch, minPrice: e.target.value })}
                                    className="bg-gray-700 border-gray-600 text-white"
                                />
                                <Input
                                    type="number"
                                    placeholder="Max price"
                                    value={newSearch.maxPrice}
                                    onChange={(e) => setNewSearch({ ...newSearch, maxPrice: e.target.value })}
                                    className="bg-gray-700 border-gray-600 text-white"
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={handleSave} className="flex-1 bg-purple-600 hover:bg-purple-700">
                                    <Save className="h-4 w-4 mr-1" />
                                    Save Search
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setShowAddForm(false)}
                                    className="border-gray-600 text-gray-300"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-4 pb-24">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                    </div>
                ) : searches.length === 0 ? (
                    <div className="text-center py-16">
                        <Search className="h-16 w-16 mx-auto text-gray-600 mb-4" />
                        <h3 className="text-xl font-semibold text-gray-300 mb-2">No Saved Searches</h3>
                        <p className="text-gray-500 mb-6">Save your searches to get alerts when new posts match</p>
                        <Button
                            onClick={() => setShowAddForm(true)}
                            className="bg-purple-600 hover:bg-purple-700"
                        >
                            <Plus className="h-4 w-4 mr-1" />
                            Create First Search
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {searches.map((search) => (
                            <Card
                                key={search.search_id}
                                className="bg-gray-800/60 border-gray-700 overflow-hidden"
                            >
                                <div className="p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1" onClick={() => runSearch(search)}>
                                            <h3 className="text-white font-semibold flex items-center gap-2 cursor-pointer hover:text-purple-400">
                                                {search.search_name || search.name}
                                            </h3>
                                            <p className="text-sm text-gray-400 mt-1">
                                                Keywords: {search.search_query}
                                            </p>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {search.location && (
                                                    <Badge variant="outline" className="text-xs border-gray-600 text-gray-300">
                                                        <MapPin className="h-3 w-3 mr-1" />
                                                        {search.location}
                                                    </Badge>
                                                )}
                                                {(search.min_price || search.max_price) && (
                                                    <Badge variant="outline" className="text-xs border-gray-600 text-gray-300">
                                                        ₹{search.min_price || 0} - ₹{search.max_price || '∞'}
                                                    </Badge>
                                                )}
                                                {search.matches_count > 0 && (
                                                    <Badge className="bg-green-600">
                                                        {search.matches_count} matches
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => toggleNotifications(search.search_id)}
                                                className={search.notification_enabled ? 'text-green-400' : 'text-gray-500'}
                                            >
                                                {search.notification_enabled ? (
                                                    <Bell className="h-5 w-5" />
                                                ) : (
                                                    <BellOff className="h-5 w-5" />
                                                )}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(search.search_id)}
                                                className="text-gray-400 hover:text-red-400"
                                            >
                                                <Trash2 className="h-5 w-5" />
                                            </Button>
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => runSearch(search)}
                                        className="mt-3 w-full border-purple-500 text-purple-400 hover:bg-purple-500/20"
                                    >
                                        <Search className="h-4 w-4 mr-1" />
                                        Run This Search
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-24 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg shadow-lg z-50 ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'
                    } text-white text-sm`}>
                    {toast.message}
                </div>
            )}
        </div>
    );
};

export default SavedSearches;
