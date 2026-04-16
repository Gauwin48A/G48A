import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  RUNTIME_TRANSLATION_ENABLED,
  translatePostsInstant,
  translatePosts,
  arePostsTranslationsCached,
  translateTextFromCache,
  translateText,
  isTextTranslationCached,
} from "../utils/translateContent";

function normalizeLanguage(value) {
  return String(value || "en")
    .trim()
    .toLowerCase()
    .split("-")[0];
}

function scheduleLowPriorityTask(task, fallbackDelayMs = 32) {
  if (typeof window !== "undefined" && typeof window.requestIdleCallback === "function") {
    const idleId = window.requestIdleCallback(task, { timeout: 420 });
    return () => window.cancelIdleCallback(idleId);
  }

  const timer = setTimeout(task, fallbackDelayMs);
  return () => clearTimeout(timer);
}

const MAX_POSTS_SNAPSHOT_CACHE = 12;
const MAX_GLOBAL_POSTS_SNAPSHOT_CACHE = 40;
const globalPostSnapshots = new Map();

function cacheSnapshot(map, key, value, maxEntries = MAX_POSTS_SNAPSHOT_CACHE) {
  if (!(map instanceof Map) || !key) {
    return;
  }
  map.set(key, value);
  while (map.size > maxEntries) {
    const oldestKey = map.keys().next().value;
    map.delete(oldestKey);
  }
}

function cacheGlobalSnapshot(key, value) {
  cacheSnapshot(globalPostSnapshots, key, value, MAX_GLOBAL_POSTS_SNAPSHOT_CACHE);
}

export function useTranslatedPosts(posts) {
  const { i18n } = useTranslation();
  const currentLang = useMemo(() => normalizeLanguage(i18n.language), [i18n.language]);
  const [translatedPosts, setTranslatedPosts] = useState(posts || []);
  const [isTranslating, setIsTranslating] = useState(false);
  const lastTranslationKeyRef = useRef("");
  const lastLangRef = useRef(currentLang);
  const translatedSnapshotsRef = useRef(new Map());

  const postsSignature = useMemo(() => {
    if (!Array.isArray(posts) || posts.length === 0) {
      return "0";
    }

    return posts
      .map((post, index) => {
        const id = post?.post_id ?? post?.id ?? index;
        const version = post?.updated_at ?? post?.updatedAt ?? post?.created_at ?? "";
        const titleLen = typeof post?.title === "string" ? post.title.length : 0;
        return `${id}:${version}:${titleLen}`;
      })
      .join("|");
  }, [posts]);

  useEffect(() => {
    let cancelled = false;
    const languageChanged = lastLangRef.current !== currentLang;
    lastLangRef.current = currentLang;
    const translationKey = `${currentLang}:${postsSignature}`;

    if (!posts?.length) {
      setTranslatedPosts([]);
      setIsTranslating(false);
      lastTranslationKeyRef.current = "";
      return () => {
        cancelled = true;
      };
    }

    if (currentLang === "en" || !RUNTIME_TRANSLATION_ENABLED) {
      setTranslatedPosts(posts);
      setIsTranslating(false);
      lastTranslationKeyRef.current = translationKey;
      cacheSnapshot(translatedSnapshotsRef.current, translationKey, posts);
      cacheGlobalSnapshot(translationKey, posts);
      return () => {
        cancelled = true;
      };
    }

    const cachedSnapshot =
      translatedSnapshotsRef.current.get(translationKey) ||
      globalPostSnapshots.get(translationKey);
    if (cachedSnapshot) {
      setTranslatedPosts(cachedSnapshot);
      setIsTranslating(false);
      lastTranslationKeyRef.current = translationKey;
      cacheSnapshot(translatedSnapshotsRef.current, translationKey, cachedSnapshot);
      return () => {
        cancelled = true;
      };
    }

    if (lastTranslationKeyRef.current === translationKey) {
      setIsTranslating(false);
      return () => {
        cancelled = true;
      };
    }

    lastTranslationKeyRef.current = translationKey;

    // Apply cached translations immediately so language switch feels instant.
    const instantPosts = translatePostsInstant(posts, currentLang);
    setTranslatedPosts(instantPosts);
    cacheSnapshot(translatedSnapshotsRef.current, translationKey, instantPosts);
    cacheGlobalSnapshot(translationKey, instantPosts);

    if (arePostsTranslationsCached(posts, currentLang)) {
      setIsTranslating(false);
      return () => {
        cancelled = true;
      };
    }

    const doTranslate = async () => {
      setIsTranslating(true);
      try {
        const translated = await translatePosts(posts, currentLang);
        if (!cancelled) {
          setTranslatedPosts(translated);
          cacheSnapshot(translatedSnapshotsRef.current, translationKey, translated);
          cacheGlobalSnapshot(translationKey, translated);
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn("Translation error:", error);
        }
        if (!cancelled) {
          setTranslatedPosts(posts);
        }
      } finally {
        if (!cancelled) {
          setIsTranslating(false);
        }
      }
    };

    let cancelScheduledTask = () => {};
    if (languageChanged) {
      void doTranslate();
    } else {
      cancelScheduledTask = scheduleLowPriorityTask(() => {
        if (!cancelled) {
          void doTranslate();
        }
      });
    }

    return () => {
      cancelled = true;
      cancelScheduledTask();
    };
  }, [posts, currentLang, postsSignature]);

  return { translatedPosts, isTranslating };
}

export function useTranslatedText(text) {
  const { i18n } = useTranslation();
  const currentLang = useMemo(() => normalizeLanguage(i18n.language), [i18n.language]);
  const [translatedText, setTranslatedText] = useState(text || "");
  const [isTranslating, setIsTranslating] = useState(false);
  const lastTextKeyRef = useRef("");
  const lastLangRef = useRef(currentLang);

  useEffect(() => {
    let cancelled = false;
    const languageChanged = lastLangRef.current !== currentLang;
    lastLangRef.current = currentLang;
    const textKey = `${currentLang}:${String(text || "")}`;

    if (!text) {
      setTranslatedText("");
      setIsTranslating(false);
      lastTextKeyRef.current = "";
      return () => {
        cancelled = true;
      };
    }

    if (currentLang === "en" || !RUNTIME_TRANSLATION_ENABLED) {
      setTranslatedText(text);
      setIsTranslating(false);
      lastTextKeyRef.current = textKey;
      return () => {
        cancelled = true;
      };
    }

    if (lastTextKeyRef.current === textKey) {
      setIsTranslating(false);
      return () => {
        cancelled = true;
      };
    }
    lastTextKeyRef.current = textKey;

    // Show cached translation immediately while network translation resolves.
    setTranslatedText(translateTextFromCache(text, currentLang));

    if (isTextTranslationCached(text, currentLang)) {
      setIsTranslating(false);
      return () => {
        cancelled = true;
      };
    }

    const doTranslate = async () => {
      setIsTranslating(true);
      try {
        const translated = await translateText(text, currentLang);
        if (!cancelled) {
          setTranslatedText(translated);
        }
      } catch {
        if (!cancelled) {
          setTranslatedText(text);
        }
      } finally {
        if (!cancelled) {
          setIsTranslating(false);
        }
      }
    };

    let cancelScheduledTask = () => {};
    if (languageChanged) {
      void doTranslate();
    } else {
      cancelScheduledTask = scheduleLowPriorityTask(() => {
        if (!cancelled) {
          void doTranslate();
        }
      }, 24);
    }

    return () => {
      cancelled = true;
      cancelScheduledTask();
    };
  }, [text, currentLang]);

  return { translatedText, isTranslating };
}

export function useContentTranslator() {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;

  const translate = useCallback(
    async (text) => {
      if (!text || currentLang === "en" || !RUNTIME_TRANSLATION_ENABLED) {
        return text;
      }
      return translateText(text, currentLang);
    },
    [currentLang]
  );

  const translateMany = useCallback(
    async (posts) => {
      if (!posts?.length || currentLang === "en" || !RUNTIME_TRANSLATION_ENABLED) {
        return posts;
      }
      return translatePosts(posts, currentLang);
    },
    [currentLang]
  );

  return { translate, translateMany, currentLang };
}

export default {
  useTranslatedPosts,
  useTranslatedText,
  useContentTranslator,
};
