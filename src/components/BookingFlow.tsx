"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";

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
  /** Shorter label for the button on phones. */
  shortSubmitLabel?: string;
  /** e.g. { title: "Knipbeurt", meta: "45 min · € 25" } */
  summary: { title: string; meta: string };
  /** Reschedule: the appointment being moved, shown and preselected. */
  current?: { iso: string; date: string; label: string };
};

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function scrollToSoftly(el: HTMLElement | null) {
  el?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
}

export function BookingFlow({
  days,
  mode,
  action,
  submitLabel,
  shortSubmitLabel,
  summary,
  current,
}: Props) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  const [date, setDate] = useState<string | null>(
    (current && days.some((d) => d.date === current.date) ? current.date : days[0]?.date) ?? null,
  );
  const [slot, setSlot] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const timesRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);

  const day = days.find((d) => d.date === date);
  const chosen = day?.slots.find((s) => s.iso === slot);

  // On phones, move on to the details once a time is picked.
  useEffect(() => {
    if (slot && mode === "new" && window.matchMedia("(max-width: 1023px)").matches) {
      scrollToSoftly(detailsRef.current);
    }
  }, [slot, mode]);

  if (!days.length) {
    return (
      <div className="card px-6 py-14 text-center">
        <p className="title text-[22px]">Op dit moment geen plek</p>
        <p className="mx-auto mt-2 max-w-[320px] text-muted">
          Alles is vol de komende weken. Kijk binnenkort nog eens.
        </p>
      </div>
    );
  }

  function submit() {
    const form = formRef.current;
    if (!form || !slot || pending) return;
    // Native validation scrolls to and highlights the first missing field.
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    startTransition(() => formAction(data));
  }

  return (
    <div>
      <section aria-labelledby="step-when">
        {mode === "new" ? (
          <StepTitle n={1} id="step-when">
            Kies een dag en tijd
          </StepTitle>
        ) : (
          <h2 id="step-when" className="sr-only">
            Kies een nieuwe dag en tijd
          </h2>
        )}
        <DateRow
          days={days}
          selected={date}
          onSelect={(d) => {
            setDate(d);
            setSlot(null);
          }}
        />

        <div ref={timesRef} className="mt-6 scroll-mt-6">
          {day && (
            <>
              <p className="mb-3 text-[14px] text-muted">
                <span className="font-semibold text-ink">{day.label}</span> · {day.slots.length}{" "}
                {day.slots.length === 1 ? "tijd" : "tijden"} vrij
              </p>
              <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                {day.slots.map((s) => {
                  const isCurrent = s.iso === current?.iso;
                  return (
                    <li key={s.iso}>
                      <button
                        type="button"
                        onClick={() => setSlot(s.iso)}
                        aria-pressed={s.iso === slot}
                        disabled={isCurrent}
                        aria-label={isCurrent ? `${s.label}, je huidige tijd` : undefined}
                        className="tile tabular flex h-12 w-full flex-col items-center justify-center text-[15px] font-semibold disabled:cursor-default disabled:border-dashed disabled:bg-transparent disabled:text-faint"
                      >
                        {s.label}
                        {isCurrent && <span className="text-[10px] font-semibold leading-none">Huidig</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </section>

      <form
        ref={formRef}
        id="booking-form"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        noValidate={false}
      >
        <input type="hidden" name="start" value={slot ?? ""} />

        {mode === "new" && (
          <section aria-labelledby="step-details" ref={detailsRef} className="mt-12 scroll-mt-6">
            <StepTitle n={2} id="step-details">
              Je gegevens
            </StepTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Naam" name="name" autoComplete="name" required state={state} />
              <Field
                label="Telefoon"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                state={state}
              />
              <div className="sm:col-span-2">
                <Field
                  label="E-mail"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  hint="Hier komen je bevestiging en herinnering naartoe."
                  state={state}
                />
              </div>
              <label className="sm:col-span-2">
                <span className="label mb-1.5">
                  Opmerkingen <span className="font-normal text-faint">· optioneel</span>
                </span>
                <textarea
                  name="notes"
                  defaultValue={state.values?.notes}
                  maxLength={500}
                  className="input"
                  placeholder="Welke stijl je wilt, een link naar een voorbeeldfoto…"
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
          </section>
        )}

        {/* Keeps the last field clear of the sticky bar on phones. */}
        <div className="h-16 lg:hidden" aria-hidden />

        <SummaryBar
          summary={summary}
          when={chosen && day ? `${day.weekdayShort} ${day.day} ${day.monthShort} · ${chosen.label}` : null}
          idle={current ? `Nu ${current.label}` : "Kies een dag en tijd"}
          error={state.error}
          pending={pending}
          submitLabel={submitLabel}
          shortSubmitLabel={shortSubmitLabel ?? submitLabel}
        />
      </form>
    </div>
  );
}

function StepTitle({ n, id, children }: { n: number; id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="title mb-4 text-[20px] sm:text-[22px]">
      <span className="text-faint">{n}.</span> {children}
    </h2>
  );
}

function DateRow({
  days,
  selected,
  onSelect,
}: {
  days: FlowDay[];
  selected: string | null;
  onSelect: (date: string) => void;
}) {
  const scroller = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const updateEdges = () => {
    const el = scroller.current;
    if (!el) return;
    setEdges({
      start: el.scrollLeft < 4,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
    });
  };
  useEffect(updateEdges, []);

  const page = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  };

  return (
    <div className="flex min-w-0 items-center gap-2">
      <ArrowButton dir={-1} disabled={edges.start} onClick={() => page(-1)} />
      <ul
        ref={scroller}
        onScroll={updateEdges}
        style={{
          maskImage: `linear-gradient(to right, ${edges.start ? "#000" : "transparent"}, #000 32px, #000 calc(100% - 32px), ${edges.end ? "#000" : "transparent"})`,
        }}
        className="no-scrollbar -mx-5 flex min-w-0 flex-1 snap-x snap-mandatory scroll-px-5 gap-2 overflow-x-auto px-5 lg:mx-0 lg:scroll-px-0 lg:px-0"
      >
        {days.map((d, i) => {
          const prev = days[i - 1];
          const newMonth = !!prev && prev.monthShort !== d.monthShort;
          // Extra space between weeks, so skipped (closed or full) days read as gaps in a week.
          const newWeek = !!prev && weekOf(d.date) !== weekOf(prev.date);
          return [
            newMonth && (
              <li
                key={`${d.date}-month`}
                aria-hidden
                className="flex shrink-0 items-center pl-1 text-[12px] font-semibold uppercase tracking-[0.06em] text-faint [writing-mode:vertical-rl] rotate-180"
              >
                {d.monthShort}
              </li>
            ),
            <li key={d.date} className={`snap-start ${newWeek && !newMonth ? "pl-2.5" : ""}`}>
              <button
                type="button"
                onClick={() => onSelect(d.date)}
                aria-pressed={d.date === selected}
                aria-label={`${d.label}, ${d.slots.length} ${d.slots.length === 1 ? "tijd" : "tijden"} vrij`}
                className="tile flex h-[68px] w-[72px] flex-col items-center justify-center gap-0.5"
              >
                <span className="text-[13px] font-medium opacity-70">{d.weekdayShort}</span>
                <span className="tabular whitespace-nowrap text-[15px] font-semibold">
                  {d.day} {d.monthShort}
                </span>
              </button>
            </li>,
          ];
        })}
      </ul>
      <ArrowButton dir={1} disabled={edges.end} onClick={() => page(1)} />
    </div>
  );
}

/** Monday of the week containing a yyyy-MM-dd date, as a day number. */
function weekOf(date: string) {
  const day = Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10)) / 86_400_000;
  // 1970-01-01 was a Thursday, so day 4 was a Monday.
  return day - ((day - 4 + 7 * 1000) % 7);
}

function ArrowButton({ dir, disabled, onClick }: { dir: 1 | -1; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === 1 ? "Latere dagen" : "Eerdere dagen"}
      className="hidden h-10 w-10 shrink-0 place-items-center rounded-full text-ink transition-colors hover:bg-chip disabled:cursor-default disabled:opacity-25 disabled:hover:bg-transparent lg:grid"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d={dir === 1 ? "M9 5l7 7-7 7" : "M15 5l-7 7 7 7"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function SummaryBar({
  summary,
  when,
  idle,
  error,
  pending,
  submitLabel,
  shortSubmitLabel,
}: {
  summary: { title: string; meta: string };
  when: string | null;
  idle: string;
  error: string | null;
  pending: boolean;
  submitLabel: string;
  shortSubmitLabel: string;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper/95 px-5 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] shadow-[0_-1px_2px_rgba(0,0,0,0.03)] backdrop-blur-md lg:static lg:mt-10 lg:rounded-[20px] lg:border lg:bg-paper lg:px-6 lg:py-5 lg:shadow-none lg:backdrop-blur-none">
      {error && (
        <p role="alert" className="mb-2.5 rounded-[10px] bg-danger-soft px-3 py-2 text-[13px] font-medium text-danger">
          {error}
        </p>
      )}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 text-[14px] leading-snug">
          {when ? (
            <>
              <p className="tabular truncate font-semibold">{when}</p>
              <p className="truncate text-muted">
                {summary.title} · {summary.meta}
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold">{summary.title}</p>
              <p className="tabular truncate text-muted">{idle}</p>
            </>
          )}
        </div>
        <button type="submit" aria-label={submitLabel} disabled={!when || pending} className="btn btn-primary shrink-0 lg:min-h-[54px] lg:px-7 lg:text-[16px]">
          {pending ? (
            "Even geduld…"
          ) : (
            <>
              <span className="sm:hidden">{shortSubmitLabel}</span>
              <span className="hidden sm:inline">{submitLabel}</span>
            </>
          )}
          {!pending && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>
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
    <label className="block">
      <span className="label mb-1.5">{label}</span>
      <input
        name={name}
        defaultValue={state.values?.[name]}
        className="input"
        aria-invalid={!!error}
        {...rest}
      />
      {(error || hint) && (
        <span className={`mt-1.5 block text-[13px] ${error ? "text-danger" : "text-faint"}`}>
          {error ?? hint}
        </span>
      )}
    </label>
  );
}
