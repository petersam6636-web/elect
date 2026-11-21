
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import {
  AlertCircle,
  CalendarDays,
  Check,
  Copy,
  Crown,
  Link2,
  LoaderCircle,
  Plus,
  ArrowRight,
  QrCode,
  Trophy,
  Users,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/lib/supabase-client";
import useApp from "@/lib/useApp";
import { ensureUserTask } from "@/lib/tasks";
import { getElectionDurationMs } from "@/lib/electionTimer";
import type { Project } from "@/types/project";

function formatDate(date: string | null | undefined) {
  if (!date) return "Date unavailable";

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

function formatDuration(milliseconds: number | null) {
  if (
    milliseconds === null ||
    !Number.isFinite(milliseconds) ||
    milliseconds <= 0
  ) {
    return "Not available";
  }

  const seconds = Math.floor(milliseconds / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  const parts: string[] = [];

  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (parts.length === 0) parts.push(`${remainingSeconds}s`);

  return parts.join(" ");
}

export default function SharePage() {
  const {
    linkingId,
    setLinkingId,
    taskKey,
    setTaskKey,
    project,
    setProject,
  } = useApp();

  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [loadingProject, setLoadingProject] = useState(true);
  const [projectError, setProjectError] = useState("");
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const pageRef = useRef<HTMLElement>(null);
  const shareUrl = origin && linkingId
    ? `${origin}/home/share/${linkingId}`
    : "";

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    let active = true;

    const loadCurrentProject = async () => {
      setLinkingId("");
      setCurrentProject(null);
      setLoadingProject(true);
      setProjectError("");

      try {
        const { data: userData, error: userError } =
          await supabase.auth.getUser();

        if (userError) throw userError;
        if (!userData.user) {
          throw new Error("Sign in to generate an election sharing link.");
        }

        await ensureUserTask(userData.user.id);

        const [taskResult, projectResult] = await Promise.all([
          supabase
            .from("tasks")
            .select("key")
            .eq("user_id", userData.user.id)
            .limit(1)
            .maybeSingle(),
          supabase
            .from("projects")
            .select("*, nominees (*, voters (*))")
            .eq("user_id", userData.user.id)
            .eq("deleted", false)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        if (taskResult.error) throw taskResult.error;
        if (projectResult.error) throw projectResult.error;
        if (!active) return;

        const loadedProject = projectResult.data as Project | null;
        setCurrentProject(loadedProject);
        setTaskKey(taskResult.data?.key === true);
        setProject((existingProjects) => {
          if (!loadedProject) return [];

          const previousProjects = (existingProjects ?? []).filter(
            (item) => item.id !== loadedProject.id
          );

          return [...previousProjects, loadedProject].sort((a, b) =>
            a.created_at.localeCompare(b.created_at)
          );
        });
      } catch (error: unknown) {
        if (!active) return;

        setProjectError(
          error instanceof Error
            ? error.message
            : "Unable to load the election for sharing."
        );
      } finally {
        if (active) setLoadingProject(false);
      }
    };

    void loadCurrentProject();

    return () => {
      active = false;
    };
  }, [setLinkingId, setProject, setTaskKey]);

  useEffect(() => {
    if (!currentProject?.id) {
      setLinkingId("");
      setCopied(false);
      setCopyError("");
      return;
    }

    setLinkingId(currentProject.id);
    setCopied(false);
    setCopyError("");
  }, [currentProject?.id, setLinkingId]);

  useEffect(() => {
    if (!copied) return;

    const timeout = window.setTimeout(() => setCopied(false), 2200);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  const canGenerateQr =
    taskKey === true &&
    Boolean(
      (project && project.length > 0) || currentProject
    ) &&
    Boolean(currentProject?.id && shareUrl);

  const finishedResults = useMemo(() => {
    if (!currentProject) return null;

    const nominees = currentProject.nominees ?? [];
    const rankedNominees = [...nominees].sort(
      (a, b) => (b.voters?.length ?? 0) - (a.voters?.length ?? 0)
    );
    const totalVotes = nominees.reduce(
      (total, nominee) => total + (nominee.voters?.length ?? 0),
      0
    );
    const highestVotes = rankedNominees.reduce(
      (highest, nominee) =>
        Math.max(highest, nominee.voters?.length ?? 0),
      0
    );
    const winners =
      highestVotes === 0
        ? []
        : rankedNominees.filter(
            (nominee) => (nominee.voters?.length ?? 0) === highestVotes
          );
    const durationValue = getElectionDurationMs(
      currentProject.duration_ms,
      currentProject.created_at
    );

    return {
      nominees,
      rankedNominees,
      totalVotes,
      winners,
      highestVotes,
      duration:
        Number.isFinite(durationValue) && durationValue > 0
          ? durationValue
          : null,
    };
  }, [currentProject]);

  useEffect(() => {
    if (!pageRef.current) return;

    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(
        pageRef.current?.querySelectorAll(
          "[data-enter], .finished-election-card"
        ) ?? [],
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.55,
          stagger: 0.07,
          ease: "power3.out",
        }
      );
    });

    return () => media.revert();
  }, [loadingProject, taskKey, currentProject?.id]);

  const handleCopyLink = async () => {
    if (!shareUrl) return;

    setCopyError("");

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch (error) {
      console.error("Unable to copy voting link:", error);
      setCopied(false);
      setCopyError("Copy failed. Select the link and copy it manually.");
    }
  };

  return (
    <main
      ref={pageRef}
      className="relative isolate flex min-h-[calc(100dvh-8rem)] items-center justify-center overflow-x-clip px-2 py-4 sm:px-3"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[8%] top-[17%] -z-10 h-12 w-12 rounded-full border border-emerald-300/15 bg-emerald-400/[0.04]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[9%] top-[24%] -z-10 h-20 w-20 rounded-full border border-emerald-300/10 bg-emerald-400/[0.035]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[14%] left-[15%] -z-10 h-7 w-7 rounded-full border border-emerald-300/15 bg-emerald-400/[0.05]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[19%] right-[13%] -z-10 h-14 w-14 rounded-full border border-emerald-300/10 bg-emerald-400/[0.035]"
      />

      <div className="w-full max-w-2xl">
        <header className="mb-8 text-center sm:mb-10">

          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Share your election
          </h1>
        </header>

        {loadingProject ? (
          <section
            className="mx-auto flex min-h-64 max-w-xl flex-col items-center justify-center rounded-3xl border border-white/[0.08] bg-[#0d1310]/80 px-6 text-center backdrop-blur-xl"
            role="status"
            aria-live="polite"
          >
            <LoaderCircle
              size={24}
              className="animate-spin text-emerald-300"
            />
            <p className="mt-4 text-sm text-zinc-400">
              Loading your election link...
            </p>
          </section>
        ) : projectError ? (
          <section
            className="mx-auto flex max-w-xl items-start gap-3 rounded-2xl border border-red-400/15 bg-red-400/[0.05] p-5 text-sm text-red-200"
            role="alert"
          >
            <AlertCircle size={19} className="mt-0.5 shrink-0" />
            <p>{projectError}</p>
          </section>
        ) : !canGenerateQr ? (
          taskKey === false &&
          currentProject &&
          finishedResults ? (
            <section
              data-enter
              className="finished-election-card mx-auto max-w-xl overflow-hidden rounded-3xl border border-emerald-400/15 bg-[#0d1310]/95 px-5 py-6 text-left shadow-[0_25px_90px_rgba(0,0,0,0.32)] backdrop-blur-xl sm:px-7 sm:py-7"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[0.07] px-3 py-1.5 text-xs font-medium text-emerald-300">
                  <Check size={13} />
                  Election completed
                </span>
                <span className="inline-flex items-center gap-2 text-xs text-zinc-500">
                  <CalendarDays size={14} />
                  {formatDate(currentProject.created_at)}
                </span>
              </div>

              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400/60">
                  Finished project
                </p>
                <h2 className="mt-2 break-words text-2xl font-semibold tracking-tight text-white">
                  {currentProject.name || "Untitled election"}
                </h2>
                {currentProject.description && (
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-400">
                    {currentProject.description}
                  </p>
                )}
              </div>

              <div className="mt-6 rounded-2xl border border-emerald-300/15 bg-black/20 p-5">
                {finishedResults.winners.length === 0 ? (
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-zinc-400">
                      <Trophy size={21} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        No winner recorded
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        No votes were submitted for this election.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-yellow-300/20 bg-yellow-300/[0.09] text-yellow-300">
                        <Crown size={22} />
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-zinc-500">
                          {finishedResults.winners.length > 1
                            ? "Joint winners"
                            : "Winner"}
                        </p>
                        <p className="mt-1 font-semibold text-white">
                          {finishedResults.winners
                            .map((winner) => winner.name || "Unnamed nominee")
                            .join(", ")}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-xl border border-yellow-300/15 bg-yellow-300/[0.06] px-4 py-3 sm:text-right">
                      <p className="text-[11px] text-yellow-100/50">
                        {finishedResults.winners.length > 1
                          ? "Votes each"
                          : "Winning votes"}
                      </p>
                      <p className="mt-1 text-xl font-bold tabular-nums text-yellow-200">
                        {finishedResults.highestVotes.toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/[0.07] bg-black/15 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-zinc-500">Total votes</span>
                    <Users size={15} className="text-emerald-300" />
                  </div>
                  <p className="mt-2 text-xl font-semibold tabular-nums text-white">
                    {finishedResults.totalVotes.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/[0.07] bg-black/15 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-zinc-500">Duration</span>
                    <CalendarDays size={15} className="text-emerald-300" />
                  </div>
                  <p className="mt-2 text-xl font-semibold text-white">
                    {formatDuration(finishedResults.duration)}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <Link
                  href="/home"
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 text-sm font-semibold text-[#04130c] transition hover:bg-emerald-300"
                >
                  <Trophy size={16} />
                  View finished project
                </Link>
                <Link
                  href="/home/history"
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.04] px-5 text-sm font-semibold text-zinc-300 transition hover:border-emerald-400/30 hover:text-emerald-300"
                >
                  View history
                  <ArrowRight size={16} />
                </Link>
              </div>

              {finishedResults.rankedNominees.length > 0 && (
                <p className="mt-5 text-center text-[11px] text-zinc-600">
                  {finishedResults.rankedNominees.length}{" "}
                  {finishedResults.rankedNominees.length === 1
                    ? "nominee"
                    : "nominees"}{" "}
                  participated
                </p>
              )}
            </section>
          ) : (
            <section
              data-enter
              className="mx-auto max-w-xl rounded-3xl border border-white/[0.08] bg-[#0d1310]/80 px-6 py-12 text-center backdrop-blur-xl"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.07] text-emerald-300">
                <QrCode size={21} />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-white">
                QR code isn&apos;t available
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-400">
                Create an active project before generating a QR code and
                sharing its voting link.
              </p>
              <Link
                href="/home/starting"
                className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 text-sm font-semibold text-[#04130c] transition-colors hover:bg-emerald-300"
              >
                <Plus size={16} />
                Create a project
              </Link>
            </section>
          )
        ) : (
          <section className="relative mx-auto max-w-xl overflow-hidden rounded-[2rem] border border-white/[0.09] bg-[#0d1310]/85 p-4 shadow-[0_30px_100px_rgba(0,0,0,0.35)] backdrop-blur-2xl sm:p-7">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/50 to-transparent" />
            <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-emerald-400/[0.07] blur-[90px]" />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -left-4 top-[38%] h-9 w-9 rounded-full border border-emerald-300/15 bg-emerald-400/[0.05]"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute bottom-[18%] right-5 h-5 w-5 rounded-full border border-emerald-300/20 bg-emerald-400/[0.06]"
            />

            <div className="relative z-10 text-center">
              <h2 className="mx-auto max-w-xl break-words text-xl font-semibold tracking-tight text-white sm:text-2xl">
                {currentProject.name || "Untitled election"}
              </h2>

              <p className="mt-6 text-xs text-zinc-500">
                Scan the code with a phone camera to open the voting page
              </p>

              <div className="mx-auto mt-5 flex w-full max-w-[320px] justify-center rounded-[1.75rem] border border-white/10 bg-white p-3 shadow-[0_20px_70px_rgba(16,185,129,0.12)] sm:p-4">
                {shareUrl && (
                  <QRCodeSVG
                    value={shareUrl}
                    size={280}
                    level="H"
                    includeMargin
                    bgColor="#ffffff"
                    fgColor="#07150e"
                    className="block h-auto w-full max-w-[260px]"
                  />
                )}
              </div>

              <div className="mx-auto mt-7 max-w-xl text-left">
                <label
                  htmlFor="election-share-link"
                  className="mb-2 block text-xs font-medium text-zinc-400"
                >
                  Invitation link
                </label>

                <div className="flex flex-col gap-2 rounded-2xl border border-white/[0.08] bg-black/20 p-2 sm:flex-row sm:items-center">
                  <div className="flex min-h-11 min-w-0 flex-1 items-center gap-2 px-2">
                    <Link2
                      size={16}
                      className="shrink-0 text-emerald-300"
                    />
                    <input
                      id="election-share-link"
                      type="text"
                      readOnly
                      value={shareUrl}
                      onFocus={(event) => event.currentTarget.select()}
                      className="min-w-0 flex-1 bg-transparent text-sm text-zinc-300 outline-none selection:bg-emerald-400/30"
                      aria-label="Election invitation link"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyLink}
                    disabled={!shareUrl}
                    className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 text-sm font-semibold text-[#04130c] shadow-[0_8px_24px_rgba(16,185,129,0.12)] transition duration-200 hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1310] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    {copied ? "Copied" : "Copy link"}
                  </button>
                </div>

                <p
                  className={`mt-2 min-h-5 text-xs ${
                    copyError
                      ? "text-red-300"
                      : copied
                        ? "text-emerald-300"
                        : "text-transparent"
                  }`}
                  role={copyError ? "alert" : "status"}
                  aria-live="polite"
                >
                  {copyError || (copied ? "Invitation link copied." : " ")}
                </p>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-center text-[11px] text-zinc-500">
                <QrCode size={14} className="text-emerald-400/80" />
                Scanning opens the election; it never submits a vote automatically.
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
