"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";

type ConfirmOpts = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type DialogApi = {
  confirm: (opts: ConfirmOpts) => Promise<boolean>;
  notify: (message: string) => void;
};

const Ctx = createContext<DialogApi | null>(null);

export function useDialog(): DialogApi {
  const c = useContext(Ctx);
  if (!c) throw new Error("useDialog debe usarse dentro de AppDialogProvider");
  return c;
}

export function AppDialogProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [confirmState, setConfirmState] = useState<ConfirmOpts | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const confirm = useCallback((opts: ConfirmOpts) => {
    setConfirmState(opts);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const finish = useCallback((v: boolean) => {
    resolver.current?.(v);
    resolver.current = null;
    setConfirmState(null);
  }, []);

  const notify = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }, []);

  // Bloquea el scroll del fondo mientras el diálogo esté abierto.
  useEffect(() => {
    if (!confirmState) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [confirmState]);

  return (
    <Ctx.Provider value={{ confirm, notify }}>
      {children}
      {mounted &&
        confirmState &&
        createPortal(
          <ConfirmModal
            opts={confirmState}
            onCancel={() => finish(false)}
            onConfirm={() => finish(true)}
          />,
          document.body
        )}
      {mounted &&
        toast &&
        createPortal(<Toast message={toast} />, document.body)}
    </Ctx.Provider>
  );
}

function ConfirmModal({
  opts,
  onCancel,
  onConfirm,
}: {
  opts: ConfirmOpts;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const destructive = opts.destructive ?? true;
  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-6"
      onClick={onCancel}
    >
      <div
        className="gi-pop w-full max-w-[20rem] rounded-3xl bg-background p-5 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={
            "mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl " +
            (destructive
              ? "bg-destructive/10 text-destructive"
              : "bg-primary/10 text-primary")
          }
        >
          <AlertTriangle className="h-6 w-6" />
        </div>
        {opts.title && (
          <p className="text-base font-bold text-foreground">{opts.title}</p>
        )}
        <p className="mt-1 text-sm text-muted-foreground">{opts.message}</p>
        <div className="mt-5 flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-foreground transition active:scale-[0.98]"
          >
            {opts.cancelLabel ?? "Cancelar"}
          </button>
          <button
            onClick={onConfirm}
            className={
              "flex-1 rounded-xl py-2.5 text-sm font-semibold transition active:scale-[0.98] " +
              (destructive
                ? "bg-destructive text-white"
                : "bg-primary text-primary-foreground")
            }
          >
            {opts.confirmLabel ?? "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Toast({ message }: { message: string }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[120] flex justify-center px-4">
      <div className="gi-toast rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background shadow-lg">
        {message}
      </div>
    </div>
  );
}
