import React from "react";

export default function PageDensityToggle({
  value = "compact",
  onChange,
  label = "View",
  className = "",
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">
        {label}
      </span>
      <select
        className="mhub-input h-9 px-3 text-xs font-semibold [&>option]:text-gray-900 [&>option]:bg-white dark:[&>option]:text-gray-100 dark:[&>option]:bg-gray-800"
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        aria-label={`${label} mode`}
      >
        <option value="compact">Compact</option>
        <option value="full">Full</option>
      </select>
    </div>
  );
}

