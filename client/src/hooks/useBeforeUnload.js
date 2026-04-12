import { useEffect, useRef } from "react";

/**
 * Warns user before leaving a page with unsaved changes.
 * @param {boolean} shouldWarn - Whether to show the warning
 * @param {string} [message] - Custom warning message (browsers may ignore this)
 */
export default function useBeforeUnload(shouldWarn, message = "You have unsaved changes. Leave anyway?") {
  const messageRef = useRef(message);
  messageRef.current = message;

  useEffect(() => {
    if (!shouldWarn) return;

    const handler = (e) => {
      e.preventDefault();
      e.returnValue = messageRef.current;
      return messageRef.current;
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [shouldWarn]);
}
