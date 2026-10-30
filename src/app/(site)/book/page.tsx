import type { Metadata } from "next";
import { BookingFlow } from "@/components/BookingFlow";
import { getSettings, loadSlotInput } from "@/lib/data";
import { toFlowDays } from "@/lib/flow";
import { formatDuration, formatPrice } from "@/lib/format";
import { generateSlots } from "@/lib/slots";
import { bookAction } from "./actions";

export const metadata: Metadata = { title: "Book" };

export default async function BookPage() {
  const s = await getSettings();
  const days = s.bookingOpen
    ? toFlowDays(generateSlots(await loadSlotInput(s, new Date())), s.timezone)
    : [];
  const price = formatPrice(s.pricePence, s.currency);

  return (
    <div className="fade-in mx-auto max-w-[720px]">
      <header className="mb-14">
        <p className="eyebrow mb-5">Book an appointment</p>
        <h1 className="display text-[44px] sm:text-[56px]">{s.serviceName}</h1>
        <p className="mt-4 text-muted">
          {formatDuration(s.durationMin)}
          {price && <> · {price}</>}
          {s.address && <> · {s.address.split("\n")[0]}</>}
        </p>
      </header>

      {s.bookingOpen ? (
        <BookingFlow days={days} mode="new" action={bookAction} submitLabel="Confirm booking" />
      ) : (
        <div className="card px-6 py-12 text-center">
          <p className="display text-3xl">Bookings are paused</p>
          <p className="mt-4 text-muted">Please check back soon.</p>
        </div>
      )}
    </div>
  );
}
