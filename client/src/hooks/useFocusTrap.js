/**
 * useFocusTrap — L-02
 * React hook that traps keyboard focus inside a modal/dialog container.
 * Uses the `trapFocus` utility from accessibility.js.
 *
 * Usage:
 *   const ref = useRef(null);
 *   useFocusTrap(ref, isOpen);
 *   return <div ref={ref}>{modalContent}</div>;
 */

import { useEffect } from 'react';
import { trapFocus } from '@/utils/accessibility';

/**
 * Traps focus inside `containerRef` when `isActive` is true.
 * Cleans up the listener when `isActive` becomes false or component unmounts.
 *
 * @param {React.RefObject<HTMLElement>} containerRef - ref to the modal container
 * @param {boolean} isActive - whether the trap should be active
 */
export function useFocusTrap(containerRef, isActive) {
  useEffect(() => {
    if (!isActive) return;
    const el = containerRef?.current;
    if (!el) return;

    // trapFocus returns a cleanup function
    const cleanup = trapFocus(el);
    return cleanup;
  }, [containerRef, isActive]);
}

export default useFocusTrap;
