"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  Vote,
  Users,
  UserRound,
  Crown,
  Trophy,
  ShieldCheck,
  CalendarDays,
  Flag,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Timer,
  Zap,
  Hourglass,
  X,
  AlertTriangle,
} from "lucide-react";

import { supabase } from "@/lib/supabase-client";
import useApp from "@/lib/useApp";
import {
  getElectionDurationMs,
  getElectionStartStorageKey,
  LEGACY_ELECTION_START_KEY,
} from "@/lib/electionTimer";
import {
  getCompetitionRanks,
  getOrdinalLabel,
  getRankingTheme,
} from "@/lib/rankingStyles";

import ProjectLoading from "@/components/ProjectLoading";
import ModalPortal from "@/components/ModalPortal";

import type { Project } from "@/types/project";

type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;

function calculateTimeLeft(milliseconds: number): TimeLeft {
  const remaining = Math.max(0, milliseconds);

  return {
    days: Math.floor(remaining / DAY),
    hours: Math.floor((remaining % DAY) / HOUR),
    minutes: Math.floor((remaining % HOUR) / MINUTE),
    seconds: Math.floor((remaining % MINUTE) / 1000),
  };
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function formatDate(date: string) {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Date unavailable";
  }

  return parsedDate.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function ActiveProject() {
  const { userInfo, setProject, setTaskKey } = useApp();

  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const [electionStartTime, setElectionStartTime] = useState<number | null>(
    null
  );

  const [loading, setLoading] = useState(true);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState("");

  // Controls the manual confirmation popup.
  const [showEndConfirmation, setShowEndConfirmation] = useState(false);

  // Prevent multiple automatic or manual ending requests.
  const endingRef = useRef(false);

  // --------------------------------------------------
  // LOAD THE USER'S MOST RECENT PROJECT
  // --------------------------------------------------

  useEffect(() => {
    if (!userInfo) {
      setLoading(false);
      return;
    }

    let active = true;

    const loadProject = async () => {
      setLoading(true);
      setError("");

      try {
        const { data, error: fetchError } = await supabase
          .from("projects")
          .select(`
            *,
            nominees (
              *,
              achievements (*),
              voters (*)
            )
          `)
          .eq("user_id", userInfo)
          .eq("deleted", false)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (fetchError) {
          throw fetchError;
        }

        if (!data) {
          throw new Error("No active election project was found.");
        }

        const selectedProject = data as Project;

        const createdAt = new Date(
          selectedProject.created_at
        ).getTime();

        if (!Number.isFinite(createdAt)) {
          throw new Error(
            "The saved election creation date is invalid."
          );
        }

        const storedDuration = Number(selectedProject.duration_ms);
        const hasLegacyExpiration = storedDuration > createdAt;
        const duration = getElectionDurationMs(
          selectedProject.duration_ms,
          selectedProject.created_at
        );

        if (!Number.isFinite(duration) || duration <= 0) {
          throw new Error("The saved election duration is invalid.");
        }

        const startStorageKey = getElectionStartStorageKey(
          selectedProject.id
        );
        const savedStartTime = Number(
          localStorage.getItem(startStorageKey)
        );
        const legacyStartTime = Number(
          localStorage.getItem(LEGACY_ELECTION_START_KEY)
        );

        const hasSavedStartTime =
          Number.isFinite(savedStartTime) &&
          savedStartTime > 0 &&
          savedStartTime <= Date.now();
        const hasLegacyStartTime =
          Number.isFinite(legacyStartTime) &&
          legacyStartTime >= createdAt &&
          legacyStartTime <= Date.now();
        const startTime = hasLegacyExpiration
          ? createdAt
          : hasSavedStartTime
            ? savedStartTime
            : hasLegacyStartTime
              ? legacyStartTime
              : createdAt;

        localStorage.setItem(startStorageKey, String(startTime));
        localStorage.removeItem(LEGACY_ELECTION_START_KEY);

        if (!active) return;

        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, duration - elapsedTime);

        setElectionStartTime(startTime);
        setRemainingMs(remainingTime);
        setActiveProject(selectedProject);

        // Refresh this project in shared state without dropping older projects.
        setProject((previousProjects) => {
          const projects = previousProjects ?? [];
          const hasProject = projects.some(
            (project) => project.id === selectedProject.id
          );

          return hasProject
            ? projects.map((project) =>
                project.id === selectedProject.id
                  ? selectedProject
                  : project
              )
            : [...projects, selectedProject];
        });
      } catch (err: unknown) {
        if (!active) return;

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load your election."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadProject();

    return () => {
      active = false;
    };
  }, [userInfo, setProject]);

  // --------------------------------------------------
  // END ELECTION
  // --------------------------------------------------

  const endElection = useCallback(async () => {
    if (!userInfo || endingRef.current) return;

    endingRef.current = true;
    setEnding(true);
    setError("");

    try {
      const { error: updateError } = await supabase
        .from("tasks")
        .update({ key: false })
        .eq("user_id", userInfo);

      if (updateError) {
        throw updateError;
      }

      try {
        if (activeProject) {
          localStorage.removeItem(
            getElectionStartStorageKey(activeProject.id)
          );
        }
        localStorage.removeItem(LEGACY_ELECTION_START_KEY);
      } catch (storageError) {
        console.warn("Unable to clear the saved election timer:", storageError);
      }

      // Update shared state immediately.
      // HomePage can now render FinishedProject.
      setTaskKey(false);
    } catch (err: unknown) {
      endingRef.current = false;

      setError(
        err instanceof Error
          ? err.message
          : "Unable to end the election. Please try again."
      );
    } finally {
      setEnding(false);
    }
  }, [activeProject, userInfo, setTaskKey]);

  // --------------------------------------------------
  // CONFIRM MANUAL ELECTION END
  // --------------------------------------------------

  const confirmEndElection = useCallback(async () => {
    setShowEndConfirmation(false);
    await endElection();
  }, [endElection]);

  // --------------------------------------------------
  // LIVE COUNTDOWN
  // --------------------------------------------------

  useEffect(() => {
    if (
      !activeProject ||
      electionStartTime === null ||
      endingRef.current
    ) {
      return;
    }

    const duration = getElectionDurationMs(
      activeProject.duration_ms,
      activeProject.created_at
    );

    const updateCountdown = () => {
      // Calculate the remaining time using the original saved
      // start time, not the time the page was refreshed.
      const elapsedTime = Date.now() - electionStartTime;
      const remaining = Math.max(0, duration - elapsedTime);

      setRemainingMs(remaining);

      // Automatic expiry does not require manual confirmation.
      if (remaining <= 0) {
        void endElection();
      }
    };

    updateCountdown();

    const interval = window.setInterval(
      updateCountdown,
      1000
    );

    return () => {
      window.clearInterval(interval);
    };
  }, [activeProject, electionStartTime, endElection]);

  // --------------------------------------------------
  // CLOSE CONFIRMATION WITH ESCAPE KEY
  // --------------------------------------------------

  useEffect(() => {
    if (!showEndConfirmation) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !ending) {
        setShowEndConfirmation(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showEndConfirmation, ending]);

  // --------------------------------------------------
  // LOADING SCREEN
  // --------------------------------------------------

  if (loading) {
    return <ProjectLoading />;
  }

  // --------------------------------------------------
  // ERROR SCREEN
  // --------------------------------------------------

  if (error && !activeProject) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-2 md:px-3">
        <div className="w-full max-w-md rounded-3xl border border-red-500/15 bg-[#121824] p-7 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10">
            <AlertCircle className="text-red-400" size={23} />
          </div>

          <h2 className="mt-4 text-base font-semibold text-white">
            Unable to load election
          </h2>

          <p
            role="alert"
            className="mt-2 text-sm leading-6 text-red-300/80"
          >
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (!activeProject) return null;

  // --------------------------------------------------
  // DASHBOARD DATA
  // --------------------------------------------------

  const time = calculateTimeLeft(remainingMs);

  const isUrgent = remainingMs <= 10_000;
  const isExpired = remainingMs <= 0;

  const nominees = activeProject.nominees ?? [];
  const topNominees = nominees
    .slice()
    .sort(
      (a, b) =>
        (b.voters?.length ?? 0) - (a.voters?.length ?? 0)
    );

  const totalVoters = nominees.reduce(
    (total, nominee) =>
      total + (nominee.voters?.length ?? 0),
    0
  );
  const topNomineeVoteCounts = topNominees.map(
    (nominee) => nominee.voters?.length ?? 0
  );
  const topNomineeRanks = getCompetitionRanks(topNomineeVoteCounts);

  const totalAchievements = nominees.reduce(
    (total, nominee) =>
      total + (nominee.achievements?.length ?? 0),
    0
  );

  const duration = getElectionDurationMs(
    activeProject.duration_ms,
    activeProject.created_at
  );

  const elapsedTime = Math.max(0, duration - remainingMs);

  const progress =
    duration > 0
      ? Math.min(
          100,
          Math.max(0, (elapsedTime / duration) * 100)
        )
      : 100;

  const timeUnits = [
    { label: "Days", value: time.days },
    { label: "Hours", value: time.hours },
    { label: "Minutes", value: time.minutes },
    { label: "Seconds", value: time.seconds },
  ];

  // --------------------------------------------------
  // DASHBOARD UI
  // --------------------------------------------------

  return (
    <div className="relative isolate mx-auto w-full max-w-7xl space-y-6 px-2 pb-6 md:px-3">
      {/* ELECTION HEADER */}

      <section className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-3xl border border-blue-400/20 bg-gradient-to-br from-[#121925] via-[#151d2b] to-[#101621] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.28)] sm:p-8">
        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-300/[0.07] px-3 py-1.5 text-xs font-bold tracking-widest text-blue-200">
              <span className="h-2 w-2 animate-pulse rounded-full bg-blue-300 shadow-[0_0_8px_rgba(147,197,253,0.6)]" />
              LIVE ELECTION
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-300/[0.08] px-3 py-1.5 text-[11px] font-semibold text-blue-200">
              <ShieldCheck size={13} />
              Election Active
            </div>
          </div>

          <h1 className="mt-6 break-words text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {activeProject.name}
            <span className="text-blue-400">.</span>
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-blue-50/95">
            {activeProject.description ||
              "Your election is currently running. Monitor the voting activity and track your nominees below."}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-white/85">
            <div className="flex items-center gap-2">
              <CalendarDays
                size={15}
                className="text-blue-300"
              />
              Started {formatDate(activeProject.created_at)}
            </div>

            <div className="flex items-center gap-2">
              <Users
                size={15}
                className="text-blue-300"
              />
              {nominees.length} nominees
            </div>
          </div>
        </div>
      </section>

      {/* FULL-WIDTH COUNTDOWN */}

      <section
        className={`relative mx-auto w-full max-w-6xl overflow-hidden rounded-3xl border transition-colors duration-500 ${
          isUrgent
            ? "border-red-500/25 bg-gradient-to-br from-[#151923] via-[#111722] to-[#0a0e16]"
            : "border-blue-400/30 bg-gradient-to-br from-[#151d29] via-[#151e2c] to-[#101622]"
        }`}
      >
        {/* Countdown content */}

        <div className="relative z-10 mx-auto w-full max-w-3xl px-4 py-5 sm:px-7 sm:py-6 lg:px-8 lg:py-7">

          {/* Heading */}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div
                className={`flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] ${
                  isUrgent
                    ? "text-red-300"
                    : "text-blue-200"
                }`}
              >
                <Timer size={15} />
                ELECTION COUNTDOWN
              </div>

              <h2 className="mt-1.5 text-xl font-bold tracking-tight text-white sm:text-2xl">
                Time remaining
              </h2>

              <p className="mt-1 text-xs text-zinc-200">
                Time left until voting closes.
              </p>
            </div>

            <div
              className={`flex items-center gap-2 rounded-full border px-3 py-2 text-[9px] font-bold tracking-wider ${
                isUrgent
                  ? "border-red-400/35 bg-red-400/[0.16] text-red-200"
                  : "border-blue-300/30 bg-blue-300/[0.14] text-blue-200"
              }`}
            >
              {isUrgent ? (
                <>
                  <Zap size={12} />
                  ENDING SOON
                </>
              ) : (
                <>
                  <Hourglass size={12} />
                  COUNTING DOWN
                </>
              )}
            </div>
          </div>

          {/* TRANSPARENT GLASS COUNTDOWN UNITS */}

          <div className="mt-5 grid grid-cols-4 gap-2 sm:gap-3">
            {timeUnits.map((unit, index) => (
              <div
                key={unit.label}
                className="group min-w-0 text-center"
              >
                <div
                  className={`relative flex h-16 min-h-0 items-center justify-center overflow-hidden rounded-xl border backdrop-blur-sm transition-all duration-300 sm:h-20 sm:rounded-2xl md:h-[5.5rem] ${
                    isUrgent
                      ? "border-red-400/40 bg-red-400/[0.17] shadow-[inset_0_0_25px_rgba(239,68,68,0.08)]"
                      : "border-blue-300/35 bg-blue-400/[0.17] shadow-[inset_0_0_25px_rgba(59,130,246,0.08)] group-hover:border-blue-200/55 group-hover:bg-blue-400/[0.23]"
                  }`}
                >
                  {/* Glass highlight */}

                  <div
                    className={`pointer-events-none absolute inset-x-0 top-0 h-px ${
                      isUrgent
                        ? "bg-red-300/40"
                        : "bg-blue-200/40"
                    }`}
                  />

                  {/* Countdown number */}

                  <span
                    className={`relative font-mono text-xl font-bold tracking-tighter tabular-nums sm:text-3xl md:text-4xl ${
                      isUrgent
                        ? "text-red-300"
                        : index === 3
                          ? "text-blue-200"
                          : "text-white"
                    }`}
                  >
                    {pad(unit.value)}
                  </span>

                  {/* Bottom glow */}

                  <div
                    className={`pointer-events-none absolute bottom-0 left-1/2 h-1 w-1/3 -translate-x-1/2 rounded-full blur-md ${
                      isUrgent
                        ? "bg-red-300/40"
                        : "bg-blue-300/40"
                    }`}
                  />
                </div>

                <p
                  className={`mt-1.5 text-[9px] font-bold uppercase tracking-[0.12em] sm:text-[10px] ${
                    isUrgent
                      ? "text-red-300/80"
                      : "text-blue-100/85"
                  }`}
                >
                  {unit.label}
                </p>
              </div>
            ))}
          </div>

          {/* Urgent and expired messages */}

          {isUrgent && !isExpired && (
            <p className="mt-3 flex items-center justify-center gap-2 text-center text-[11px] font-semibold text-red-400">
              <Zap size={13} />
              Less than 10 seconds remaining
            </p>
          )}

          {isExpired && (
            <p className="mt-3 text-center text-[11px] font-semibold text-red-400">
              Election time has expired. Finishing your election...
            </p>
          )}

          {/* Progress */}

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between gap-3 text-[10px]">
              <span className="font-medium text-zinc-200">
                Election time elapsed
              </span>

              <span
                className={`font-semibold tabular-nums ${
                  isUrgent
                    ? "text-red-300"
                    : "text-blue-200"
                }`}
              >
                {progress.toFixed(1)}%
              </span>
            </div>

            <div
              className={`h-1.5 overflow-hidden rounded-full ${
                isUrgent
                  ? "bg-red-500/15"
                  : "bg-blue-400/15"
              }`}
            >
              <div
                className={`h-full rounded-full transition-[width] duration-1000 ${
                  isUrgent
                    ? "bg-red-500"
                    : "bg-blue-400"
                }`}
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>
          </div>

          {/* Status */}

          <div className="mt-4 flex items-center justify-center gap-2 text-center">
            <span
              className={`h-2 w-2 rounded-full ${
                isUrgent
                  ? "animate-pulse bg-red-400"
                  : "animate-pulse bg-blue-400"
              }`}
            />

            <p
              className={`text-[10px] font-bold tracking-[0.18em] ${
                isUrgent
                  ? "text-red-300"
                  : "text-blue-200"
              }`}
            >
              {isUrgent
                ? "FINAL MOMENTS"
                : "VOTING IN PROGRESS"}
            </p>
          </div>

          <h3 className="mt-1.5 text-center text-base font-bold tracking-tight text-white sm:text-lg">
            {isUrgent ? "Almost there" : "Your election is live"}
          </h3>

          <p className="mx-auto mt-1 max-w-xs text-center text-[10px] leading-4 text-zinc-200">
            {isUrgent
              ? "The election is approaching its scheduled closing time."
              : "Your voting space is active. Every vote counts."}
          </p>
        </div>
      </section>

      {/* STATISTICS */}

      <section className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          {
            label: "Total Nominees",
            value: nominees.length,
            icon: UserRound,
          },
          {
            label: "Total Voters",
            value: totalVoters,
            icon: Users,
          },
          {
            label: "Achievements",
            value: totalAchievements,
            icon: Trophy,
          },
        ].map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="rounded-2xl border border-blue-400/20 bg-gradient-to-br from-[#172131] to-[#111722] p-5 shadow-[0_12px_35px_rgba(0,0,0,0.18)]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-400/10 text-blue-400">
                <Icon size={19} />
              </div>

              <p className="mt-4 text-2xl font-bold tabular-nums text-white">
                {stat.value.toLocaleString()}
              </p>

              <p className="mt-1 text-xs text-zinc-500">
                {stat.label}
              </p>
            </div>
          );
        })}
      </section>

      {/* NOMINEES */}

      <section className="mx-auto w-full max-w-6xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">
              Election Nominees
            </h2>

            <p className="mt-1 text-xs text-zinc-500">
              Nominees and their recorded voting activity.
            </p>
          </div>

          <div className="rounded-lg border border-white/[0.07] bg-[#141a24] px-3 py-1.5 text-xs text-zinc-400">
            Showing {topNominees.length} of {nominees.length}
          </div>
        </div>

        {nominees.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-[#141a24] px-5 py-12 text-center">
            <Users
              className="mx-auto mb-3 text-zinc-600"
              size={30}
            />

            <p className="text-sm font-medium text-zinc-300">
              No nominees yet
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              Your election currently has no registered nominees.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {topNominees.map((nominee, index) => {
              const voteCount = nominee.voters?.length ?? 0;
              const votePercentage =
                totalVoters > 0 ? (voteCount / totalVoters) * 100 : 0;
              const rank = topNomineeRanks[index] ?? index + 1;
              const rankTheme = getRankingTheme(rank - 1);
              const rankLabel = `Rank #${rank}`;

              return (
                <article
                  key={nominee.id}
                  className={`relative overflow-hidden rounded-2xl border ${rankTheme.card}`}
                >
                  {/* Nominee information */}

                  <div className="flex items-center gap-4 p-5 pr-28 sm:pr-32">
                    <div className="flex min-w-0 items-center gap-3">
                      {nominee.image ? (
                        <img
                          src={nominee.image}
                          alt={nominee.name}
                          className={`h-12 w-12 rounded-xl border object-cover ${rankTheme.avatar}`}
                        />
                      ) : (
                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${rankTheme.avatar}`}>
                          <UserRound size={21} />
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-white">
                            {nominee.name}
                          </p>
                          {
                            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold ${rankTheme.badge}`}>
                              {rank <= 3 && voteCount > 0 && <Crown size={11} />}
                              {getOrdinalLabel(rank - 1)}
                            </span>
                          }
                        </div>

                        <p className="mt-1 text-[11px] text-zinc-500">
                          {rankLabel}
                        </p>
                      </div>
                    </div>

                    <div className={`absolute right-5 top-5 flex items-center gap-2 rounded-xl border px-3 py-2 ${rankTheme.badge}`}>
                      <Vote
                        size={15}
                        className={rankTheme.crown}
                      />

                      <span className={`text-sm font-bold ${rankTheme.crown}`}>
                        {voteCount}
                      </span>

                      <span className="text-[11px] text-zinc-500">
                        Votes
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-white/[0.06] px-5 py-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-xs text-zinc-500">
                        Share of votes
                      </span>
                      <span className={`text-xs font-semibold tabular-nums ${rankTheme.crown}`}>
                        {votePercentage.toFixed(1)}%
                      </span>
                    </div>
                    <div
                      className="h-2 overflow-hidden rounded-full bg-[#141a24]"
                      role="progressbar"
                      aria-label={`${nominee.name || "Nominee"} share of votes`}
                      aria-valuenow={Number(votePercentage.toFixed(1))}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className={`h-full rounded-full bg-gradient-to-r transition-[width] duration-500 ${rankTheme.progress}`}
                        style={{ width: `${votePercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Manifesto */}

                  {nominee.manifesto && (
                    <div className="border-t border-white/[0.06] px-5 py-4">
                      <p className={`mb-2 text-[10px] font-semibold uppercase tracking-widest ${rankTheme.crown}`}>
                        Manifesto
                      </p>

                      <p className="text-sm leading-6 text-zinc-400">
                        {nominee.manifesto}
                      </p>
                    </div>
                  )}

                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ERROR NOTIFICATION */}

      {error && activeProject && (
        <div
          role="alert"
          className="mx-auto flex w-full max-w-6xl items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.06] p-4 text-xs text-red-300"
        >
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      {/* FORCE END */}

      <section className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-2xl border border-red-500/25 bg-gradient-to-br from-[#24161b] to-[#111722] p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-red-400/25 bg-red-500/15 text-red-300">
              <Flag size={20} />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-white">
                End this election
              </h2>

              <p className="mt-1 max-w-md text-xs leading-5 text-zinc-500">
                Manually end the election before its scheduled countdown
                expires. This will deactivate voting immediately.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowEndConfirmation(true)}
            disabled={ending || isExpired}
            className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-400/30 bg-red-500 px-5 py-3 text-xs font-semibold text-white transition-all hover:border-red-300/50 hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Flag size={15} />
            Force End Election
          </button>
        </div>
      </section>

      {/* END ELECTION CONFIRMATION POPUP */}

      {showEndConfirmation && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/60 px-4 py-8 backdrop-blur-md"
            onMouseDown={(event) => {
              if (
                event.target === event.currentTarget &&
                !ending
              ) {
                setShowEndConfirmation(false);
              }
            }}
          >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="end-election-title"
            className="relative w-full max-w-md animate-in fade-in zoom-in-95 duration-200 overflow-hidden rounded-3xl border border-red-400/30 bg-gradient-to-br from-[#24161b] via-[#18151c] to-[#101621] p-6 shadow-[0_25px_100px_rgba(0,0,0,0.65)] sm:p-8"
          >
            {/* Decorative glow */}


            <div className="relative">

              {/* Close button */}

              <button
                type="button"
                onClick={() => setShowEndConfirmation(false)}
                disabled={ending}
                aria-label="Close confirmation"
                className="absolute right-0 top-0 flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-white/[0.07] bg-[#141a24] text-zinc-400 transition hover:bg-[#141a24] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X size={17} />
              </button>

              {/* Warning icon */}

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-red-400/30 bg-red-500/15 text-red-300 shadow-[0_0_35px_rgba(239,68,68,0.12)]">
                <AlertTriangle size={27} strokeWidth={1.6} />
              </div>

              {/* Confirmation text */}

              <h2
                id="end-election-title"
                className="mt-6 text-xl font-bold tracking-tight text-white sm:text-2xl"
              >
                End this election?
              </h2>

              <p className="mt-3 text-sm leading-7 text-zinc-400">
                Are you sure you want to end{" "}
                <span className="font-semibold text-white">
                  {activeProject.name}
                </span>
                ?
              </p>

              <div className="mt-4 rounded-xl border border-red-400/25 bg-red-500/[0.10] p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle
                    size={17}
                    className="mt-0.5 shrink-0 text-red-400"
                  />

                  <p className="text-xs leading-6 text-red-100">
                    Ending this election will immediately deactivate
                    voting. Voters will no longer be able to participate.
                    This action should only be taken when you are certain.
                  </p>
                </div>
              </div>

              {/* Action buttons */}

              <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowEndConfirmation(false)}
                  disabled={ending}
                  className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-[#141a24] px-5 py-3 text-xs font-semibold text-zinc-300 transition hover:bg-[#141a24] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => void confirmEndElection()}
                  disabled={ending}
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-400/30 bg-red-500 px-5 py-3 text-xs font-semibold text-white transition hover:border-red-300/50 hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {ending ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Ending Election...
                    </>
                  ) : (
                    <>
                      <Flag size={15} />
                      Yes, End Election
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
          </div>
        </ModalPortal>
      )}

      {/* FOOTER */}

      <div className="flex items-center justify-center gap-2 pb-2 text-[10px] text-zinc-600">
        <CheckCircle2
          size={12}
          className="text-blue-500/70"
        />
        VoteSphere Election Management
      </div>
    </div>
  );
}