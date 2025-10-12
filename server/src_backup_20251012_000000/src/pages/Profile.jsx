import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Shield, 
  Copy, 
  Edit, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import '../i18n';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../components/LanguageSelector';

const Profile = () => {
  // Sticky header CSS
  // .sticky-header { position: sticky; top: 0; background: #fff; z-index: 10; }
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [editErrors, setEditErrors] = useState({});
  const [preferences, setPreferences] = useState({ location: '', minPrice: '', maxPrice: '', date: '' });
  const [editPrefMode, setEditPrefMode] = useState(false);

  useEffect(() => {
    // Try to load from localStorage first for instant display after login
    const cached = localStorage.getItem('userProfile');
    if (cached) {
      try {
        setUser(JSON.parse(cached));
      } catch (e) {}
    }
    setLoading(true);
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    const token = localStorage.getItem('authToken');
    const userId = localStorage.getItem('userId') || 1;
    // Fetch profile (always refresh from API for latest info)
    fetch(`${baseUrl}/api/profile?userId=${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      credentials: 'include'
    })
      .then(res => res.json())
      .then(data => {
        if (data && typeof data === 'object') {
          setUser(data);
          setEditData({
            full_name: data.full_name || '',
            phone: data.phone || '',
            address: data.address || '',
            avatar_url: data.avatar_url || '',
            bio: data.bio || ''
          });
          setError(null);
          localStorage.setItem('userProfile', JSON.stringify(data));
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Failed to fetch profile');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    // Fetch user preferences
    if (user && user.user_id) {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      fetch(`${baseUrl}/api/profile/preferences?userId=${user.user_id}`)
        .then(res => {
          if (res.status === 404) return null;
          return res.json();
        })
        .then(data => {
          if (data && typeof data === 'object') {
            setPreferences(data);
          } else {
            setPreferences({ location: '', minPrice: '', maxPrice: '', date: '' });
          }
        })
        .catch(() => {
          setPreferences({ location: '', minPrice: '', maxPrice: '', date: '' });
        });
    }
  }, [user]);

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({ ...prev, [name]: value }));
  };

  const handlePrefChange = (e) => {
    const { name, value } = e.target;
    setPreferences(prev => ({ ...prev, [name]: value }));
  };

  const validateEdit = () => {
    const errors = {};
    if (!editData.full_name || editData.full_name.length < 2) errors.full_name = 'Full name must be at least 2 characters.';
    if (!/^([6-9][0-9]{9})$/.test(editData.phone)) errors.phone = 'Phone must be 10 digits, start with 6-9.';
    if (!editData.address || editData.address.length < 5) errors.address = 'Address must be at least 5 characters.';
    return errors;
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const errors = validateEdit();
    setEditErrors(errors);
    if (Object.keys(errors).length > 0) return;
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      const token = localStorage.getItem('authToken');
      const userId = user.user_id;
      const res = await fetch(`${baseUrl}/api/profile/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ userId, ...editData })
      });
      const updated = await res.json();
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update profile');
      }
      setUser(prev => ({ ...prev, ...updated }));
      setEditMode(false);
      toast({ title: 'Profile updated!' });
    } catch (err) {
      setEditErrors({ form: err.message || 'Failed to update profile' });
    }
  };

  const handlePrefSubmit = async (e) => {
    e.preventDefault();
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    const token = localStorage.getItem('authToken');
    const userId = user.user_id;
    await fetch(`${baseUrl}/api/profile/preferences/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ userId, ...preferences })
    });
    setEditPrefMode(false);
    toast({ title: 'Preferences updated!' });
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><p className="text-gray-500">Loading...</p></div>;
  }
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen flex-col gap-4">
        <p className="text-red-500">{error}</p>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!user) {
    return null; // or some placeholder
  }

  const profileData = user;

  return (
    <div className="bg-white min-h-screen flex flex-col items-center">
      <div className="main-container px-2 py-4 sm:px-4 sm:py-8" style={{maxWidth: '600px', margin: '0 auto'}}>
        {/* Spacing between navbar and banner */}
        <div className="h-2" /> {/* Reduced gap */}
        {/* Custom Profile Banner */}
        <div className="w-full flex flex-col items-center justify-center py-8 bg-gradient-to-r from-blue-100 to-blue-300 rounded-2xl mb-8 shadow-lg relative overflow-hidden">
          <div className="absolute left-0 top-0 w-full h-full opacity-10 pointer-events-none select-none">
            <svg width="100%" height="100%" viewBox="0 0 600 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="300" cy="60" rx="300" ry="60" fill="#3b82f6" />
            </svg>
          </div>
          <div className="relative z-10 flex flex-col items-center">
            <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="28" cy="28" r="28" fill="#2563eb" />
              <path d="M28 12L31.4721 23.5279L43 26L31.4721 28.4721L28 40L24.5279 28.4721L13 26L24.5279 23.5279L28 12Z" fill="#fff" />
            </svg>
            <h1 className="text-3xl font-extrabold text-black mt-4 mb-1 drop-shadow">Profile</h1>
            <p className="text-base text-black font-medium">Your account and verification details</p>
          </div>
        </div>
        <div className="max-w-6xl mx-auto p-4 space-y-6 bg-white rounded-2xl shadow-lg overflow-y-auto">
          <Card className="shadow-lg border-0 rounded-2xl overflow-hidden">
            <CardContent className="p-8">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6">
                {/* Profile Photo Upload */}
                <div className="flex flex-col items-center space-x-0 space-y-3 mb-4 lg:mb-0">
                  <div className="relative">
                    <Avatar className="h-24 w-24 ring-4 ring-blue-200">
                      <AvatarFallback className="text-3xl bg-blue-500 text-white font-bold">
                        {profileData.name?.split(' ').map(n => n[0]).join('') || 'JD'}
                      </AvatarFallback>
                    </Avatar>
                    <label htmlFor="profile-photo-upload" className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-2 cursor-pointer shadow-lg hover:bg-blue-700 transition" title="Upload profile photo">
                      <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M12 16v-4m0 0V8m0 4h4m-4 0H8" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="2"/></svg>
                      <input id="profile-photo-upload" type="file" accept="image/*" className="hidden" />
                    </label>
                  </div>
                  <h1 className="text-3xl font-bold text-gray-800 mb-2">{profileData.name}</h1>
                  <p className="text-gray-600">User ID: {profileData.id}</p>
                </div>
                <Button className="bg-blue-500 hover:bg-blue-600 text-white" onClick={() => setEditMode(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              </div>
              {/* Wall Photo Upload */}
              <div className="w-full flex flex-col items-center mb-8">
                <div className="relative w-full max-w-2xl h-40 rounded-2xl overflow-hidden bg-blue-100 border border-blue-200 flex items-center justify-center">
                  <span className="text-blue-400 text-lg">Upload a wall photo</span>
                  <label htmlFor="wall-photo-upload" className="absolute bottom-3 right-3 bg-blue-600 text-white rounded-full p-2 cursor-pointer shadow-lg hover:bg-blue-700 transition" title="Upload wall photo">
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M12 16v-4m0 0V8m0 4h4m-4 0H8" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><rect x="3" y="3" width="18" height="18" rx="4" stroke="#fff" strokeWidth="2"/></svg>
                    <input id="wall-photo-upload" type="file" accept="image/*" className="hidden" />
                  </label>
                </div>
              </div>
              {/* Tabs Section - Rewards Style */}
              <Card className="shadow-lg border-0 rounded-2xl overflow-hidden bg-blue-50">
                <CardContent className="p-0">
                  <Tabs defaultValue="personal" className="w-full">
                    <div className="border-b border-blue-200">
                      <TabsList className="h-auto p-0 bg-transparent">
                        <TabsTrigger value="personal" className="px-6 py-4 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none border-b-2 border-transparent">
                          Personal Info
                        </TabsTrigger>
                        <TabsTrigger value="verification" className="px-6 py-4 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none border-b-2 border-transparent">
                          Verification
                        </TabsTrigger>
                      </TabsList>
                    </div>
                    <TabsContent value="personal" className="p-8">
                      <Card className="border-0 bg-transparent">
                        <CardHeader>
                          <CardTitle className="text-xl text-blue-800">Personal Information</CardTitle>
                          <p className="text-blue-600">Manage your personal details</p>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <h4 className="text-sm font-semibold text-blue-700 mb-2">Full Name</h4>
                              <p className="text-blue-900">{profileData.name}</p>
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-blue-700 mb-2">Gender</h4>
                              <p className="text-blue-900">{profileData.gender}</p>
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-blue-700 mb-2">Date of Birth</h4>
                              <div className="flex items-center space-x-2">
                                <Calendar className="w-4 h-4 text-blue-500" />
                                <p className="text-blue-900">{profileData.dateOfBirth}</p>
                              </div>
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-blue-700 mb-2">Phone Number (Public)</h4>
                              <div className="flex items-center space-x-2">
                                <Phone className="w-4 h-4 text-blue-500" />
                                <p className="text-blue-900">{profileData.phone}</p>
                              </div>
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-blue-700 mb-2">Email (Private)</h4>
                              <div className="flex items-center space-x-2">
                                <Mail className="w-4 h-4 text-blue-500" />
                                <p className="text-blue-900">{profileData.email}</p>
                              </div>
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-blue-700 mb-2">Location</h4>
                              <div className="flex items-center space-x-2">
                                <MapPin className="w-4 h-4 text-blue-500" />
                                <p className="text-blue-900">{profileData.location}</p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                    <TabsContent value="verification" className="p-8">
                      <Card className="border-0 bg-transparent">
                        <CardHeader>
                          <CardTitle className="text-xl text-blue-800">Verification Details</CardTitle>
                          <p className="text-blue-600">Your verification status and documents</p>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <h4 className="text-sm font-semibold text-blue-700 mb-2">Aadhaar Status</h4>
                              <p className="text-blue-900">{profileData.aadhaarStatus}</p>
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-blue-700 mb-2">PAN Status</h4>
                              <p className="text-blue-900">{profileData.panStatus}</p>
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-blue-700 mb-2">Verified On</h4>
                              <div className="flex items-center space-x-2">
                                <Shield className="w-4 h-4 text-blue-500" />
                                <p className="text-blue-900">{profileData.verifiedOn}</p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
              {editMode ? (
                <form className="space-y-4" onSubmit={handleEditSubmit} aria-label="Edit Profile Form">
                  <div>
                    <label htmlFor="full_name" className="block font-medium">Full Name</label>
                    <input id="full_name" name="full_name" value={editData.full_name} onChange={handleEditChange} className="input" aria-invalid={!!editErrors.full_name} aria-describedby={editErrors.full_name ? 'full_name-error' : undefined} />
                    {editErrors.full_name && <span id="full_name-error" className="text-red-600">{editErrors.full_name}</span>}
                  </div>
                  <div>
                    <label htmlFor="phone" className="block font-medium">Phone</label>
                    <input id="phone" name="phone" value={editData.phone} onChange={handleEditChange} className="input" aria-invalid={!!editErrors.phone} aria-describedby={editErrors.phone ? 'phone-error' : undefined} />
                    {editErrors.phone && <span id="phone-error" className="text-red-600">{editErrors.phone}</span>}
                  </div>
                  <div>
                    <label htmlFor="address" className="block font-medium">Address</label>
                    <input id="address" name="address" value={editData.address} onChange={handleEditChange} className="input" aria-invalid={!!editErrors.address} aria-describedby={editErrors.address ? 'address-error' : undefined} />
                    {editErrors.address && <span id="address-error" className="text-red-600">{editErrors.address}</span>}
                  </div>
                  <div>
                    <label htmlFor="avatar_url" className="block font-medium">Avatar URL</label>
                    <input id="avatar_url" name="avatar_url" value={editData.avatar_url} onChange={handleEditChange} className="input" />
                  </div>
                  <div>
                    <label htmlFor="bio" className="block font-medium">Bio</label>
                    <textarea id="bio" name="bio" value={editData.bio} onChange={handleEditChange} className="input" />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" className="bg-blue-600 text-white">Save</Button>
                    <Button type="button" variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
                  </div>
                </form>
              ) : null}
            </CardContent>
          </Card>
          <div className="w-full max-w-2xl mx-auto mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-blue-900">My Preferences for Recommendations</h2>
              <Button onClick={() => setEditPrefMode(e => !e)}>{editPrefMode ? 'Cancel' : 'Edit'}</Button>
            </div>
            {editPrefMode ? (
              <form onSubmit={handlePrefSubmit} className="flex flex-wrap gap-2 mb-4">
                <select name="location" value={preferences.location} onChange={e => setPreferences({ ...preferences, location: e.target.value })} className="border rounded p-2">
                  <option value="">Select Location</option>
                  <option value="Delhi">Delhi {preferences.location === 'Delhi' && '✓'}</option>
                  <option value="Mumbai">Mumbai {preferences.location === 'Mumbai' && '✓'}</option>
                  <option value="Bangalore">Bangalore {preferences.location === 'Bangalore' && '✓'}</option>
                  <option value="Chennai">Chennai {preferences.location === 'Chennai' && '✓'}</option>
                  <option value="Kolkata">Kolkata {preferences.location === 'Kolkata' && '✓'}</option>
                </select>
                <input name="minPrice" value={preferences.minPrice} onChange={handlePrefChange} placeholder="Min Price" type="number" className="border rounded px-2 py-1 text-sm w-24" />
                <input name="maxPrice" value={preferences.maxPrice} onChange={handlePrefChange} placeholder="Max Price" type="number" className="border rounded px-2 py-1 text-sm w-24" />
                <input name="date" value={preferences.date} onChange={handlePrefChange} placeholder="Date" type="date" className="border rounded px-2 py-1 text-sm" />
                <Button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Save</Button>
              </form>
            ) : (
              <div className="flex flex-wrap gap-4 mb-4">
                <div className="text-gray-700">Location: <span className="font-bold">{preferences.location || 'Any'}</span></div>
                <div className="text-gray-700">Min Price: <span className="font-bold">{preferences.minPrice || 'Any'}</span></div>
                <div className="text-gray-700">Max Price: <span className="font-bold">{preferences.maxPrice || 'Any'}</span></div>
                <div className="text-gray-700">Date: <span className="font-bold">{preferences.date || 'Any'}</span></div>
              </div>
            )}
          </div>
          <Button onClick={() => window.location.href = '/channels/create'} className="mt-4 w-full bg-blue-600 text-white">
            {t('create_channel')}
          </Button>
        </div>
      </div>
      <LanguageSelector />
    </div>
  );
};

export default Profile;
