"use client";

import { useState, useTransition } from "react";
import { Pin, Share2, Check } from "lucide-react";
import { togglePin } from "@/app/actions";

export function ContactTopActions({
  kind,
  id,
  pinned: initialPinned,
  name,
  phone,
}: {
  kind: "cliente" | "beneficiario";
  id: string;
  pinned: boolean;
  name: string;
  phone: string | null;
}) {
  const [pinned, setPinned] = useState(initialPinned);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  function pin() {
    const next = !pinned;
    setPinned(next);
    start(() => togglePin(kind, id, next));
  }

  async function share() {
    const text = `${name}${phone ? `\n${phone}` : ""}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: name, text });
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={pin}
        disabled={pending}
        aria-label="Favorito"
        className={
          "flex h-9 w-9 items-center justify-center rounded-full border transition " +
          (pinned
            ? "border-primary bg-primary/10 text-primary"
            : "border-border bg-card text-muted-foreground")
        }
      >
        <Pin className={"h-4 w-4 " + (pinned ? "fill-primary" : "")} />
      </button>
      <button
        onClick={share}
        aria-label="Compartir"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition"
      >
        {copied ? <Check className="h-4 w-4 text-income" /> : <Share2 className="h-4 w-4" />}
      </button>
    </div>
  );
}
