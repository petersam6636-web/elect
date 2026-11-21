"use client";

import { useEffect, useState, type ReactNode } from "react";

import { appContext } from "./appContext";

import type {
  Project,
  ProjectDetail,
} from "@/types/project";

type BrowserStatus = "checking" | "chrome" | "google-app" | "unsupported";

type NavigatorWithUserAgentData = Navigator & {
  userAgentData?: {
    brands?: Array<{ brand: string }>;
  };
};

function getBrowserStatus(): Exclude<BrowserStatus, "checking"> {
  const userAgent = navigator.userAgent;
  const isGoogleApp = /\bGSA\/|GoogleApp/i.test(userAgent);

  if (isGoogleApp) return "google-app";

  const unsupportedBrowser =
    /\b(?:Edg|Edge|OPR|OPiOS|Opera|SamsungBrowser|YaBrowser|DuckDuckGo|Firefox|FxiOS|UCBrowser|Brave|Vivaldi|MiuiBrowser|HuaweiBrowser)\//i.test(
      userAgent
    );
  const isIOSChrome = /\bCriOS\//i.test(userAgent);
  const navigatorWithUserAgentData =
    navigator as NavigatorWithUserAgentData;
  const chromeBrand = navigatorWithUserAgentData.userAgentData?.brands?.some(
    ({ brand }) => brand === "Google Chrome"
  );
  const isChrome =
    isIOSChrome ||
    (chromeBrand ??
      (!navigatorWithUserAgentData.userAgentData &&
        /\bChrome\//i.test(userAgent)));

  return isChrome && !unsupportedBrowser && !/\bwv\b/i.test(userAgent)
    ? "chrome"
    : "unsupported";
}

export default function ContextFile({
  children,
}: {
  children: ReactNode;
}) {
  const [browserStatus, setBrowserStatus] =
    useState<BrowserStatus>("checking");
  const [project, setProject] = useState<Project[] | null>(null);
  const [taskKey, setTaskKey] = useState<boolean | null>(null);
  const [userInfo, setUserInfo] = useState("");
  const [projectDetails, setProjectDetails] =
    useState<ProjectDetail | null>(null);
  const [currentProject, setCurrentProject] =
    useState<Project | null>(null);
  const [linkingId, setLinkingId] = useState<string>("");

  useEffect(() => {
    setBrowserStatus(getBrowserStatus());
  }, []);

  if (browserStatus === "checking") {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#070b09] px-5 text-zinc-100">
        <p role="status" className="text-sm text-zinc-400">
          Checking browser compatibility…
        </p>
      </main>
    );
  }

  if (browserStatus !== "chrome") {
    const openedInGoogleApp = browserStatus === "google-app";

    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#070b09] px-5 py-10 text-zinc-100">
        <section
          role="alert"
          className="w-full max-w-md rounded-3xl border border-white/[0.09] bg-[#0d1310] p-7 text-center sm:p-9"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300">
            <span className="text-xl font-semibold">C</span>
          </div>
          <h1 className="mt-5 text-xl font-semibold tracking-tight text-white">
            Google Chrome required
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            {openedInGoogleApp
              ? "This link opened in the Google app’s built-in browser. Open the browser menu and choose “Open in Chrome” to continue."
              : "VoteSphere is supported only in Google Chrome. Open this link in Chrome to continue."}
          </p>
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