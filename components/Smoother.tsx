
"use client";

import { ReactNode, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(
  ScrollTrigger,
  ScrollSmoother,
  useGSAP
);

interface SmoothScrollProps {
  children: ReactNode;
}

export default function SmoothScroll({
  children,
}: SmoothScrollProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
const smoother = ScrollSmoother.create({
  wrapper: wrapperRef.current!,
  content: contentRef.current!,
  smooth: 0.8,
  effects: true,
  smoothTouch: 0.1,
  normalizeScroll: true,
  ignoreMobileResize: true,
});

      return () => {
        smoother.kill();
        ScrollTrigger.getAll().forEach((trigger) => {
          trigger.kill();
        });
      };
    },
    {
      scope: wrapperRef,
    }
  );

  return (
    <div ref={wrapperRef} id="smooth-wrapper">
      <div ref={contentRef} id="smooth-content">
        {children}
      </div>
    </div>
  );
}
