import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-[480px] py-12 text-center">
      <span className="pill mb-5">404</span>
      <h1 className="headline text-[40px]">Nothing here</h1>
      <p className="mt-3 text-muted">The link may be mistyped, or the booking no longer exists.</p>
      <Link href="/#book" className="btn btn-primary btn-lg mt-8">
        Book an appointment
      </Link>
    </div>
  );
}
