import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Shield, Copy, Edit, Phone, Mail, MapPin, Calendar, Camera,
  User, Settings, Bell, Lock, CreditCard, Star, CheckCircle,
  ChevronRight, Sparkles, Award, TrendingUp
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import '../i18n';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../components/LanguageSelector';
import { createChannel, getChannelByUser } from '../lib/api';

const Profile = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [editErrors, setEditErrors] = useState({});
  const [preferences, setPreferences] = useState({ location: '', minPrice: '', maxPrice: '', date: '' });
  const [editPrefMode, setEditPrefMode] = useState(false);
  const [channel, setChannel] = useState(null);
  const [activeTab, setActiveTab] = useState('personal');

  useEffect(() => {
    const cached = localStorage.getItem('userProfile');
    if (cached) {
      try { setUser(JSON.parse(cached)); } catch (e) { }
    }
    setLoading(true);
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    const token = localStorage.getItem('authToken');
    const userId = localStorage.getItem('userId');
    if (!userId || !token) {
      setError('You must be logged in to view your profile.');
      setLoading(false);
      return;
    }
    fetch(`${baseUrl}/api/profile?userId=${userId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      credentials: 'include'
    })
      .then(res => res.json())
      .then(data => {
        if (data && typeof data === 'object' && !data.error) {
          setUser(data);
          setEditData({
            full_name: data.full_name || data.name || '',
            phone: data.phone || '',
            address: data.address || '',
            avatar_url: data.avatar_url || '',
            bio: data.bio || ''
          });
          localStorage.setItem('userProfile', JSON.stringify(data));
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (user?.user_id) {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      fetch(`${baseUrl}/api/profile/preferences?userId=${user.user_id}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) setPreferences(data);
        })
        .catch(() => { });

      getChannelByUser(user.user_id)
        .then(res => setChannel(res.data))
        .catch(() => setChannel(null));
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
    if (!editData.full_name || editData.full_name.length < 2) errors.full_name = 'Name must be at least 2 characters';
    if (editData.phone && !/^[6-9][0-9]{9}$/.test(editData.phone)) errors.phone = 'Invalid phone number';
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
      const res = await fetch(`${baseUrl}/api/profile/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ userId: user.user_id, ...editData })
      });
      const updated = await res.json();
      if (res.ok) {
        setUser(prev => ({ ...prev, ...updated }));
        setEditMode(false);
        toast({ title: 'Profile updated successfully!' });
      }
    } catch (err) {
      setEditErrors({ form: err.message });
    }
  };

  const handlePrefSubmit = async (e) => {
    e.preventDefault();
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    const token = localStorage.getItem('authToken');
    await fetch(`${baseUrl}/api/profile/preferences/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ userId: user.user_id, ...preferences })
    });
    setEditPrefMode(false);
    toast({ title: 'Preferences saved!' });
  };

  const isLoggedIn = localStorage.getItem('userId') && localStorage.getItem('authToken');

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-10 shadow-2xl text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
            <User className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">{t('profile')}</h2>
          <p className="text-white/80 text-lg mb-8">Manage your account, preferences, and settings</p>
          <div className="flex flex-col gap-3">
            <a href="/login" className="bg-white text-indigo-600 text-lg px-8 py-4 rounded-xl font-bold hover:bg-white/90 transition">Login to Continue</a>
            <a href="/signup" className="border-2 border-white/50 text-white text-lg px-8 py-4 rounded-xl font-semibold hover:bg-white/10 transition">Create Account</a>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-100">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">😕</div>
          <p className="text-red-500 text-xl mb-4">{error || 'Profile not found'}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  const profileData = user;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900" style={{ paddingBottom: '180px' }}>
      {/* Premium Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />

        <div className="relative max-w-4xl mx-auto px-4 py-12 sm:px-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Avatar with Upload */}
            <div className="relative group">
              <Avatar className="h-28 w-28 ring-4 ring-white/30 shadow-xl">
                {profileData.avatar_url ? (
                  <AvatarImage src={profileData.avatar_url} />
                ) : (
                  <AvatarFallback className="text-3xl font-bold text-white bg-gradient-to-br from-blue-500 to-indigo-600">
                    {profileData.name?.split(' ').map(n => n[0]).join('') || profileData.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                  </AvatarFallback>
                )}
              </Avatar>
              <input
                type="file"
                id="avatar-upload"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const formData = new FormData();
                  formData.append('avatar', file);
                  formData.append('userId', user.user_id);
                  try {
                    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
                    const token = localStorage.getItem('authToken');
                    const res = await fetch(`${baseUrl}/api/profile/upload-avatar`, {
                      method: 'POST',
                      headers: { 'Authorization': `Bearer ${token}` },
                      body: formData
                    });
                    const data = await res.json();
                    if (res.ok && data.avatar_url) {
                      setUser(prev => ({ ...prev, avatar_url: data.avatar_url }));
                      toast({ title: 'Profile picture updated!' });
                    } else {
                      toast({ title: 'Upload failed', variant: 'destructive' });
                    }
                  } catch (err) {
                    toast({ title: 'Upload error', variant: 'destructive' });
                  }
                }}
              />
              <button
                onClick={() => document.getElementById('avatar-upload')?.click()}
                className="absolute bottom-0 right-0 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition group-hover:bg-blue-50"
              >
                <Camera className="w-5 h-5 text-blue-600" />
              </button>
            </div>

            {/* User Info */}
            <div className="text-center md:text-left flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">{profileData.name || profileData.full_name}</h1>
              <p className="text-white/80 mb-3">{profileData.email}</p>
              <div className="flex flex-wrap justify-center md:justify-start gap-2">
                <Badge className="bg-white/20 text-white border-0">
                  <Shield className="w-3 h-3 mr-1" /> {profileData.verified ? 'Verified' : 'Unverified'}
                </Badge>
                <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0">
                  <Star className="w-3 h-3 mr-1" /> {profileData.role || 'Member'}
                </Badge>
                {channel && (
                  <Badge className="bg-purple-500 text-white border-0">
                    <Sparkles className="w-3 h-3 mr-1" /> Channel Owner
                  </Badge>
                )}
              </div>
            </div>

            {/* Edit Button */}
            <Button onClick={() => setEditMode(true)} className="bg-white text-indigo-600 hover:bg-white/90 font-bold shadow-lg">
              <Edit className="w-4 h-4 mr-2" /> Edit Profile
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="max-w-4xl mx-auto px-4 -mt-8 mb-8 relative z-10">
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-white dark:bg-gray-800 border-0 shadow-xl">
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-6 h-6 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold text-gray-800 dark:text-white">15</p>
              <p className="text-xs text-gray-500">Posts</p>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-gray-800 border-0 shadow-xl">
            <CardContent className="p-4 text-center">
              <Award className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
              <p className="text-2xl font-bold text-gray-800 dark:text-white">Bronze</p>
              <p className="text-xs text-gray-500">Rank</p>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-gray-800 border-0 shadow-xl">
            <CardContent className="p-4 text-center">
              <Calendar className="w-6 h-6 mx-auto mb-2 text-blue-500" />
              <p className="text-2xl font-bold text-gray-800 dark:text-white">30</p>
              <p className="text-xs text-gray-500">Days</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 pb-12">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full flex bg-white dark:bg-gray-800 rounded-2xl p-1 shadow-lg mb-6">
            <TabsTrigger value="personal" className="flex-1 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white py-3 font-semibold">
              <User className="w-4 h-4 mr-2" /> Personal
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex-1 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white py-3 font-semibold">
              <Settings className="w-4 h-4 mr-2" /> Preferences
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex-1 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white py-3 font-semibold">
              <Lock className="w-4 h-4 mr-2" /> Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal">
            <Card className="bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" /> Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {editMode ? (
                  <form onSubmit={handleEditSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="full_name">Full Name</Label>
                      <Input id="full_name" name="full_name" value={editData.full_name} onChange={handleEditChange} className="mt-1" />
                      {editErrors.full_name && <p className="text-red-500 text-sm mt-1">{editErrors.full_name}</p>}
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input id="phone" name="phone" value={editData.phone} onChange={handleEditChange} className="mt-1" />
                      {editErrors.phone && <p className="text-red-500 text-sm mt-1">{editErrors.phone}</p>}
                    </div>
                    <div>
                      <Label htmlFor="address">Address</Label>
                      <Input id="address" name="address" value={editData.address} onChange={handleEditChange} className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="bio">Bio</Label>
                      <Input id="bio" name="bio" value={editData.bio} onChange={handleEditChange} className="mt-1" placeholder="Tell us about yourself..." />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <Button type="submit" className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600">Save Changes</Button>
                      <Button type="button" variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                      <div className="flex items-center gap-3 mb-2">
                        <User className="w-5 h-5 text-blue-500" />
                        <span className="text-sm text-gray-500">Full Name</span>
                      </div>
                      <p className="font-semibold text-gray-800 dark:text-white">{profileData.name || profileData.full_name || '-'}</p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                      <div className="flex items-center gap-3 mb-2">
                        <Mail className="w-5 h-5 text-blue-500" />
                        <span className="text-sm text-gray-500">Email</span>
                      </div>
                      <p className="font-semibold text-gray-800 dark:text-white">{profileData.email || '-'}</p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                      <div className="flex items-center gap-3 mb-2">
                        <Phone className="w-5 h-5 text-blue-500" />
                        <span className="text-sm text-gray-500">Phone</span>
                      </div>
                      <p className="font-semibold text-gray-800 dark:text-white">{profileData.phone || '-'}</p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                      <div className="flex items-center gap-3 mb-2">
                        <MapPin className="w-5 h-5 text-blue-500" />
                        <span className="text-sm text-gray-500">Address</span>
                      </div>
                      <p className="font-semibold text-gray-800 dark:text-white">{profileData.address || '-'}</p>
                    </div>
                  </div>
                )}

                {/* Verification Status */}
                <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-green-800 dark:text-green-300">Verification Status</p>
                        <p className="text-sm text-green-600 dark:text-green-400">{profileData.verified ? 'Your account is verified' : 'Verify your account for more features'}</p>
                      </div>
                    </div>
                    {!profileData.verified && (
                      <Button size="sm" className="bg-green-600 hover:bg-green-700">Verify Now</Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences">
            <Card className="bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-600" /> Recommendation Preferences
                </CardTitle>
                <Button size="sm" variant="outline" onClick={() => setEditPrefMode(!editPrefMode)}>
                  {editPrefMode ? 'Cancel' : 'Edit'}
                </Button>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 mb-6">These preferences are used to show personalized recommendations on your feed.</p>

                {editPrefMode ? (
                  <form onSubmit={handlePrefSubmit} className="space-y-4">
                    <div>
                      <Label>Preferred Location</Label>
                      <select name="location" value={preferences.location} onChange={handlePrefChange} className="w-full mt-1 p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600">
                        <option value="">Any Location</option>
                        <option value="Delhi">Delhi</option>
                        <option value="Mumbai">Mumbai</option>
                        <option value="Bangalore">Bangalore</option>
                        <option value="Chennai">Chennai</option>
                        <option value="Kolkata">Kolkata</option>
                        <option value="Hyderabad">Hyderabad</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Min Price (₹)</Label>
                        <Input name="minPrice" type="number" value={preferences.minPrice} onChange={handlePrefChange} className="mt-1" placeholder="0" />
                      </div>
                      <div>
                        <Label>Max Price (₹)</Label>
                        <Input name="maxPrice" type="number" value={preferences.maxPrice} onChange={handlePrefChange} className="mt-1" placeholder="100000" />
                      </div>
                    </div>
                    <Button type="submit" className="w-full bg-gradient-to-r from-blue-500 to-indigo-600">Save Preferences</Button>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-center">
                      <MapPin className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                      <p className="text-sm text-gray-500">Location</p>
                      <p className="font-bold text-gray-800 dark:text-white">{preferences.location || 'Any'}</p>
                    </div>
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl text-center">
                      <p className="text-sm text-gray-500 mb-1">Min Price</p>
                      <p className="font-bold text-gray-800 dark:text-white text-xl">₹{preferences.minPrice || '0'}</p>
                    </div>
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-center">
                      <p className="text-sm text-gray-500 mb-1">Max Price</p>
                      <p className="font-bold text-gray-800 dark:text-white text-xl">₹{preferences.maxPrice || '∞'}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-blue-600" /> Account Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { icon: Bell, label: 'Notifications', desc: 'Manage push notifications', action: 'Configure' },
                  { icon: Lock, label: 'Privacy & Security', desc: 'Password and login settings', action: 'Manage' },
                  { icon: CreditCard, label: 'Payment Methods', desc: 'Add or remove payment options', action: 'Update' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <item.icon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 dark:text-white">{item.label}</p>
                        <p className="text-sm text-gray-500">{item.desc}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                ))}

                {/* Language Selector */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-white">Language</p>
                      <p className="text-sm text-gray-500">Choose your preferred language</p>
                    </div>
                    <LanguageSelector />
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="mt-8 p-4 border-2 border-red-200 dark:border-red-800 rounded-xl">
                  <p className="font-semibold text-red-600 mb-2">Danger Zone</p>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">Delete your account permanently</p>
                    <Button variant="destructive" size="sm">Delete Account</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Profile;
