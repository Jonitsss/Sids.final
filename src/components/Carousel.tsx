"use client";

import { useEffect, useRef, useState } from "react";
import { carouselSlides } from "@/data/content";

const INTERVAL = 5000;

export default function Carousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const rootRef = useRef<HTMLElement>(null);

  const goTo = (i: number) => {
    setIndex(((i % carouselSlides.length) + carouselSlides.length) % carouselSlides.length);
  };
  const next = () => goTo(index + 1);
  const prev = () => goTo(index - 1);

  // Reduced-motion check
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPaused(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setPaused(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Auto-rotate (handled in render-time effect)
  useEffect(() => {
    if (paused) return;
    const id = setInterval(next, INTERVAL);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, paused]);

  // Visibility change
  useEffect(() => {
    const onVis = () => {
      // state controlled in effect above by re-running when paused changes
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      dx < 0 ? next() : prev();
    }
  };

  const handleManual = (i: number) => {
    goTo(i);
  };

  return (
    <figure
      ref={rootRef}
      className="img-card img-card--carousel reveal-el"
      role="region"
      aria-roledescription="carrusel"
      aria-label="Liderazgo pastoral de SIDS"
      data-carousel
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => {
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
        if (!mq.matches) setPaused(false);
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="carousel-track">
        {carouselSlides.map((s, i) => (
          <div
            className={`carousel-slide${i === index ? " is-active" : ""}`}
            key={s.src}
            data-carousel-slide
            aria-hidden={i === index ? "false" : "true"}
          >
            <img src={s.src} alt={s.alt} loading={i === 0 ? "eager" : "lazy"} />
          </div>
        ))}
      </div>

      <div className="carousel-controls">
        <button
          type="button"
          className="carousel-btn carousel-btn--prev"
          aria-label="Imagen anterior"
          onClick={prev}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <button
          type="button"
          className="carousel-btn carousel-btn--next"
          aria-label="Imagen siguiente"
          onClick={next}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>

      <div className="carousel-dots" role="tablist" aria-label="Selector de imagen">
        {carouselSlides.map((s, i) => (
          <button
            type="button"
            className={`carousel-dot${i === index ? " is-active" : ""}`}
            key={s.src}
            role="tab"
            aria-selected={i === index ? "true" : "false"}
            aria-label={`Ir a imagen ${i + 1}: ${s.alt}`}
            onClick={() => handleManual(i)}
          />
        ))}
      </div>
    </figure>
  );
}
