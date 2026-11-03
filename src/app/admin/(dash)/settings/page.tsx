import { calendarFeedKey } from "@/lib/auth";
import { ActionForm, Submit } from "@/components/ActionForm";
import { ShareLink } from "@/components/ShareLink";
import { getSettings } from "@/lib/data";
import { siteUrl } from "@/lib/env";
import { saveSettingsAction } from "../../actions";

export const metadata = { title: "Instellingen" };

export default async function SettingsPage() {
  const s = await getSettings();
  const feed = `${siteUrl()}/api/calendar?key=${calendarFeedKey()}`;
  const webcal = feed.replace(/^https?:/, "webcal:");
  const site = siteUrl();

  return (
    <div className="fade-in max-w-[760px]">
      <h1 className="headline text-[34px] sm:text-[40px]">Instellingen</h1>

      <div className="card mt-6 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="label">Je link om afspraken te maken</p>
          <a href={site} className="title mt-0.5 block truncate text-[18px] hover:underline">
            {site.replace(/^https?:\/\//, "")}
          </a>
        </div>
        <ShareLink url={site} />
      </div>

      <ActionForm action={saveSettingsAction} successMessage="Opgeslagen." className="mt-6 space-y-5">
        <Group title="Je pagina" description="Wat vrienden zien als ze een afspraak maken, en in de mails.">
          <Text label="Naam" name="businessName" defaultValue={s.businessName} required />
          <Text label="Naam van de behandeling" name="serviceName" defaultValue={s.serviceName} required />
          <Text label="Kop" name="tagline" defaultValue={s.tagline} wide hint="De grote zin bovenaan je pagina." />
          <Text label="Omschrijving" name="serviceDescription" defaultValue={s.serviceDescription} wide />
          <Area label="Adres" name="address" defaultValue={s.address} hint="Staat in de bevestigingen en herinneringen." />
          <Text label="Extra info" name="contact" defaultValue={s.contact} hint="Staat bij je adres, bijv. “Bel aan bij de bovenste bel”." />
          <Text
            label="WhatsApp-nummer"
            name="whatsapp"
            type="tel"
            inputMode="tel"
            defaultValue={s.whatsapp}
            placeholder="06 12345678"
            hint="Vrienden krijgen een knop om je te appen, bijv. voor last-minute wijzigingen."
          />
        </Group>

        <Group title="De afspraak">
          <Text label="Duur (minuten)" name="durationMin" type="number" inputMode="numeric" min={10} max={240} step={5} defaultValue={s.durationMin} />
          <Text label="Pauze ertussen (minuten)" name="bufferMin" type="number" inputMode="numeric" min={0} max={120} step={5} defaultValue={s.bufferMin} hint="Tijd om te vegen en klaar te zetten." />
          <Text
            label="Prijs"
            name="price"
            inputMode="decimal"
            placeholder="25"
            defaultValue={s.pricePence ? (s.pricePence / 100).toFixed(s.pricePence % 100 ? 2 : 0).replace(".", ",") : ""}
            hint="Laat leeg om geen prijs te tonen."
          />
          <Select
            label="Valuta"
            name="currency"
            defaultValue={s.currency}
            options={[...new Set(["EUR", "GBP", "USD", s.currency])].map((c) => [c, c])}
          />
        </Group>

        <Group title="Regels">
          <Text label="Minimale voorbereidingstijd (uren)" name="minNoticeHours" type="number" inputMode="numeric" min={0} max={168} defaultValue={s.minNoticeHours} hint="Tot hoe kort van tevoren een plek nog te boeken is." />
          <Text label="Boekingsperiode (dagen)" name="windowDays" type="number" inputMode="numeric" min={1} max={180} defaultValue={s.windowDays} hint="Hoe ver vooruit vrienden kunnen boeken." />
          <Text label="Wijzigingsgrens (uren)" name="cancelCutoffHours" type="number" inputMode="numeric" min={0} max={168} defaultValue={s.cancelCutoffHours} hint="Zo lang van tevoren stopt online verzetten en annuleren." />
          <Select
            label="Tijdzone"
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
              <span className="block font-semibold">Nieuwe afspraken aannemen</span>
              <span className="text-[14px] text-muted">Vink uit om de pagina even stil te zetten, bijv. als je weg bent.</span>
            </span>
          </label>
        </Group>

        <div className="sticky bottom-0 z-10 -mx-5 border-t border-line bg-bone/95 px-5 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-md sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
          <Submit className="btn btn-primary w-full sm:w-auto">Instellingen opslaan</Submit>
        </div>
      </ActionForm>

      <section className="card mt-6 p-5 sm:p-6">
        <h2 className="title text-[18px]">Je agenda-abonnement</h2>
        <p className="mt-1.5 max-w-[560px] text-[14px] text-muted">
          Abonneer je één keer en elke afspraak verschijnt vanzelf in de agenda op je telefoon. Tik op
          iPhone op Abonneer. Kies in Google Agenda &ldquo;Andere agenda&rsquo;s → Via URL&rdquo; en plak de
          link. Houd hem privé.
        </p>
        <p className="mt-2 max-w-[560px] text-[14px] text-muted">
          Google Agenda kijkt maar om de paar uur of er iets veranderd is; Apple is sneller. De mail bij
          elke afspraak komt meteen binnen, dus vertrouw daarop voor last-minute boekingen.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input readOnly value={feed} className="input tabular !text-[13px] text-muted" aria-label="Link van het agenda-abonnement" />
          <a href={webcal} className="btn btn-secondary shrink-0">
            Abonneren
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
