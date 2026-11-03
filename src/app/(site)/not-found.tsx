import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-[480px] py-12 text-center">
      <span className="pill mb-5">404</span>
      <h1 className="headline text-[40px]">Niets te vinden</h1>
      <p className="mt-3 text-muted">Misschien klopt de link niet, of bestaat de afspraak niet meer.</p>
      <Link href="/#book" className="btn btn-primary btn-lg mt-8">
        Afspraak maken
      </Link>
    </div>
  );
}
