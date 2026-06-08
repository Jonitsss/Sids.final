"use client";

import { useEffect, useState } from "react";

export default function Loader() {
  const [count, setCount] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const page = document.getElementById("page");
    const body = document.body;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      setHidden(true);
      body.classList.remove("loading");
      page?.classList.add("visible");
      return;
    }

    let current = 0;
    const target = 100;
    const interval = setInterval(() => {
      current += Math.floor(Math.random() * 7) + 3;
      if (current >= target) current = target;
      setCount(current);
      if (current >= target) {
        clearInterval(interval);
        setTimeout(() => {
          setHidden(true);
          body.classList.remove("loading");
          page?.classList.add("visible");
        }, 350);
      }
    }, 90);

    return () => clearInterval(interval);
  }, [mounted]);

  return (
    <div className={`loader${hidden ? " hidden" : ""}`} id="loader" aria-hidden="true">
      <div className="loader-mark">
        <img src="/assets/logo.png" alt="" />
      </div>
      <div className="loader-pct" id="loaderPct" suppressHydrationWarning>
        {count}
        <span className="cursor">_</span>
      </div>
      <div className="loader-bar"></div>
      <p className="loader-tag">SANTA IGLESIA DEL SEÑOR</p>
    </div>
  );
}
