import React from "react";
import { useNavigate } from "react-router-dom";
import { useHaptic } from "@/hooks/useHaptic";

/**
 * Floating Action Button — positioned above bottom nav.
 * @param {{ icon: React.ReactNode, label?: string, to?: string, onClick?: () => void, className?: string }} props
 */
export default function FAB({ icon, label, to, onClick, className = "" }) {
  const navigate = useNavigate();
  const { light } = useHaptic();

  const handleClick = () => {
    light();
    if (to) navigate(to);
    else onClick?.();
  };

  return (
    <button
      onClick={handleClick}
      className={`fixed z-40 flex items-center gap-2 rounded-full shadow-lg active:scale-95 transition-transform
        ${label ? "px-5 h-14" : "w-14 h-14 justify-center"}
        bg-primary text-primary-foreground
        ${className}`}
      style={{
        bottom: "calc(var(--bottom-nav-height, 64px) + env(safe-area-inset-bottom, 0px) + 16px)",
        right: "16px",
      }}
      aria-label={label || "Action"}
    >
      {icon}
      {label && <span className="text-sm font-semibold">{label}</span>}
    </button>
  );
}
