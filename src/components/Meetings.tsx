import { schedule, meetingTags } from "@/data/content";

export default function Meetings() {
  return (
    <>
      <section className="section section-dark" id="reuniones">
        <div className="container two-col">
          <figure className="img-card reveal-el">
            <img src="/assets/img/feature-domingo.png" alt="Reunión dominical en SIDS" loading="lazy" />
          </figure>
          <div className="col reveal-el">
            <div className="eyebrow">05 — Nuestras Reuniones</div>
            <h2 className="section-headline">
              Te esperamos<br />con las puertas <em>abiertas</em>
            </h2>
            <p className="body-text">
              Tres encuentros semanales para adorar, aprender, orar y crecer
              en familia.
            </p>
            <ul className="schedule-list">
              {schedule.map((s) => (
                <li className="schedule-item" key={s.day}>
                  <span className="schedule-day">{s.day}</span>
                  <span className="schedule-time">{s.time}</span>
                  <span className="schedule-desc">{s.desc}</span>
                </li>
              ))}
            </ul>
            <div className="tag-group">
              {meetingTags.map((t) => (
                <span className="tag" key={t}>{t}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section section-black">
        <div className="container quote-wrap">
          <p className="quote-pre">Salmos 34:19</p>
          <blockquote className="quote">
            <span className="line-1">MUCHAS</span>
            <span className="line-2"><span className="hl">SON LAS</span></span>
            <span className="line-3">AFLICCIONES DEL JUSTO</span>
            <span className="line-4">PERO DE TODAS ELLAS LO LIBRARÁ EL SEÑOR.</span>
          </blockquote>
        </div>
      </section>
    </>
  );
}
