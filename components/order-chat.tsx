"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { useT } from "@/components/lang-provider";
import {
  listOrderMessages,
  sendOrderMessage,
  markOrderMessagesRead,
  type OrderMessage,
} from "@/app/actions";

// Chat por pedido entre el cliente y el negocio. `me` indica desde qué lado se
// abre (para alinear las burbujas). Sondea cada pocos segundos mientras está
// montado (sin infraestructura de realtime).
export function OrderChat({
  orderId,
  me,
  flow = false,
  messagesClass,
}: {
  orderId: string;
  me: "cliente" | "negocio";
  // flow=true: los mensajes fluyen con la página (sin scroll anidado). Se usa en
  // el detalle del pedido del cliente para evitar un contenedor de scroll
  // anidado que provoca artefactos de compositing (fantasmas) en el WebView de
  // Android. En la hoja del panel se deja el scroll acotado (flow=false).
  flow?: boolean;
  // Alto del área de mensajes en modo flujo (por defecto min-h-[6rem]). Permite
  // que el chat ocupe casi toda la pantalla en su pestaña.
  messagesClass?: string;
}) {
  const t = useT();
  const [messages, setMessages] = useState<OrderMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  async function load(scroll = false) {
    const list = await listOrderMessages(orderId);
    setMessages(list);
    setLoaded(true);
    // Al ver el chat, se marca como leído (limpia el aviso de no leídos).
    markOrderMessagesRead(orderId);
    // En modo flujo no auto-desplazamos (moveríamos toda la página).
    if (scroll && !flow) {
      requestAnimationFrame(() =>
        endRef.current?.scrollIntoView({ behavior: "smooth" })
      );
    }
  }

  useEffect(() => {
    load(true);
    const id = setInterval(() => load(false), 4000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  async function submit() {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");
    await sendOrderMessage(orderId, text);
    await load(true);
    setSending(false);
  }

  return (
    <div className="flex flex-col">
      <div
        className={
          "space-y-2 rounded-xl bg-muted/40 p-3 " +
          (flow
            ? messagesClass ?? "min-h-[6rem]"
            : "max-h-72 min-h-[8rem] overflow-y-auto")
        }
      >
        {!loaded ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            {t("Cargando…")}
          </p>
        ) : messages.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            {me === "negocio"
              ? t("Aún no hay mensajes con el cliente.")
              : t("Escríbele al negocio si tienes dudas de este envío.")}
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.sender === me;
            return (
              <div
                key={m.id}
                className={"flex " + (mine ? "justify-end" : "justify-start")}
              >
                <div
                  className={
                    "max-w-[80%] rounded-2xl px-3 py-2 text-sm " +
                    (mine
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-foreground border border-border")
                  }
                >
                  <p className="whitespace-pre-line break-words">{m.body}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <div className="mt-2 flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          placeholder={t("Escribe un mensaje…")}
          className="max-h-24 flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!input.trim() || sending}
          aria-label={t("Enviar")}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition active:scale-95 disabled:opacity-50"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
