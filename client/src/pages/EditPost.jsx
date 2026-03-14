import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { isAuthenticated } from "@/utils/authStorage";
import api from "@/services/api";
import { useTranslation } from "react-i18next";

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

const EditPost = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { postId } = useParams();
  const { toast } = useToast();
  const { user } = useAuth();

  const canUsePage = useMemo(() => isAuthenticated(user), [user]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    location: "",
    status: "active",
  });

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
        });
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

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();

    if (!canUsePage) {
      navigate("/login", { state: { returnTo: `/edit-post/${postId}` } });
      return;
    }

    if (!form.title.trim() || form.title.trim().length < 5) {
      toast({
        title: "Title is too short",
        description: "Please enter at least 5 characters for the title.",
        variant: "destructive",
      });
      return;
    }

    if (!form.price || Number(form.price) <= 0) {
      toast({
        title: "Invalid price",
        description: "Enter a valid price greater than 0.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    setError("");

    try {
      await api.put(`/posts/${encodeURIComponent(postId)}`, {
        title: form.title.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        location: form.location.trim(),
        status: form.status,
      });

      toast({
        title: "Listing updated",
        description: "Your post changes were saved successfully.",
      });

      navigate("/my-home", {
        state: { focusTab: form.status === "sold" ? "sold" : "active" },
      });
    } catch (saveError) {
      setError(normalizeErrorMessage(saveError, "Unable to save changes."));
      toast({
        title: "Update failed",
        description: normalizeErrorMessage(
          saveError,
          "Unable to save changes.",
        ),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!canUsePage) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
          <h2 className="text-xl font-bold text-amber-800 mb-2">
            Login required
          </h2>
          <p className="text-sm text-amber-700 mb-4">
            Sign in to edit your listing.
          </p>
          <Button
            type="button"
            className="bg-amber-600 hover:bg-amber-700 text-white"
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
      <div className="min-h-screen flex items-center justify-center p-6 text-gray-600">
        Loading listing details...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-2xl mx-auto p-4 pt-8">
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="text-2xl">{t("edit_listing")}</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">{t("title")}</Label>
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

              <div>
                <Label htmlFor="description">{t("description")}</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={onChange}
                  className="mt-1"
                  rows={5}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">{t("price_inr")}</Label>
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
                  <Label htmlFor="status">{t("status")}</Label>
                  <select
                    id="status"
                    name="status"
                    value={form.status}
                    onChange={onChange}
                    className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="active">{t("active")}</option>
                    <option value="sold">{t("sold")}</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="location">{t("location")}</Label>
                <Input
                  id="location"
                  name="location"
                  value={form.location}
                  onChange={onChange}
                  className="mt-1"
                />
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/my-home")}
                >
                  Cancel
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
