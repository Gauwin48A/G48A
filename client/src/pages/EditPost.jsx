import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { isAuthenticated } from "@/utils/authStorage";
import api from "@/services/api";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import { fetchCategoriesCached } from "@/services/categoriesService";
import { fetchSubcategories } from "@/services/subcategoriesService";
import { useTranslation } from "react-i18next";
import { ImagePlus, X, Upload, ArrowLeft } from "lucide-react";
import { navigateBack } from "@/utils/navigation";

const MAX_IMAGES = 10;
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const normalizePost = (payload) => payload?.post ?? payload ?? null;

const normalizeErrorMessage = (error, fallback) => {
  const status = Number(error?.status || error?.response?.status || 0);
  if (status === 401 || status === 403) {
    return "Please sign in with the listing owner account to edit this post.";
  }
  if (status === 404) {
    return "Listing not found. It may have been deleted.";
  }
  return String(error?.message || fallback);
};

const buildApiPath = (path) => {
  const base = import.meta.env.VITE_API_URL || "";
  return `${base}${path}`;
};

const EditPost = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { postId } = useParams();
  const { toast } = useToast();
  const { user } = useAuth();

  const canUsePage = useMemo(() => isAuthenticated(user), [user]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    location: "",
    status: "active",
    category_id: "",
    subcategory_id: "",
  });

  // Image state
  const [existingImages, setExistingImages] = useState([]);
  const [removedImages, setRemovedImages] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);

  // Category/subcategory state
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);

  // Fetch categories on mount
  useEffect(() => {
    fetchCategoriesCached()
      .then((list) => setCategories(Array.isArray(list) ? list : []))
      .catch(() => setCategories([]));
  }, []);

  // Fetch subcategories when category changes
  useEffect(() => {
    if (!form.category_id) {
      setSubcategories([]);
      return;
    }
    fetchSubcategories(form.category_id)
      .then((list) => setSubcategories(Array.isArray(list) ? list : []))
      .catch(() => setSubcategories([]));
  }, [form.category_id]);

  useEffect(() => {
    let cancelled = false;

    const fetchPost = async () => {
      if (!postId) {
        setError("Invalid post id.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const payload = await api.get(`/posts/${encodeURIComponent(postId)}`);
        if (cancelled) return;
        const post = normalizePost(payload);
        if (!post) {
          setError("Listing not found.");
          setLoading(false);
          return;
        }

        setForm({
          title: String(post.title || ""),
          description: String(post.description || ""),
          price: String(post.price ?? ""),
          location: String(post.location || ""),
          status: String(post.status || "active").toLowerCase(),
          category_id: String(post.category_id || ""),
          subcategory_id: String(post.subcategory_id || ""),
        });

        // Parse existing images
        const imgs = Array.isArray(post.images)
          ? post.images
          : typeof post.images === "string"
            ? JSON.parse(post.images || "[]")
            : [];
        setExistingImages(imgs);
      } catch (fetchError) {
        if (cancelled) return;
        setError(
          normalizeErrorMessage(fetchError, "Unable to load listing details."),
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchPost();

    return () => {
      cancelled = true;
    };
  }, [postId]);

  // Clean up preview URLs
  useEffect(() => {
    return () => previewUrls.forEach((url) => URL.revokeObjectURL(url));
  }, [previewUrls]);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageAdd = useCallback((event) => {
    const files = Array.from(event.target.files || []);
    const valid = files.filter((f) => {
      if (!ACCEPTED_TYPES.includes(f.type)) {
        toast({
          title: t("invalid_file_type", "Invalid file type"),
          description: t("accepted_image_types", "Only JPEG, PNG, and WebP are accepted."),
          variant: "destructive",
        });
        return false;
      }
      if (f.size > MAX_FILE_SIZE) {
        toast({
          title: t("file_too_large", "File too large"),
          description: t("max_file_size", "Maximum file size is 2MB."),
          variant: "destructive",
        });
        return false;
      }
      return true;
    });

    setNewFiles((prev) => {
      const total = existingImages.length - removedImages.length + prev.length + valid.length;
      if (total > MAX_IMAGES) {
        toast({
          title: t("too_many_images", "Too many images"),
          description: t("max_images_desc", "Maximum {{max}} images allowed.", { max: MAX_IMAGES }),
          variant: "destructive",
        });
        return prev;
      }
      return [...prev, ...valid];
    });

    setPreviewUrls((prev) => [...prev, ...valid.map((f) => URL.createObjectURL(f))]);
    event.target.value = "";
  }, [existingImages, removedImages, toast, t]);

  const removeExistingImage = useCallback((imgUrl) => {
    setRemovedImages((prev) => [...prev, imgUrl]);
  }, []);

  const removeNewFile = useCallback((index) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const keptImages = useMemo(
    () => existingImages.filter((img) => !removedImages.includes(img)),
    [existingImages, removedImages],
  );

  const totalImages = keptImages.length + newFiles.length;

  const onSubmit = async (event) => {
    event.preventDefault();

    if (!canUsePage) {
      navigate("/login", { state: { returnTo: `/edit-post/${postId}` } });
      return;
    }

    if (!form.title.trim() || form.title.trim().length < 5) {
      toast({
        title: t("title_too_short", "Title is too short"),
        description: t("title_min_chars", "Please enter at least 5 characters for the title."),
        variant: "destructive",
      });
      return;
    }

    if (!form.price || Number(form.price) <= 0) {
      toast({
        title: t("invalid_price", "Invalid price"),
        description: t("price_greater_zero", "Enter a valid price greater than 0."),
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    setError("");
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("title", form.title.trim());
      formData.append("description", form.description.trim());
      formData.append("price", Number(form.price));
      formData.append("location", form.location.trim());
      formData.append("status", form.status);
      if (form.category_id) formData.append("category_id", form.category_id);
      if (form.subcategory_id) formData.append("subcategory_id", form.subcategory_id);
      if (removedImages.length > 0) {
        formData.append("removed_images", JSON.stringify(removedImages));
      }
      newFiles.forEach((file) => formData.append("images", file));

      // Use XHR for upload progress
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", buildApiPath(`/posts/${encodeURIComponent(postId)}`));
        xhr.withCredentials = true;
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText));
          else reject(new Error(JSON.parse(xhr.responseText)?.error || "Update failed"));
        };
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.send(formData);
      });

      toast({
        title: t("listing_updated", "Listing updated"),
        description: t("post_saved", "Your post changes were saved successfully."),
      });

      navigate("/my-home", {
        state: { focusTab: form.status === "sold" ? "sold" : "active" },
      });
    } catch (saveError) {
      setError(normalizeErrorMessage(saveError, "Unable to save changes."));
      toast({
        title: t("update_failed", "Update failed"),
        description: normalizeErrorMessage(saveError, "Unable to save changes."),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
      setUploadProgress(0);
    }
  };

  if (!canUsePage) {
    return (
      <div className="min-h-screen mhub-premium-page bg-gradient-to-br from-slate-50 via-white to-amber-50 dark:from-slate-950 dark:via-slate-900/60 dark:to-slate-950 flex items-center justify-center p-4 dark:bg-gradient-to-br">
        <div className="max-w-md w-full rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-400/30 dark:bg-amber-500/10 p-6 text-center page-shell page-pad dark:border dark:border-amber-600/40 dark:bg-amber-950/20 dark:text-center">
          <h2 className="text-xl font-bold text-amber-800 dark:text-amber-200 mb-2">
            Login required
          </h2>
          <p className="text-sm text-amber-700 dark:text-amber-200 mb-4 dark:text-amber-300">
            Sign in to edit your listing.
          </p>
          <Button
            type="button"
            className="bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-700/40 dark:hover:bg-amber-700/40 dark:text-white"
            onClick={() =>
              navigate("/login", {
                state: { returnTo: `/edit-post/${postId || ""}` },
              })
            }
          >
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen mhub-premium-page bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900/60 dark:to-slate-950 flex items-center justify-center p-6 dark:bg-gradient-to-br">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen mhub-premium-page bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900/60 dark:to-slate-950 dark:bg-gradient-to-br">
      <div className="max-w-2xl mx-auto p-4 pt-8 page-shell page-pad">
        <div className="mb-4">
          <Button
            variant="ghost"
            onClick={() => navigateBack(navigate, "/my-home")}
            className="rounded-full px-3 py-1.5"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("back", "Back")}
          </Button>
        </div>

        <Card className="shadow-lg border-0 dark:border-0">
          <CardHeader>
            <CardTitle className="text-2xl">{t("edit_listing", "Edit Listing")}</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200 p-3 text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-5">
              {/* ── Images ── */}
              <div>
                <Label className="text-sm font-semibold">
                  {t("images", "Images")}
                  <span className="ml-2 text-xs text-gray-400 font-normal">
                    {totalImages}/{MAX_IMAGES}
                  </span>
                </Label>
                <div className="mt-2 flex flex-wrap gap-3">
                  {keptImages.map((img, i) => (
                    <div key={`existing-${i}`} className="relative group w-24 h-24 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                      <img
                        src={resolveMediaUrl(img) || "/placeholder.svg"}
                        alt={`Image ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeExistingImage(img)}
                        className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label={t("remove_image", "Remove image")}
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <Badge className="absolute bottom-1 left-1 text-[10px] bg-black/50 text-white border-0">
                        {i + 1}
                      </Badge>
                    </div>
                  ))}
                  {previewUrls.map((url, i) => (
                    <div key={`new-${i}`} className="relative group w-24 h-24 rounded-xl overflow-hidden border-2 border-dashed border-blue-300 dark:border-blue-600">
                      <img
                        src={url}
                        alt={`New ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeNewFile(i)}
                        className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label={t("remove_image", "Remove image")}
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <Badge className="absolute bottom-1 left-1 text-[10px] bg-blue-500 text-white border-0">
                        {t("new", "New")}
                      </Badge>
                    </div>
                  ))}
                  {totalImages < MAX_IMAGES && (
                    <label className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 dark:hover:border-blue-500 dark:hover:bg-blue-900/20 transition-colors">
                      <ImagePlus className="w-6 h-6 text-gray-400" />
                      <span className="text-[10px] text-gray-400 mt-1">{t("add", "Add")}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        className="hidden"
                        onChange={handleImageAdd}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* ── Title ── */}
              <div>
                <Label htmlFor="title">{t("title", "Title")}</Label>
                <Input
                  id="title"
                  name="title"
                  value={form.title}
                  onChange={onChange}
                  className="mt-1"
                  maxLength={100}
                  required
                />
              </div>

              {/* ── Description ── */}
              <div>
                <Label htmlFor="description">{t("description", "Description")}</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={onChange}
                  className="mt-1"
                  rows={5}
                />
              </div>

              {/* ── Category & Subcategory ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category_id">{t("category", "Category")}</Label>
                  <select
                    id="category_id"
                    name="category_id"
                    value={form.category_id}
                    onChange={(e) => {
                      setForm((prev) => ({
                        ...prev,
                        category_id: e.target.value,
                        subcategory_id: "",
                      }));
                    }}
                    className="mhub-input mt-1 h-11 w-full rounded-xl px-3 text-sm"
                  >
                    <option value="">{t("select_category", "Select category")}</option>
                    {categories.map((cat) => (
                      <option key={cat.category_id || cat.id} value={cat.category_id || cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {subcategories.length > 0 && (
                  <div>
                    <Label htmlFor="subcategory_id">{t("subcategory", "Subcategory")}</Label>
                    <select
                      id="subcategory_id"
                      name="subcategory_id"
                      value={form.subcategory_id}
                      onChange={onChange}
                      className="mhub-input mt-1 h-11 w-full rounded-xl px-3 text-sm"
                    >
                      <option value="">{t("select_subcategory", "Select subcategory")}</option>
                      {subcategories.map((sub) => (
                        <option key={sub.subcategory_id || sub.id} value={sub.subcategory_id || sub.id}>
                          {sub.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* ── Price & Status ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">{t("price_inr", "Price (₹)")}</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    min="1"
                    value={form.price}
                    onChange={onChange}
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="status">{t("status", "Status")}</Label>
                  <select
                    id="status"
                    name="status"
                    value={form.status}
                    onChange={onChange}
                    className="mhub-input mt-1 h-11 w-full rounded-xl px-3 text-sm"
                  >
                    <option value="active">{t("active", "Active")}</option>
                    <option value="sold">{t("sold", "Sold")}</option>
                  </select>
                </div>
              </div>

              {/* ── Location ── */}
              <div>
                <Label htmlFor="location">{t("location", "Location")}</Label>
                <Input
                  id="location"
                  name="location"
                  value={form.location}
                  onChange={onChange}
                  className="mt-1"
                />
              </div>

              {/* ── Upload progress ── */}
              {saving && uploadProgress > 0 && (
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700/40 dark:hover:bg-blue-700/40 dark:text-white"
                >
                  {saving ? (
                    <>
                      <Upload className="w-4 h-4 mr-2 animate-pulse" />
                      {uploadProgress > 0 ? `${uploadProgress}%` : t("saving", "Saving...")}
                    </>
                  ) : (
                    t("save_changes", "Save Changes")
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/my-home")}
                >
                  {t("cancel", "Cancel")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EditPost;
