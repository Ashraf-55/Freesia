"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import localFont from "next/font/local";
import gsap from "gsap";

type Props = {
  onFinished: () => void;
};

const playfair = localFont({
  src: "../fonts/PlayfairDisplay-Bold.woff2",
  weight: "700",
  display: "swap",
});

const LETTERS = ["F", "R", "E", "E", "S", "I", "A"];
const STEP = 13;
const SPAN = 22;
const TILE = 40;

const u = (n: number) => `calc(${n} * var(--u))`;

function bloom(cx: number, cy: number, ring: number, petal: number, inner: string, outer: string) {
  const layers: string[] = [];
  for (let k = 0; k < 5; k += 1) {
    const a = (-90 + k * 72) * (Math.PI / 180);
    const x = cx + ring * Math.cos(a);
    const y = cy + ring * Math.sin(a);
    layers.push(
      `radial-gradient(circle at ${u(x)} ${u(y)}, ${inner} 0, ${outer} ${u(petal * 0.72)}, transparent ${u(petal)})`
    );
  }
  layers.push(`radial-gradient(circle at ${u(cx)} ${u(cy)}, #FFD166 0, #E0A526 ${u(2)}, transparent ${u(2.6)})`);
  return layers;
}

function leaf(cx: number, cy: number, rx: number, ry: number) {
  return `radial-gradient(ellipse ${u(rx)} ${u(ry)} at ${u(cx)} ${u(cy)}, #7FB27A 0, #3F7C4B 70%, transparent 100%)`;
}

function dot(cx: number, cy: number) {
  return `radial-gradient(circle at ${u(cx)} ${u(cy)}, #FFFFFF 0, #FFFFFF ${u(1.3)}, transparent ${u(1.9)})`;
}

const FLOWER_PATTERN = [
  ...bloom(10, 10, 5.2, 4.6, "#FF9DB0", "#D42B4D"),
  ...bloom(30, 30, 5.2, 4.6, "#FF8AA0", "#C41F42"),
  ...bloom(30, 10, 3.6, 3.2, "#FFFFFF", "#F0DCC6"),
  ...bloom(10, 30, 3.6, 3.2, "#FFFFFF", "#F0DCC6"),
  leaf(20, 20, 4.5, 2),
  dot(20, 0),
  dot(0, 20),
  dot(40, 20),
  dot(20, 40),
  "linear-gradient(135deg, #5A0F23, #3A0A17)",
].join(", ");

const fillStyle: CSSProperties = {
  backgroundImage: FLOWER_PATTERN,
  backgroundSize: `${u(TILE)} ${u(TILE)}`,
  backgroundPosition: "0px 0px",
  backgroundRepeat: "repeat",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
  WebkitTextFillColor: "transparent",
  clipPath: "inset(0% 100% 0% 0%)",
};

const outlineStyle: CSSProperties = {
  color: "transparent",
  WebkitTextFillColor: "transparent",
  WebkitTextStroke: "1px #d96b56",
};

const HOLD_AT = 92;
const MAX_WAIT_MS = 10000;

function settle(target: EventTarget, events: string[]) {
  return new Promise<void>((resolve) => {
    const done = () => resolve();
    events.forEach((name) => target.addEventListener(name, done, { once: true }));
  });
}

function waitForPageReady(maxMs: number): Promise<void> {
  const loaded: Promise<void> =
    document.readyState === "complete" ? Promise.resolve() : settle(window, ["load"]);
  const fonts: Promise<void> = document.fonts ? document.fonts.ready.then(() => undefined) : Promise.resolve();
  const videos = Array.from(document.querySelectorAll("video")).map((v) =>
    v.readyState >= 3 ? Promise.resolve() : settle(v, ["canplay", "canplaythrough", "error"])
  );
  const images = Array.from(document.images)
    .filter((img) => {
      const r = img.getBoundingClientRect();
      return r.bottom > 0 && r.top < window.innerHeight * 1.2;
    })
    .map((img) =>
      img.complete ? (img.decode ? img.decode().catch(() => undefined) : Promise.resolve()) : settle(img, ["load", "error"])
    );
  const timeout = new Promise<void>((resolve) => window.setTimeout(resolve, maxMs));
  return Promise.race([Promise.all([loaded, fonts, ...videos, ...images]).then(() => undefined), timeout]);
}

const STAR_COLORS = ["255,255,255", "243,168,154", "232,128,108", "201,161,90"];

function StarField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    type Star = { x: number; y: number; r: number; a: number; sp: number; ph: number; v: number; fill: string; spark: boolean };
    let stars: Star[] = [];
    let w = 0;
    let h = 0;
    let raf = 0;
    let last = performance.now();
    let shoot: { x: number; y: number; vx: number; vy: number; life: number } | null = null;
    let nextShoot = last + 2500;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(130, Math.max(45, (w * h) / 13000)));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.5 + Math.random() * 1.1,
        a: 0.3 + Math.random() * 0.6,
        sp: 0.6 + Math.random() * 1.8,
        ph: Math.random() * Math.PI * 2,
        v: 3 + Math.random() * 7,
        fill: `rgb(${STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)]})`,
        spark: Math.random() < 0.12,
      }));
    };

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, w, h);

      for (const s of stars) {
        s.y -= s.v * dt;
        if (s.y < -4) {
          s.y = h + 4;
          s.x = Math.random() * w;
        }
        const tw = 0.5 + 0.5 * Math.sin((now / 1000) * s.sp + s.ph);
        ctx.globalAlpha = s.a * (0.3 + 0.7 * tw);
        ctx.fillStyle = s.fill;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        if (s.spark && tw > 0.55) {
          const L = s.r * 5 * tw;
          ctx.fillRect(s.x - L, s.y - 0.3, L * 2, 0.6);
          ctx.fillRect(s.x - 0.3, s.y - L, 0.6, L * 2);
        }
      }

      if (!shoot && now > nextShoot) {
        shoot = { x: w * (0.55 + Math.random() * 0.4), y: h * Math.random() * 0.35, vx: -420, vy: 230, life: 1 };
        nextShoot = now + 5000 + Math.random() * 3500;
      }
      if (shoot) {
        shoot.x += shoot.vx * dt;
        shoot.y += shoot.vy * dt;
        shoot.life -= dt * 1.1;
        if (shoot.life <= 0) {
          shoot = null;
        } else {
          const g = ctx.createLinearGradient(shoot.x, shoot.y, shoot.x - shoot.vx * 0.18, shoot.y - shoot.vy * 0.18);
          g.addColorStop(0, "rgba(232,128,108,0.9)");
          g.addColorStop(1, "rgba(232,128,108,0)");
          ctx.globalAlpha = Math.max(0, shoot.life);
          ctx.strokeStyle = g;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(shoot.x, shoot.y);
          ctx.lineTo(shoot.x - shoot.vx * 0.18, shoot.y - shoot.vy * 0.18);
          ctx.stroke();
        }
      }

      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    };

    resize();
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />;
}

const BACKDROP_CSS = `
@keyframes fi3-drift-a{0%{transform:translate3d(-12%,-8%,0) scale(1)}100%{transform:translate3d(10%,12%,0) scale(1.18)}}
@keyframes fi3-drift-b{0%{transform:translate3d(14%,10%,0) scale(1.1)}100%{transform:translate3d(-10%,-12%,0) scale(0.92)}}
@keyframes fi3-drift-c{0%{transform:translate3d(-6%,14%,0) scale(0.95)}100%{transform:translate3d(8%,-10%,0) scale(1.15)}}
@keyframes fi3-glow{0%,100%{opacity:.55}50%{opacity:1}}
.fi3-blob{position:absolute;border-radius:9999px;will-change:transform;animation-timing-function:ease-in-out;animation-iteration-count:infinite;animation-direction:alternate}
.fi3-a{width:70vmax;height:70vmax;left:-20vmax;top:-25vmax;background:radial-gradient(circle,rgba(243,168,154,.55) 0%,rgba(243,168,154,0) 62%);animation-name:fi3-drift-a;animation-duration:19s}
.fi3-b{width:65vmax;height:65vmax;right:-22vmax;bottom:-24vmax;background:radial-gradient(circle,rgba(255,250,247,.75) 0%,rgba(255,250,247,0) 62%);animation-name:fi3-drift-b;animation-duration:23s}
.fi3-c{width:55vmax;height:55vmax;left:25vw;top:30vh;background:radial-gradient(circle,rgba(232,128,108,.22) 0%,rgba(232,128,108,0) 62%);animation-name:fi3-drift-c;animation-duration:27s}
.fi3-glow{position:absolute;left:50%;top:50%;width:70vmin;height:42vmin;transform:translate(-50%,-50%);background:radial-gradient(ellipse at center,rgba(255,255,255,.55) 0%,rgba(255,255,255,0) 70%);animation:fi3-glow 6s ease-in-out infinite;will-change:opacity}
@media (prefers-reduced-motion:reduce){.fi3-blob,.fi3-glow{animation:none}}
`;

export default function FreesiaIntro3({ onFinished }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const fillRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const outlineRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const finishedRef = useRef(onFinished);
  const [count, setCount] = useState(0);

  useEffect(() => {
    finishedRef.current = onFinished;
  }, [onFinished]);

  useEffect(() => {
    const container = containerRef.current;
    const word = wordRef.current;
    const bar = barRef.current;
    const fills = fillRefs.current.filter((el): el is HTMLSpanElement => el !== null);
    const outlines = outlineRefs.current.filter((el): el is HTMLSpanElement => el !== null);
    if (!container || !word || !bar || fills.length !== LETTERS.length || outlines.length !== LETTERS.length) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finishedRef.current();
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    let cancelled = false;
    let lastCount = -1;
    let lastDrift = Number.NaN;
    const lastProgress = new Array<number>(LETTERS.length).fill(-1);
    const state = { val: 0 };

    const render = () => {
      const v = state.val;
      const rounded = Math.round(v);
      if (rounded !== lastCount) {
        lastCount = rounded;
        setCount(rounded);
      }
      bar.style.transform = `scaleX(${(v / 100).toFixed(4)})`;

      const drift = Math.round(-10 + 20 * (v / 100));
      const driftChanged = drift !== lastDrift;
      lastDrift = drift;

      fills.forEach((el, i) => {
        if (driftChanged) el.style.backgroundPosition = `${drift}px 0px`;
        const p = gsap.utils.clamp(0, 1, (v - i * STEP) / SPAN);
        if (p === lastProgress[i]) return;
        lastProgress[i] = p;
        el.style.clipPath = `inset(0% ${((1 - p) * 100).toFixed(2)}% 0% 0%)`;
      });
    };

    const ctx = gsap.context(() => {
      gsap.set(word, { transformOrigin: "50% 50%" });
      gsap.fromTo(
        outlines,
        { y: 18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, ease: "power3.out", stagger: 0.07 }
      );

      const finish = () => {
        setCount(100);
        fills.forEach((el) => {
          el.style.clipPath = "inset(0% 0% 0% 0%)";
        });
        const out = gsap.timeline({ delay: 0.25, onComplete: () => finishedRef.current() });
        out.to(word, { scale: 1.1, duration: 0.6, ease: "power2.out" });
        out.to(container, { yPercent: -100, duration: 1.1, ease: "power4.inOut" }, "+=0.15");
      };

      const reachedHold = new Promise<void>((resolve) => {
        gsap.to(state, { val: HOLD_AT, duration: 3.4, ease: "power4.inOut", onUpdate: render, onComplete: resolve });
      });

      Promise.all([reachedHold, waitForPageReady(MAX_WAIT_MS)]).then(() => {
        if (cancelled) return;
        ctx.add(() => {
          gsap.to(state, { val: 100, duration: 0.9, ease: "power2.inOut", onUpdate: render, onComplete: finish });
        });
      });
    }, containerRef);

    return () => {
      cancelled = true;
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
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-[#f4d2ca] px-2"
    >
      <style>{BACKDROP_CSS}</style>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="fi3-blob fi3-a" />
        <div className="fi3-blob fi3-b" />
        <div className="fi3-blob fi3-c" />
        <div className="fi3-glow" />
      </div>
      <StarField />

      <div
        className="relative mb-4 text-xs tabular-nums tracking-[0.4em] text-[#4a413f]/70 sm:mb-6 sm:text-base"
        style={{ fontFamily: "Inter, system-ui, sans-serif" }}
      >
        {count}%
      </div>

      <div
        ref={wordRef}
        className={`${playfair.className} relative flex select-none items-center justify-center whitespace-nowrap text-[48px] leading-none tracking-[0.04em] [--u:0.4px] sm:text-[96px] sm:[--u:0.7px] lg:text-[140px] lg:[--u:1px]`}
      >
        {LETTERS.map((letter, i) => (
          <span key={i} className="relative inline-block">
            <span
              ref={(el) => {
                fillRefs.current[i] = el;
              }}
              aria-hidden="true"
              className="absolute inset-0"
              style={fillStyle}
            >
              {letter}
            </span>
            <span
              ref={(el) => {
                outlineRefs.current[i] = el;
              }}
              className="relative inline-block"
              style={outlineStyle}
            >
              {letter}
            </span>
          </span>
        ))}
      </div>

      <div className="absolute inset-x-0 bottom-0 h-1 bg-[#d96b56]/10">
        <div ref={barRef} className="h-full w-full origin-left bg-[#e8806c]" style={{ transform: "scaleX(0)" }} />
      </div>
    </div>
  );
}
