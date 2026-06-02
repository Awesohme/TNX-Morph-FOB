"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelectMenuOption = {
  value: string;
  label: string;
};

/**
 * Branded dropdown that replaces the native <select> menu. Renders a light, rounded
 * popover (closes on select, keyboard accessible) instead of the browser's default menu.
 *
 * Works in two ways:
 *  - Controlled: pass `value` + `onChange` (e.g. inline auto-submitting fields).
 *  - Inside a form: pass `name` so a hidden input carries the value into FormData.
 */
export function SelectMenu({
  name,
  value,
  defaultValue,
  options,
  onChange,
  placeholder = "Select",
  className,
  buttonClassName,
  menuClassName,
  disabled,
  ariaLabel,
}: {
  name?: string;
  value?: string;
  defaultValue?: string;
  options: SelectMenuOption[];
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState(defaultValue ?? "");
  const current = isControlled ? value : internal;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const selected = options.find((option) => option.value === current);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function commit(next: string) {
    if (!isControlled) setInternal(next);
    onChange?.(next);
    setOpen(false);
  }

  function onButtonKeyDown(event: React.KeyboardEvent) {
    if (disabled) return;
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(Math.max(0, options.findIndex((option) => option.value === current)));
      } else {
        setActiveIndex((index) => Math.min(options.length - 1, index + 1));
      }
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(0, index - 1));
    } else if (event.key === "Escape") {
      setOpen(false);
    } else if (event.key === "Enter" && open) {
      event.preventDefault();
      const option = options[activeIndex];
      if (option) commit(option.value);
    }
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {name ? <input type="hidden" name={name} value={current} /> : null}
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        onKeyDown={onButtonKeyDown}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white pl-3 pr-2.5 text-left text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5 disabled:cursor-not-allowed disabled:opacity-60",
          buttonClassName,
        )}
      >
        <span className={cn("truncate", !selected && "text-slate-400")}>{selected ? selected.label : placeholder}</span>
        <ChevronDown className={cn("size-4 shrink-0 text-slate-400 transition", open && "rotate-180")} />
      </button>

      {open ? (
        <div
          id={listboxId}
          role="listbox"
          className={cn("absolute z-50 mt-1.5 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg shadow-slate-900/5", menuClassName)}
        >
          {options.map((option, index) => {
            const isSelected = option.value === current;
            const isActive = index === activeIndex;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => commit(option.value)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition",
                  isActive ? "bg-slate-100 text-slate-900" : "text-slate-700",
                  isSelected && "font-medium",
                )}
              >
                <span className="truncate">{option.label}</span>
                {isSelected ? <Check className="size-4 shrink-0 text-slate-900" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
