import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-navy-deep px-6">
      <div className="w-full max-w-md text-center">
        <div
          className="
            mx-auto
            flex
            h-14
            w-14
            items-center
            justify-center
            rounded-2xl
            bg-gold
            text-2xl
            font-bold
            text-navy-deep
          "
        >
          C
        </div>

        <h1 className="mt-6 font-display text-4xl font-bold text-white">
          Compass
        </h1>

        <p className="mt-2 text-sm text-white/60">
          Cancer care navigation prototype
        </p>

        <div className="mt-10 space-y-3">
          <Link
            href="/patient"
            className="
              block
              rounded-xl
              bg-white
              px-5
              py-4
              font-semibold
              text-navy
              transition
              hover:bg-navy-tint
            "
          >
            Continue as Maria
          </Link>

          <Link
            href="/navigator"
            className="
              block
              rounded-xl
              bg-gold
              px-5
              py-4
              font-semibold
              text-navy-deep
              transition
              hover:bg-gold-soft
            "
          >
            Continue as Navigator
          </Link>
        </div>

        <p className="mt-6 text-xs text-white/45">
          Demo uses synthetic patient data.
        </p>
      </div>
    </main>
  );
}
