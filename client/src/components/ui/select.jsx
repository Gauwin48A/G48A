import React from 'react';
import { cn } from '@/lib/utils';

// Fix: Ensure select dropdown works for both controlled and uncontrolled usage
export function Select({ children, onValueChange, value, defaultValue, name, ...props }) {
  const [open, setOpen] = React.useState(false);
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = React.useState(defaultValue || "");
  const selected = isControlled ? value : internalValue;

  // Normalize children
  const childArray = React.Children.toArray(children);
  const triggerChild = childArray.find(c => c && c.type && (c.type.name === 'SelectTrigger'));
  const contentChild = childArray.find(c => c && c.type && (c.type.name === 'SelectContent'));

  // Helper to find placeholder from SelectValue inside trigger
  let placeholder = 'Select...';
  if (triggerChild && triggerChild.props && triggerChild.props.children) {
    const triggerChildren = React.Children.toArray(triggerChild.props.children);
    const valueNode = triggerChildren.find(ch => ch && ch.type && ch.type.name === 'SelectValue');
    if (valueNode && valueNode.props && valueNode.props.placeholder) placeholder = valueNode.props.placeholder;
  }

  const findLabelForValue = (val) => {
    // Search items inside contentChild then fallback to direct children
    const items = contentChild ? React.Children.toArray(contentChild.props.children) : childArray.filter(c => c && c.type && c.type.name === 'SelectItem');
    const found = items.find(it => it && it.props && it.props.value === val);
    return found ? (found.props.children || String(found.props.value)) : '';
  };

  const handleSelect = (val) => {
    if (!isControlled) setInternalValue(val);
    if (onValueChange) onValueChange(val);
    setOpen(false);
  };

  // Render
  return (
    <div className="relative" tabIndex={0} onBlur={() => setOpen(false)} {...props}>
      {triggerChild ? (
        React.cloneElement(triggerChild, {
          onClick: (e) => { e?.preventDefault(); setOpen(o => !o); },
          children: (
            <span className="flex items-center justify-between w-full">
              <span>{selected ? findLabelForValue(selected) : placeholder}</span>
              {/* keep any right-side icons if triggerChild provided them */}
            </span>
          )
        })
      ) : (
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          className="w-full border rounded px-3 py-2 text-left"
          onClick={() => setOpen(o => !o)}
        >
          {selected ? findLabelForValue(selected) : placeholder}
        </button>
      )}

      {open && (
        contentChild ? (
          React.cloneElement(contentChild, {},
            React.Children.map(contentChild.props.children, (opt) =>
              React.cloneElement(opt, {
                selected: opt.props.value === selected,
                onClick: () => handleSelect(opt.props.value),
              })
            )
          )
        ) : (
          <ul
            role="listbox"
            tabIndex={-1}
            className="absolute z-10 mt-1 w-full bg-white border rounded shadow max-h-60 overflow-auto"
          >
            {React.Children.map(childArray.filter(c => c && c.type && c.type.name === 'SelectItem'), (opt) =>
              React.cloneElement(opt, {
                selected: opt.props.value === selected,
                onClick: () => handleSelect(opt.props.value),
              })
            )}
          </ul>
        )
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

export function SelectValue({ placeholder, children, ...props }) {
  return <span className="pointer-events-none" {...props}>{children || placeholder}</span>;
}
