"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui";
import { Sheet } from "@/components/sheet";
import { OrderForm } from "@/components/order-form";
import type { ExchangeRate } from "@/lib/types";

export function ClientOrderButton({
  rates,
  pointsBalance = 0,
  redeemMin = 100,
  pointValue = 0.05,
}: {
  rates: ExchangeRate[];
  pointsBalance?: number;
  redeemMin?: number;
  pointValue?: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button className="w-full" onClick={() => setOpen(true)}>
        <Send className="h-4 w-4" /> Pedir una remesa
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Pedir una remesa">
        <OrderForm
          rates={rates}
          onDone={() => setOpen(false)}
          pointsBalance={pointsBalance}
          redeemMin={redeemMin}
          pointValue={pointValue}
        />
      </Sheet>
    </>
  );
}
