export const siteConfig = {
  name: "Santa Iglesia del Señor",
  shortName: "SIDS",
  tagline: "Árbol de Vida",
  description:
    "Santa Iglesia del Señor (SIDS) · Árbol de Vida. Iglesia cristiana evangélica en Ingeniero Allan. Jueves 20 hs, Sábado 18 hs, Domingo 18 hs. ¡Las puertas están abiertas!",
  url: "https://santaiglesia.com.ar",
  founded: 1974,
  address: {
    street: "Calle 21 y 7",
    locality: "Ingeniero Allan",
    region: "Buenos Aires",
    country: "AR",
    neighborhood: "Barrio el Parque",
  },
  social: {
    facebook: "https://www.facebook.com/MinisterioSantaIglesia",
    youtube: "https://www.youtube.com/@sids2025",
    instagram: "https://www.instagram.com/sids_iglesia/",
  },
};

export const navLinks = [
  { href: "#about", label: "Quiénes Somos" },
  { href: "#valores", label: "Valores" },
  { href: "#reuniones", label: "Reuniones" },
  { href: "#ubicacion", label: "Ubicación" },
];

export const marqueeLightItems = [
  "Santa Iglesia del Señor",
  "Fe",
  "Esperanza",
  "Amor",
  "Árbol de Vida",
];

export const marqueeDarkItems = [
  "LAS PUERTAS ESTÁN ABIERTAS",
  "TE ESPERAMOS",
  "SUMATE A LA COMUNIDAD",
];

export const carouselSlides = [
  {
    src: "/assets/img/obispo.jpg",
    alt: "Obispo Dr. Edgardo Norberto Montenegro",
  },
  {
    src: "/assets/img/dra.jpg",
    alt: "Dra. Magdalena Ciulla de Montenegro",
  },
];

export const stats = [
  { count: 1974, suffix: "", label: "Año de fundación" },
  { count: 100, suffix: "%", label: "Compromiso con la Palabra" },
  { count: 3, suffix: "+", label: "Reuniones semanales" },
  { count: 100, suffix: "+", label: "Familias acompañadas" },
  { count: 1, suffix: "", label: "Misión: Cristo" },
];

export const schedule = [
  { day: "Jueves", time: "20:00 hs", desc: "Reunión General" },
  { day: "Sábado", time: "18:00 hs", desc: "Reunión de Jóvenes" },
  { day: "Domingo", time: "18:00 hs", desc: "Reunión General" },
];

export const meetingTags = [
  "Alabanza",
  "Adoración",
  "Comunión",
  "Enseñanza",
  "Oración",
];

export const heroLines = [
  {
    text: "SANTA",
    images: [
      { src: "/assets/img/feature-church.png", alt: "", modifier: "" },
      { src: "/assets/img/hero-02.jpg", alt: "", modifier: "" },
    ],
  },
  {
    text: "IGLESIA",
    images: [
      { src: "/assets/img/Musicosection.jpg", alt: "", modifier: "" },
      { src: "/assets/img/foto1.jpg", alt: "", modifier: "hero-img-bottom" },
    ],
  },
  {
    text: "DEL",
    images: [
      { src: "/assets/img/hero-05.jpg", alt: "", modifier: "hero-img-top-9" },
      { src: "/assets/img/hero-06.jpg", alt: "", modifier: "hero-img-top-soft" },
    ],
  },
  {
    text: "SEÑOR",
    images: [
      { src: "/assets/img/feature-domingo.png", alt: "", modifier: "hero-img-top" },
      { src: "/assets/img/feature-domingo.png", alt: "", modifier: "hero-img-bottom" },
    ],
  },
];
