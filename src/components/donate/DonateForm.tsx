"use client";

import { useState } from "react";
import { PRESETS_USD } from "@/lib/btcpay/amounts";
import { createInvoiceAction } from "@/app/donate/actions";

export function DonateForm({ configured }: { configured: boolean }) {
  const [amount, setAmount] = useState<string>("5");

  return (
    <form action={createInvoiceAction} className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {PRESETS_USD.map((preset) => (
          <button
            key={preset}
            type="button"
            data-testid={`preset-${preset}`}
            onClick={() => setAmount(String(preset))}
            className={`px-3 py-1 text-sm border ${
              amount === String(preset)
                ? "border-amber text-amber"
                : "border-amber/30 text-muted hover:text-amber"
            }`}
          >
            ${preset}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <span className="text-muted">Amount (USD)</span>
        <input
          type="number"
          name="amount"
          step="0.01"
          min="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="bg-transparent border border-amber/30 px-2 py-1 w-32 text-amber font-mono"
        />
      </label>
      <button
        type="submit"
        disabled={!configured}
        className="px-4 py-2 border border-amber text-amber hover:bg-amber/10 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {configured ? "Donate via BTCPay" : "Donations not available"}
      </button>
    </form>
  );
}
