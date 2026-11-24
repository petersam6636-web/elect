import { QrCode, ShieldCheck, Vote } from "lucide-react";

import type { Project } from "@/types/project";

export default function AccessProjectSummary({
  project,
}: {
  project: Project;
}) {
  return (
    <section className="rounded-3xl border border-blue-400/20 bg-[#111722]/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.38)] sm:p-8">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-300/20 bg-blue-400/[0.08] text-blue-300">
        <Vote size={22} />
      </div>
      <h1 className="mt-5 break-words text-2xl font-bold tracking-tight sm:text-3xl">
        {project.name}
      </h1>
      <p className="mt-2 text-sm leading-6 text-white/55">
        {project.description || "No election description was provided."}
      </p>

      <div className="mt-6 flex gap-3 rounded-2xl border border-blue-300/20 bg-blue-400/[0.06] p-4">
        <QrCode className="mt-0.5 shrink-0 text-blue-300" size={18} />
        <div>
          <p className="text-sm font-semibold text-blue-100">
            Voter registration link
          </p>
          <p className="mt-1 text-xs leading-5 text-white/55">
            You reached the registration page for this election. The actual
            registration form and shared open/closed state will be connected
            next.
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-4">
        <ShieldCheck className="mt-0.5 shrink-0 text-amber-200" size={18} />
        <p className="text-xs leading-5 text-amber-100/80">
          No voter details are being collected yet. Please wait until the
          registration form is enabled before treating this election as open.
        </p>
      </div>
    </section>
  );
}
