"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import type { ActionState } from "./BookingFlow";

/** Inline "move to another time" form for the barber's appointment list. */
export function MoveButton({
  action,
  date,
  time,
  hasEmail,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  /** Current local date (yyyy-MM-dd) and time (HH:mm), to start from. */
  date: string;
  time: string;
  hasEmail: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(action, { error: null });
  const submitted = useRef(false);

  // Close once the move went through; the list re-renders with the new time.
  useEffect(() => {
    if (submitted.current && !pending && !state.error) {
      submitted.current = false;
      setOpen(false);
    }
  }, [pending, state]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-[40px] rounded-full px-3 text-[14px] font-semibold text-muted transition-colors hover:bg-chip hover:text-ink"
      >
        Verzetten
      </button>
    );
  }

  return (
    <form
      className="fade-in w-full rounded-[16px] bg-bone p-3 ring-1 ring-line sm:min-w-[340px]"
      onSubmit={(e) => {
        e.preventDefault();
        submitted.current = true;
        const data = new FormData(e.currentTarget);
        startTransition(() => formAction(data));
      }}
    >
      <p className="px-1 pb-3 text-[14px] font-semibold">Verzetten naar</p>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input
          type="date"
          name="date"
          required
          defaultValue={state.values?.date ?? date}
          aria-label="Nieuwe datum"
          className="input"
        />
        <input
          type="time"
          name="time"
          required
          step={300}
          defaultValue={state.values?.time ?? time}
          aria-label="Nieuwe tijd"
          className="input w-[120px]"
        />
      </div>
      {hasEmail && (
        <label className="mt-3 flex cursor-pointer items-center gap-2.5 px-1 text-[14px]">
          <input type="checkbox" name="notify" defaultChecked className="h-[18px] w-[18px] accent-[var(--color-ink)]" />
          Stuur een mail met de nieuwe tijd
        </label>
      )}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOpen(false)}>
          Laat maar
        </button>
        <button type="submit" disabled={pending} className="btn btn-primary btn-sm">
          {pending ? "Verzetten…" : "Verzetten"}
        </button>
      </div>
      {state.error && (
        <p role="alert" className="px-1 pt-2 text-[13px] text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}
