export default function Values() {
  const values = [
    { num: "01", label: "Fe", meta: "Creer en la Palabra" },
    { num: "02", label: "Esperanza", meta: "Confiar en el Señor" },
    { num: "03", label: "Amor", meta: "Servir a la comunidad" },
  ];

  return (
    <>
      <section className="section section-dark" id="valores">
        <div className="container">
          <div className="eyebrow reveal-el">03 — Nuestros Valores</div>
          <h2 className="section-headline reveal-el">Fe · Esperanza · Amor</h2>
          <div className="portfolio-grid">
            {values.map((v) => (
              <div className="portfolio-card reveal-el" key={v.num}>
                <span className="num">{v.num}</span>
                <span className="label">{v.label}</span>
                <span className="meta">{v.meta}</span>
                <span className="arrow">→</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-light">
        <div className="container venn-wrap">
          <div className="venn-diagram" aria-hidden="true">
            <div className="venn-circle">
              <span className="venn-title">Fe</span>
              <span className="venn-sub">Creer</span>
            </div>
            <div className="venn-circle">
              <span className="venn-title">Esperanza</span>
              <span className="venn-sub">Confiar</span>
            </div>
            <div className="venn-circle">
              <span className="venn-title">Amor</span>
              <span className="venn-sub">Servir</span>
            </div>
          </div>
          <div className="venn-copy reveal-el">
            <div className="eyebrow">Nuestro Fundamento</div>
            <h2 className="section-headline">Fe · Esperanza · Amor</h2>
            <p className="body-text">
              Tres pilares que guían nuestra misión y visión como iglesia.
              Cada uno se entrelaza con los otros para formar una vida en Cristo.
            </p>
            <a className="btn" href="https://www.instagram.com/sids_iglesia/" target="_blank" rel="noopener">
              Conocé más <span className="arrow">→</span>
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
