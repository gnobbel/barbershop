import { asc, gt } from "drizzle-orm";
import { db } from "@/db";
import { timeOff } from "@/db/schema";
import { ActionForm, Submit } from "@/components/ActionForm";
import { getSettings, getWeeklyHours, loadSlotInput } from "@/lib/data";
import { formatDayLong, formatTime, WEEKDAY_ORDER, WEEKDAYS } from "@/lib/format";
import { generateSlots, minutesToTime } from "@/lib/slots";
import {
  addHoursAction,
  addTimeOffAction,
  removeHoursAction,
  removeTimeOffAction,
} from "../../actions";

export const metadata = { title: "Availability" };

export default async function Availability() {
  const s = await getSettings();
  const now = new Date();
  const [input, hours, off] = await Promise.all([
    loadSlotInput(s, now),
    getWeeklyHours(),
    db.select().from(timeOff).where(gt(timeOff.endAt, now)).orderBy(asc(timeOff.startAt)),
  ]);
  const days = generateSlots(input);
  const openSlots = days.reduce((n, d) => n + d.slots.length, 0);

  return (
    <div className="fade-in space-y-20">
      <div>
        <p className="eyebrow mb-4">When you cut</p>
        <h1 className="display text-[44px] sm:text-[52px]">Availability</h1>
        <p className="mt-5 max-w-[560px] text-muted">
          Set your regular weekly hours, then block off any exceptions. Friends see{" "}
          {s.durationMin}-minute slots with {s.bufferMin} minutes between them, from{" "}
          {s.minNoticeHours} hours ahead up to {s.windowDays} days out.
        </p>
        <p className="mt-6 inline-block border-y border-line py-3 text-[14px]">
          <span className="tabular text-ink">{openSlots}</span>{" "}
          <span className="text-muted">
            open {openSlots === 1 ? "slot" : "slots"} across {days.length}{" "}
            {days.length === 1 ? "day" : "days"}
            {days[0] && (
              <>
                {" "}· next{" "}
                <span className="tabular text-ink">
                  {formatDayLong(days[0].slots[0], s.timezone)}, {formatTime(days[0].slots[0], s.timezone)}
                </span>
              </>
            )}
          </span>
        </p>
      </div>

      {/* Weekly hours */}
      <section className="grid gap-10 lg:grid-cols-[1fr_340px] lg:gap-16">
        <div>
          <h2 className="eyebrow mb-4 !text-ink">Weekly hours</h2>
          <ul className="border-t border-line">
            {WEEKDAY_ORDER.map((wd) => {
              const ranges = hours.filter((h) => h.weekday === wd);
              return (
                <li
                  key={wd}
                  className="grid grid-cols-[110px_1fr] items-center gap-4 border-b border-line py-4"
                >
                  <span className={ranges.length ? "" : "text-faint"}>{WEEKDAYS[wd]}</span>
                  {ranges.length ? (
                    <div className="flex flex-wrap gap-2">
                      {ranges.map((h) => (
                        <form
                          key={h.id}
                          action={removeHoursAction.bind(null, h.id)}
                          className="tabular inline-flex items-center gap-3 rounded-xs border border-line bg-paper py-1.5 pl-3 pr-2 text-[14px]"
                        >
                          {minutesToTime(h.startMin)}–{minutesToTime(h.endMin)}
                          <button
                            aria-label={`Remove ${WEEKDAYS[wd]} ${minutesToTime(h.startMin)}–${minutesToTime(h.endMin)}`}
                            className="cursor-pointer px-1 text-faint transition-colors hover:text-danger"
                          >
                            ×
                          </button>
                        </form>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[14px] text-faint">Closed</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <ActionForm action={addHoursAction} resetOnSuccess className="card self-start p-6">
          <h3 className="eyebrow mb-5 !text-ink">Add hours</h3>
          <fieldset>
            <legend className="eyebrow mb-3">Days</legend>
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAY_ORDER.map((wd) => (
                <label key={wd} className="cursor-pointer">
                  <input type="checkbox" name="weekday" value={wd} className="peer sr-only" />
                  <span className="block w-11 rounded-xs border border-line py-2 text-center text-[13px] transition-colors peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink">
                    {WEEKDAYS[wd].slice(0, 2)}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <label className="field">
              <span className="eyebrow">From</span>
              <input type="time" name="start" required defaultValue="10:00" step={300} className="input" />
            </label>
            <label className="field">
              <span className="eyebrow">To</span>
              <input type="time" name="end" required defaultValue="16:00" step={300} className="input" />
            </label>
          </div>
          <div className="mt-6">
            <Submit pendingLabel="Adding…" className="btn btn-primary w-full">
              Add hours
            </Submit>
          </div>
        </ActionForm>
      </section>

      {/* Time off */}
      <section className="grid gap-10 lg:grid-cols-[1fr_340px] lg:gap-16">
        <div>
          <h2 className="eyebrow mb-4 !text-ink">Time off</h2>
          {off.length ? (
            <ul className="border-t border-line">
              {off.map((t) => (
                <li
                  key={t.id}
                  className="flex items-start justify-between gap-4 border-b border-line py-4"
                >
                  <div>
                    <p className="tabular">{describeRange(t.startAt, t.endAt, s.timezone)}</p>
                    {t.note && <p className="mt-0.5 text-[14px] text-muted">{t.note}</p>}
                  </div>
                  <form action={removeTimeOffAction.bind(null, t.id)}>
                    <button className="eyebrow link cursor-pointer hover:!text-danger">Remove</button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <p className="border-y border-line py-5 text-[14px] text-faint">
              Nothing blocked off. Add holidays or evenings you&rsquo;re unavailable.
            </p>
          )}
        </div>

        <ActionForm action={addTimeOffAction} resetOnSuccess className="card self-start p-6">
          <h3 className="eyebrow mb-5 !text-ink">Block off time</h3>
          <div className="grid grid-cols-2 gap-3">
            <label className="field">
              <span className="eyebrow">From</span>
              <input type="date" name="from" required className="input" />
            </label>
            <label className="field">
              <span className="eyebrow">Until</span>
              <input type="date" name="to" className="input" />
            </label>
            <label className="field">
              <span className="eyebrow">
                Time <span className="normal-case tracking-normal text-faint">opt.</span>
              </span>
              <input type="time" name="fromTime" step={300} className="input" />
            </label>
            <label className="field">
              <span className="eyebrow">
                Time <span className="normal-case tracking-normal text-faint">opt.</span>
              </span>
              <input type="time" name="toTime" step={300} className="input" />
            </label>
          </div>
          <label className="field mt-3">
            <span className="eyebrow">Note</span>
            <input name="note" placeholder="Holiday, wedding…" maxLength={120} className="input" />
          </label>
          <p className="mt-3 text-[12px] leading-relaxed text-faint">
            Leave times empty to block whole days. Existing bookings stay as they are.
          </p>
          <div className="mt-5">
            <Submit pendingLabel="Saving…" className="btn btn-primary w-full">
              Block off
            </Submit>
          </div>
        </ActionForm>
      </section>
    </div>
  );
}

function describeRange(start: Date, end: Date, tz: string) {
  const startTime = formatTime(start, tz);
  const endTime = formatTime(end, tz);
  // An end of exactly midnight belongs to the previous day.
  const lastMoment = new Date(end.getTime() - 1);
  const startDay = formatDayLong(start, tz);
  const endDay = formatDayLong(lastMoment, tz);
  const wholeDays = startTime === "00:00" && endTime === "00:00";
  if (wholeDays) return startDay === endDay ? `${startDay}, all day` : `${startDay} – ${endDay}`;
  if (startDay === formatDayLong(end, tz)) return `${startDay}, ${startTime}–${endTime}`;
  return `${startDay} ${startTime} – ${formatDayLong(end, tz)} ${endTime}`;
}
