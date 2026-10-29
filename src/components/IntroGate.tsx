"use client";

import { useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";

// Solid cover with the same background as the intro. It is shown while the
// intro's JS chunk is still downloading, so the homepage never flashes
// between the server-rendered cover and the intro mounting.
function IntroCover() {
  return <div className="freesia-intro-cover fixed inset-0 z-[9999] bg-[#f4d2ca]" />;
}

const FreesiaIntro = dynamic(() => import("./FreesiaIntro"), { ssr: false, loading: IntroCover });
const FreesiaIntro2 = dynamic(() => import("./FreesiaIntro2"), { ssr: false, loading: IntroCover });
const FreesiaIntro3 = dynamic(() => import("./FreesiaIntro3"), { ssr: false, loading: IntroCover });

const STORAGE_KEY = "freesia_intro_seen";

const subscribe = () => () => {};
const readSeen = () => window.sessionStorage.getItem(STORAGE_KEY) === "1";
const readSeenOnServer = () => null;

export default function IntroGate({ variant = 1 }: { variant?: 1 | 2 | 3 }) {
  const seen = useSyncExternalStore<boolean | null>(subscribe, readSeen, readSeenOnServer);
  const [showIntro, setShowIntro] = useState(true);

  if (seen === null) {
    return (
      <>
        <IntroCover />
        <noscript>
          <style>{`.freesia-intro-cover{display:none}`}</style>
        </noscript>
      </>
    );
  }

  if (seen || !showIntro) return null;

  const Intro = variant === 3 ? FreesiaIntro3 : variant === 2 ? FreesiaIntro2 : FreesiaIntro;

  return (
    <Intro
      onFinished={() => {
        window.sessionStorage.setItem(STORAGE_KEY, "1");
        setShowIntro(false);
      }}
    />
  );
}
