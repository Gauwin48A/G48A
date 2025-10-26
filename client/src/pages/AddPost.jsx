import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Upload, Shield, Crown, Star, Eye } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";

const AddPost = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  // Get tier and category from URL params
  const urlParams = new URLSearchParams(location.search);
  const selectedTier = urlParams.get('tier') || 'basic';
  const selectedCategory = urlParams.get('category');

  // Dropdown options from backend
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);

  useEffect(() => {
    const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';
    fetch(`${API_BASE}/api/categories`).then(res => res.json()).then(data => setCategories(Array.isArray(data) ? data : [])).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        const res = await fetch(`${baseUrl}/api/brands`);
        if (!res.ok) throw new Error('Failed to fetch brands');
        const data = await res.json();
        setBrands(Array.isArray(data) ? data : []);
      } catch (err) {
        setBrands([]);
      }
    };
    fetchBrands();
  }, []);

  // Add title to formData and pre-fill category
  const [formData, setFormData] = useState({
    title: '',
    category: selectedCategory || '',
    brand: '',
    model: '',
    condition: '',
    age: '',
    warranty: '',
    price: '',
    district: '',
    state: '',
    contactNumber: '',
    description: '',
    dimensions: ''
  });
  const [images, setImages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Fetch tiers from backend if needed, or define in DB
  const [tiers, setTiers] = useState([]);
  const [currentTier, setCurrentTier] = useState(null);
  useEffect(() => {
    const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';
    fetch(`${API_BASE}/api/tiers`)
      .then(async (res) => {
        if (!res.ok) {
          setTiers([]);
          toast({
            title: "Tier fetch error",
            description: `Error ${res.status}`,
            variant: "destructive"
          });
          return [];
        }
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          setTiers([]);
          toast({
            title: "Tier fetch error",
            description: "Invalid response",
            variant: "destructive"
          });
          return [];
        }
        return res.json();
      })
      .then((data) => {
        setTiers(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        setTiers([]);
        toast({
          title: "Tier fetch error",
          description: err.message,
          variant: "destructive"
        });
      });
  }, []);
  useEffect(() => {
    setCurrentTier(tiers.find(t => t.key === selectedTier));
  }, [tiers, selectedTier]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (name) => (value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Image upload validation
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        toast({ title: 'Invalid file type', description: 'Only JPG, PNG, WEBP allowed.', variant: 'destructive' });
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        toast({ title: 'File too large', description: 'Each image must be <2MB.', variant: 'destructive' });
        return;
      }
    }
    if (files.length + images.length > (currentTier?.maxImages || 1)) {
      toast({ title: 'Too many images', description: `Max ${(currentTier?.maxImages || 1)} images allowed.`, variant: 'destructive' });
      return;
    }
    setImages(prev => [...prev, ...files]);
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const generatePostId = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5).toUpperCase();
    return `POST${timestamp.toString().slice(-6)}${random}`;
  };

  // Accessibility: focus on first error
  useEffect(() => {
    if (Object.keys(formErrors).length > 0) {
      const firstErrorField = Object.keys(formErrors)[0];
      const el = document.querySelector(`[name="${firstErrorField}"]`);
      if (el) el.focus();
    }
  }, [formErrors]);

  // Enhanced validation
  const validateFields = useCallback(() => {
    const errors = {};
    if (!formData.title || formData.title.length < 5 || formData.title.length > 100) errors.title = 'Title is required (5-100 chars).';
    if (!formData.category) errors.category = 'Category is required.';
    if (!formData.brand || formData.brand.length < 2) errors.brand = 'Brand is required (min 2 chars).';
    if (!formData.model || formData.model.length < 2) errors.model = 'Model is required (min 2 chars).';
    if (!formData.price || isNaN(formData.price) || Number(formData.price) <= 0) errors.price = 'Price must be a positive number.';
    if (!formData.contactNumber || !/^([6-9][0-9]{9})$/.test(formData.contactNumber)) errors.contactNumber = 'Contact number must be 10 digits and start with 6-9.';
    if (!formData.description || formData.description.length < 20 || formData.description.length > 1000) errors.description = 'Description is required (20-1000 chars).';
    if (images.length === 0) errors.images = 'At least one image is required.';
    return errors;
  }, [formData, images]);

  const validateForm = () => {
    const errors = {};
    if (!formData.category) errors.category = 'Category is required';
    if (!formData.brand) errors.brand = 'Brand is required';
    if (!formData.model) errors.model = 'Model is required';
    if (!formData.condition) errors.condition = 'Condition is required';
    if (!formData.price) errors.price = 'Price is required';
    if (!formData.description) errors.description = 'Description is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePreview = () => {
    const errors = validateFields();
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast({
        title: 'Missing or Invalid Information',
        description: Object.values(errors).join(' '),
        variant: 'destructive'
      });
      return;
    }
    setShowPreview(true);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    const errors = validateFields();
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast({
        title: 'Missing or Invalid Information',
        description: Object.values(errors).join(' '),
        variant: 'destructive'
      });
      setIsLoading(false);
      return;
    }
    // Age validation before allowing post creation
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    const token = localStorage.getItem('authToken');
    const userId = localStorage.getItem('userId') || 1;
    const profileRes = await fetch(`${baseUrl}/api/users/profile?userId=${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      credentials: 'include'
    });
    const profile = await profileRes.json();
    if (profile.age < 18 || profile.age > 60) {
      toast({
        title: "Age Restriction",
        description: "Only users aged 18–60 can create posts.",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }
    // Validation
    if (!formData.category || !formData.brand || !formData.model || !formData.price || images.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields and upload at least one image.",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }
    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value) data.append(key, value);
      });
      images.forEach((img, idx) => data.append('images', img));
      // Send to backend
      const res = await fetch('http://localhost:5000/api/posts', {
        method: 'POST',
        body: data
      });
      const result = await res.json();
      if (res.ok) {
        toast({
          title: "Post Created Successfully",
          description: `Your mobile listing has been created.`
        });
        navigate('/all-posts');
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create post.",
          variant: "destructive"
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err.message || "Failed to create post.",
        variant: "destructive"
      });
    }
    setIsLoading(false);
  };

  if (showPreview) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="mb-8">
            <Button 
              onClick={() => setShowPreview(false)}
              variant="outline" 
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Edit Post
            </Button>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Preview Your Post</h1>
            <p className="text-gray-600">Review your listing before publishing</p>
          </div>

          <Card className="shadow-xl border-0 rounded-2xl overflow-hidden mb-6">
            <div className="flex">
              <div className="w-80 h-64 relative bg-gray-100 flex-shrink-0">
                {images[0] ? (
                  <img
                    src={URL.createObjectURL(images[0])}
                    onError={e => { e.target.onerror = null; e.target.src = '/placeholder.svg'; }}
                    alt="Product"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    No Image
                  </div>
                )}
                <Badge className={`absolute top-4 left-4 ${currentTier.color} text-white`}>
                  {currentTier.name}
                </Badge>
              </div>
              
              <div className="flex-1 p-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {formData.brand} {formData.model}
                </h3>
                <div className="text-3xl font-bold text-green-600 mb-4">
                  ₹{parseInt(formData.price).toLocaleString()}
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div><span className="font-medium">Condition:</span> {formData.condition}</div>
                  <div><span className="font-medium">Age:</span> {formData.age} months</div>
                  <div><span className="font-medium">Warranty:</span> {formData.warranty}</div>
                  <div><span className="font-medium">Location:</span> {formData.district}, {formData.state}</div>
                </div>
                
                {formData.description && (
                  <p className="text-gray-600 mb-4">{formData.description}</p>
                )}
              </div>
            </div>
          </Card>

          <div className="flex space-x-4">
            <Button
              onClick={() => setShowPreview(false)}
              variant="outline"
              className="flex-1"
            >
              Edit Post
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700"
              disabled={isLoading}
            >
              {isLoading ? "Publishing..." : "Publish Post"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100">
      <div className="max-w-4xl mx-auto px-4 py-8 pb-40"> {/* Add bottom padding for sticky bar */}
        {/* Header */}
        <div className="mb-8">
          <Link to="/all-posts" className="inline-flex items-center text-sky-600 hover:text-sky-700 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Browse
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Create New Listing</h1>
              <p className="text-gray-600 mt-2">Fill in the details to list your mobile phone</p>
            </div>
            <Badge className={`${currentTier?.color || 'bg-gray-400'} text-white text-lg px-4 py-2`}>
              {currentTier?.icon ? <currentTier.icon className="w-5 h-5 mr-2" /> : null}
              {currentTier?.name ? `${currentTier.name} Tier` : 'Tier'}
            </Badge>
          </div>
        </div>

        <Card className="shadow-xl border-0 rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-sky-500 to-blue-600 text-white">
            <CardTitle className="text-2xl">Mobile Phone Details</CardTitle>
            <CardDescription className="text-sky-100">
              Provide accurate information to attract genuine buyers
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <div className="space-y-8">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="title" className="text-sm font-semibold text-gray-700">Title *</Label>
                    <Input
                      id="title"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      placeholder="e.g., iPhone 14 Pro for Sale"
                      className="mt-2 h-12 border-2 border-gray-200 focus:border-sky-500"
                      required
                      maxLength={100}
                      minLength={5}
                    />
                    {formErrors.title && <div className="text-red-500 text-xs mt-1">{formErrors.title}</div>}
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">Category *</Label>
                    {/* If category is pre-selected, show as read-only input, else show dropdown */}
                    {selectedCategory ? (
                      <Input
                        name="category"
                        value={formData.category}
                        readOnly
                        disabled
                        className="mt-2 h-12 border-2 border-gray-200 bg-gray-100 cursor-not-allowed"
                      />
                    ) : (
                      <Select name="category" value={formData.category} onValueChange={handleSelectChange('category')} required>
                        <SelectTrigger className="mt-2 h-12 border-2 border-gray-200 focus:border-sky-500">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(cat => (
                            <SelectItem key={cat.id || cat} value={cat.name || cat}>
                              {cat.name || cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {formErrors.category && <div className="text-red-500 text-xs mt-1">{formErrors.category}</div>}
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">Brand *</Label>
                    <Select name="brand" value={formData.brand} onValueChange={handleSelectChange('brand')} required>
                      <SelectTrigger className="mt-2 h-12 border-2 border-gray-200 focus:border-sky-500">
                        <SelectValue placeholder="Select brand" />
                      </SelectTrigger>
                      <SelectContent>
                        {brands.map(brand => (
                          <SelectItem key={brand.id || brand} value={brand.name || brand}>
                            {brand.name || brand}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formErrors.brand && <div className="text-red-500 text-xs mt-1">{formErrors.brand}</div>}
                  </div>
                  <div>
                    <Label htmlFor="model" className="text-sm font-semibold text-gray-700">Model *</Label>
                    <Input
                      id="model"
                      name="model"
                      value={formData.model}
                      onChange={handleInputChange}
                      placeholder="e.g., iPhone 14 Pro, Galaxy S23"
                      className="mt-2 h-12 border-2 border-gray-200 focus:border-sky-500"
                      required
                    />
                    {formErrors.model && <div className="text-red-500 text-xs mt-1">{formErrors.model}</div>}
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">Condition *</Label>
                    <Select value={formData.condition || ""} onValueChange={handleSelectChange('condition')}>
                      <SelectTrigger className="mt-2 h-12 border-2 border-gray-200 focus:border-sky-500">
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="like-new">Like New</SelectItem>
                        <SelectItem value="excellent">Excellent</SelectItem>
                        <SelectItem value="good">Good</SelectItem>
                        <SelectItem value="fair">Fair</SelectItem>
                      </SelectContent>
                    </Select>
                    {formErrors.condition && <div className="text-red-500 text-xs mt-1">{formErrors.condition}</div>}
                  </div>
                </div>
              </div>

              {/* Additional Details */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <Label htmlFor="age" className="text-sm font-semibold text-gray-700">Age (months)</Label>
                    <Input
                      id="age"
                      name="age"
                      type="number"
                      value={formData.age}
                      onChange={handleInputChange}
                      placeholder="0-48 months"
                      className="mt-2 h-12 border-2 border-gray-200 focus:border-sky-500"
                      min="0"
                      max="48"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-semibold text-gray-700">Warranty Status</Label>
                    <Select value={formData.warranty || ""} onValueChange={handleSelectChange('warranty')}>
                      <SelectTrigger className="mt-2 h-12 border-2 border-gray-200 focus:border-sky-500">
                        <SelectValue placeholder="Warranty status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Under Warranty</SelectItem>
                        <SelectItem value="expired">Warranty Expired</SelectItem>
                        <SelectItem value="no-warranty">No Warranty</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="dimensions" className="text-sm font-semibold text-gray-700">Dimensions</Label>
                    <Input
                      id="dimensions"
                      name="dimensions"
                      value={formData.dimensions}
                      onChange={handleInputChange}
                      placeholder="e.g., 6.1 inch"
                      className="mt-2 h-12 border-2 border-gray-200 focus:border-sky-500"
                    />
                  </div>
                </div>
              </div>

              {/* Pricing & Location */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing & Location</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <Label htmlFor="price" className="text-sm font-semibold text-gray-700">Price (₹) *</Label>
                    <Input
                      id="price"
                      name="price"
                      type="number"
                      value={formData.price}
                      onChange={handleInputChange}
                      placeholder="Enter price"
                      className="mt-2 h-12 border-2 border-gray-200 focus:border-sky-500"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="district" className="text-sm font-semibold text-gray-700">District *</Label>
                    <Input
                      id="district"
                      name="district"
                      value={formData.district}
                      onChange={handleInputChange}
                      placeholder="Enter district"
                      className="mt-2 h-12 border-2 border-gray-200 focus:border-sky-500"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="state" className="text-sm font-semibold text-gray-700">State *</Label>
                    <Input
                      id="state"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      placeholder="Enter state"
                      className="mt-2 h-12 border-2 border-gray-200 focus:border-sky-500"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Contact & Images */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact & Images</h3>
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="contactNumber" className="text-sm font-semibold text-gray-700">Contact Number *</Label>
                    <Input
                      id="contactNumber"
                      name="contactNumber"
                      type="tel"
                      value={formData.contactNumber}
                      onChange={handleInputChange}
                      placeholder="+91 XXXXXXXXXX"
                      className="mt-2 h-12 border-2 border-gray-200 focus:border-sky-500"
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-semibold text-gray-700">
                      Images (1-{currentTier?.maxImages || 1} photos) *
                    </Label>
                    <div className="mt-2">
                      <div className="border-2 border-dashed border-sky-300 rounded-xl p-8 bg-sky-50">
                        <div className="text-center">
                          <Upload className="mx-auto h-12 w-12 text-sky-400 mb-4" />
                          <div>
                            <label htmlFor="images" className="cursor-pointer">
                              <Button 
                                type="button"
                                className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700"
                                onClick={() => document.getElementById('images').click()}
                              >
                                Upload Images
                              </Button>
                              <input
                                id="images"
                                name="images"
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="sr-only"
                              />
                            </label>
                            <p className="mt-2 text-sm text-gray-500">
                              PNG, JPG up to 10MB each • Max {currentTier?.maxImages || 1} images
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {images.length > 0 && (
                        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                          {images.map((image, index) => (
                            <div key={index} className="relative">
                              <img
                                src={URL.createObjectURL(image)}
                                onError={e => { e.target.onerror = null; e.target.src = '/placeholder.svg'; }}
                                alt={`Upload ${index + 1}`}
                                className="h-24 w-full object-cover rounded-lg border-2 border-gray-200"
                              />
                              <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description" className="text-sm font-semibold text-gray-700">Description *</Label>
                    <Textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="Add any additional details about your mobile phone..."
                      className="mt-2 border-2 border-gray-200 focus:border-sky-500"
                      rows={4}
                      required
                      minLength={20}
                      maxLength={1000}
                    />
                    {formErrors.description && <div className="text-red-500 text-xs mt-1">{formErrors.description}</div>}
                  </div>
                </div>
              </div>

              {/* Action Buttons - moved below description, not sticky */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-6 border-t mt-8">
                <Button
                  type="button"
                  onClick={handlePreview}
                  variant="outline"
                  className="border-sky-500 text-sky-600 hover:bg-sky-50 font-semibold px-6 py-3 text-base shadow"
                  style={{ minWidth: 120 }}
                >
                  <Eye className="w-5 h-5 mr-2" />
                  Preview
                </Button>
                <Button
                  onClick={handleSubmit}
                  className={`bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 font-semibold px-6 py-3 text-base shadow ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                  disabled={isLoading}
                  style={{ minWidth: 140 }}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center"><svg className="animate-spin mr-2 w-5 h-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>Publishing...</span>
                  ) : "Publish Post"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AddPost;