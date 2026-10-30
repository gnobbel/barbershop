"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

export type FlowDay = {
  date: string;
  weekdayShort: string;
  day: number;
  monthShort: string;
  label: string;
  slots: { iso: string; label: string }[];
};

export type ActionState = {
  error: string | null;
  fieldErrors?: Record<string, string>;
  /** Echo of submitted values, so a failed submit doesn't wipe the form. */
  values?: Record<string, string>;
};

type Props = {
  days: FlowDay[];
  mode: "new" | "reschedule";
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  submitLabel: string;
};

function scrollIntoViewSoftly(el: HTMLElement | null) {
  if (!el) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
}

export function BookingFlow({ days, mode, action, submitLabel }: Props) {
  const [state, formAction] = useActionState(action, { error: null });
  const [date, setDate] = useState<string | null>(days[0]?.date ?? null);
  const [slot, setSlot] = useState<string | null>(null);
  const timesRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);

  const day = days.find((d) => d.date === date);
  const chosen = day?.slots.find((s) => s.iso === slot);

  useEffect(() => {
    if (slot) scrollIntoViewSoftly(detailsRef.current);
  }, [slot]);

  if (!days.length) {
    return (
      <div className="card px-6 py-12 text-center sm:px-12">
        <p className="display text-3xl">No openings right now</p>
        <p className="mt-4 text-muted">
          Every slot in the coming weeks is taken. Please check back soon.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-14">
      {/* 01 — Day */}
      <section aria-labelledby="step-day">
        <StepHeading n="01" id="step-day">
          Choose a day
        </StepHeading>
        <div className="-mx-5 overflow-x-auto px-5 pb-3 [mask-image:linear-gradient(to_right,#000_calc(100%-56px),transparent)] [scrollbar-width:thin] sm:mx-0 sm:px-0">
          <ul className="flex snap-x gap-2 pr-14">
            {days.map((d) => {
              const active = d.date === date;
              return (
                <li key={d.date} className="snap-start">
                  <button
                    type="button"
                    onClick={() => {
                      setDate(d.date);
                      setSlot(null);
                      scrollIntoViewSoftly(timesRef.current);
                    }}
                    aria-pressed={active}
                    aria-label={`${d.label}, ${d.slots.length} times available`}
                    className={`flex h-[92px] w-[68px] flex-col items-center justify-center rounded-xs border transition-colors duration-200 ${
                      active
                        ? "border-ink bg-ink text-paper"
                        : "border-line bg-paper hover:border-line-strong"
                    }`}
                  >
                    <span
                      className={`text-[10px] font-medium uppercase tracking-[0.16em] ${active ? "text-paper/70" : "text-muted"}`}
                    >
                      {d.weekdayShort}
                    </span>
                    <span className="display tabular mt-1 text-[28px] leading-none">{d.day}</span>
                    <span
                      className={`mt-1.5 text-[10px] uppercase tracking-[0.12em] ${active ? "text-paper/70" : "text-faint"}`}
                    >
                      {d.monthShort}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* 02 — Time */}
      <section aria-labelledby="step-time" ref={timesRef} className="scroll-mt-8">
        <StepHeading n="02" id="step-time">
          Choose a time
        </StepHeading>
        {day && (
          <>
            <p className="display mb-5 text-2xl">{day.label}</p>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {day.slots.map((s) => {
                const active = s.iso === slot;
                return (
                  <li key={s.iso}>
                    <button
                      type="button"
                      onClick={() => setSlot(s.iso)}
                      aria-pressed={active}
                      className={`tabular h-12 w-full rounded-xs border text-[15px] transition-colors duration-200 ${
                        active
                          ? "border-ink bg-ink text-paper"
                          : "border-line bg-paper hover:border-line-strong"
                      }`}
                    >
                      {s.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      {/* 03 — Details / confirm */}
      <section
        aria-labelledby="step-details"
        ref={detailsRef}
        className={`scroll-mt-8 transition-opacity duration-300 ${slot ? "" : "pointer-events-none opacity-40"}`}
        aria-disabled={!slot}
      >
        <StepHeading n="03" id="step-details">
          {mode === "new" ? "Your details" : "Confirm the change"}
        </StepHeading>

        <form action={formAction} className="space-y-6">
          <input type="hidden" name="start" value={slot ?? ""} />

          <div className="border-y border-line py-5">
            <p className="eyebrow mb-1.5">Selected</p>
            <p className="tabular text-[17px]">
              {chosen && day ? (
                <>
                  {day.label} <span className="text-muted">at</span> {chosen.label}
                </>
              ) : (
                <span className="text-faint">Pick a day and time above</span>
              )}
            </p>
          </div>

          {mode === "new" && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Name" name="name" autoComplete="name" required state={state} />
              <Field
                label="Phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                required
                state={state}
              />
              <div className="sm:col-span-2">
                <Field
                  label="Email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  hint="Your confirmation and reminder go here."
                  state={state}
                />
              </div>
              <label className="field sm:col-span-2">
                <span className="eyebrow">
                  Notes <span className="normal-case tracking-normal text-faint">(optional)</span>
                </span>
                <textarea
                  name="notes"
                  defaultValue={state.values?.notes}
                  maxLength={500}
                  className="input"
                  placeholder="Anything I should know: the style you're after, a reference, etc."
                />
              </label>
              {/* Honeypot: invisible to people, irresistible to bots. */}
              <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
                <label>
                  Company
                  <input type="text" name="company" tabIndex={-1} autoComplete="off" />
                </label>
              </div>
            </div>
          )}

          {state.error && (
            <p role="alert" className="border-l-2 border-danger pl-4 text-[14px] text-danger">
              {state.error}
            </p>
          )}

          <Submit disabled={!slot} label={submitLabel} />
        </form>
      </section>
    </div>
  );
}

function StepHeading({ n, id, children }: { n: string; id: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-baseline gap-4">
      <span className="tabular text-[11px] font-medium tracking-[0.18em] text-clay">{n}</span>
      <h2 id={id} className="eyebrow !text-ink">
        {children}
      </h2>
      <span className="h-px flex-1 translate-y-[-3px] bg-line" />
    </div>
  );
}

function Field({
  label,
  name,
  hint,
  state,
  ...rest
}: {
  label: string;
  name: string;
  hint?: string;
  state: ActionState;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const error = state.fieldErrors?.[name];
  return (
    <label className="field">
      <span className="eyebrow">{label}</span>
      <input
        name={name}
        defaultValue={state.values?.[name]}
        className="input"
        aria-invalid={!!error}
        style={error ? { borderColor: "var(--color-danger)" } : undefined}
        {...rest}
      />
      {(error || hint) && (
        <span className={`mt-2 block text-[13px] ${error ? "text-danger" : "text-faint"}`}>
          {error ?? hint}
        </span>
      )}
    </label>
  );
}

function Submit({ disabled, label }: { disabled: boolean; label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={disabled || pending}>
      {pending ? "One moment…" : label}
    </button>
  );
}
