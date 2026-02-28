import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Upload, Eye } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import AudioRecorder from '@/components/AudioRecorder';

import { useTranslation } from 'react-i18next';
import { getAccessToken, getUserId } from '@/utils/authStorage';
import { fetchCategoriesCached } from '@/services/categoriesService';
import { buildApiPath } from '@/lib/networkConfig';

const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;
const FALLBACK_TIERS = [
  { key: 'basic', name: 'Basic', maxImages: 1, color: 'bg-gray-500' },
  { key: 'silver', name: 'Silver', maxImages: 5, color: 'bg-blue-500' },
  { key: 'premium', name: 'Premium', maxImages: 10, color: 'bg-yellow-500' }
];

const normalizeTierKey = (value) => {
  if (!value) return 'basic';
  const cleaned = String(value).trim().toLowerCase();
  if (cleaned.includes('premium')) return 'premium';
  if (cleaned.includes('silver')) return 'silver';
  if (cleaned.includes('basic') || cleaned.includes('free')) return 'basic';
  return cleaned;
};

const normalizeTierColor = (value) => {
  if (!value) return 'bg-gray-500';
  const color = String(value).trim();
  return color.startsWith('bg-') ? color : `bg-${color}`;
};

const normalizeTier = (tier) => {
  const key = normalizeTierKey(tier?.key || tier?.tier_key || tier?.slug || tier?.name);
  return {
    ...tier,
    key,
    name: tier?.name || key.charAt(0).toUpperCase() + key.slice(1),
    maxImages: Number(tier?.maxImages ?? tier?.max_images ?? 1),
    color: normalizeTierColor(tier?.color),
    icon: typeof tier?.icon === 'function' ? tier.icon : null
  };
};

const AddPost = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Get tier and category from URL params
  const { selectedTier, selectedCategory } = useMemo(() => {
    const urlParams = new URLSearchParams(location.search);
    return {
      selectedTier: normalizeTierKey(urlParams.get('tier') || 'basic'),
      selectedCategory: urlParams.get('category')
    };
  }, [location.search]);

  // Dropdown options from backend
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const fetchDropdownData = async () => {
      try {
        const [categoriesData, brandsRes] = await Promise.all([
          fetchCategoriesCached(),
          fetch(buildApiPath('/brands'))
        ]);
        const brandsData = brandsRes.ok ? await brandsRes.json() : [];

        if (cancelled) return;
        setCategories(Array.isArray(categoriesData) ? categoriesData : []);
        setBrands(Array.isArray(brandsData) ? brandsData : []);
      } catch {
        if (cancelled) return;
        setCategories([]);
        setBrands([]);
      }
    };

    fetchDropdownData();
    return () => {
      cancelled = true;
    };
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
  const [audioBlob, setAudioBlob] = useState(null); // Voice description
  const [isFlashSale, setIsFlashSale] = useState(false); // 24-hour Flash Sale
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const previewImageUrls = useMemo(
    () => images.map((image) => URL.createObjectURL(image)),
    [images]
  );

  useEffect(() => () => {
    previewImageUrls.forEach((url) => URL.revokeObjectURL(url));
  }, [previewImageUrls]);

  // Fetch tiers from backend if needed, or define in DB
  const [tiers, setTiers] = useState([]);
  useEffect(() => {
    let cancelled = false;

    const fetchTiers = async () => {
      try {
        const res = await fetch(buildApiPath('/tiers'));
        if (!res.ok) {
          if (!cancelled) {
            setTiers([]);
            toast({
              title: "Tier fetch error",
              description: `Error ${res.status}`,
              variant: "destructive"
            });
          }
          return;
        }

        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          if (!cancelled) {
            setTiers([]);
            toast({
              title: "Tier fetch error",
              description: "Invalid response",
              variant: "destructive"
            });
          }
          return;
        }

        const data = await res.json();
        if (!cancelled) {
          const normalized = Array.isArray(data) ? data.map(normalizeTier) : [];
          setTiers(normalized.length > 0 ? normalized : FALLBACK_TIERS);
        }
      } catch (err) {
        if (cancelled) return;
        setTiers(FALLBACK_TIERS);
        toast({
          title: "Tier fetch error",
          description: err.message,
          variant: "destructive"
        });
      }
    };

    fetchTiers();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const currentTier = useMemo(
    () => tiers.find((tier) => normalizeTierKey(tier.key) === selectedTier) || FALLBACK_TIERS.find((tier) => tier.key === selectedTier) || FALLBACK_TIERS[0],
    [tiers, selectedTier]
  );

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
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
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

    const token = getAccessToken();
    const userId = getUserId();
    if (!token || !userId) {
      toast({
        title: "Login required",
        description: "Please log in to publish a listing.",
        variant: "destructive"
      });
      navigate('/login', { state: { returnTo: location.pathname + location.search } });
      setIsLoading(false);
      return;
    }

    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value) data.append(key, value);
      });
      images.forEach((img) => data.append('images', img));

      // Add voice description if recorded (Voice-First Commerce)
      if (audioBlob) {
        data.append('audio', audioBlob, 'voice-description.webm');
      }

      // Add Flash Sale flag (24-hour urgent listing)
      data.append('is_flash_sale', isFlashSale ? 'true' : 'false');
      // Send to backend
      const res = await fetch(buildApiPath('/posts'), {
        method: 'POST',
        body: data,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: 'include'
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
      <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 dark:from-gray-900 dark:to-gray-800">
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Preview Your Post</h1>
            <p className="text-gray-600 dark:text-gray-300">Review your listing before publishing</p>
          </div>

          <Card className="shadow-xl border-0 rounded-2xl overflow-hidden mb-6 dark:bg-gray-800">
            <div className="flex">
              <div className="w-80 h-64 relative bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                {images[0] ? (
                  <img
                    src={previewImageUrls[0]}
                    onError={e => { e.target.onerror = null; e.target.src = '/placeholder.svg'; }}
                    alt="Product"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    No Image
                  </div>
                )}
                <Badge className={`absolute top-4 left-4 ${currentTier?.color || 'bg-gray-400'} text-white`}>
                  {currentTier?.name || 'Basic'}
                </Badge>
              </div>

              <div className="flex-1 p-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {formData.brand} {formData.model}
                </h3>
                <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-4">
                  ₹{(Number.parseInt(formData.price, 10) || 0).toLocaleString()}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4 text-sm text-gray-700 dark:text-gray-300">
                  <div><span className="font-medium">Condition:</span> {formData.condition}</div>
                  <div><span className="font-medium">Age:</span> {formData.age} months</div>
                  <div><span className="font-medium">Warranty:</span> {formData.warranty}</div>
                  <div><span className="font-medium">Location:</span> {formData.district}, {formData.state}</div>
                </div>

                {formData.description && (
                  <p className="text-gray-600 dark:text-gray-400 mb-4">{formData.description}</p>
                )}
              </div>
            </div>
          </Card>

          <div className="flex space-x-4">
            <Button
              onClick={() => setShowPreview(false)}
              variant="outline"
              className="flex-1 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
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
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-4xl mx-auto px-4 py-8 pb-40"> {/* Add bottom padding for sticky bar */}
        {/* Header */}
        <div className="mb-8">
          <Link to="/all-posts" className="inline-flex items-center text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('back_to_browse')}
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('create_new_listing')}</h1>
              <p className="text-gray-600 dark:text-gray-300 mt-2">{t('fill_details')}</p>
            </div>
            <Badge className={`${currentTier?.color || 'bg-gray-400'} text-white text-lg px-4 py-2`}>
              {currentTier?.icon ? <currentTier.icon className="w-5 h-5 mr-2" /> : null}
              {currentTier?.name ? `${currentTier.name} ${t('tier')}` : t('tier')}
            </Badge>
          </div>
        </div>

        <Card className="shadow-xl border-0 rounded-2xl overflow-hidden dark:bg-gray-800">
          <CardHeader className="bg-gradient-to-r from-sky-500 to-blue-600 text-white">
            <CardTitle className="text-2xl">{t('mobile_phone_details')}</CardTitle>
            <CardDescription className="text-sky-100">
              {t('provide_accurate_info')}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 dark:bg-gray-800">
            <div className="space-y-8">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('basic_information')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="title" className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('title')} *</Label>
                    <Input
                      id="title"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      placeholder="e.g., iPhone 14 Pro for Sale"
                      className="mt-2 h-12 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-sky-500"
                      required
                      maxLength={100}
                      minLength={5}
                    />
                    {formErrors.title && <div className="text-red-500 text-xs mt-1">{formErrors.title}</div>}
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('category')} *</Label>
                    {/* If category is pre-selected, show as read-only input, else show dropdown */}
                    {selectedCategory ? (
                      <Input
                        name="category"
                        value={formData.category}
                        readOnly
                        disabled
                        className="mt-2 h-12 border-2 border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed"
                      />
                    ) : (
                      <Select name="category" value={formData.category} onValueChange={handleSelectChange('category')} required>
                        <SelectTrigger className="mt-2 h-12 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-sky-500">
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
                    <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('brand')} *</Label>
                    <Select name="brand" value={formData.brand} onValueChange={handleSelectChange('brand')} required>
                      <SelectTrigger className="mt-2 h-12 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-sky-500">
                        <SelectValue placeholder={t('select_brand')} />
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
                    <Label htmlFor="model" className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('model')} *</Label>
                    <Input
                      id="model"
                      name="model"
                      value={formData.model}
                      onChange={handleInputChange}
                      placeholder="e.g., iPhone 14 Pro, Galaxy S23"
                      className="mt-2 h-12 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-sky-500"
                      required
                    />
                    {formErrors.model && <div className="text-red-500 text-xs mt-1">{formErrors.model}</div>}
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('condition')} *</Label>
                    <Select value={formData.condition || ""} onValueChange={handleSelectChange('condition')}>
                      <SelectTrigger className="mt-2 h-12 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-sky-500">
                        <SelectValue placeholder={t('select_condition')} />
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
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('additional_details')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <Label htmlFor="age" className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('age_months')}</Label>
                    <Input
                      id="age"
                      name="age"
                      type="number"
                      value={formData.age}
                      onChange={handleInputChange}
                      placeholder="0-48 months"
                      className="mt-2 h-12 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-sky-500"
                      min="0"
                      max="48"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('warranty_status')}</Label>
                    <Select value={formData.warranty || ""} onValueChange={handleSelectChange('warranty')}>
                      <SelectTrigger className="mt-2 h-12 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-sky-500">
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
                    <Label htmlFor="dimensions" className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('dimensions')}</Label>
                    <Input
                      id="dimensions"
                      name="dimensions"
                      value={formData.dimensions}
                      onChange={handleInputChange}
                      placeholder="e.g., 6.1 inch"
                      className="mt-2 h-12 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-sky-500"
                    />
                  </div>
                </div>
              </div>

              {/* Pricing & Location */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('pricing_location')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <Label htmlFor="price" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Price (₹) *</Label>
                    <Input
                      id="price"
                      name="price"
                      type="number"
                      value={formData.price}
                      onChange={handleInputChange}
                      placeholder="Enter price"
                      className="mt-2 h-12 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-sky-500"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="district" className="text-sm font-semibold text-gray-700 dark:text-gray-300">District *</Label>
                    <Input
                      id="district"
                      name="district"
                      value={formData.district}
                      onChange={handleInputChange}
                      placeholder="Enter district"
                      className="mt-2 h-12 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-sky-500"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="state" className="text-sm font-semibold text-gray-700 dark:text-gray-300">State *</Label>
                    <Input
                      id="state"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      placeholder="Enter state"
                      className="mt-2 h-12 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-sky-500"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Contact & Images */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Contact & Images</h3>
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="contactNumber" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Contact Number *</Label>
                    <Input
                      id="contactNumber"
                      name="contactNumber"
                      type="tel"
                      value={formData.contactNumber}
                      onChange={handleInputChange}
                      placeholder="+91 XXXXXXXXXX"
                      className="mt-2 h-12 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-sky-500"
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Images (1-{currentTier?.maxImages || 1} photos) *
                    </Label>
                    <div className="mt-2">
                      <div className="border-2 border-dashed border-sky-300 dark:border-sky-600 rounded-xl p-8 bg-sky-50 dark:bg-gray-700">
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
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                              PNG, JPG up to 2MB each • Max {currentTier?.maxImages || 1} images
                            </p>
                          </div>
                        </div>
                      </div>

                      {images.length > 0 && (
                        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                          {images.map((image, index) => (
                            <div key={index} className="relative">
                              <img
                                src={previewImageUrls[index]}
                                onError={e => { e.target.onerror = null; e.target.src = '/placeholder.svg'; }}
                                alt={`Upload ${index + 1}`}
                                className="h-24 w-full object-cover rounded-lg border-2 border-gray-200 dark:border-gray-600"
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
                    <Label htmlFor="description" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Description *</Label>
                    <Textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="Add any additional details about your mobile phone..."
                      className="mt-2 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-sky-500"
                      rows={4}
                      required
                      minLength={20}
                      maxLength={1000}
                    />
                    {formErrors.description && <div className="text-red-500 text-xs mt-1">{formErrors.description}</div>}
                  </div>

                  {/* Voice Description - The Defender's Voice-First Commerce */}
                  <AudioRecorder
                    onAudioReady={(blob) => setAudioBlob(blob)}
                    existingAudio={null}
                  />

                  {/* Flash Sale Toggle - The Defender's Hyperlocal Urgency */}
                  <div className="flex flex-col gap-3 p-4 border-2 border-dashed border-orange-300 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">⏳</span>
                        <div>
                          <h3 className="text-sm font-semibold text-orange-800 dark:text-orange-300">
                            24-Hour Flash Sale
                          </h3>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Auto-expires in 24 hours • Gets 2x visibility boost
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsFlashSale(!isFlashSale)}
                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${isFlashSale ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'
                          }`}
                      >
                        <span
                          className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform ${isFlashSale ? 'translate-x-7' : 'translate-x-1'
                            }`}
                        />
                      </button>
                    </div>
                    {isFlashSale && (
                      <div className="text-xs text-center text-orange-600 bg-orange-100 dark:bg-orange-900/40 py-2 px-3 rounded-lg">
                        🔥 Your listing will appear at the TOP of feeds and auto-delete after 24 hours!
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons - moved below description, not sticky */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-6 border-t dark:border-gray-600 mt-8">
                <Button
                  type="button"
                  onClick={handlePreview}
                  variant="outline"
                  className="border-sky-500 text-sky-600 hover:bg-sky-50 dark:hover:bg-gray-700 font-semibold px-6 py-3 text-base shadow"
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


