"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Copy,
  Crown,
  Medal,
  Plus,
  Trophy,
  Users,
  Vote,
} from "lucide-react";

import useApp from "@/lib/useApp";
import { getElectionDurationMs } from "@/lib/electionTimer";
import type { Nominee } from "@/types/project";

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

function getWinners(nominees: Nominee[]) {
  const highestVotes = Math.max(
    0,
    ...nominees.map((nominee) => nominee.voters?.length ?? 0)
  );

  if (highestVotes === 0) return [];

  return nominees.filter(
    (nominee) => (nominee.voters?.length ?? 0) === highestVotes
  );
}

export default function FinishedProject() {
  const { project } = useApp();
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");

  const finishedProject = useMemo(() => {
    const projects = (project ?? []).filter((item) => item.deleted !== true);

    return [...projects].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      const safeDateA = Number.isFinite(dateA) ? dateA : 0;
      const safeDateB = Number.isFinite(dateB) ? dateB : 0;
      return safeDateB - safeDateA;
    })[0] ?? null;
  }, [project]);

  const results = useMemo(() => {
    if (!finishedProject) return null;

    const nominees = finishedProject.nominees ?? [];
    const rankedNominees = [...nominees].sort(
      (a, b) => (b.voters?.length ?? 0) - (a.voters?.length ?? 0)
    );
    const totalVotes = nominees.reduce(
      (total, nominee) => total + (nominee.voters?.length ?? 0),
      0
    );
    const winners = getWinners(nominees);
    const highestVotes =
      winners.length > 0 ? winners[0].voters?.length ?? 0 : 0;
    const durationValue = getElectionDurationMs(
      finishedProject.duration_ms,
      finishedProject.created_at
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
  }, [finishedProject]);

  const shareUrl =
    typeof window !== "undefined" && finishedProject
      ? `${window.location.origin}/home/share/${finishedProject.id}`
      : "";

  const handleCopyLink = async () => {
    if (!shareUrl) return;

    setCopyError("");
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch (error) {
      console.error("Unable to copy election link:", error);
      setCopyError("Copy failed. Select the link and copy it manually.");
    }
  };

  if (!finishedProject || !results) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-2 md:px-3">
        <section className="w-full max-w-xl rounded-3xl border border-white/[0.08] bg-[#0d1310] p-8 text-center">
          <Trophy size={38} className="mx-auto text-emerald-400" />
          <h1 className="mt-5 text-2xl font-semibold text-white">
            Finished election unavailable
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            The election could not be found in your workspace.
          </p>
          <Link
            href="/home/history"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-[#04130c]"
          >
            View history
            <ArrowRight size={16} />
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="w-full min-w-0 px-2 md:px-3">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-3 py-1.5 text-xs font-medium text-emerald-300">
            <CheckCircle2 size={13} />
            Election completed
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Final <span className="text-emerald-400">results.</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">
            Review the verified vote totals and final ranking for this election.
          </p>
        </div>

        <Link
          href="/home/starting"
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-400 px-4 text-sm font-semibold text-[#04130c] transition hover:bg-emerald-300"
        >
          <Plus size={16} />
          New election
        </Link>
      </header>

      <section className="relative overflow-hidden rounded-3xl border border-emerald-400/15 bg-gradient-to-br from-[#10251a] via-[#0b1711] to-[#09110d] p-5 shadow-[0_25px_90px_rgba(0,0,0,0.28)] sm:p-8">
        <div className="pointer-events-none absolute right-10 top-10 h-32 w-32 rounded-full bg-emerald-400/[0.08] blur-[55px]" />

        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-black/20 px-3 py-1.5 text-xs font-medium text-emerald-200">
              <Trophy size={13} />
              Final election
            </span>
            <span className="inline-flex items-center gap-2 text-xs text-white/35">
              <CalendarDays size={14} />
              {formatDate(finishedProject.created_at)}
            </span>
          </div>

          <div className="mt-8 max-w-3xl">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300/60">
              Election
            </p>
            <h2 className="break-words text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {finishedProject.name || "Untitled election"}
            </h2>
            {finishedProject.description && (
              <p className="mt-4 text-sm leading-7 text-white/50">
                {finishedProject.description}
              </p>
            )}
          </div>

          <div className="mt-8 rounded-2xl border border-emerald-300/15 bg-black/20 p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200/65">
              <Crown size={15} />
              Election result
            </div>

            {results.winners.length === 0 ? (
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-white/[0.06] p-3 text-white/50">
                  <Vote size={22} />
                </div>
                <div>
                  <p className="font-semibold text-white">No votes recorded</p>
                  <p className="mt-1 text-sm text-white/40">
                    No winner can be determined for this election.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-yellow-300/20 bg-yellow-300/[0.09] text-yellow-300">
                    <Trophy size={27} />
                  </div>
                  <div>
                    <p className="text-xs text-white/40">
                      {results.winners.length > 1
                        ? "Joint winners"
                        : "Winning nominee"}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-x-2">
                      {results.winners.map((winner, index) => (
                        <span
                          key={winner.id}
                          className="text-xl font-semibold text-white sm:text-2xl"
                        >
                          {winner.name || "Unnamed nominee"}
                          {index < results.winners.length - 1 && (
                            <span className="text-emerald-300">,</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-yellow-300/15 bg-yellow-300/[0.06] px-4 py-3 sm:text-right">
                  <p className="text-xs text-yellow-100/50">Votes each</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-yellow-200">
                    {results.highestVotes.toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/[0.07] bg-black/15 p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40">Election duration</span>
                <Clock3 size={17} className="text-emerald-300" />
              </div>
              <p className="mt-3 text-2xl font-semibold text-white">
                {formatDuration(results.duration)}
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-black/15 p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40">Total votes</span>
                <Users size={17} className="text-emerald-300" />
              </div>
              <p className="mt-3 text-2xl font-semibold tabular-nums text-white">
                {results.totalVotes.toLocaleString()}
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-black/15 p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40">Nominees</span>
                <Medal size={17} className="text-emerald-300" />
              </div>
              <p className="mt-3 text-2xl font-semibold text-white">
                {results.nominees.length}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-9">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-white">Nominee results</h2>
            <p className="mt-1 text-xs text-white/40">
              Final vote distribution
            </p>
          </div>
          <span className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-white/45">
            {results.nominees.length} nominees
          </span>
        </div>

        {results.rankedNominees.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6 text-center text-sm text-white/40">
            No nominees were recorded for this election.
          </div>
        ) : (
          <div className="grid gap-3">
            {results.rankedNominees.map((nominee, index) => {
              const voteCount = nominee.voters?.length ?? 0;
              const percentage =
                results.totalVotes > 0
                  ? (voteCount / results.totalVotes) * 100
                  : 0;
              const isWinner = results.winners.some(
                (winner) => winner.id === nominee.id
              );

              return (
                <article
                  key={nominee.id}
                  className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025]"
                >
                  <div className="p-4 sm:p-5">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        {nominee.image ? (
                          <img
                            src={nominee.image}
                            alt={nominee.name || "Nominee"}
                            className="h-12 w-12 shrink-0 rounded-xl border border-emerald-400/20 object-cover"
                          />
                        ) : (
                          <div
                            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                              isWinner
                                ? "bg-emerald-400/15 text-emerald-300"
                                : "bg-white/[0.06] text-white/45"
                            }`}
                          >
                            {index + 1}
                          </div>
                        )}

                        <div className="min-w-0">
                          <p className="break-words font-medium text-white">
                            {nominee.name || "Unnamed nominee"}
                          </p>
                          {isWinner && (
                            <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-300">
                              <Crown size={11} />
                              Winner
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="font-semibold tabular-nums text-white">
                          {voteCount.toLocaleString()} votes
                        </p>
                        <p className="mt-0.5 text-xs text-white/35">
                          {percentage.toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className={`h-full rounded-full ${
                          isWinner ? "bg-emerald-400" : "bg-white/25"
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    <Link
                      href={`/home/${nominee.id}`}
                      className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.07] px-4 text-sm font-semibold text-emerald-300 transition hover:border-emerald-400/40 hover:bg-emerald-400/15 hover:text-emerald-200"
                    >
                      View more
                      <ArrowRight size={15} />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-9 flex flex-col gap-4 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.045] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h2 className="font-semibold text-white">Election actions</h2>
          <p className="mt-1 text-sm text-white/40">
            Review the full history or prepare another election.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleCopyLink}
            disabled={!shareUrl}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 text-sm font-semibold text-white/70 transition hover:border-emerald-400/30 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
            {copied ? "Copied" : "Copy link"}
          </button>

          <Link
            href="/home/history"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-400 hover:text-[#04130c]"
          >
            View history
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {copyError && (
        <p role="alert" className="mt-3 text-right text-xs text-red-300">
          {copyError}
        </p>
      )}

      <footer className="mt-12 border-t border-white/[0.06] py-6 text-center text-xs text-white/25">
        VoteSphere · Every vote recorded. Every result visible.
      </footer>
    </main>
  );
}
