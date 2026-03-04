import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const SelectContext = createContext(null);

function isSelectItemElement(child) {
  if (!React.isValidElement(child)) {
    return false;
  }
  return child.type === SelectItem || child.type?.displayName === "SelectItem";
}

function collectOptions(children, acc = []) {
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) {
      return;
    }

    if (isSelectItemElement(child) && child.props?.value !== undefined) {
      acc.push({ value: child.props.value, label: child.props.children });
    }

    if (child.props?.children) {
      collectOptions(child.props.children, acc);
    }
  });
  return acc;
}

function useSelectContext(componentName) {
  const context = useContext(SelectContext);
  if (!context) {
    throw new Error(`${componentName} must be used inside Select`);
  }
  return context;
}

function Select({
  children,
  onValueChange,
  value,
  defaultValue = "",
  name,
  disabled = false,
  className,
  ...props
}) {
  const [open, setOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(defaultValue);
  const containerRef = useRef(null);

  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;

  const options = useMemo(() => collectOptions(children), [children]);
  const selectedOption = useMemo(
    () => options.find((option) => option.value === currentValue) || null,
    [options, currentValue],
  );

  const selectValue = (nextValue) => {
    if (!isControlled) {
      setInternalValue(nextValue);
    }
    if (onValueChange) {
      onValueChange(nextValue);
    }
    setOpen(false);
  };

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const onPointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    const onEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  const contextValue = useMemo(
    () => ({
      open,
      setOpen,
      disabled,
      value: currentValue,
      selectedLabel: selectedOption?.label ?? null,
      selectValue,
    }),
    [open, disabled, currentValue, selectedOption],
  );

  return (
    <SelectContext.Provider value={contextValue}>
      <div ref={containerRef} className={cn("relative w-full", className)} {...props}>
        {children}
        {name ? <input type="hidden" name={name} value={currentValue || ""} /> : null}
      </div>
    </SelectContext.Provider>
  );
}

function SelectTrigger({ className, children, ...props }) {
  const { open, setOpen, disabled } = useSelectContext("SelectTrigger");

  return (
    <button
      type="button"
      aria-haspopup="listbox"
      aria-expanded={open}
      disabled={disabled}
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      onClick={(event) => {
        event.preventDefault();
        setOpen((prev) => !prev);
      }}
      {...props}
    >
      {children}
    </button>
  );
}
SelectTrigger.displayName = "SelectTrigger";

function SelectContent({ className, children, ...props }) {
  const { open } = useSelectContext("SelectContent");
  if (!open) {
    return null;
  }

  return (
    <div
      className={cn(
        "absolute top-full left-0 mt-1 z-[9999] w-full overflow-hidden rounded-md border border-gray-200 bg-white text-gray-900 shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100",
        className,
      )}
      style={{
        backgroundColor: "var(--popover, #ffffff)",
        color: "var(--popover-foreground, #111827)",
      }}
      {...props}
    >
      <ul role="listbox" className="max-h-60 overflow-y-auto">
        {children}
      </ul>
    </div>
  );
}
SelectContent.displayName = "SelectContent";

function SelectItem({ className, children, value, ...props }) {
  const { value: selectedValue, selectValue } = useSelectContext("SelectItem");
  const isSelected = value === selectedValue;

  return (
    <li
      role="option"
      aria-selected={isSelected}
      tabIndex={0}
      className={cn(
        "px-3 py-2 cursor-pointer hover:bg-blue-100",
        isSelected ? "bg-blue-100 font-bold" : "",
        className,
      )}
      onClick={(event) => {
        event.stopPropagation();
        selectValue(value);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectValue(value);
        }
      }}
      {...props}
    >
      {children}
    </li>
  );
}
SelectItem.displayName = "SelectItem";

function SelectValue({ placeholder, children, className, ...props }) {
  const { selectedLabel } = useSelectContext("SelectValue");
  return (
    <span className={cn("pointer-events-none truncate", className)} {...props}>
      {selectedLabel ?? children ?? placeholder ?? "Select..."}
    </span>
  );
}
SelectValue.displayName = "SelectValue";

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue };
