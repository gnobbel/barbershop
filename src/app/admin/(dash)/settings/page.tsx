import { calendarFeedKey } from "@/lib/auth";
import { ActionForm, Submit } from "@/components/ActionForm";
import { getSettings } from "@/lib/data";
import { siteUrl } from "@/lib/env";
import { saveSettingsAction } from "../../actions";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const s = await getSettings();
  const feed = `${siteUrl()}/api/calendar?key=${calendarFeedKey()}`;
  const webcal = feed.replace(/^https?:/, "webcal:");

  return (
    <div className="fade-in">
      <p className="eyebrow mb-4">Your chair</p>
      <h1 className="display text-[44px] sm:text-[52px]">Settings</h1>

      <ActionForm action={saveSettingsAction} successMessage="Saved." className="mt-12 max-w-[760px]">
        <Group title="Presentation" description="What friends see on the booking page and in emails.">
          <Text label="Name" name="businessName" defaultValue={s.businessName} required />
          <Text label="Tagline" name="tagline" defaultValue={s.tagline} wide />
          <Text label="Service" name="serviceName" defaultValue={s.serviceName} required />
          <Text
            label="Description"
            name="serviceDescription"
            defaultValue={s.serviceDescription}
            wide
          />
          <Area
            label="Address"
            name="address"
            defaultValue={s.address}
            hint="Included in confirmations and reminders."
          />
          <Text
            label="Contact"
            name="contact"
            defaultValue={s.contact}
            hint="e.g. WhatsApp 07… Shown for last-minute changes."
          />
        </Group>

        <Group title="The appointment">
          <Text label="Duration (min)" name="durationMin" type="number" min={10} max={240} step={5} defaultValue={s.durationMin} />
          <Text
            label="Break between (min)"
            name="bufferMin"
            type="number"
            min={0}
            max={120}
            step={5}
            defaultValue={s.bufferMin}
            hint="Time to sweep up and reset."
          />
          <Text
            label="Price"
            name="price"
            inputMode="decimal"
            defaultValue={s.pricePence ? (s.pricePence / 100).toFixed(s.pricePence % 100 ? 2 : 0) : ""}
            hint="Leave empty to hide the price."
          />
          <Text label="Currency" name="currency" defaultValue={s.currency} maxLength={3} />
        </Group>

        <Group title="Booking rules">
          <Text
            label="Minimum notice (hours)"
            name="minNoticeHours"
            type="number"
            min={0}
            max={168}
            defaultValue={s.minNoticeHours}
            hint="How soon before a slot it can still be booked."
          />
          <Text
            label="Booking window (days)"
            name="windowDays"
            type="number"
            min={1}
            max={180}
            defaultValue={s.windowDays}
            hint="How far ahead friends can book."
          />
          <Text
            label="Change cutoff (hours)"
            name="cancelCutoffHours"
            type="number"
            min={0}
            max={168}
            defaultValue={s.cancelCutoffHours}
            hint="Online cancelling and rescheduling stop this long before."
          />
          <Text label="Timezone" name="timezone" defaultValue={s.timezone} hint="e.g. Europe/London" />
          <label className="flex cursor-pointer items-start gap-3 sm:col-span-2">
            <input
              type="checkbox"
              name="bookingOpen"
              defaultChecked={s.bookingOpen}
              className="mt-1 h-4 w-4 accent-[var(--color-ink)]"
            />
            <span>
              <span className="block">Accept new bookings</span>
              <span className="text-[13px] text-muted">
                Untick to pause the booking page, for example while you&rsquo;re away.
              </span>
            </span>
          </label>
        </Group>

        <div className="sticky bottom-0 -mx-5 border-t border-line bg-bone/95 px-5 py-5 backdrop-blur sm:mx-0 sm:px-0">
          <Submit>Save settings</Submit>
        </div>
      </ActionForm>

      <section className="mt-20 max-w-[760px] border-t border-line pt-10">
        <h2 className="eyebrow mb-3 !text-ink">Your calendar feed</h2>
        <p className="max-w-[560px] text-[14px] text-muted">
          Subscribe once and every booking appears in your phone&rsquo;s calendar, updating by itself.
          On iPhone tap the link below. In Google Calendar choose &ldquo;Other calendars → From
          URL&rdquo; and paste it. Keep the link private.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input readOnly value={feed} className="input tabular text-[13px]" aria-label="Calendar feed URL" />
          <a href={webcal} className="btn btn-ghost shrink-0">
            Subscribe
          </a>
        </div>
      </section>

      <section className="mt-14 max-w-[760px] border-t border-line pt-10">
        <h2 className="eyebrow mb-3 !text-ink">Your booking link</h2>
        <p className="text-[14px] text-muted">Share this with friends:</p>
        <p className="display mt-2 break-all text-2xl">
          <a href={`${siteUrl()}/book`} className="link">
            {siteUrl().replace(/^https?:\/\//, "")}/book
          </a>
        </p>
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
    <fieldset className="mb-12 border-t border-line pt-8">
      <legend className="sr-only">{title}</legend>
      <div className="mb-6">
        <p className="eyebrow !text-ink">{title}</p>
        {description && <p className="mt-1 text-[14px] text-muted">{description}</p>}
      </div>
      <div className="grid gap-5 sm:grid-cols-2">{children}</div>
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
    <label className={`field ${wide ? "sm:col-span-2" : ""}`}>
      <span className="eyebrow">{label}</span>
      <input className="input" {...rest} />
      {hint && <span className="mt-2 block text-[12px] text-faint">{hint}</span>}
    </label>
  );
}

function Area({
  label,
  hint,
  ...rest
}: { label: string; hint?: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="field">
      <span className="eyebrow">{label}</span>
      <textarea className="input !min-h-[48px]" rows={2} {...rest} />
      {hint && <span className="mt-2 block text-[12px] text-faint">{hint}</span>}
    </label>
  );
}
