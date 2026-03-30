/**
 * ExpandableText — U-06
 * "Read More / Show Less" toggle for long descriptions.
 * Shows a truncated preview (3 lines by default) with a toggle button.
 *
 * Usage:
 *   import ExpandableText from '@/components/ExpandableText';
 *   <ExpandableText text={post.description} maxLines={3} />
 */

import React, { useState, useRef, useLayoutEffect } from 'react';

/**
 * @param {object}  props
 * @param {string}  props.text         - The full text content
 * @param {number}  [props.maxLines=3] - Lines shown when collapsed
 * @param {string}  [props.className]  - Extra CSS classes for the container
 * @param {string}  [props.moreLabel]  - Label for expand button (default: "Read more")
 * @param {string}  [props.lessLabel]  - Label for collapse button (default: "Show less")
 */
export default function ExpandableText({
  text,
  maxLines = 3,
  className = '',
  moreLabel = 'Read more',
  lessLabel = 'Show less',
}) {
  const [expanded, setExpanded]       = useState(false);
  const [isClamped, setIsClamped]     = useState(false);
  const textRef                       = useRef(null);

  // Detect if the text is actually clamped (needs toggle button)
  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;
    setIsClamped(el.scrollHeight > el.clientHeight + 2); // +2px tolerance
  }, [text, maxLines]);

  const lineClampStyle = expanded
    ? {}
    : {
        display: '-webkit-box',
        WebkitLineClamp: maxLines,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      };

  if (!text) return null;

  return (
    <div className={className}>
      <p
        ref={textRef}
        className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line"
        style={lineClampStyle}
      >
        {text}
      </p>

      {(isClamped || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
          aria-expanded={expanded}
        >
          {expanded ? lessLabel : moreLabel}
        </button>
      )}
    </div>
  );
}
