"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ExternalLink, Globe } from "lucide-react";

import { appContext } from "./appContext";

import type {
  Project,
  ProjectDetail,
} from "@/types/project";

function isGoogleChrome() {
  const userAgent = navigator.userAgent;
  const isChrome = /(?:Chrome|CriOS)\//i.test(userAgent);
  const isAnotherBrowser =
    /(?:Edg(?:A|iOS)?|OPR|Opera|SamsungBrowser|Vivaldi|YaBrowser|DuckDuckGo|UCBrowser|MiuiBrowser|HuaweiBrowser|FxiOS|GSA|Brave)\//i.test(
      userAgent
    ) || /;\s*wv\)/i.test(userAgent);

  return isChrome && !isAnotherBrowser;
}

function getChromeOpenUrl() {
  const currentUrl = new URL(window.location.href);

  if (/Android/i.test(navigator.userAgent)) {
    const scheme = currentUrl.protocol.slice(0, -1);
    const fallbackUrl = encodeURIComponent("https://www.google.com/chrome/");

    return `intent://${currentUrl.host}${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}#Intent;scheme=${scheme};package=com.android.chrome;S.browser_fallback_url=${fallbackUrl};end`;
  }

  const chromeScheme =
    currentUrl.protocol === "https:" ? "googlechromes" : "googlechrome";

  return `${chromeScheme}://navigate?url=${encodeURIComponent(currentUrl.href)}`;
}

export default function ContextFile({
  children,
}: {
  children: ReactNode;
}) {
  const [chromeSupported, setChromeSupported] = useState<boolean | null>(null);
  const [project, setProject] = useState<Project[] | null>(null);
  const [taskKey, setTaskKey] = useState<boolean | null>(null);
  const [userInfo, setUserInfo] = useState("");
  const [projectDetails, setProjectDetails] =
    useState<ProjectDetail | null>(null);
  const [currentProject, setCurrentProject] =
    useState<Project | null>(null);
  const [linkingId, setLinkingId] = useState<string>("");

  useEffect(() => {
    setChromeSupported(isGoogleChrome());
  }, []);

  if (chromeSupported === null) {
    return (
      <div
        className="flex min-h-dvh items-center justify-center bg-[#070b09] px-4 text-sm text-white/55"
        role="status"
      >
        Checking browser support...
      </div>
    );
  }

  if (!chromeSupported) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#070b09] px-4 py-8 text-white">
        <section className="w-full max-w-md rounded-3xl border border-white/[0.09] bg-[#0d1310] p-6 text-center shadow-2xl shadow-black/30 sm:p-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300">
            <Globe size={25} />
          </div>

          <h1 className="mt-5 text-xl font-semibold text-white">
            Open VoteSphere in Google Chrome
          </h1>
          <p className="mt-2 text-sm leading-6 text-white/50">
            Voting is supported only in Google Chrome. Open this page in Chrome
            to continue.
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <a
              href={getChromeOpenUrl()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-[#04130c] transition hover:bg-emerald-300"
            >
              Open in Chrome
              <ExternalLink size={16} />
            </a>
            <a
              href="https://www.google.com/chrome/"
              target="_blank"
              rel="noreferrer"
              className="text-sm text-emerald-300 transition hover:text-emerald-200"
            >
              Get Google Chrome
            </a>
          </div>
        </section>
      </main>
    );
  }

  return (
    <appContext.Provider
      value={{
        userInfo,
        setUserInfo,

        project,
        setProject,

        taskKey,
        setTaskKey,

        projectDetails,
        setProjectDetails,

        currentProject,
        setCurrentProject,

        linkingId,
        setLinkingId,
      }}
    >
      {children}
    </appContext.Provider>
  );
}