
"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import ScrollSmoother from "gsap/ScrollSmoother";
import { useGSAP } from "@gsap/react";
import Slider from "./Slider";
import type { NavigationPosition } from "./NavigationCustomizer";
import useApp from "@/lib/useApp";

gsap.registerPlugin(ScrollTrigger, ScrollSmoother, useGSAP);

interface DashboardShellProps {
  children: ReactNode;
}

const STORAGE_KEY = "votesphere-navigation-position";

export default function DashboardShell({ children }: DashboardShellProps) {
  const { taskKey, project } = useApp();
  const pathname = usePathname();

  const [position, setPosition] = useState<NavigationPosition>("left");
  const [ready, setReady] = useState(false);
  const smoothWrapperRef = useRef<HTMLDivElement>(null);
  const smoothContentRef = useRef<HTMLElement>(null);

  const isNomineesRoute = pathname === "/home/nominees";

  const showNomineesIndicator =
    taskKey === true &&
    Boolean(project && project.length > 0) &&
    !isNomineesRoute;

  useGSAP(
    () => {
      const wrapper = smoothWrapperRef.current;
      const content = smoothContentRef.current;

      if (!wrapper || !content) return;

      const media = gsap.matchMedia();

      media.add("(prefers-reduced-motion: no-preference)", () => {
        const smoother = ScrollSmoother.create({
          wrapper,
          content,
          smooth: 0.25,
          smoothTouch: 0,
          effects: false,
        });

        return () => smoother.kill();
      });

      return () => media.revert();
    },
    {
      scope: smoothWrapperRef,
      dependencies: [pathname],
      revertOnUpdate: true,
    }
  );

  useEffect(() => {
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
    <div className="relative min-h-dvh bg-[#070b09] text-zinc-100">
      <Slider
        position={position}
        onPositionChange={changePosition}
        showNomineesIndicator={showNomineesIndicator}
      />

      <div
        ref={smoothWrapperRef}
        id="smooth-wrapper"
        className="relative min-h-dvh bg-[#070b09]"
      >
        <main
          ref={smoothContentRef}
          id="smooth-content"
          className={`min-h-dvh w-full transition-[padding] duration-300 ease-in-out ${
            position === "left"
              ? "md:pl-[88px] md:pr-5"
              : position === "right"
                ? "md:pl-5 md:pr-[88px]"
                : "md:px-5 md:pb-[92px]"
          }`}
        >
          <div className="mx-auto min-h-dvh w-full max-w-[1600px] px-4 pb-24 pt-5 sm:px-6 md:px-0 md:pb-6 md:pt-6">
            {ready ? children : (
              <div className="min-h-[60vh]" aria-hidden="true" />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
