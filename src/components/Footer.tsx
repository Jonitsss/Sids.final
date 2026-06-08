"use client";

import { useEffect, useState } from "react";

export default function Footer() {
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="site-footer">
      <div className="container">
        <a
          className="footer-email"
          href="https://www.instagram.com/sids_iglesia/"
          target="_blank"
          rel="noopener"
        >
          Sumate a nuestra comunidad <span className="arrow">→</span>
        </a>
        <div className="footer-grid">
          <div className="footer-col">
            <h4>Síguenos</h4>
            <a href="https://www.facebook.com/MinisterioSantaIglesia" target="_blank" rel="noopener">Facebook</a>
            <a href="https://www.youtube.com/@sids2025" target="_blank" rel="noopener">YouTube</a>
            <a href="https://www.instagram.com/sids_iglesia/" target="_blank" rel="noopener">Instagram</a>
          </div>
          <div className="footer-col">
            <h4>Reuniones</h4>
            <a href="#reuniones">Jueves · 20:00 hs</a>
            <a href="#reuniones">Sábado · 18:00 hs</a>
            <a href="#reuniones">Domingo · 18:00 hs</a>
          </div>
          <div className="footer-col">
            <h4>Dirección</h4>
            <p className="footer-address">Calle 21 y 7 Bº el Parque, Ing. Allan</p>
          </div>
        </div>
        <div className="footer-meta">
          <span>&copy; {year ?? ""} Santa Iglesia del Señor</span>
        </div>
      </div>
    </footer>
  );
}
