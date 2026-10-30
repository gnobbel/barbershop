import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-[560px] py-10 text-center">
      <p className="eyebrow mb-5">Not found</p>
      <h1 className="display text-5xl">Nothing here.</h1>
      <p className="mt-5 text-muted">The link may be mistyped, or the booking no longer exists.</p>
      <Link href="/book" className="btn btn-primary mt-10">
        Book an appointment
      </Link>
    </div>
  );
}
