"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "./BookingFlow";

/** Two-step cancel so a stray tap never cancels an appointment. */
export function CancelButton({
  action,
  label = "Cancel appointment",
  confirmText = "Cancel this appointment?",
  variant = "button",
}: {
  action: (prev: ActionState) => Promise<ActionState>;
  label?: string;
  confirmText?: string;
  /** "quiet" renders a low-key text button, for lists. */
  variant?: "button" | "quiet";
}) {
  const [armed, setArmed] = useState(false);
  const [state, formAction] = useActionState(action, { error: null });

  if (!armed) {
    return variant === "quiet" ? (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className="min-h-[40px] rounded-full px-3 text-[14px] font-semibold text-muted transition-colors hover:bg-danger-soft hover:text-danger"
      >
        {label}
      </button>
    ) : (
      <button type="button" className="btn btn-secondary w-full sm:w-auto" onClick={() => setArmed(true)}>
        {label}
      </button>
    );
  }

  return (
    <form action={formAction} className="fade-in w-full rounded-[16px] bg-danger-soft p-3 sm:min-w-[320px]">
      <p className="px-1 pb-3 text-[14px] font-semibold text-danger">{confirmText}</p>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setArmed(false)}>
          Keep it
        </button>
        <Confirm />
      </div>
      {state.error && (
        <p role="alert" className="px-1 pt-2 text-[13px] text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}

function Confirm() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-danger btn-sm">
      {pending ? "Cancelling…" : "Yes, cancel"}
    </button>
  );
}
