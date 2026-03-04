import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { translateBatch } from '@/utils/translateContent';

const EXCLUDED_SELECTOR =
  'script,style,noscript,textarea,code,pre,[contenteditable="true"],[data-no-auto-translate="true"]';

const MAX_TEXT_LENGTH = 280;

const isEligibleText = (value) => {
  if (typeof value !== 'string') {
    return false;
  }

  const text = value.trim();
  if (!text || text.length < 2 || text.length > MAX_TEXT_LENGTH) {
    return false;
  }

  // Skip pure numeric/symbol content.
  if (/^[0-9\s.,:/\-+()%[\]{}]+$/.test(text)) {
    return false;
  }

  // Only auto-translate Latin-script source so already-localized text is left untouched.
  return /[A-Za-z]/.test(text);
};

const getNormalizedLanguage = (value) => String(value || 'en').trim().toLowerCase().split('-')[0];

const isNodeConnected = (node) => Boolean(node && node.isConnected);

function GlobalContentTranslator() {
  const { i18n } = useTranslation();

  const textNodeStateRef = useRef(new Map());
  const attrStateRef = useRef(new Map());
  const observerRef = useRef(null);
  const scanTimerRef = useRef(null);
  const isWorkingRef = useRef(false);
  const latestLanguageRef = useRef(getNormalizedLanguage(i18n.language));

  const cleanupDetachedState = () => {
    const textStates = textNodeStateRef.current;
    for (const [node] of textStates) {
      if (!isNodeConnected(node)) {
        textStates.delete(node);
      }
    }

    const attrStates = attrStateRef.current;
    for (const [element] of attrStates) {
      if (!isNodeConnected(element)) {
        attrStates.delete(element);
      }
    }
  };

  const restoreOriginalContent = () => {
    cleanupDetachedState();

    for (const [node, state] of textNodeStateRef.current) {
      if (!isNodeConnected(node)) {
        continue;
      }
      if (typeof state?.originalText === 'string' && node.nodeValue !== state.originalText) {
        node.nodeValue = state.originalText;
      }
      if (state) {
        state.translatedLang = 'en';
        state.translatedText = state.originalText;
      }
    }

    for (const [element, state] of attrStateRef.current) {
      if (!isNodeConnected(element) || !state || typeof state !== 'object') {
        continue;
      }
      ['placeholder', 'title', 'aria-label'].forEach((attrName) => {
        const originalKey = `${attrName}Original`;
        const original = state[originalKey];
        if (typeof original === 'string' && element.getAttribute(attrName) !== original) {
          element.setAttribute(attrName, original);
        }
      });
      state.translatedLang = 'en';
    }
  };

  const collectTextNodes = (root) => {
    if (!root) {
      return [];
    }

    const collected = [];
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          if (!node || typeof node.nodeValue !== 'string') {
            return NodeFilter.FILTER_REJECT;
          }

          const parent = node.parentElement;
          if (!parent || parent.closest(EXCLUDED_SELECTOR)) {
            return NodeFilter.FILTER_REJECT;
          }

          if (!isEligibleText(node.nodeValue)) {
            return NodeFilter.FILTER_REJECT;
          }

          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let current = walker.nextNode();
    while (current) {
      collected.push(current);
      current = walker.nextNode();
    }

    return collected;
  };

  const collectAttributeElements = (root) => {
    if (!root || typeof root.querySelectorAll !== 'function') {
      return [];
    }

    return Array.from(root.querySelectorAll('[placeholder],[title],[aria-label]')).filter((element) => {
      if (!element || element.closest(EXCLUDED_SELECTOR)) {
        return false;
      }
      return true;
    });
  };

  const scheduleScan = (delayMs = 100) => {
    if (scanTimerRef.current) {
      clearTimeout(scanTimerRef.current);
    }
    scanTimerRef.current = setTimeout(() => {
      scanTimerRef.current = null;
      const lang = latestLanguageRef.current;
      if (lang === 'en') {
        return;
      }
      void runScan(document.body, lang);
    }, delayMs);
  };

  const runScan = async (root, targetLang) => {
    if (!root || targetLang === 'en' || isWorkingRef.current) {
      return;
    }

    isWorkingRef.current = true;
    try {
      cleanupDetachedState();

      const textNodes = collectTextNodes(root);
      const textTasks = [];

      textNodes.forEach((node) => {
        const currentText = node.nodeValue || '';
        let state = textNodeStateRef.current.get(node);
        if (!state) {
          state = {
            originalText: currentText,
            translatedLang: null,
            translatedText: null
          };
          textNodeStateRef.current.set(node, state);
        } else {
          const externallyChanged =
            currentText !== state.originalText && currentText !== state.translatedText;
          if (externallyChanged) {
            state.originalText = currentText;
            state.translatedLang = null;
            state.translatedText = null;
          }
        }

        if (!isEligibleText(state.originalText)) {
          return;
        }

        if (state.translatedLang === targetLang && currentText === state.translatedText) {
          return;
        }

        textTasks.push({
          kind: 'text',
          node,
          state,
          source: state.originalText
        });
      });

      const attributeElements = collectAttributeElements(root);
      const attrTasks = [];

      attributeElements.forEach((element) => {
        let state = attrStateRef.current.get(element);
        if (!state) {
          state = {
            translatedLang: null
          };
          attrStateRef.current.set(element, state);
        }

        ['placeholder', 'title', 'aria-label'].forEach((attrName) => {
          const currentValue = element.getAttribute(attrName);
          if (!isEligibleText(currentValue)) {
            return;
          }

          const originalKey = `${attrName}Original`;
          const translatedKey = `${attrName}Translated`;
          const knownOriginal = state[originalKey];
          const knownTranslated = state[translatedKey];

          if (typeof knownOriginal !== 'string') {
            state[originalKey] = currentValue;
          } else {
            const externallyChanged = currentValue !== knownOriginal && currentValue !== knownTranslated;
            if (externallyChanged) {
              state[originalKey] = currentValue;
              state[translatedKey] = null;
              state.translatedLang = null;
            }
          }

          const source = state[originalKey];
          if (!isEligibleText(source)) {
            return;
          }

          if (state.translatedLang === targetLang && currentValue === state[translatedKey]) {
            return;
          }

          attrTasks.push({
            kind: 'attr',
            element,
            state,
            attrName,
            source
          });
        });
      });

      const allTasks = [...textTasks, ...attrTasks];
      if (allTasks.length === 0) {
        return;
      }

      const uniqueSources = Array.from(new Set(allTasks.map((task) => task.source)));
      const translated = await translateBatch(uniqueSources, targetLang);
      const translatedMap = new Map();
      uniqueSources.forEach((source, index) => {
        translatedMap.set(source, translated[index] || source);
      });

      allTasks.forEach((task) => {
        const translatedValue = translatedMap.get(task.source) || task.source;
        if (task.kind === 'text') {
          if (task.node.nodeValue !== translatedValue) {
            task.node.nodeValue = translatedValue;
          }
          task.state.translatedLang = targetLang;
          task.state.translatedText = translatedValue;
          return;
        }

        if (task.element.getAttribute(task.attrName) !== translatedValue) {
          task.element.setAttribute(task.attrName, translatedValue);
        }
        task.state.translatedLang = targetLang;
        task.state[`${task.attrName}Translated`] = translatedValue;
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('[GlobalContentTranslator] scan failed:', error?.message || error);
      }
    } finally {
      isWorkingRef.current = false;
    }
  };

  useEffect(() => {
    const normalizedLang = getNormalizedLanguage(i18n.language);
    latestLanguageRef.current = normalizedLang;

    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return undefined;
    }

    if (scanTimerRef.current) {
      clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }

    if (normalizedLang === 'en') {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      restoreOriginalContent();
      return undefined;
    }

    void runScan(document.body, normalizedLang);

    const observer = new MutationObserver(() => {
      scheduleScan(80);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder', 'title', 'aria-label']
    });

    observerRef.current = observer;

    return () => {
      if (scanTimerRef.current) {
        clearTimeout(scanTimerRef.current);
        scanTimerRef.current = null;
      }
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, [i18n.language]);

  return null;
}

export default GlobalContentTranslator;
