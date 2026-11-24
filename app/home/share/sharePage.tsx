
"use client";

import { memo, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Check,
  Copy,
  Link2,
  LoaderCircle,
  Plus,
  QrCode,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/lib/supabase-client";
import useApp from "@/lib/useApp";
import { ensureUserTask } from "@/lib/tasks";
import type { Project } from "@/types/project";

const SharedQRCode = memo(function SharedQRCode({ value }: { value: string }) {
  return (
    <QRCodeSVG
      value={value}
      size={280}
      level="M"
      includeMargin
      bgColor="#ffffff"
      fgColor="#0a0e16"
      className="block h-auto w-full max-w-[260px]"
    />
  );
});

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
            .select("*")
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
    Boolean(project && project.length > 0) &&
    Boolean(currentProject?.id && shareUrl);

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
    <main className="share-page relative isolate flex min-h-[calc(100dvh-8rem)] items-center justify-center overflow-hidden px-2 py-3 md:px-3 sm:py-4">
      <div className="w-full max-w-2xl">
        <header className="share-page-title mb-5 text-center sm:mb-6">

          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Share your election
          </h1>
        </header>

        {loadingProject ? (
          <section
            className="mx-auto flex min-h-64 max-w-xl flex-col items-center justify-center rounded-3xl border border-white/[0.08] bg-[#141a24] px-6 text-center backdrop-blur-xl"
            role="status"
            aria-live="polite"
          >
            <LoaderCircle
              size={24}
              className="animate-spin text-blue-300"
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
          <section className="mx-auto max-w-xl rounded-3xl border border-white/[0.08] px-6 py-12 text-center backdrop-blur-xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-400/15 bg-blue-400/[0.07] text-blue-300">
              <QrCode size={21} />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-white">
              QR code isn&apos;t available
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-400">
              Create a project to generate a QR code and share its voting
              link.
            </p>
            <Link
              href="/home/starting"
              className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-400 px-5 text-sm font-semibold text-[#07101c] transition-colors hover:bg-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#141a24]"
            >
              <Plus size={16} />
              Create a project
            </Link>
          </section>
        ) : (
          <section className="share-page-card relative mx-auto max-w-xl overflow-hidden rounded-[2rem] border border-white/[0.09] bg-[#141a24] p-3 shadow-[0_30px_100px_rgba(0,0,0,0.35)] backdrop-blur-2xl sm:p-5">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-300/50 to-transparent" />

            <div className="relative z-10 text-center">
              <h2 className="mx-auto max-w-xl break-words text-xl font-semibold tracking-tight text-white sm:text-2xl">
                {currentProject.name || "Untitled election"}
              </h2>

              <p className="share-page-instructions mt-3 text-xs text-zinc-300 sm:mt-4">
                Scan the code with a phone camera to open the voting page
              </p>

              <div className="share-page-code mx-auto mt-3 flex w-full max-w-[260px] justify-center rounded-[1.5rem] border border-white/10 bg-white p-2 shadow-[0_20px_70px_rgba(59,130,246,0.08)] sm:mt-4 sm:p-3">
                {shareUrl && (
                  <SharedQRCode value={shareUrl} />
                )}
              </div>

              <div className="share-page-link mx-auto mt-5 max-w-xl text-left">
                <label
                  htmlFor="election-share-link"
                  className="mb-2 block text-xs font-medium text-zinc-300"
                >
                  Invitation link
                </label>

                <div className="flex flex-col gap-2 rounded-2xl border border-white/[0.08] bg-black/20 p-2 sm:flex-row sm:items-center">
                  <div className="flex min-h-11 min-w-0 flex-1 items-center gap-2 px-2">
                    <Link2
                      size={16}
                      className="shrink-0 text-blue-300"
                    />
                    <input
                      id="election-share-link"
                      type="text"
                      readOnly
                      value={shareUrl}
                      onFocus={(event) => event.currentTarget.select()}
                      className="min-w-0 flex-1 bg-transparent text-sm text-zinc-300 outline-none selection:bg-blue-400/30"
                      aria-label="Election invitation link"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyLink}
                    disabled={!shareUrl}
                    className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-400 px-5 text-sm font-semibold text-[#07101c] shadow-[0_8px_24px_rgba(59,130,246,0.08)] transition duration-200 hover:bg-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#141a24] disabled:cursor-not-allowed disabled:opacity-50"
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
                        ? "text-blue-300"
                        : "text-transparent"
                  }`}
                  role={copyError ? "alert" : "status"}
                  aria-live="polite"
                >
                  {copyError || (copied ? "Invitation link copied." : " ")}
                </p>
              </div>

              <div className="share-page-note  flex flex-wrap items-center justify-center gap-2 text-center text-[11px] text-zinc-300">
                <QrCode size={14} className="text-blue-400/80" />
                Scanning opens the election; it never submits a vote automatically.
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
