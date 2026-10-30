"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "./BookingFlow";

/** Two-step cancel so a stray tap never cancels an appointment. */
export function CancelButton({
  action,
  label = "Cancel appointment",
  confirmText = "Are you sure?",
}: {
  action: (prev: ActionState) => Promise<ActionState>;
  label?: string;
  confirmText?: string;
}) {
  const [armed, setArmed] = useState(false);
  const [state, formAction] = useActionState(action, { error: null });

  if (!armed) {
    return (
      <button type="button" className="btn btn-ghost" onClick={() => setArmed(true)}>
        {label}
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3">
      <span className="text-[14px] text-muted">{confirmText}</span>
      <Confirm />
      <button type="button" className="btn btn-ghost" onClick={() => setArmed(false)}>
        Keep it
      </button>
      {state.error && (
        <p role="alert" className="w-full text-[14px] text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}

function Confirm() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn border-danger bg-danger text-paper hover:opacity-90"
    >
      {pending ? "Cancelling…" : "Yes, cancel"}
    </button>
  );
}
