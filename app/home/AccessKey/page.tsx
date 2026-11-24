import Link from "next/link";
import { ArrowLeft, KeyRound, ShieldAlert } from "lucide-react";

export default function AccessKeyPage() {
  return (
    <main className="flex min-h-[calc(100dvh-5rem)] items-center justify-center px-4 py-8 text-white">
      <section className="w-full max-w-xl rounded-3xl border border-blue-400/20 bg-[#111722]/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.42)] sm:p-9">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-300/20 bg-blue-400/[0.08] text-blue-300 shadow-[0_10px_28px_rgba(0,0,0,0.24)]">
          <KeyRound size={25} />
        </div>

        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
          Private election
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          Secure access setup
        </h1>
        <p className="mt-3 text-sm leading-6 text-white/60">
          Private elections need server-verified, one-use voter keys. That
          secure key service is not configured yet, so no private election or
          access key has been created.
        </p>

        <div
          role="status"
          className="mt-6 flex gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-4"
        >
          <ShieldAlert className="mt-0.5 shrink-0 text-amber-200" size={19} />
          <p className="text-xs leading-5 text-amber-100/80">
            Do not share a voting link or rely on a browser-generated key for
            a private election. Keys must be validated and consumed on the
            server to prevent unauthorized or duplicate votes.
          </p>
        </div>

        <Link
          href="/home/starting"
          className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-300/25 bg-blue-400/[0.09] px-4 py-3.5 text-sm font-semibold text-blue-100 shadow-[0_10px_28px_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5 hover:border-blue-300/45 hover:bg-blue-400/[0.14] hover:shadow-[0_16px_38px_rgba(0,0,0,0.3)]"
        >
          <ArrowLeft size={16} />
          Back to election setup
        </Link>
      </section>
    </main>
  );
}
