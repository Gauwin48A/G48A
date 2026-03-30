import e, {
  useCallback as $,
  useEffect as y,
  useState as i,
} from "react";
import {
  useParams as j,
  useNavigate as E,
  useLocation as I,
} from "react-router-dom";
import { Button as N } from "@/components/ui/button";
import { Card as O } from "@/components/ui/card";
import { Avatar as D, AvatarFallback as M } from "@/components/ui/avatar";
import {
  FaHeart as U,
  FaRegHeart as z,
  FaShare as H,
  FaEye as K,
  FaArrowLeft as k,
  FaClock as J,
  FaMapMarkerAlt as V,
} from "react-icons/fa";
import { useTranslation as W } from "react-i18next";
import api from "../lib/api";
import {
  PageErrorState as G,
  PageLoadingState as Q,
} from "@/components/page-state/PageStateBlocks";
const X = () => {
  const { t: translate } = W(),
    tr = (d, n) => {
      const translated = translate(d);
      return typeof translated == "string" && translated.trim() && translated !== d ? translated : n;
    },
    { id: postId } = j(),
    navigate = E(),
    locationPost = I().state?.post || null,
    [post, setPost] = i(locationPost),
    [isLoading, setIsLoading] = i(!locationPost),
    [errorMessage, setErrorMessage] = i(""),
    [isLiked, setIsLiked] = i(!1),
    [likesCount, setLikesCount] = i(Number(locationPost?.likes || 0)),
    [toastMessage, setToastMessage] = i(""),
    [retryCount, setRetryCount] = i(0),
    fetchPost = $(
      async (t) => {
        if (!postId) {
          setPost(null), setErrorMessage(tr("post_not_found", "Post not found.")), setIsLoading(!1);
          return;
        }
        (!locationPost || retryCount > 0) && setIsLoading(!0), setErrorMessage("");
        try {
          const response = await api.get(`/posts/${postId}`, {
            signal: t,
          });
          const d = response?.data ?? response,
            parsedPost = d?.post || d;
          if (!parsedPost || typeof parsedPost != "object") throw new Error("invalid_payload");
          setPost(parsedPost), setLikesCount(Number(parsedPost.likes || 0));
        } catch {
          if (t?.aborted) return;
          setPost(null),
            setErrorMessage(
              tr(
                "post_load_failed",
                "We could not load this post right now. Please try again.",
              ),
            );
        } finally {
          t?.aborted || setIsLoading(!1);
        }
      },
      [postId, locationPost, retryCount],
    );
  y(() => {
    locationPost && retryCount === 0 && (setPost(locationPost), setLikesCount(Number(locationPost.likes || 0)), setIsLoading(!1), setErrorMessage(""));
    const t = new AbortController();
    return (
      fetchPost(t.signal),
      () => {
        t.abort();
      }
    );
  }, [fetchPost, locationPost, retryCount]),
    y(() => {
      if (!toastMessage) return;
      const t = setTimeout(() => setToastMessage(""), 2e3);
      return () => clearTimeout(t);
    }, [toastMessage]),
    y(() => {
      if (!postId) return;
      api.post(`/posts/${postId}/view`).catch(() => {});
      const t =
        localStorage.getItem("userId") || localStorage.getItem("user_id");
      t &&
        api.post(`/recently-viewed/track`, { postId: postId, userId: t, source: "feed" }).catch(() => {});
    }, [postId]);
  const handleLike = async () => {
      if (postId) {
        setIsLiked((t) => {
          const toggled = !t;
          return setLikesCount((d) => (toggled ? d + 1 : d - 1)), toggled;
        });
        try {
          await api.post(`/posts/${postId}/like`);
        } catch {}
      }
    },
    handleShare = async () => {
      if (!postId) return;
      const t = `${window.location.origin}/feed/${postId}`;
      try {
        await navigator.clipboard.writeText(t),
          setToastMessage(tr("link_copied", "Link copied."));
      } catch {
        setToastMessage(tr("unable_to_copy_link", "Unable to copy link."));
      }
    },
    formatDate = (t) =>
      t
        ? new Date(t).toLocaleDateString("en-IN", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "";
  return isLoading
    ? e.createElement(
        "div",
        {
          className:
            "min-h-screen mhub-premium-page bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4 dark:bg-gradient-to-b",
        },
        e.createElement(Q, {
          title: translate("loading") || "Loading...",
          description:
            translate("feed_post_loading_desc") || "Loading the selected feed post.",
          className: "w-full max-w-md page-shell page-pad",
          marker: "loading",
        }),
      )
    : errorMessage || !post
      ? e.createElement(
          "div",
          {
            className:
              "min-h-screen mhub-premium-page bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4 dark:bg-gradient-to-b",
          },
          e.createElement(G, {
            title: tr("post_unavailable_title", "Post unavailable"),
            description:
              errorMessage || tr("post_removed_hint", "This post may have been removed."),
            onRetry: () => setRetryCount((t) => t + 1),
            retryLabel: tr("retry", "Retry"),
            marker: "error",
            className: "w-full max-w-md page-shell page-pad",
            secondaryAction: e.createElement(
              N,
              {
                onClick: () => navigate("/feed"),
                variant: "outline",
                className: "border-indigo-300 text-indigo-700 dark:border-indigo-600/40 dark:text-indigo-300",
              },
              e.createElement(k, { className: "mr-2" }),
              " ",
              translate("back_to_feed") || "Back to Feed",
            ),
          }),
        )
      : e.createElement(
          "div",
          {
            className:
              "min-h-screen mhub-premium-page bg-gradient-to-b from-slate-50 to-white dark:bg-gradient-to-b",
          },
          e.createElement(
            "div",
            {
              className:
                "sticky top-0 z-50 mhub-premium-bar shadow-sm",
            },
            e.createElement(
              "div",
              {
                className:
                  "max-w-4xl mx-auto px-4 py-3 flex items-center gap-4 page-shell page-pad",
              },
              e.createElement(
                "button",
                {
                  onClick: () => navigate("/feed"),
                  className:
                    "flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-indigo-600 transition font-medium dark:text-gray-200 dark:hover:text-indigo-300",
                },
                e.createElement(k, null),
                " ",
                e.createElement(
                  "span",
                  { className: "hidden sm:inline" },
                  translate("back") || "Back",
                ),
              ),
              e.createElement(
                "div",
                { className: "flex-1 text-center dark:text-center" },
                e.createElement(
                  "span",
                  { className: "text-gray-500 dark:text-gray-400 text-sm dark:text-gray-300 dark:text-sm" },
                  tr("post", "Post"),
                ),
              ),
              e.createElement("div", { className: "w-16" }),
            ),
          ),
          e.createElement(
            "div",
            { className: "max-w-4xl mx-auto px-4 py-8 page-shell page-pad" },
            e.createElement(
              O,
              {
                className:
                  "mhub-premium-surface rounded-2xl overflow-hidden",
              },
              e.createElement(
                "div",
                {
                  className:
                    "flex items-center gap-4 p-6 border-b dark:border-gray-700 dark:border-b",
                },
                e.createElement(
                  D,
                  {
                    className:
                      "w-14 h-14 bg-gradient-to-br from-indigo-400 to-purple-500 dark:bg-gradient-to-br",
                  },
                  e.createElement(
                    M,
                    { className: "text-white text-xl font-bold dark:text-white dark:text-xl" },
                    post.user?.name?.[0] || post.username?.[0] || "U",
                  ),
                ),
                e.createElement(
                  "div",
                  { className: "flex-1" },
                  e.createElement(
                    "h3",
                    {
                      className:
                        "font-bold text-lg text-gray-900 dark:text-white dark:text-lg dark:text-gray-100",
                    },
                    post.user?.name || post.username || tr("anonymous", "Anonymous"),
                  ),
                  e.createElement(
                    "div",
                    {
                      className:
                        "flex flex-wrap items-center gap-3 text-gray-500 dark:text-gray-400 text-sm mt-1 dark:text-gray-300 dark:text-sm",
                    },
                    post.location &&
                      e.createElement(
                        "span",
                        { className: "flex items-center gap-1" },
                        e.createElement(V, { className: "text-xs dark:text-xs" }),
                        " ",
                        post.location,
                      ),
                    e.createElement(
                      "span",
                      { className: "flex items-center gap-1" },
                      e.createElement(J, { className: "text-xs dark:text-xs" }),
                      " ",
                      formatDate(post.created_at),
                    ),
                  ),
                ),
              ),
              e.createElement(
                "div",
                { className: "p-6 md:p-8" },
                post.title &&
                  e.createElement(
                    "h1",
                    {
                      className:
                        "text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-6 leading-tight dark:text-2xl dark:md:text-3xl dark:text-gray-100",
                    },
                    post.title,
                  ),
                e.createElement(
                  "article",
                  { className: "prose prose-lg dark:prose-invert max-w-none" },
                  e.createElement(
                    "p",
                    {
                      className:
                        "text-gray-700 dark:text-gray-300 text-lg leading-relaxed whitespace-pre-wrap dark:text-gray-200 dark:text-lg",
                    },
                    post.description ||
                      tr("no_content_available", "No content available."),
                  ),
                ),
              ),
              e.createElement(
                "div",
                {
                  className:
                    "flex flex-wrap items-center justify-between gap-4 px-6 py-4 mhub-premium-bar border-t dark:border-gray-700 dark:border-t",
                },
                e.createElement(
                  "div",
                  { className: "flex gap-6" },
                  e.createElement(
                    "button",
                    {
                      onClick: handleLike,
                      className:
                        "flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-red-500 transition font-medium dark:text-gray-200 dark:hover:text-red-300",
                    },
                    isLiked
                      ? e.createElement(U, {
                          className: "w-5 h-5 text-red-500 dark:text-red-300",
                        })
                      : e.createElement(z, { className: "w-5 h-5" }),
                    e.createElement(
                      "span",
                      null,
                      likesCount,
                      " ",
                      tr("likes", "Likes"),
                    ),
                  ),
                  e.createElement(
                    "button",
                    {
                      onClick: handleShare,
                      className:
                        "flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-indigo-600 transition font-medium dark:text-gray-200 dark:hover:text-indigo-300",
                    },
                    e.createElement(H, { className: "w-4 h-4" }),
                    e.createElement("span", null, tr("share", "Share")),
                  ),
                  e.createElement(
                    "span",
                    {
                      className:
                        "flex items-center gap-2 text-gray-500 dark:text-gray-400 dark:text-gray-300",
                    },
                    e.createElement(K, { className: "w-4 h-4" }),
                    e.createElement(
                      "span",
                      null,
                      post.views_count || post.views || 0,
                      " ",
                      tr("views", "Views"),
                    ),
                  ),
                ),
              ),
            ),
            e.createElement(
              "div",
              { className: "text-center mt-8 dark:text-center" },
              e.createElement(
                N,
                {
                  onClick: () => navigate("/feed"),
                  variant: "outline",
                  className:
                    "border-indigo-300 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-400 px-8 dark:border-indigo-600/40 dark:text-indigo-300 dark:hover:bg-indigo-950/20",
                },
                e.createElement(k, { className: "mr-2" }),
                " ",
                tr("back_to_feed", "Back to Feed"),
              ),
            ),
          ),
          toastMessage &&
            e.createElement(
              "div",
              {
                className:
                  "fixed bottom-28 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-6 py-3 rounded-xl shadow-lg z-50 dark:bg-indigo-700/40 dark:text-white",
              },
              toastMessage,
            ),
        );
};
var ne = X;
export { ne as default };
