"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

type Props = {
  onFinished: () => void;
};

type Kind = "rose_red" | "rose_white" | "baby_breath";

const SVGS: Record<Kind, string> = {
  rose_red:
    '<svg viewBox="0 0 40 40" width="100%" height="100%"><circle cx="20" cy="20" r="17" fill="#A81C26"/><path d="M20 6c7 0 13 5 13 12 0 7-6 13-13 13S7 25 7 18C7 11 13 6 20 6z" fill="#C72B36"/><path d="M20 11c4 0 8 3 8 7s-4 8-8 8-8-4-8-8 4-7 8-7z" fill="#D9424C"/><path d="M20 15c-3 0-5 2-5 4.5S17 24 20 24s5-2 5-4.5S23 15 20 15z" fill="#A81C26"/><path d="M16 17c2-2 6-2 8 0" stroke="#7E141C" stroke-width="1.2" fill="none" stroke-linecap="round"/></svg>',
  rose_white:
    '<svg viewBox="0 0 40 40" width="100%" height="100%"><circle cx="20" cy="20" r="17" fill="#E4D6BF"/><path d="M20 6c7 0 13 5 13 12 0 7-6 13-13 13S7 25 7 18C7 11 13 6 20 6z" fill="#F3EBDD"/><path d="M20 11c4 0 8 3 8 7s-4 8-8 8-8-4-8-8 4-7 8-7z" fill="#FBF6EC"/><path d="M20 15c-3 0-5 2-5 4.5S17 24 20 24s5-2 5-4.5S23 15 20 15z" fill="#E4D6BF"/><path d="M16 17c2-2 6-2 8 0" stroke="#CDB894" stroke-width="1.2" fill="none" stroke-linecap="round"/></svg>',
  baby_breath:
    '<svg viewBox="0 0 40 40" width="100%" height="100%"><g stroke="#7DA27A" stroke-width="1.2" stroke-linecap="round" fill="none"><path d="M20 36V22"/><path d="M20 28L10 16"/><path d="M20 26L30 14"/><path d="M20 22L20 8"/></g><g fill="#FFFFFF" stroke="#E6DDCC" stroke-width="0.8"><circle cx="10" cy="15" r="3.6"/><circle cx="6.5" cy="19" r="2.6"/><circle cx="30" cy="13" r="3.6"/><circle cx="34" cy="17.5" r="2.6"/><circle cx="20" cy="7" r="3.6"/><circle cx="15" cy="9.5" r="2.4"/><circle cx="25" cy="9.5" r="2.4"/><circle cx="20" cy="21" r="2.4"/></g></svg>',
};

const SEQUENCE: Kind[] = [
  "rose_red",
  "rose_white",
  "rose_red",
  "baby_breath",
  "rose_white",
  "rose_red",
  "baby_breath",
  "rose_white",
  "rose_red",
  "baby_breath",
  "rose_red",
  "rose_white",
  "baby_breath",
  "rose_red",
];

const DROP_PLAN = [1, 1, 1, 2, 1, 2, 1, 2, 1, 2];
const TOTAL = SEQUENCE.length;
const GOLDEN_ANGLE = 137.5 * (Math.PI / 180);
const REFERENCE_SIZE = 320;

export default function FreesiaIntro2({ onFinished }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const bouquetRef = useRef<HTMLDivElement>(null);
  const finishedRef = useRef(onFinished);
  const [count, setCount] = useState(0);

  useEffect(() => {
    finishedRef.current = onFinished;
  }, [onFinished]);

  useEffect(() => {
    const container = containerRef.current;
    const zone = zoneRef.current;
    const bouquet = bouquetRef.current;
    if (!container || !zone || !bouquet) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finishedRef.current();
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const ctx = gsap.context(() => {
      const state = { val: 0 };
      let stepsDone = 0;
      let dropped = 0;

      gsap.set(bouquet, { scale: 0.8, transformOrigin: "50% 50%" });

      const dropRose = (i: number) => {
        const zoneRect = zone.getBoundingClientRect();
        const ratio = zoneRect.width / REFERENCE_SIZE;
        const size = gsap.utils.random(24, 40, 1);
        const angle = i * GOLDEN_ANGLE;
        const radius = (20 + i * 8) * ratio;
        const finalX = radius * Math.cos(angle);
        const finalY = radius * Math.sin(angle);

        const rose = document.createElement("div");
        rose.innerHTML = SVGS[SEQUENCE[i]];
        Object.assign(rose.style, {
          position: "absolute",
          left: "50%",
          top: "50%",
          width: `${size}px`,
          height: `${size}px`,
          marginLeft: `${-size / 2}px`,
          marginTop: `${-size / 2}px`,
          filter: "drop-shadow(0 3px 4px rgba(26,26,26,0.28))",
          willChange: "transform",
        });
        bouquet.appendChild(rose);

        const startY = -(zoneRect.top + zoneRect.height / 2 + 200);
        const startX = gsap.utils.random(-zoneRect.width / 2, zoneRect.width / 2);
        gsap.set(rose, { x: startX, y: startY, rotation: gsap.utils.random(-60, 60) });
        gsap.to(rose, {
          x: finalX,
          y: finalY,
          rotation: gsap.utils.random(0, 360),
          duration: 0.8,
          ease: "bounce.out",
        });

        dropped += 1;
        gsap.to(bouquet, {
          scale: 0.8 + 0.28 * (dropped / TOTAL),
          duration: 0.5,
          ease: "power2.out",
          overwrite: "auto",
        });
      };

      gsap.to(state, {
        val: 100,
        duration: 4,
        ease: "power2.inOut",
        onUpdate: () => {
          setCount(Math.round(state.val));
          const step = Math.min(DROP_PLAN.length, Math.floor(state.val / 10));
          while (stepsDone < step) {
            for (let k = 0; k < DROP_PLAN[stepsDone]; k += 1) {
              if (dropped < TOTAL) dropRose(dropped);
            }
            stepsDone += 1;
          }
        },
        onComplete: () => {
          setCount(100);
          while (dropped < TOTAL) dropRose(dropped);
          gsap.to(container, {
            yPercent: -100,
            duration: 1,
            ease: "power4.inOut",
            delay: 0.6,
            onComplete: () => finishedRef.current(),
          });
        },
      });
    }, containerRef);

    return () => {
      ctx.revert();
      bouquet.replaceChildren();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      dir="ltr"
      role="status"
      aria-label="Loading Freesia"
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-[#FFF8F0] px-4"
    >
      <div
        ref={zoneRef}
        className="relative h-[260px] w-[260px] rounded-full border border-[#1A1A1A]/10 bg-white/40 sm:h-[320px] sm:w-[320px]"
      >
        <div ref={bouquetRef} className="absolute inset-0" />
      </div>

      <div
        className="mt-6 text-[56px] font-bold leading-none tabular-nums text-[#1A1A1A] sm:mt-8 sm:text-[100px]"
        style={{ fontFamily: "Tajawal, var(--font-cairo), system-ui, sans-serif" }}
      >
        {count}%
      </div>

      <div
        className="mt-3 text-sm uppercase tracking-[0.5em] text-[#1A1A1A]/60 sm:text-xl"
        style={{ fontFamily: "Inter, system-ui, sans-serif" }}
      >
        FREESIA
      </div>
    </div>
  );
}
