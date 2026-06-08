import Carousel from "./Carousel";

export default function About() {
  return (
    <>
      <section className="section section-dark" id="about">
        <div className="container two-col reverse">
          <div className="col reveal-el">
            <div className="eyebrow">01 — Quiénes Somos</div>
            <h2 className="section-headline">
              Una iglesia<br />
              comprometida<br />
              con el <em>Evangelio</em>
            </h2>
            <p className="body-text">
              Santa Iglesia del Señor es una iglesia cristiana evangélica
              comprometida con la predicación del Evangelio de Jesucristo,
              la enseñanza de la Palabra de Dios y el acompañamiento espiritual
              de las familias y la comunidad.
            </p>
            <p className="body-text">
              Nuestra congregación es guiada por los Obispos
              <strong> Dr. Edgardo Norberto Montenegro</strong> y
              <strong> Dra. Magdalena Ciulla de Montenegro</strong>,
              quienes desarrollan su ministerio con dedicación, amor y servicio.
            </p>
          </div>
          <Carousel />
        </div>
      </section>

      <section className="section section-light section-statement">
        <div className="container statement">
          <p className="statement-text">
            <span className="hl">Estar donde debo estar</span>
            nos ahorrará <em>dolores de cabeza.</em>
          </p>
          <p className="statement-cite">— Santa Iglesia del Señor</p>
        </div>
      </section>

      <section className="section section-dark">
        <div className="container two-col">
          <figure className="img-card reveal-el">
            <img src="/assets/img/feature-church.png" alt="Cultos en SIDS" loading="lazy" />
          </figure>
          <div className="col reveal-el">
            <div className="eyebrow">02 — Nuestra Iglesia</div>
            <h2 className="section-headline">
              Espacios para la<br />
              adoración y el<br />
              <em>crecimiento</em> espiritual
            </h2>
            <p className="body-text">
              En SIDS contamos con espacios especialmente preparados para
              la adoración, la enseñanza bíblica, la comunión y el crecimiento
              espiritual de toda la familia.
            </p>
            <p className="body-text">
              Te invitamos a ser parte de nuestras reuniones.
              <strong> ¡Las puertas están abiertas!</strong>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
