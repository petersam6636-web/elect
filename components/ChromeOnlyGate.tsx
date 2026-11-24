"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ArrowUpRight, Download, ShieldCheck } from "lucide-react";

function isGoogleChrome(): boolean {
  const userAgent = navigator.userAgent;
  const isAlternativeBrowser =
    /(?:Edg(?:A|iOS)?|OPR|SamsungBrowser|UCBrowser|YaBrowser|Vivaldi|FxiOS|DuckDuckGo)\//i.test(
      userAgent,
    );
  const isBrave = Reflect.get(navigator, "brave") !== undefined;

  const userAgentData = Reflect.get(navigator, "userAgentData");
  if (typeof userAgentData === "object" && userAgentData !== null) {
    const brands = Reflect.get(userAgentData, "brands");
    if (Array.isArray(brands) && brands.length > 0) {
      return (
        !isAlternativeBrowser &&
        !isBrave &&
        brands.some(
          (brand: unknown) =>
            typeof brand === "object" &&
            brand !== null &&
            Reflect.get(brand, "brand") === "Google Chrome",
        )
      );
    }
  }

  const isChromeUserAgent = /(?:Chrome|CriOS)\//i.test(userAgent);
  return isChromeUserAgent && !isAlternativeBrowser && !isBrave;
}

function openInChrome(): void {
  const currentUrl = window.location.href;
  const protocol = window.location.protocol.slice(0, -1);

  if (/Android/i.test(navigator.userAgent)) {
    const intentUrl = currentUrl.replace(/^https?:\/\//i, "");
    window.location.assign(
      `intent://${intentUrl}#Intent;scheme=${protocol};package=com.android.chrome;end`,
    );
    return;
  }

  const chromeProtocol = protocol === "https" ? "googlechromes" : "googlechrome";
  window.location.assign(
    `${chromeProtocol}://navigate?url=${encodeURIComponent(currentUrl)}`,
  );
}

export default function ChromeOnlyGate({
  children,
}: {
  children: ReactNode;
}) {
  const [isChrome, setIsChrome] = useState<boolean | null>(null);

  useEffect(() => {
    setIsChrome(isGoogleChrome());
  }, []);

  if (isChrome === true) {
    return children;
  }

  if (isChrome === null) {
    return (
      <main className="flex min-h-screen items-center justify-center px-5 text-sm text-zinc-400">
        <p role="status">Checking browser compatibility...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12 text-zinc-100">
      <section
        aria-labelledby="chrome-required-title"
        className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#141a24] p-8 text-center shadow-2xl shadow-black/30 sm:p-10"
      >
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-400/[0.08] text-blue-300">
          <ShieldCheck aria-hidden="true" size={28} />
        </div>
        <h1
          id="chrome-required-title"
          className="text-2xl font-semibold tracking-tight text-white sm:text-3xl"
        >
          Google Chrome is required
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-zinc-400">
          To use VoteSphere, open this page in Google Chrome. If Chrome is not
          installed, download it from Google.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={openInChrome}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-500 px-5 py-3 text-sm font-semibold text-[#0a0e16] transition-colors hover:bg-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300"
          >
            Open in Chrome
            <ArrowUpRight aria-hidden="true" size={17} />
          </button>
          <a
            href="https://www.google.com/chrome/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#141a24] px-5 py-3 text-sm font-semibold text-zinc-100 transition-colors hover:border-blue-400/30 hover:bg-[#141a24] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300"
          >
            Download Chrome
            <Download aria-hidden="true" size={17} />
          </a>
        </div>

      </section>
    </main>
  );
}
