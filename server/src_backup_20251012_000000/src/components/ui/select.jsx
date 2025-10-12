import React from 'react';
import { cn } from '@/lib/utils';

export function Select({ children, onValueChange, value, defaultValue, ...props }) {
  const [open, setOpen] = React.useState(false);
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = React.useState(defaultValue || "");
  const selected = isControlled ? value : internalValue;
  const handleSelect = (val) => {
    if (!isControlled) setInternalValue(val);
    if (onValueChange) onValueChange(val);
    setOpen(false);
  };
  return (
    <div className="relative" tabIndex={0} onBlur={() => setOpen(false)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full border rounded px-3 py-2 text-left"
        onClick={() => setOpen((o) => !o)}
      >
        {React.Children.toArray(children).find(opt => opt.props.value === selected)?.props.children || "Select..."}
      </button>
      {open && (
        <ul
          role="listbox"
          tabIndex={-1}
          className="absolute z-10 mt-1 w-full bg-white border rounded shadow max-h-60 overflow-auto"
        >
          {React.Children.map(children, (opt) =>
            React.cloneElement(opt, {
              selected: opt.props.value === selected,
              onClick: () => handleSelect(opt.props.value),
            })
          )}
        </ul>
      )}
    </div>
  );
}

export function SelectTrigger({ className, children, ...props }) {
  return (
    <button
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function SelectContent({ className, children, ...props }) {
  return (
    <div
      className={cn(
        "relative z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md",
        className
      )}
      {...props}
    >
      <ul className="max-h-60 overflow-auto">{children}</ul>
    </div>
  );
}

export function SelectItem({ className, children, value, selected, onClick, ...props }) {
  return (
    <li
      role="option"
      aria-selected={selected}
      tabIndex={0}
      className={cn(
        "px-3 py-2 cursor-pointer hover:bg-blue-100",
        selected ? "bg-blue-100 font-bold" : "",
        className
      )}
      onClick={onClick}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick && onClick(); }}
      {...props}
    >
      {children}
    </li>
  );
}

export function SelectValue({ placeholder, ...props }) {
  return <span className="pointer-events-none" {...props}>{placeholder}</span>;
}
