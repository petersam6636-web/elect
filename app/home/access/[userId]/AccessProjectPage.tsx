"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, LoaderCircle } from "lucide-react";

import AccessProjectSummary from "@/components/access/AccessProjectSummary";
import { supabase } from "@/lib/supabase-client";
import useApp from "@/lib/useApp";
import type { Project } from "@/types/project";

export default function AccessProjectPage({
  userId,
}: {
  userId: string;
}) {
  const { currentProject } = useApp();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const contextProject =
    currentProject?.user_id === userId ? currentProject : null;
  const visibleProject = project ?? contextProject;

  useEffect(() => {
    if (contextProject) return;

    let active = true;

    const loadProjectForUser = async () => {
      try {
        const { data, error: projectError } = await supabase
          .from("projects")
          .select("*")
          .eq("user_id", userId)
          .eq("deleted", false)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (projectError) throw projectError;
        if (!data) {
          throw new Error("This election is unavailable.");
        }

        if (active) setProject(data as Project);
      } catch (loadError: unknown) {
        if (!active) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load this election."
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadProjectForUser();
    return () => {
      active = false;
    };
  }, [contextProject, userId]);

  if (loading && !visibleProject) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center gap-3 text-white">
        <LoaderCircle className="animate-spin text-blue-300" size={20} />
        <span className="text-sm text-white/55">Loading election registration…</span>
      </main>
    );
  }

  if (!visibleProject) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center px-4 py-8 text-white">
        <section className="w-full max-w-lg rounded-3xl border border-red-400/20 bg-[#111722] p-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.4)]">
          <p role="alert" className="text-sm leading-6 text-red-200">
            {error || "This election registration link is unavailable."}
          </p>
          <Link
            href="/home"
            className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm text-white/70 hover:bg-white/[0.05]"
          >
            <ArrowLeft size={15} />
            Return home
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-3 py-8 text-white sm:px-5">
      <div className="mx-auto w-full max-w-3xl">
        <AccessProjectSummary project={visibleProject} />
      </div>
    </main>
  );
}
