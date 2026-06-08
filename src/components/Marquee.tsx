interface MarqueeItem {
  text: string;
}

interface MarqueeProps {
  variant: "light" | "dark";
  items: string[];
}

export default function Marquee({ variant, items }: MarqueeProps) {
  const sectionClass = variant === "light" ? "marquee-light" : "marquee-dark";
  const itemClass = variant === "light" ? "marquee-serif" : "marquee-display";

  const looped: { text: string; hidden: boolean }[] = [
    ...items.map((text) => ({ text, hidden: false })),
    ...items.map((text) => ({ text, hidden: true })),
  ];

  return (
    <div className={`marquee-section ${sectionClass}`}>
      <div className="marquee-track">
        {looped.map((item, i) => (
          <span className="marquee-item" key={i} aria-hidden={item.hidden ? "true" : undefined}>
            <span className={itemClass}>{item.text}</span>
            <span className="marquee-dot">◆</span>
          </span>
        ))}
      </div>
    </div>
  );
}
