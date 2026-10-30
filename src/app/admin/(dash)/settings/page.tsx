import { calendarFeedKey } from "@/lib/auth";
import { ActionForm, Submit } from "@/components/ActionForm";
import { ShareLink } from "@/components/ShareLink";
import { getSettings } from "@/lib/data";
import { siteUrl } from "@/lib/env";
import { saveSettingsAction } from "../../actions";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const s = await getSettings();
  const feed = `${siteUrl()}/api/calendar?key=${calendarFeedKey()}`;
  const webcal = feed.replace(/^https?:/, "webcal:");
  const site = siteUrl();

  return (
    <div className="fade-in max-w-[760px]">
      <h1 className="headline text-[34px] sm:text-[40px]">Settings</h1>

      <div className="card mt-6 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="label">Your booking link</p>
          <a href={site} className="title mt-0.5 block truncate text-[18px] hover:underline">
            {site.replace(/^https?:\/\//, "")}
          </a>
        </div>
        <ShareLink url={site} />
      </div>

      <ActionForm action={saveSettingsAction} successMessage="Saved." className="mt-6 space-y-5">
        <Group title="Your page" description="What friends see when booking and in emails.">
          <Text label="Name" name="businessName" defaultValue={s.businessName} required />
          <Text label="Service name" name="serviceName" defaultValue={s.serviceName} required />
          <Text label="Headline" name="tagline" defaultValue={s.tagline} wide hint="The big line at the top of your page." />
          <Text label="Description" name="serviceDescription" defaultValue={s.serviceDescription} wide />
          <Area label="Address" name="address" defaultValue={s.address} hint="Included in confirmations and reminders." />
          <Text label="Contact" name="contact" defaultValue={s.contact} hint="e.g. WhatsApp 06 12345678, for last-minute changes." />
        </Group>

        <Group title="The appointment">
          <Text label="Duration (minutes)" name="durationMin" type="number" inputMode="numeric" min={10} max={240} step={5} defaultValue={s.durationMin} />
          <Text label="Break between (minutes)" name="bufferMin" type="number" inputMode="numeric" min={0} max={120} step={5} defaultValue={s.bufferMin} hint="Time to sweep up and reset." />
          <Text
            label="Price"
            name="price"
            inputMode="decimal"
            placeholder="25"
            defaultValue={s.pricePence ? (s.pricePence / 100).toFixed(s.pricePence % 100 ? 2 : 0) : ""}
            hint="Leave empty to hide the price."
          />
          <Select
            label="Currency"
            name="currency"
            defaultValue={s.currency}
            options={[...new Set(["EUR", "GBP", "USD", s.currency])].map((c) => [c, c])}
          />
        </Group>

        <Group title="Booking rules">
          <Text label="Minimum notice (hours)" name="minNoticeHours" type="number" inputMode="numeric" min={0} max={168} defaultValue={s.minNoticeHours} hint="How soon before a slot it can still be booked." />
          <Text label="Booking window (days)" name="windowDays" type="number" inputMode="numeric" min={1} max={180} defaultValue={s.windowDays} hint="How far ahead friends can book." />
          <Text label="Change cutoff (hours)" name="cancelCutoffHours" type="number" inputMode="numeric" min={0} max={168} defaultValue={s.cancelCutoffHours} hint="Online cancelling and rescheduling stop this long before." />
          <Select
            label="Timezone"
            name="timezone"
            defaultValue={s.timezone}
            options={[...new Set([s.timezone, ...Intl.supportedValuesOf("timeZone")])]
              .sort()
              .map((tz) => [tz, tz.replace(/_/g, " ")])}
          />
          <label className="flex cursor-pointer items-start gap-3 rounded-[12px] bg-white p-4 ring-1 ring-line sm:col-span-2">
            <input
              type="checkbox"
              name="bookingOpen"
              defaultChecked={s.bookingOpen}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-ink)]"
            />
            <span>
              <span className="block font-semibold">Accept new bookings</span>
              <span className="text-[14px] text-muted">Untick to pause the booking page, e.g. while you&rsquo;re away.</span>
            </span>
          </label>
        </Group>

        <div className="sticky bottom-0 z-10 -mx-5 border-t border-line bg-bone/95 px-5 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-md sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
          <Submit className="btn btn-primary w-full sm:w-auto">Save settings</Submit>
        </div>
      </ActionForm>

      <section className="card mt-6 p-5 sm:p-6">
        <h2 className="title text-[18px]">Your calendar feed</h2>
        <p className="mt-1.5 max-w-[560px] text-[14px] text-muted">
          Subscribe once and every booking appears in your phone&rsquo;s calendar, updating by itself.
          On iPhone tap Subscribe. In Google Calendar choose &ldquo;Other calendars → From URL&rdquo; and
          paste the link. Keep it private.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input readOnly value={feed} className="input tabular !text-[13px] text-muted" aria-label="Calendar feed URL" />
          <a href={webcal} className="btn btn-secondary shrink-0">
            Subscribe
          </a>
        </div>
      </section>
    </div>
  );
}

function Group({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="card p-5 sm:p-6">
      <legend className="sr-only">{title}</legend>
      <p className="title text-[17px]">{title}</p>
      {description && <p className="mt-0.5 text-[14px] text-muted">{description}</p>}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Text({
  label,
  hint,
  wide,
  ...rest
}: { label: string; hint?: string; wide?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={`block ${wide ? "sm:col-span-2" : ""}`}>
      <span className="label mb-1.5">{label}</span>
      <input className="input" {...rest} />
      {hint && <span className="mt-1.5 block text-[13px] text-faint">{hint}</span>}
    </label>
  );
}

function Select({
  label,
  options,
  ...rest
}: { label: string; options: string[][] } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block">
      <span className="label mb-1.5">{label}</span>
      <span className="relative block">
        <select className="input appearance-none pr-10" {...rest}>
          {options.map(([value, text]) => (
            <option key={value} value={value}>
              {text}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </label>
  );
}

function Area({
  label,
  hint,
  ...rest
}: { label: string; hint?: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block">
      <span className="label mb-1.5">{label}</span>
      <textarea className="input !min-h-[50px]" rows={2} {...rest} />
      {hint && <span className="mt-1.5 block text-[13px] text-faint">{hint}</span>}
    </label>
  );
}
