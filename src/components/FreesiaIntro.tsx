"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

type Props = {
  onFinished: () => void;
};

const PETALS = [
  { d: "M50 50 C26 42 24 12 50 4 C76 12 74 42 50 50Z", fill: "#8E1B20", angle: 0 },
  { d: "M50 50 C28 42 27 16 50 8 C73 16 72 42 50 50Z", fill: "#A5212A", angle: 72 },
  { d: "M50 50 C31 43 30 20 50 12 C70 20 69 43 50 50Z", fill: "#C1272D", angle: 144 },
  { d: "M50 50 C34 44 33 24 50 17 C67 24 66 44 50 50Z", fill: "#D33A3A", angle: 216 },
  { d: "M50 50 C37 45 36 29 50 23 C64 29 63 45 50 50Z", fill: "#E25555", angle: 288 },
];

export default function FreesiaIntro({ onFinished }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const flowerRef = useRef<SVGGElement>(null);
  const clipRef = useRef<SVGCircleElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const petalRefs = useRef<(SVGPathElement | null)[]>([]);
  const finishedRef = useRef(onFinished);
  const [count, setCount] = useState(0);

  useEffect(() => {
    finishedRef.current = onFinished;
  }, [onFinished]);

  useEffect(() => {
    const container = containerRef.current;
    const flower = flowerRef.current;
    const clip = clipRef.current;
    const bar = barRef.current;
    const petals = petalRefs.current.filter((p): p is SVGPathElement => p !== null);
    if (!container || !flower || !clip || !bar || petals.length !== PETALS.length) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finishedRef.current();
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const ctx = gsap.context(() => {
      petals.forEach((petal, i) => {
        gsap.set(petal, { svgOrigin: "50 50", scale: 0, rotation: PETALS[i].angle - 40 });
      });
      gsap.set(flower, { svgOrigin: "50 50", scale: 0.6, rotation: 0 });
      gsap.set(clip, { attr: { r: 6 } });
      gsap.set(bar, { width: "0%" });

      const state = { val: 0 };
      let opened = 0;
      let lastCount = 0;

      gsap.to(state, {
        val: 100,
        duration: 3.5,
        ease: "power4.inOut",
        onUpdate: () => {
          const v = state.val;
          const rounded = Math.round(v);
          if (rounded !== lastCount) {
            lastCount = rounded;
            setCount(rounded);
          }

          while (opened < petals.length && v >= (opened + 1) * 20 - 0.0001) {
            gsap.to(petals[opened], {
              scale: 1,
              rotation: PETALS[opened].angle,
              svgOrigin: "50 50",
              duration: 0.6,
              ease: "back.out(1.7)",
            });
            opened += 1;
          }

          const p = v / 100;
          gsap.set(flower, { scale: 0.6 + 0.6 * p, rotation: 25 * p });
          gsap.set(clip, { attr: { r: 6 + 44 * p } });
          gsap.set(bar, { width: `${v}%` });
        },
        onComplete: () => {
          setCount(100);
          const out = gsap.timeline({ onComplete: () => finishedRef.current() });
          out.fromTo(flower, { scale: 1.2 }, { scale: 1, duration: 0.5, ease: "power2.out" });
          out.to(container, { yPercent: -100, duration: 1.2, ease: "power4.inOut" }, 0.5);
        },
      });
    }, containerRef);

    return () => {
      ctx.revert();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      dir="ltr"
      role="status"
      aria-label="Loading Freesia"
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0D0D0D] px-4"
    >
      <svg viewBox="0 0 100 100" className="h-20 w-20 overflow-visible sm:h-52 sm:w-52" aria-hidden="true">
        <defs>
          <clipPath id="freesia-bloom-clip">
            <circle ref={clipRef} cx="50" cy="50" r="6" />
          </clipPath>
        </defs>
        <g ref={flowerRef}>
          <g clipPath="url(#freesia-bloom-clip)">
            {PETALS.map((petal, i) => (
              <path
                key={i}
                ref={(el) => {
                  petalRefs.current[i] = el;
                }}
                d={petal.d}
                fill={petal.fill}
              />
            ))}
          </g>
          <circle cx="50" cy="50" r="5" fill="#E8B04B" />
        </g>
      </svg>

      <div
        className="mt-6 text-[64px] font-bold leading-none tabular-nums text-white sm:mt-10 sm:text-[120px]"
        style={{ fontFamily: "Tajawal, var(--font-cairo), system-ui, sans-serif" }}
      >
        {count}%
      </div>

      <div
        className="mt-4 text-sm uppercase tracking-[0.5em] text-white opacity-40 sm:text-xl"
        style={{ fontFamily: "Inter, system-ui, sans-serif" }}
      >
        FREESIA
      </div>

      <div className="absolute inset-x-0 bottom-0 h-1 bg-white/5">
        <div ref={barRef} className="h-full w-0 bg-[#FF6B35]" />
      </div>
    </div>
  );
}
