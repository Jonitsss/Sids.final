export default function Location() {
  return (
    <section className="section section-light section-center" id="ubicacion">
      <div className="container">
        <div className="eyebrow reveal-el">06 — Nuestra Ubicación</div>
        <h2 className="section-headline reveal-el">
          Calle 21 y 7 ·<br />
          <em>Barrio el Parque</em><br />
          Ingeniero Allan
        </h2>
        <div className="map-frame reveal-el">
          <iframe
            title="Mapa Santa Iglesia del Señor"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src="https://www.google.com/maps?q=Ingeniero+Allan+Buenos+Aires&output=embed"
          />
        </div>
        <a
          className="btn btn-outline"
          href="https://www.google.com/maps/search/?api=1&query=Calle+21+y+7+Barrio+el+Parque+Ingeniero+Allan"
          target="_blank"
          rel="noopener"
        >
          Ver en Google Maps <span className="arrow">→</span>
        </a>
      </div>
    </section>
  );
}
