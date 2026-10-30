"use client";

import { createContext, startTransition, useActionState, useContext, useEffect, useRef } from "react";
import type { ActionState } from "./BookingFlow";

const PendingContext = createContext(false);

/**
 * A form bound to a server action that keeps what was typed when the action
 * returns an error (React's built-in form actions reset fields on every submit).
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  successMessage,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  successMessage?: string;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  const ref = useRef<HTMLFormElement>(null);
  const submitted = useRef(false);

  useEffect(() => {
    if (!pending && submitted.current && !state.error && resetOnSuccess) ref.current?.reset();
  }, [pending, state, resetOnSuccess]);

  return (
    <PendingContext.Provider value={pending}>
      <form
        ref={ref}
        className={className}
        onSubmit={(e) => {
          e.preventDefault();
          submitted.current = true;
          const data = new FormData(e.currentTarget);
          startTransition(() => formAction(data));
        }}
      >
        {children}
        {state.error ? (
          <p role="alert" className="mt-4 rounded-[10px] bg-danger-soft px-3 py-2 text-[14px] font-medium text-danger">
            {state.error}
          </p>
        ) : (
          successMessage &&
          submitted.current &&
          !pending && (
            <p role="status" className="mt-4 flex items-center gap-2 text-[14px] font-medium text-go">
              <span className="dot" aria-hidden />
              {successMessage}
            </p>
          )
        )}
      </form>
    </PendingContext.Provider>
  );
}

export function Submit({
  children,
  pendingLabel = "Saving…",
  className = "btn btn-primary",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
}) {
  const pending = useContext(PendingContext);
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingLabel : children}
    </button>
  );
}
