"use client";

import {
  Children,
  isValidElement,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Opt = { value: string; label: string; disabled?: boolean };

function parseOptions(children: ReactNode): Opt[] {
  const out: Opt[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type !== "option") return;
    const props = child.props as {
      value?: string | number;
      children?: ReactNode;
      disabled?: boolean;
    };
    const value = props.value != null ? String(props.value) : "";
    const label =
      typeof props.children === "string" || typeof props.children === "number"
        ? String(props.children)
        : value;
    out.push({ value, label, disabled: props.disabled });
  });
  return out;
}

// Select con la lista de opciones estilizada como la app (hoja inferior),
// en vez del desplegable nativo de Android. Mantiene la misma API que un
// <select>: name, value/defaultValue, onChange({target:{value}}), <option>.
export function Select({
  name,
  value,
  defaultValue,
  onChange,
  children,
  className,
  disabled,
  title = "Selecciona",
}: {
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (e: { target: { value: string } }) => void;
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
  title?: string;
}) {
  const options = useMemo(() => parseOptions(children), [children]);
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState(defaultValue ?? "");
  const current = isControlled ? (value as string) : internal;

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const selected = options.find((o) => o.value === current);
  const label = selected?.label ?? options[0]?.label ?? "—";

  function choose(v: string) {
    if (!isControlled) setInternal(v);
    onChange?.({ target: { value: v } });
    setOpen(false);
  }

  return (
    <>
      {name && <input type="hidden" name={name} value={current} />}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-xl border border-input bg-background py-2.5 pl-3 pr-3 text-left text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:opacity-50",
          className
        )}
      >
        <span className="truncate">{label}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {open &&
        mounted &&
        createPortal(
          <div
            className="fixed inset-0 z-[110] flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
            onClick={() => setOpen(false)}
          >
            <div
              className="gi-sheet max-h-[70vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-background p-2 pb-6 sm:rounded-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="px-3 py-2 text-sm font-bold text-foreground">
                {title}
              </p>
              <div className="space-y-0.5">
                {options.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    disabled={o.disabled}
                    onClick={() => choose(o.value)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left text-sm transition active:scale-[0.99] disabled:opacity-40",
                      o.value === current
                        ? "bg-primary/10 font-semibold text-primary"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    <span className="truncate">{o.label}</span>
                    {o.value === current && (
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
