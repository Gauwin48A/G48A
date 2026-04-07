import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { FaArrowLeft, FaNewspaper } from "react-icons/fa";
import { getAccessToken } from "@/utils/authStorage";
import api from "@/services/api";

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
      const response = await api.post("/feed/add", { description: payload });
      const result = response?.data ?? response;

      toast({
        title: t("post_published") || "Post Published",
        description:
          t("post_visible") || "Your post is now visible in the feed.",
      });
      navigate("/feed");
    } catch (submitError) {
      setError(
        submitError.message || t("publish_failed") || "Failed to publish post",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen mhub-premium-page bg-gradient-to-b from-indigo-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900/60 dark:to-slate-950 transition-colors duration-300 dark:bg-gradient-to-b">
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 dark:from-[#0b1220] dark:via-[#1b2542] dark:to-[#0b1220] py-6 dark:bg-gradient-to-r">
        <div className="max-w-2xl mx-auto px-4 page-shell page-pad">
          <button
            onClick={() => navigate("/feed")}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors dark:text-white/80 dark:hover:text-white"
          >
            <FaArrowLeft /> {t("back_to_feed") || "Back to Feed"}
          </button>

          <div className="flex items-center gap-3">
            <FaNewspaper className="text-3xl text-white/90 dark:text-white/90" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white dark:text-white">
                {t("create_feed_post") || "Create Feed Post"}
              </h1>
              <p className="text-white/70 text-sm mt-1 dark:text-white/70">
                {t("share_update") ||
                  "Share an update, announcement, or thought with the community"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto py-8 px-4 page-shell page-pad">
        <Card className="mhub-premium-surface rounded-2xl overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 dark:text-gray-200">
                {t("title_optional") || "Title (Optional)"}
              </label>
              <input
                type="text"
                className="mhub-input w-full rounded-xl px-4 py-3 text-[var(--text)] placeholder:text-[var(--text-faint)] focus:ring-2 focus:ring-ring focus:ring-offset-0 transition-all dark:text-[var(--text)] dark:placeholder:text-[var(--text-faint)]"
                placeholder={t("enter_title") || "Give your post a title..."}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={200}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 dark:text-gray-200">
                {t("content") || "Content"}{" "}
                <span className="text-red-500 dark:text-red-300">*</span>
              </label>
              <textarea
                className="mhub-input w-full rounded-xl px-4 py-3 text-[var(--text)] placeholder:text-[var(--text-faint)] focus:ring-2 focus:ring-ring focus:ring-offset-0 transition-all resize-none dark:text-[var(--text)] dark:placeholder:text-[var(--text-faint)]"
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

            <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-xl p-4 border border-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/20 dark:border dark:border-indigo-600/40">
              <p className="text-indigo-700 dark:text-indigo-300 text-sm">
                <strong>{t("tip") || "Tip"}:</strong>{" "}
                {t("feed_tip") ||
                  'Feed posts are text-only. For selling items with images, use the main "Add Post" feature instead.'}
              </p>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl p-4 border border-red-200 dark:border-red-800 dark:bg-red-950/20 dark:text-red-300 dark:border dark:border-red-600/40">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/feed")}
                className="flex-1 py-3 rounded-xl border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-950"
              >
                {t("cancel") || "Cancel"}
              </Button>
              <Button
                type="submit"
                disabled={submitting || !combinedDescription.trim()}
                className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed dark:bg-indigo-700/40 dark:hover:bg-indigo-700/40 dark:text-white"
              >
                {submitting
                  ? t("publishing") || "Publishing..."
                  : t("publish_post") || "Publish Post"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default PostAdd;
