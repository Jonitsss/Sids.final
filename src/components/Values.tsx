export default function Values() {
  const groups = [
    { label: "Grupo conexión Varones", bg: "var(--green-mid)" },
    { label: "Grupo conexión Mujeres", bg: "var(--bg-deep)" },
    { label: "Grupo conexión Matrimonios", bg: "var(--green)" },
    { label: "Grupo Conexión Adolescentes", bg: "var(--teal)" },
    { label: "Escuela de Ministerio", bg: "var(--green-mid)" },
    { label: "Adolescentes", bg: "var(--bg-deep)" },
    { label: "Pre-Adolescentes", bg: "var(--green)" },
  ];

  return (
    <section className="section section-dark" id="ministerios">
      <div className="container">
        <div className="groups-layout">
          <div className="groups-grid">
            {groups.map((g) => (
              <div
                className="group-card reveal-el"
                key={g.label}
                style={{ background: g.bg }}
              >
                <span className="label">{g.label}</span>
              </div>
            ))}
          </div>
          <div className="groups-cta reveal-el">
            <div className="eyebrow">SUMATE</div>
            <h2 className="section-headline">Nuestros ministerios</h2>
            <button className="btn btn-outline" type="button">
              — Más información <span className="arrow">→</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
