import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { addTextPost } from "../lib/api";

import { useTranslation } from "react-i18next";

const PostAdd = () => {
  const { t } = useTranslation();
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setError("Description is required");
      return;
    }
    if (description.length < 5 || description.length > 500) {
      setError("Description must be 5-500 characters.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await addTextPost({ description });
      toast({ title: "Post published!" });
      setDescription("");
      navigate("/feed");
    } catch (err) {
      setError("Failed to publish post");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950">
      <div className="max-w-xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">{t("add_new_text_post")}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            rows={5}
            placeholder={t("enter_description_placeholder")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          {error && <div className="text-red-500 dark:text-red-400 text-sm">{error}</div>}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/feed")}
            >
              {t("cancel", "Cancel")}
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? t("publishing", "Publishing...") : t("publish", "Publish")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PostAdd;
