"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Copy, QrCode, ShieldAlert } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { supabase } from "@/lib/supabase-client";
import type { Project } from "@/types/project";

const subscribeToLocation = () => () => {};
const getBrowserOrigin = () => window.location.origin;
const getServerOrigin = () => "";

export default function AccessKeyPage({
  projectId,
}: {
  projectId: string;
}) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const origin = useSyncExternalStore(
    subscribeToLocation,
    getBrowserOrigin,
    getServerOrigin
  );
  const [loading, setLoading] = useState(Boolean(projectId));
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const registrationUrl =
    origin && projectId
      ? `${origin}/home/access/${encodeURIComponent(projectId)}`
      : "";

  useEffect(() => {
    if (!projectId) return;

    let active = true;

    const loadProject = async () => {
      try {
        const { data: authData, error: authError } =
          await supabase.auth.getUser();

        if (authError) throw authError;
        if (!authData.user) {
          router.replace("/");
          return;
        }

        const { data, error: projectError } = await supabase
          .from("projects")
          .select("*")
          .eq("id", projectId)
          .eq("user_id", authData.user.id)
          .eq("deleted", false)
          .maybeSingle();

        if (projectError) throw projectError;
        if (!data) {
          throw new Error("This election was not found in your account.");
        }

        if (active) setProject(data as Project);
      } catch (loadError: unknown) {
        if (!active) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load your election."
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadProject();
    return () => {
      active = false;
    };
  }, [projectId, router]);

  const copyRegistrationLink = async () => {
    if (!registrationUrl) return;

    try {
      await navigator.clipboard.writeText(registrationUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (copyError: unknown) {
      console.error("Unable to copy voter registration link:", copyError);
      setError("Copy failed. Select the link and copy it manually.");
    }
  };

  const handleEndRegistration = () => {
    router.push("/home/register");
  };

  if (loading) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center px-4 text-white">
        <span className="text-sm text-white/55">Loading election access…</span>
      </main>
    );
  }

  if (!project) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center px-4 py-8 text-white">
        <section className="w-full max-w-lg rounded-3xl border border-red-400/20 bg-[#111722] p-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.42)]">
          <p role="alert" className="text-sm leading-6 text-red-200">
            {error ||
              (projectId
                ? "Unable to load this election."
                : "The election ID is missing from this access link.")}
          </p>
          <Link
            href="/home/starting"
            className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm text-white/70 hover:bg-white/[0.05]"
          >
            <ArrowLeft size={15} />
            Back to election setup
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-3 py-6 text-white sm:px-5 sm:py-10">
      <div className="mx-auto grid w-full max-w-5xl gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-3xl border border-blue-400/20 bg-[#111722]/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.38)] sm:p-8">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-300/20 bg-blue-400/[0.08] text-blue-300 shadow-[0_10px_28px_rgba(0,0,0,0.24)]">
            <QrCode size={24} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
            Private election
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Organizer access link
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/60">
            Share the QR or link with people who should be able to open this
            election&apos;s registration page.
          </p>

          <div
            role="status"
            className="mt-6 flex gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-4"
          >
            <ShieldAlert className="mt-0.5 shrink-0 text-amber-200" size={19} />
            <p className="text-xs leading-5 text-amber-100/80">
              Public registration submission and shared close-state are not
              connected yet. No voter information is collected from this
              page at this stage.
            </p>
          </div>

          <button
            type="button"
            onClick={handleEndRegistration}
            className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-400 px-4 py-3.5 text-sm font-semibold text-[#07101c] shadow-[0_12px_30px_rgba(0,0,0,0.25)] transition hover:-translate-y-0.5 hover:bg-blue-300 hover:shadow-[0_18px_42px_rgba(0,0,0,0.32)]"
          >
            End registering and add students
          </button>
          <Link
            href="/home/starting"
            className="mt-4 inline-flex items-center gap-2 text-sm text-white/45 transition hover:text-white"
          >
            <ArrowLeft size={15} />
            Back to election setup
          </Link>
        </section>

        <aside className="h-fit rounded-3xl border border-white/[0.08] bg-[#111722]/90 p-5 shadow-[0_16px_48px_rgba(0,0,0,0.28)] sm:p-6">
          <h2 className="text-sm font-semibold text-white">Voter registration QR</h2>
          <p className="mt-2 text-xs leading-5 text-white/50">
            Scan or copy this link to open the registration page for{" "}
            <span className="font-medium text-white/75">{project.name}</span>.
          </p>
          {registrationUrl && (
            <div className="mx-auto mt-5 w-fit rounded-2xl bg-white p-3">
              <QRCodeSVG
                value={registrationUrl}
                size={210}
                level="M"
                includeMargin
                bgColor="#ffffff"
                fgColor="#0a0e16"
              />
            </div>
          )}
          <p className="mt-4 break-all rounded-xl border border-white/[0.08] bg-black/20 p-3 text-[11px] leading-5 text-white/60">
            {registrationUrl}
          </p>
          <button
            type="button"
            onClick={() => void copyRegistrationLink()}
            disabled={!registrationUrl}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-400 px-4 py-3 text-sm font-semibold text-[#07101c] transition hover:bg-blue-300 disabled:opacity-50"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? "Link copied" : "Copy registration link"}
          </button>
        </aside>
      </div>
    </main>
  );
}
