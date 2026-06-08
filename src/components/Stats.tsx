"use client";

import { useEffect, useRef, useState } from "react";
import { stats } from "@/data/content";

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

function useCountUp(target: number, suffix: string, duration = 1400) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const animated = useRef(false);

  useEffect(() => {
    if (animated.current) return;
    const el = ref.current;
    if (!el) return;

    if (!("IntersectionObserver" in window)) {
      setValue(target);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !animated.current) {
            animated.current = true;
            const start = performance.now();
            const step = (now: number) => {
              const t = Math.min(1, (now - start) / duration);
              const v = Math.floor(easeOut(t) * target);
              setValue(v);
              if (t < 1) requestAnimationFrame(step);
              else setValue(target);
            };
            requestAnimationFrame(step);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.45 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [target, duration]);

  return { ref, value: `${value}${suffix}` };
}

function StatCard({ count, suffix, label }: { count: number; suffix: string; label: string }) {
  const { ref, value } = useCountUp(count, suffix);
  return (
    <div className="stat-card reveal-el">
      <div className="stat-value" ref={ref} suppressHydrationWarning>
        {value}
      </div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export default function Stats() {
  return (
    <section className="section section-dark">
      <div className="container">
        <div className="eyebrow reveal-el">04 — Nuestra Historia</div>
        <h2 className="section-headline reveal-el" style={{ marginBottom: 48 }}>
          Una comunidad que <em>crece</em>
        </h2>
        <div className="stats-grid">
          {stats.map((s, i) => (
            <StatCard key={i} count={s.count} suffix={s.suffix} label={s.label} />
          ))}
        </div>
      </div>
    </section>
  );
}
