
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { gsap } from "gsap";
import {
  ArrowRight,
  Award,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Copy,
  Crown,
  Info,
  Loader2,
  MessageSquare,
  ShieldCheck,
  Trophy,
  Users,
  Vote,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase-client";
import useApp from "@/lib/useApp";
import { getElectionDurationMs } from "@/lib/electionTimer";
import {
  getCompetitionRanks,
  getOrdinalLabel,
  getRankingTheme,
} from "@/lib/rankingStyles";
import type { Achievement, Nominee, Project } from "@/types/project";
import ProjectLoading from "@/components/ProjectLoading";
import ModalPortal from "@/components/ModalPortal";

type QRPageProps = {
  projectId: string;
};

type VoteForm = {
  name: string;
  comment: string;
};

type VoteCheckResult = {
  hasVoted: boolean;
  voterId: string;
};

type VoterCommentRow = {
  nominee_id: string;
  comment: string | null;
};

type QueryPage<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

const QUERY_PAGE_SIZE = 100;

async function fetchAllPages<T>(
  fetchPage: (
    from: number,
    to: number
  ) => PromiseLike<QueryPage<T>>
): Promise<T[]> {
  const rows: T[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await fetchPage(
      offset,
      offset + QUERY_PAGE_SIZE - 1
    );

    if (error) throw error;

    const page = data ?? [];
    if (page.length === 0) return rows;

    rows.push(...page);
    offset += page.length;
  }
}

const getVoteStorageKey = (projectId: string | number) =>
  `votesphere-voted-${projectId}`;

const isValidUUID = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );

const createVoterId = () => crypto.randomUUID();

function formatDate(date: string | null | undefined) {
  if (!date) return "Date unavailable";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "Date unavailable";
  }

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

export default function QRPage({ projectId }: QRPageProps) {
  const router = useRouter();
  const { setProject, setTaskKey } = useApp();
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [loadingProject, setLoadingProject] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [electionStatus, setElectionStatus] = useState<
    "loading" | "active" | "finished"
  >("loading");
  const pageRef = useRef<HTMLElement>(null);

  const [selectedNominee, setSelectedNominee] =
    useState<Nominee | null>(null);

  const [voteForm, setVoteForm] = useState<VoteForm>({
    name: "",
    comment: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [voteError, setVoteError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showAlreadyVoted, setShowAlreadyVoted] = useState(false);
  const [showVoteConfirmation, setShowVoteConfirmation] = useState(false);
  const [copied, setCopied] = useState(false);
  // Fetch the exact project identified by the URL projectId.
  // This page does not depend on the newest project in app context.
  const refreshProject = useCallback(async (): Promise<Project> => {
    if (!projectId) {
      throw new Error("No election ID was provided.");
    }

    const { data: projectData, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("deleted", false)
      .maybeSingle();

    if (projectError) throw projectError;

    if (!projectData) {
      throw new Error("This election could not be found or is no longer available.");
    }

    const { data: taskData, error: taskError } = await supabase
      .from("tasks")
      .select("key")
      .eq("user_id", projectData.user_id)
      .limit(1)
      .maybeSingle();

    if (taskError) throw taskError;

    const isElectionActive = taskData?.key === true;
    setElectionStatus(isElectionActive ? "active" : "finished");
    setTaskKey(isElectionActive);
    setProject((previousProjects) => {
      const projects = previousProjects ?? [];
      const existingIndex = projects.findIndex(
        (project) => project.id === projectData.id
      );

      if (existingIndex === -1) return [...projects, projectData as Project];

      return projects.map((project) =>
        project.id === projectData.id ? (projectData as Project) : project
      );
    });

    const nomineeData = await fetchAllPages<Nominee>((from, to) =>
      supabase
        .from("nominees")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true })
        .range(from, to)
    );

    const nomineeIds = nomineeData.map((nominee) => nominee.id);
    let achievementData: Achievement[] = [];
    let voterData: VoterCommentRow[] = [];

    if (nomineeIds.length > 0) {
      [achievementData, voterData] = await Promise.all([
        fetchAllPages<Achievement>((from, to) =>
          supabase
            .from("achievements")
            .select("*")
            .in("nominee_id", nomineeIds)
            .order("created_at", { ascending: true })
            .range(from, to)
        ),
        fetchAllPages<VoterCommentRow>((from, to) =>
          supabase
            .from("voters")
            .select("nominee_id, comment")
            .eq("project_id", projectId)
            .range(from, to)
        ),
      ]);
    }

    const achievementsByNominee = new Map<string, Achievement[]>();
    for (const achievement of achievementData) {
      const nomineeAchievements =
        achievementsByNominee.get(achievement.nominee_id) ?? [];
      nomineeAchievements.push(achievement);
      achievementsByNominee.set(
        achievement.nominee_id,
        nomineeAchievements
      );
    }

    const votersByNominee = new Map<string, VoterCommentRow[]>();
    for (const voter of voterData) {
      const nomineeVoters = votersByNominee.get(voter.nominee_id) ?? [];
      nomineeVoters.push(voter);
      votersByNominee.set(voter.nominee_id, nomineeVoters);
    }

    const nomineesWithData = nomineeData.map((nominee) => ({
      ...nominee,
      achievements: achievementsByNominee.get(nominee.id) ?? [],
      voters: votersByNominee.get(nominee.id) ?? [],
    }));

    const updatedProject = {
      ...projectData,
      nominees: nomineesWithData,
    } as Project;

    setCurrentProject(updatedProject);
    setProject((previousProjects) =>
      (previousProjects ?? []).some(
        (project) => project.id === updatedProject.id
      )
        ? (previousProjects ?? []).map((project) =>
            project.id === updatedProject.id ? updatedProject : project
          )
        : [...(previousProjects ?? []), updatedProject]
    );

    return updatedProject;
  }, [projectId, setProject, setTaskKey]);

  // Check whether this browser has already voted in this exact project.
  const checkVotingStatus = useCallback(
    async (selectedProjectId: string | number): Promise<VoteCheckResult> => {
      const storageKey = getVoteStorageKey(selectedProjectId);

      let voterId = localStorage.getItem(storageKey);

      if (!voterId || !isValidUUID(voterId)) {
        voterId = createVoterId();
        localStorage.setItem(storageKey, voterId);
      }

      const { data, error } = await supabase
        .from("voters")
        .select("id, project_id")
        .eq("id", voterId)
        .eq("project_id", selectedProjectId)
        .maybeSingle();

      if (error) throw error;

      const alreadyVoted = Boolean(data);

      setHasVoted(alreadyVoted);

      return {
        hasVoted: alreadyVoted,
        voterId,
      };
    },
    []
  );

  // Load the project using the projectId supplied by the route.
  // The effect does not rely on useApp, taskKey, or a project array.
  useEffect(() => {
    if (!projectId) {
      setLoadError("No election ID was provided.");
      setLoadingProject(false);
      return;
    }

    let active = true;

    const loadProject = async () => {
      setLoadingProject(true);
      setLoadError("");

      try {
        const updated = await refreshProject();
        const voteStatus = await checkVotingStatus(updated.id);

        if (active) {
          setHasVoted(voteStatus.hasVoted);
        }
      } catch (error: unknown) {
        if (active) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Unable to load this election."
          );
        }
      } finally {
        if (active) {
          setLoadingProject(false);
        }
      }
    };

    void loadProject();

    // Listen for votes belonging only to this project.
    const channel = supabase
      .channel(`nominee-votes-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "voters",
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          void refreshProject().catch((error) => {
            console.error("Unable to refresh election results:", error);
          });
        }
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [projectId, refreshProject, checkVotingStatus]);

  // Hide the success notification automatically.
  useEffect(() => {
    if (!successMessage) return;

    const timeout = window.setTimeout(() => {
      setSuccessMessage("");
    }, 4500);

    return () => window.clearTimeout(timeout);
  }, [successMessage]);

  // Sort nominees by vote count, highest first.
  // Nominees with zero votes remain in the list.
  const nominees = useMemo(() => {
    return [...(currentProject?.nominees ?? [])].sort((a, b) => {
      const votesA = a.voters?.length ?? 0;
      const votesB = b.voters?.length ?? 0;

      return votesB - votesA;
    });
  }, [currentProject?.nominees]);

  const totalVotes = nominees.reduce(
    (total, nominee) => total + (nominee.voters?.length ?? 0),
    0
  );
  const nomineeVoteCounts = nominees.map(
    (nominee) => nominee.voters?.length ?? 0
  );

  const finishedResults = useMemo(() => {
    if (!currentProject) return null;

    const rankedNominees = [...nominees].sort(
      (a, b) => (b.voters?.length ?? 0) - (a.voters?.length ?? 0)
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
      rankedNominees,
      winners,
      highestVotes,
      duration:
        Number.isFinite(durationValue) && durationValue > 0
          ? durationValue
          : null,
    };
  }, [currentProject, nominees]);

  const nomineeRanks = getCompetitionRanks(nomineeVoteCounts);

  useEffect(() => {
    if (!pageRef.current) return;

    const media = gsap.matchMedia();

    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(
        pageRef.current?.querySelectorAll(
          "[data-enter], .finished-election-card"
        ) ?? [],
        { opacity: 0, y: 28 },
        {
          opacity: 1,
          y: 0,
          duration: 0.55,
          stagger: 0.08,
          ease: "power3.out",
        }
      );
    });

    return () => media.revert();
  }, [electionStatus, currentProject?.id]);

  const openVoteModal = async (nominee: Nominee) => {
    if (!currentProject?.id || submitting || hasVoted) return;

    setVoteError("");

    try {
      const updatedProject = await refreshProject();
      const { data: task, error: taskError } = await supabase
        .from("tasks")
        .select("key")
        .eq("user_id", updatedProject.user_id)
        .limit(1)
        .maybeSingle();

      if (taskError) throw taskError;
      if (task?.key !== true) {
        setElectionStatus("finished");
        setVoteError("Voting has ended for this election.");
        return;
      }

      const voteStatus = await checkVotingStatus(currentProject.id);

      if (voteStatus.hasVoted) {
        setShowAlreadyVoted(true);
        return;
      }

      setSelectedNominee(nominee);
      setVoteForm({
        name: "",
        comment: "",
      });
    } catch (error: unknown) {
      console.error("Unable to check voting status:", error);

      setVoteError(
        error instanceof Error
          ? error.message
          : "We couldn't verify your voting status. Please try again."
      );
    }
  };

  const closeVoteModal = () => {
    if (submitting) return;

    setShowVoteConfirmation(false);
    setSelectedNominee(null);
    setVoteError("");

    setVoteForm({
      name: "",
      comment: "",
    });
  };

  // Submit a vote to the exact project identified by the route.
  const handleVote = async () => {
    if (!selectedNominee || !currentProject?.id || submitting) return;

    const name = voteForm.name.trim();
    const comment = voteForm.comment.trim();

    if (!name) {
      setVoteError("Please enter your name before voting.");
      return;
    }

    setSubmitting(true);
    setVoteError("");

    try {
      const updatedProject = await refreshProject();
      const { data: task, error: taskError } = await supabase
        .from("tasks")
        .select("key")
        .eq("user_id", updatedProject.user_id)
        .limit(1)
        .maybeSingle();

      if (taskError) throw taskError;
      if (task?.key !== true) {
        setElectionStatus("finished");
        setVoteError("Voting has ended for this election.");
        setSelectedNominee(null);
        return;
      }

      // Verify the exact browser UUID and project combination again.
      const voteStatus = await checkVotingStatus(currentProject.id);

      if (voteStatus.hasVoted) {
        setShowAlreadyVoted(true);
        setSelectedNominee(null);
        return;
      }

      const { error } = await supabase.from("voters").insert({
        id: voteStatus.voterId,
        project_id: currentProject.id,
        nominee_id: selectedNominee.id,
        name,
        comment: comment || null,
      });

      if (error) {
        // Check whether this exact voter/project combination
        // was inserted by another request.
        const {
          data: existingVote,
          error: checkError,
        } = await supabase
          .from("voters")
          .select("id")
          .eq("id", voteStatus.voterId)
          .eq("project_id", currentProject.id)
          .maybeSingle();

        if (checkError) throw checkError;

        if (existingVote) {
          setHasVoted(true);
          setShowAlreadyVoted(true);
          setSelectedNominee(null);
          return;
        }

        throw error;
      }

      setHasVoted(true);

      const nomineeName =
        selectedNominee.name || "your selected nominee";

      setSelectedNominee(null);

      setVoteForm({
        name: "",
        comment: "",
      });

      setSuccessMessage(
        `Thank you, ${name}! Your vote for ${nomineeName} was submitted successfully.`
      );

      // Fetch the latest data for this same project.
      try {
        await refreshProject();
        setLoadError("");
      } catch (refreshError: unknown) {
        console.error(
          "Vote saved, but project refresh failed:",
          refreshError
        );

        setLoadError(
          "Your vote was submitted, but the latest results could not be loaded. Please refresh the page."
        );
      }
    } catch (error: unknown) {
      console.error("Vote submission failed:", error);

      setVoteError(
        error instanceof Error
          ? error.message
          : "Your vote could not be submitted. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDetails = (nomineeId: string) => {
    router.push(`/home/nominees/${nomineeId}`);
  };

  const handleRefresh = async () => {
    setLoadingProject(true);
    setLoadError("");

    try {
      const updated = await refreshProject();
      const voteStatus = await checkVotingStatus(updated.id);

      setHasVoted(voteStatus.hasVoted);
    } catch (error: unknown) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Unable to reload the election."
      );
    } finally {
      setLoadingProject(false);
    }
  };

  const handleCopyLink = async () => {
    if (!currentProject) return;

    const shareLink = `${window.location.origin}/home/share/${currentProject.id}`;

    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch (error) {
      console.error("Unable to copy election link:", error);
    }
  };

  // Loading the project from Supabase.
  if (loadingProject) {
    return <ProjectLoading />;
  }

  // Project not found or unable to load.
  if (loadError && !currentProject) {
    return (
      <div className="flex min-h-[calc(100dvh-5rem)] w-full items-center justify-center overflow-hidden px-2 py-4 md:px-3">
        <section className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/[0.09] bg-[#111722] p-7 text-center shadow-[0_25px_80px_rgba(0,0,0,0.35)] sm:p-9">

          <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-red-400/20 bg-red-400/[0.08] text-red-300">
            <Info size={29} />
          </div>

          <h2 className="text-xl font-semibold tracking-tight text-white">
            Election unavailable
          </h2>

          <p className="mx-auto mt-3 max-w-sm break-words text-sm leading-6 text-white/45">
            {loadError}
          </p>

          <button
            type="button"
            onClick={() => void handleRefresh()}
            className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-400 px-5 py-3.5 text-sm font-semibold text-[#07101c] transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-300"
          >
            Try again
            <ArrowRight size={16} />
          </button>
        </section>
      </div>
    );
  }

  if (!currentProject) {
    return <ProjectLoading />;
  }

  if (electionStatus === "finished" && finishedResults) {
    return (
      <main
        ref={pageRef}
        className="relative min-h-screen w-full min-w-0 overflow-x-clip px-2 py-4 text-white md:px-3"
      >

        <div className="relative mx-auto w-full min-w-0 max-w-7xl">
          <header
            data-enter
            className="mb-8 flex flex-col justify-between gap-5 pb-6 sm:flex-row sm:items-center"
          >
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-400/[0.06] px-3 py-1.5 text-xs font-medium text-blue-300">
                <CheckCircle2 size={13} />
                Election completed
              </div>

              <h1 className="break-words text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Final <span className="text-blue-400">results.</span>
              </h1>

              <p className="mt-2 max-w-xl break-words text-sm text-white/40">
                {currentProject.description ||
                  "The election has ended and its final results are available."}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void handleRefresh()}
              className="inline-flex h-11 w-fit shrink-0 items-center gap-2 rounded-xl border border-white/[0.08] bg-[#141a24] px-4 text-sm font-semibold text-white/70 transition hover:border-blue-400/25 hover:text-blue-300"
            >
              <Loader2 size={15} className="text-blue-300" />
              Refresh results
            </button>
          </header>

          {loadError && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-amber-400/15 bg-amber-400/[0.05] p-3 text-xs text-amber-200"
            >
              {loadError}
            </div>
          )}

          <section className="finished-election-card relative min-w-0 overflow-hidden rounded-3xl border border-blue-400/25 bg-gradient-to-br from-[#151d29] via-[#151d2b] to-[#0d121b] p-5 shadow-[0_25px_90px_rgba(0,0,0,0.32)] sm:p-8">

            <div className="relative">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-blue-300/15 bg-black/20 px-3 py-1.5 text-xs font-medium text-blue-200">
                  <Trophy size={13} />
                  Final election
                </span>
                <span className="inline-flex items-center gap-2 text-xs text-white/35">
                  <CalendarDays size={14} />
                  {formatDate(currentProject.created_at)}
                </span>
              </div>

              <div className="mt-8 min-w-0 max-w-3xl">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-300/60">
                  Election
                </p>
                <h2 className="break-words text-3xl font-semibold tracking-tight sm:text-4xl">
                  {currentProject.name || "Untitled election"}
                </h2>
              </div>

              <div className="mt-8 rounded-2xl border border-blue-300/25 bg-[#08130d] p-5 shadow-[inset_0_1px_0_rgba(147,197,253,0.08)] sm:p-6">
                <div className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-200/65">
                  <Crown size={15} />
                  Election result
                </div>

                {finishedResults.winners.length === 0 ? (
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-[#141a24] p-3 text-white/50">
                      <Vote size={22} />
                    </div>
                    <div>
                      <p className="font-semibold">No votes recorded</p>
                      <p className="mt-1 text-sm text-white/40">
                        No winner can be determined for this election.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-yellow-300/20 bg-yellow-300/[0.09] text-yellow-300">
                        <Trophy size={27} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-white/40">
                          {finishedResults.winners.length > 1
                            ? "Joint winners"
                            : "Winning nominee"}
                        </p>
                        <div className="mt-1 flex min-w-0 flex-wrap gap-x-2">
                          {finishedResults.winners.map((winner, index) => (
                            <span
                              key={winner.id}
                              className="min-w-0 break-words text-xl font-semibold sm:text-2xl"
                            >
                              {winner.name || "Unnamed nominee"}
                              {index < finishedResults.winners.length - 1 && (
                                <span className="text-blue-300">,</span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-yellow-300/15 bg-yellow-300/[0.06] px-4 py-3 sm:text-right">
                      <p className="text-xs text-yellow-100/50">
                        {finishedResults.winners.length > 1 ? "Votes each" : "Winning votes"}
                      </p>
                      <p className="mt-1 text-2xl font-bold tabular-nums text-yellow-200">
                        {finishedResults.highestVotes.toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-5 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="min-w-0 rounded-2xl border border-blue-300/20 bg-[#121824] p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/40">Election duration</span>
                    <Clock3 size={17} className="text-blue-300" />
                  </div>
                  <p className="mt-3 break-words text-2xl font-semibold">
                    {formatDuration(finishedResults.duration)}
                  </p>
                </div>

                <div className="min-w-0 rounded-2xl border border-blue-300/20 bg-[#121824] p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/40">Total votes</span>
                    <Users size={17} className="text-blue-300" />
                  </div>
                  <p className="mt-3 text-2xl font-semibold tabular-nums">
                    {totalVotes.toLocaleString()}
                  </p>
                </div>

                <div className="min-w-0 rounded-2xl border border-blue-300/20 bg-[#121824] p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/40">Nominees</span>
                    <Award size={17} className="text-blue-300" />
                  </div>
                  <p className="mt-3 text-2xl font-semibold">
                    {nominees.length}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section data-enter className="mt-9 min-w-0">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-white">Nominee results</h2>
                <p className="mt-1 text-xs text-white/40">
                  Final vote distribution
                </p>
              </div>
              <span className="rounded-lg border border-white/[0.08] bg-[#141a24] px-3 py-1.5 text-xs text-white/45">
                {nominees.length} nominees
              </span>
            </div>

            {finishedResults.rankedNominees.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.08] bg-[#141a24] p-6 text-center text-sm text-white/40">
                No nominees were recorded for this election.
              </div>
            ) : (
              <div className="grid min-w-0 gap-3">
                {finishedResults.rankedNominees.map((nominee, index) => {
                  const voteCount = nominee.voters?.length ?? 0;
                  const rank = nomineeRanks[index] ?? index + 1;
                  const rankTheme = getRankingTheme(rank - 1);

                  return (
                    <article
                      key={nominee.id}
                      data-enter
                      className={`group flex min-w-0 flex-col gap-4 overflow-hidden rounded-2xl border p-4 transition sm:p-5 ${rankTheme.card}`}
                    >
                      <div className="flex min-w-0 items-center justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                          {rank <= 3 && voteCount > 0 && (
                            <Crown
                              size={18}
                              aria-label={getOrdinalLabel(rank - 1)}
                              className={`shrink-0 ${rankTheme.crown}`}
                            />
                          )}
                          {nominee.image ? (
                            <img
                              src={nominee.image}
                              alt={nominee.name || "Nominee"}
                              className={`h-12 w-12 shrink-0 rounded-xl border object-cover ${rankTheme.avatar}`}
                            />
                          ) : (
                            <div
                              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-sm font-semibold ${rankTheme.rank}`}
                            >
                              {rank}
                            </div>
                          )}

                          <div className="min-w-0">
                            <p className="break-words font-medium text-white">
                              {nominee.name || "Unnamed nominee"}
                            </p>
                            {
                              <span className={`mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold ${rankTheme.badge}`}>
                                {rank <= 3 && voteCount > 0 && <Crown size={11} />}
                                {getOrdinalLabel(rank - 1)}
                              </span>
                            }
                          </div>
                        </div>

                        <div className={`shrink-0 rounded-xl border px-3 py-2 text-right ${rankTheme.badge}`}>
                          <p className="text-[10px] uppercase tracking-[0.14em] text-white/40">
                            Total votes
                          </p>
                          <p className={`mt-1 font-semibold tabular-nums ${rankTheme.crown}`}>
                            {voteCount.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <Link
                        href={`/home/${nominee.id}`}
                        className={`inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-lg border px-4 text-xs font-semibold transition ${rankTheme.action}`}
                      >
                        View more
                        <ArrowRight size={13} />
                      </Link>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section
            data-enter
            className="mt-9 flex min-w-0 flex-col gap-4 rounded-2xl border border-blue-400/15 bg-blue-400/[0.045] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
          >
            <div>
              <h2 className="font-semibold text-white">This election is complete</h2>
              <p className="mt-1 text-sm text-white/40">
                Share the result or continue with the election workspace.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleCopyLink()}
                disabled={!currentProject}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-[#141a24] px-4 text-sm font-semibold text-white/70 transition hover:border-blue-400/30 hover:text-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                {copied ? "Copied" : "Copy link"}
              </button>
            </div>
          </section>

          <footer className="mt-12 border-t border-white/[0.06] py-6 text-center text-xs text-white/25">
            VoteSphere · Every vote recorded. Every result visible.
          </footer>
        </div>
      </main>
    );
  }

  return (
    <main
      ref={pageRef}
      className="relative min-h-screen overflow-hidden px-2 py-4 text-white md:px-3"
    >

      <div className="relative mx-auto w-full max-w-7xl">
        {/* Election header */}
        <header className="mb-8 flex flex-col justify-between gap-5 pb-6 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-blue-300/65">
              <span className="h-2 w-2 animate-pulse rounded-full bg-blue-400" />
              Live election
            </div>

            <h1 className="break-words text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              {currentProject.name || "Untitled election"}
            </h1>

            <p className="mt-2 break-words text-sm text-white/40">
              {currentProject.description ||
                "View the nominees and cast your vote."}
            </p>
          </div>

          <div className="inline-flex w-fit shrink-0 items-center gap-2 rounded-xl bg-blue-400/[0.06] px-3.5 py-2.5 text-xs font-medium text-blue-300">
            <CheckCircle2 size={15} />
            Voting active
          </div>
        </header>

        {/* Election statistics */}
        <section className="mb-7 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/[0.07] bg-[#141a24] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/40">Nominees</span>
              <Users size={17} className="text-blue-300" />
            </div>

            <p className="mt-2 text-2xl font-semibold text-white">
              {nominees.length}
            </p>

            <p className="mt-1 text-xs text-white/30">
              Candidates in this election
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-[#141a24] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/40">Total votes</span>
              <Vote size={17} className="text-blue-300" />
            </div>

            <p className="mt-2 text-2xl font-semibold tabular-nums text-white">
              {totalVotes.toLocaleString()}
            </p>

            <p className="mt-1 text-xs text-white/30">
              Votes submitted so far
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-[#141a24] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/40">Created</span>
              <Clock3 size={17} className="text-blue-300" />
            </div>

            <p className="mt-2 text-base font-semibold text-white">
              {formatDate(currentProject.created_at)}
            </p>

            <p className="mt-1 text-xs text-white/30">
              Election creation date
            </p>
          </div>
        </section>

        {/* Refresh error */}
        {loadError && (
          <div
            role="alert"
            className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-amber-400/15 bg-amber-400/[0.05] p-3 text-xs text-amber-200"
          >
            <span>{loadError}</span>

            <button
              type="button"
              onClick={() => void handleRefresh()}
              className="shrink-0 underline underline-offset-2"
            >
              Refresh
            </button>
          </div>
        )}

        {/* Voter status */}
        {hasVoted && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-blue-400/15 bg-blue-400/[0.055] p-4">
            <ShieldCheck
              size={19}
              className="mt-0.5 shrink-0 text-blue-300"
            />

            <div>
              <p className="text-sm font-semibold text-blue-200">
                Your vote has been recorded
              </p>

              <p className="mt-1 text-xs leading-5 text-white/40">
                You have already submitted a vote for this election.
                You cannot vote again for this election.
              </p>
            </div>
          </div>
        )}

        {/* Nominee heading */}
        <section className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/30">
              Election participants
            </p>

            <h2 className="mt-1 text-xl font-semibold text-white">
              Meet the nominees
            </h2>

            <p className="mt-1 text-sm text-white/40">
              Nominees are arranged from the highest votes to the lowest.
            </p>
          </div>

          <span className="rounded-full border border-white/[0.08] bg-[#141a24] px-3 py-1.5 text-xs text-white/45">
            {nominees.length}{" "}
            {nominees.length === 1 ? "nominee" : "nominees"}
          </span>
        </section>

        {/* Nominee cards */}
        {nominees.length === 0 ? (
          <div className="rounded-3xl border border-white/[0.08] bg-[#141a24] px-5 py-14 text-center">
            <Users className="mx-auto mb-4 text-white/30" size={30} />

            <h3 className="font-semibold text-white">
              No nominees available
            </h3>

            <p className="mt-2 text-sm text-white/40">
              Nominees will appear here when they are added to this election.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {nominees.map((nominee, index) => {
              const voteCount = nominee.voters?.length ?? 0;
              const comments = (nominee.voters ?? [])
                .map((voter) => voter.comment?.trim())
                .filter((comment): comment is string => Boolean(comment));
              const rank = nomineeRanks[index] ?? index + 1;
              const rankTheme = getRankingTheme(rank - 1);

              const percentage =
                totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;

              return (
                <article
                  key={nominee.id}
                  className={`group relative overflow-hidden rounded-3xl border p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(0,0,0,0.22)] sm:p-6 ${rankTheme.card}`}
                >
                  <div className="relative">
                    <div className="flex items-start gap-4">
                      {nominee.image ? (
                        <img
                          src={nominee.image}
                          alt={nominee.name || "Nominee"}
                          loading="lazy"
                          className={`h-12 w-12 shrink-0 rounded-2xl border object-cover ${rankTheme.avatar}`}
                        />
                      ) : (
                        <div className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-lg font-semibold ${rankTheme.avatar}`}>
                          {nominee.name?.trim().charAt(0).toUpperCase() || (
                            <Users size={22} />
                          )}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <h3 className="break-words text-lg font-semibold text-white">
                            {nominee.name || "Unnamed nominee"}
                          </h3>

                            {
                              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold ${rankTheme.badge}`}>
                                {rank <= 3 && voteCount > 0 && <Crown size={11} />}
                                {getOrdinalLabel(rank - 1)}
                            </span>
                          }
                        </div>

                        <p className="text-xs text-white/35">
                          Election nominee
                        </p>
                      </div>

                      <div className={`rounded-xl border px-3 py-2 text-right ${rankTheme.badge}`}>
                        <p className={`text-lg font-semibold tabular-nums ${rankTheme.crown}`}>
                          {voteCount.toLocaleString()}
                        </p>

                        <p className="text-[10px] text-white/35">
                          {voteCount === 1 ? "vote" : "votes"}
                        </p>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="mt-5">
                      <p className={`mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] ${rankTheme.crown}`}>
                        Description
                      </p>

                      <p className="min-h-[48px] whitespace-pre-wrap break-words text-sm leading-6 text-white/50">
                        {nominee.manifesto ||
                          "This nominee has not provided a description yet."}
                      </p>
                    </div>

                    {/* Vote progress */}
                    <div className="mt-6">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="text-xs text-white/40">
                          Vote distribution
                        </span>

                        <span className={`text-xs font-semibold tabular-nums ${rankTheme.crown}`}>
                          {percentage.toFixed(1)}%
                        </span>
                      </div>

                      <div
                        className="h-2 overflow-hidden rounded-full bg-[#141a24]"
                        role="progressbar"
                        aria-label={`${nominee.name || "Nominee"} vote percentage`}
                        aria-valuenow={Number(percentage.toFixed(1))}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <div
                          className={`h-full rounded-full bg-gradient-to-r transition-all duration-700 ease-out ${rankTheme.progress}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => handleDetails(nominee.id)}
                        className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all duration-300 hover:-translate-y-0.5 ${rankTheme.action}`}
                      >
                        <Info size={16} />
                        View details
                        <ArrowRight size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => void openVoteModal(nominee)}
                        disabled={hasVoted || submitting}
                        className={`group/button inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 ${rankTheme.solid}`}
                      >
                        <Vote size={16} />

                        {hasVoted ? "Already voted" : "Vote for nominee"}

                        {!hasVoted && (
                          <ArrowRight
                            size={15}
                            className="transition-transform group-hover/button:translate-x-1"
                          />
                        )}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <footer className="mt-10 border-t border-white/[0.06] py-6 text-center text-xs text-white/25">
          VoteSphere · Your voice, your decision.
        </footer>
      </div>

      {/* Success notification */}
      {successMessage && (
        <ModalPortal>
          <div
            role="status"
            className="fixed right-4 top-5 z-[120] flex w-[calc(100%-32px)] max-w-sm items-start gap-3 rounded-2xl border border-blue-400/20 bg-[#151e2c] p-4 shadow-[0_15px_50px_rgba(0,0,0,0.4)] backdrop-blur-xl"
          >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-400/15 text-blue-300">
            <CheckCircle2 size={19} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-blue-200">
              Vote submitted successfully!
            </p>

            <p className="mt-1 text-xs leading-5 text-white/55">
              {successMessage}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setSuccessMessage("")}
            aria-label="Dismiss notification"
            className="rounded-lg p-1 text-white/40 transition hover:bg-[#141a24] hover:text-white"
          >
            <X size={16} />
          </button>
          </div>
        </ModalPortal>
      )}

      {/* Already voted popup */}
      {showAlreadyVoted && (
        <ModalPortal>
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-white/[0.1] bg-[#141a24] p-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-400/[0.08] text-blue-300">
              <ShieldCheck size={26} />
            </div>

            <h3 className="text-lg font-semibold text-white">
              Vote already submitted
            </h3>

            <p className="mt-2 text-sm leading-6 text-white/45">
              This voter ID already has a vote recorded for this election.
              You cannot vote again using this browser ID.
            </p>

            <button
              type="button"
              onClick={() => setShowAlreadyVoted(false)}
              className="mt-6 w-full rounded-xl bg-blue-400 px-4 py-3 text-sm font-semibold text-[#07101c] transition hover:bg-blue-300"
            >
              Understood
            </button>
          </div>
          </div>
        </ModalPortal>
      )}

      {/* Voting modal */}
      {selectedNominee && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/75 px-4 py-6 backdrop-blur-md"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closeVoteModal();
              }
            }}
          >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="vote-modal-title"
            className="relative my-auto w-full max-w-md overflow-hidden rounded-3xl border border-blue-400/15 bg-[#141a24] p-6 shadow-[0_25px_100px_rgba(0,0,0,0.6)] sm:p-7"
          >

            <div className="relative">
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-400/[0.08] text-blue-300">
                    <Vote size={21} />
                  </div>

                  <h2
                    id="vote-modal-title"
                    className="text-xl font-semibold text-white"
                  >
                    Cast your vote
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={closeVoteModal}
                  disabled={submitting}
                  aria-label="Close voting dialog"
                  className="rounded-xl p-2 text-white/40 transition hover:bg-[#141a24] hover:text-white disabled:opacity-40"
                >
                  <X size={19} />
                </button>
              </div>


              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="voter-name"
                    className="mb-2 block text-xs font-medium text-white/65"
                  >
                    Your name <span className="text-blue-300">*</span>
                  </label>

                  <input
                    id="voter-name"
                    type="text"
                    autoComplete="name"
                    maxLength={100}
                    value={voteForm.name}
                    onChange={(event) =>
                      setVoteForm((previous) => ({
                        ...previous,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Enter your name"
                    disabled={submitting}
                    className="w-full rounded-xl border border-white/[0.09] bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-blue-400/45 focus:ring-2 focus:ring-blue-400/10 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label
                    htmlFor="voter-comment"
                    className="mb-2 flex items-center gap-2 text-xs font-medium text-white/65"
                  >
                    <MessageSquare size={13} />
                    Comment
                    <span className="text-white/30">(optional)</span>
                  </label>

                  <textarea
                    id="voter-comment"
                    rows={3}
                    maxLength={500}
                    value={voteForm.comment}
                    onChange={(event) =>
                      setVoteForm((previous) => ({
                        ...previous,
                        comment: event.target.value,
                      }))
                    }
                    placeholder="Share a short comment..."
                    disabled={submitting}
                    className="w-full resize-none rounded-xl border border-white/[0.09] bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-blue-400/45 focus:ring-2 focus:ring-blue-400/10 disabled:opacity-50"
                  />

                  <p className="mt-1 text-right text-[10px] text-white/25">
                    {voteForm.comment.length}/500
                  </p>
                </div>
              </div>

              {voteError && (
                <div
                  role="alert"
                  className="mt-4 rounded-xl border border-red-400/15 bg-red-400/[0.06] px-3 py-2.5 text-xs leading-5 text-red-300"
                >
                  {voteError}
                </div>
              )}

              <div className="mt-6 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => setShowVoteConfirmation(true)}
                  disabled={submitting || !voteForm.name.trim()}
                  className="group flex w-full items-center justify-center gap-2 rounded-xl bg-blue-400 px-4 py-3.5 text-sm font-semibold text-[#07101c] transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={17} className="animate-spin" />
                      Submitting vote...
                    </>
                  ) : (
                    <>
                      <Vote size={17} />
                      Confirm and vote
                      <ArrowRight
                        size={16}
                        className="transition-transform group-hover:translate-x-1"
                      />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={closeVoteModal}
                  disabled={submitting}
                  className="w-full rounded-xl border border-white/[0.08] px-4 py-3 text-sm font-medium text-white/50 transition hover:bg-[#141a24] hover:text-white disabled:opacity-40"
                >
                  Cancel
                </button>
              </div>

              <p className="mt-5 text-center text-[11px] leading-5 text-white/25">
                Please review your choice carefully. You cannot vote again
                after submitting.
              </p>
            </div>
          </section>
        </div>
        </ModalPortal>
      )}

      {showVoteConfirmation && selectedNominee && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 px-4 backdrop-blur-md"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !submitting) {
                setShowVoteConfirmation(false);
              }
            }}
          >
            <section
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="final-vote-confirmation-title"
              className="w-full max-w-sm rounded-3xl border border-blue-400/20 bg-[linear-gradient(145deg,rgba(16,37,26,0.98),rgba(11,17,13,0.98))] p-6 text-center shadow-[0_25px_100px_rgba(0,0,0,0.65)]"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-400/[0.10] text-blue-300">
                <ShieldCheck size={26} />
              </div>

              <h3
                id="final-vote-confirmation-title"
                className="mt-5 text-xl font-semibold text-white"
              >
                Confirm your final vote
              </h3>
              <p className="mt-2 text-sm leading-6 text-white/55">
                Submit your vote for{" "}
                <span className="font-semibold text-blue-300">
                  {selectedNominee.name || "this nominee"}
                </span>
                ?
              </p>
              <p className="mt-2 text-xs text-white/35">
                This cannot be changed after submission.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setShowVoteConfirmation(false)}
                  className="min-h-11 flex-1 rounded-xl border border-white/[0.08] bg-[#141a24] px-4 text-sm font-medium text-white/60 transition hover:bg-[#141a24] hover:text-white disabled:opacity-40"
                >
                  Go back
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    setShowVoteConfirmation(false);
                    void handleVote();
                  }}
                  className="min-h-11 flex-1 rounded-xl bg-blue-400 px-4 text-sm font-semibold text-[#07101c] transition hover:bg-blue-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Yes, submit vote
                </button>
              </div>
            </section>
          </div>
        </ModalPortal>
      )}
    </main>
  );
}
