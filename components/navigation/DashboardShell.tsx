
"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import Slider from "./Slider";
import type { NavigationPosition } from "./NavigationCustomizer";
import useApp from "@/lib/useApp";

interface DashboardShellProps {
  children: ReactNode;
}

const STORAGE_KEY = "votesphere-navigation-position";

export default function DashboardShell({ children }: DashboardShellProps) {
  const { taskKey, project } = useApp();
  const pathname = usePathname();

  const [position, setPosition] = useState<NavigationPosition>("left");
  const [ready, setReady] = useState(false);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  const routeSegments = pathname.split("/").filter(Boolean);
  const isPublicVoterRoute =
    routeSegments.length === 3 &&
    routeSegments[0] === "home" &&
    (routeSegments[1] === "share" || routeSegments[1] === "nominees");
  const isExcludedNomineesIndicatorRoute =
    pathname === "/home/nominees" ||
    pathname.startsWith("/home/nominees/") ||
    pathname === "/home/starting" ||
    pathname.startsWith("/home/starting/") ||
    pathname === "/home/register" ||
    pathname.startsWith("/home/register/");

  const showNomineesIndicator =
    taskKey === true &&
    Boolean(project && project.length > 0) &&
    !isExcludedNomineesIndicatorRoute;

  useEffect(() => {
    setPortalRoot(document.body);

    let savedPosition: NavigationPosition | null = null;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (
        saved === "left" ||
        saved === "right" ||
        saved === "bottom"
      ) {
        savedPosition = saved;
      }
    } catch {
      // Keep the default position if browser storage is unavailable.
    }

    const frame = window.requestAnimationFrame(() => {
      if (savedPosition) setPosition(savedPosition);
      setReady(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  const changePosition = (nextPosition: NavigationPosition) => {
    setPosition(nextPosition);

    try {
      localStorage.setItem(STORAGE_KEY, nextPosition);
    } catch {
      // The current selection still works for this session.
    }
  };

  return (
    <div className="relative min-h-dvh overflow-hidden text-zinc-100">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10"
      >
        <div className="absolute -left-32 top-[-12rem] h-[32rem] w-[32rem] rounded-full bg-emerald-500/[0.12] blur-[110px]" />
        <div className="absolute bottom-[-18rem] right-[-10rem] h-[38rem] w-[38rem] rounded-full bg-emerald-300/[0.08] blur-[130px]" />
      </div>

      {/* Keep fixed navigation outside ScrollSmoother's transformed content. */}
      {!isPublicVoterRoute &&
        portalRoot &&
        createPortal(
          <Slider
            position={position}
            onPositionChange={changePosition}
            showNomineesIndicator={showNomineesIndicator}
          />,
          portalRoot
        )}

      <div
        className="relative min-h-dvh"
      >
        <main
          className={`min-h-dvh w-full transition-[padding] duration-300 ease-in-out ${
            isPublicVoterRoute
              ? "md:px-5"
              : position === "left"
                ? "md:pl-[88px] md:pr-5"
                : position === "right"
                  ? "md:pl-5 md:pr-[88px]"
                  : "md:px-5 md:pb-[92px]"
          }`}
        >
          <div
            className={`mx-auto min-h-dvh w-full max-w-[1600px] pt-5 md:pt-6 ${
              isPublicVoterRoute ? "pb-6" : "pb-24 md:pb-6"
            }`}
          >
            {ready ? children : (
              <div className="min-h-[60vh]" aria-hidden="true" />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
