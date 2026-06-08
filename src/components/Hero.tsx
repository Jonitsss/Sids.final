import { heroLines } from "@/data/content";

export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-content">
        {heroLines.map((line) => (
          <div className="hero-line" key={line.text}>
            <span className="hero-text">{line.text}</span>
            <div className="hero-imgs">
              {line.images.map((img, i) => (
                <div className={`hero-img ${img.modifier}`.trim()} key={i}>
                  <img src={img.src} alt={img.alt} loading="lazy" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="hero-foot">
        <span>Jueves 20:00 hs · Sábado 18:00 hs · Domingo 18:00 hs</span>
        <span className="hero-scroll">↓ Scroll</span>
      </div>
    </section>
  );
}
