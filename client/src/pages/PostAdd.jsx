import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { FaArrowLeft, FaNewspaper } from "react-icons/fa";
import { getAccessToken } from "@/utils/authStorage";
import { getApiOriginBase } from "@/lib/networkConfig";

const DESCRIPTION_MIN_LENGTH = 5;
const DESCRIPTION_MAX_LENGTH = 500;

const PostAdd = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const combinedDescription = useMemo(() => {
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    if (trimmedTitle && trimmedDescription) {
      return `${trimmedTitle}\n\n${trimmedDescription}`;
    }
    return trimmedDescription || trimmedTitle;
  }, [title, description]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    const payload = combinedDescription.trim();

    if (!payload) {
      setError(t("description_required") || "Description is required");
      return;
    }

    if (
      payload.length < DESCRIPTION_MIN_LENGTH ||
      payload.length > DESCRIPTION_MAX_LENGTH
    ) {
      setError(
        t("description_length_error") ||
          `Description must be ${DESCRIPTION_MIN_LENGTH}-${DESCRIPTION_MAX_LENGTH} characters.`,
      );
      return;
    }

    const token = getAccessToken();
    if (!token) {
      navigate("/login", { state: { returnTo: "/feed/feedpostadd" } });
      return;
    }

    setSubmitting(true);
    try {
      const apiBase = getApiOriginBase();
      const response = await fetch(`${apiBase}/api/feed/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({ description: payload }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "Failed to publish post");
      }

      toast({
        title: t("post_published") || "Post Published",
        description: t("post_visible") || "Your post is now visible in the feed.",
      });
      navigate("/feed");
    } catch (submitError) {
      setError(submitError.message || t("publish_failed") || "Failed to publish post");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white dark:from-gray-900 dark:to-gray-800 transition-colors duration-300">
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 dark:from-indigo-800 dark:via-purple-800 dark:to-blue-800 py-6">
        <div className="max-w-2xl mx-auto px-4">
          <button
            onClick={() => navigate("/feed")}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
          >
            <FaArrowLeft /> {t("back_to_feed") || "Back to Feed"}
          </button>

          <div className="flex items-center gap-3">
            <FaNewspaper className="text-3xl text-white/90" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                {t("create_feed_post") || "Create Feed Post"}
              </h1>
              <p className="text-white/70 text-sm mt-1">
                {t("share_update") ||
                  "Share an update, announcement, or thought with the community"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto py-8 px-4">
        <Card className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("title_optional") || "Title (Optional)"}
              </label>
              <input
                type="text"
                className="w-full border rounded-xl px-4 py-3 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder={t("enter_title") || "Give your post a title..."}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={200}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("content") || "Content"} <span className="text-red-500">*</span>
              </label>
              <textarea
                className="w-full border rounded-xl px-4 py-3 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                rows={8}
                placeholder={
                  t("enter_description") ||
                  "What's on your mind? Share your thoughts, updates, or announcements..."
                }
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={DESCRIPTION_MAX_LENGTH}
              />
              <div className="flex justify-between items-center mt-2">
                <span
                  className={`text-xs ${
                    combinedDescription.length > DESCRIPTION_MAX_LENGTH * 0.9
                      ? "text-orange-500"
                      : "text-gray-400"
                  }`}
                >
                  {combinedDescription.length}/{DESCRIPTION_MAX_LENGTH}{" "}
                  {t("characters") || "characters"}
                </span>
              </div>
            </div>

            <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-xl p-4 border border-indigo-100 dark:border-indigo-800">
              <p className="text-indigo-700 dark:text-indigo-300 text-sm">
                <strong>{t("tip") || "Tip"}:</strong>{" "}
                {t("feed_tip") ||
                  'Feed posts are text-only. For selling items with images, use the main "Add Post" feature instead.'}
              </p>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl p-4 border border-red-200 dark:border-red-800">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/feed")}
                className="flex-1 py-3 rounded-xl border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {t("cancel") || "Cancel"}
              </Button>
              <Button
                type="submit"
                disabled={submitting || !combinedDescription.trim()}
                className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? t("publishing") || "Publishing..." : t("publish_post") || "Publish Post"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default PostAdd;
