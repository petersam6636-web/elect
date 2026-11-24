import { CalendarDays, Fingerprint, Vote } from "lucide-react";

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

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/[0.08] bg-black/15 p-4">
          <span className="flex items-center gap-2 text-xs text-white/45">
            <Fingerprint size={14} className="text-blue-300" />
            Election ID
          </span>
          <code className="mt-2 block break-all text-xs text-white/75">
            {project.id}
          </code>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-black/15 p-4">
          <span className="flex items-center gap-2 text-xs text-white/45">
            <CalendarDays size={14} className="text-blue-300" />
            Created
          </span>
          <time className="mt-2 block text-sm text-white/75">
            {new Date(project.created_at).toLocaleDateString()}
          </time>
        </div>
      </div>
    </section>
  );
}
