"use client";

import { useState } from "react";

export function ShareLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const message = `Hier kun je een afspraak bij me inplannen om te knippen: ${url}`;
  return (
    <div className="flex gap-2">
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          } catch {
            window.prompt("Kopieer je link:", url);
          }
        }}
      >
        {copied ? "Gekopieerd" : "Kopieer link"}
      </button>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(message)}`}
        target="_blank"
        rel="noreferrer"
        className="btn btn-primary btn-sm"
      >
        Deel via WhatsApp
      </a>
    </div>
  );
}
