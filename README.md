# Santa Iglesia del Señor · SIDS (Next.js)

Sitio web oficial de la **Santa Iglesia del Señor** (SIDS) — migrado de Astro 5 a Next.js 15.

🌐 **Sitio**: [sidsiglesia.com.ar](https://sidsiglesia.com.ar)
📍 **Dirección**: Calle 21 y 7, Barrio el Parque, Ingeniero Allan
⛪ **Fundada**: 1974

## Stack técnico

- **[Next.js 15](https://nextjs.org/)** — App Router + Server Components
- **React 19** — client components para Loader, Nav, Carousel, Stats
- **CSS vanilla** — copiado tal cual del proyecto original (1:1 con el diseño)
- **TypeScript** — strict mode
- **[next-sitemap](https://github.com/iamvishnusankar/next-sitemap)** — sitemap + robots en postbuild
- **Despliegue**: Vercel

## Estructura

```
.
├── public/
│   ├── assets/                  # logo + imágenes (logo.png, img/*.jpg|png)
│   ├── robots.txt               # generado por next-sitemap
│   ├── sitemap.xml              # generado por next-sitemap
│   └── sitemap-0.xml            # generado por next-sitemap
├── src/
│   ├── app/
│   │   ├── layout.tsx           # html, fonts, scroll restoration, metadata
│   │   └── page.tsx             # composición de secciones + JSON-LD
│   ├── components/              # Hero, Nav, Marquee, About, Values,
│   │                            # Stats, Meetings, Location, Footer,
│   │                            # Carousel, Loader, RevealOnScroll, SmoothScroll
│   ├── data/
│   │   └── content.ts           # stats, schedule, navLinks, heroLines, etc.
│   ├── lib/
│   │   └── seo.ts               # JSON-LD Church schema
│   └── styles/
│       └── global.css           # ~700 líneas, paleta en CSS custom properties
├── next.config.mjs
├── next-sitemap.config.js
├── tsconfig.json
└── package.json
```

## Comandos

```bash
npm install          # Instalar dependencias
npm run dev          # Servidor de desarrollo → http://localhost:3000
npm run build        # Build de producción (genera .next/)
npm start            # Servidor de producción
npm run lint         # ESLint
```

`npm run build` ejecuta automáticamente `next-sitemap` (vía `postbuild`) para generar `robots.txt` y `sitemap.xml` en `public/`.

## Despliegue en Vercel

1. Conectá el repo en [vercel.com/new](https://vercel.com/new)
2. Vercel detecta Next.js automáticamente:
   - **Build Command**: `npm run build` (incluye postbuild → sitemap)
   - **Output Directory**: `.next`
3. (Opcional) Configurá el dominio personalizado `sidsiglesia.com.ar` en *Settings → Domains*

## SEO incluido

- ✅ Meta description, keywords, authors
- ✅ Open Graph (Facebook, LinkedIn, WhatsApp)
- ✅ Twitter Card con imagen grande
- ✅ Canonical URL
- ✅ JSON-LD `Church` (horarios, dirección, redes)
- ✅ Sitemap XML (`/sitemap.xml` + `/sitemap-0.xml`)
- ✅ `robots.txt` apuntando al sitemap
- ✅ `lang="es"` y geo-tags (`geo.region`, `geo.placename`)
- ✅ `theme-color` y viewport
- ✅ Imágenes con `alt` y `loading="lazy"`
- ✅ Preconnect a Google Fonts

## Client Components (`'use client'`)

| Componente | Responsabilidad |
|---|---|
| `Loader.tsx` | Animación de carga 0→100% + toggle de `body.loading` |
| `Nav.tsx` | Scroll state (`.scrolled`) + menú móvil hamburguesa |
| `Carousel.tsx` | Auto-rotación, controles prev/next, dots, swipe, pausa hover/visibility |
| `Stats.tsx` | Contadores animados al entrar en viewport con `IntersectionObserver` |
| `RevealOnScroll.tsx` | Activa `.reveal` en todos los `.reveal-el` al entrar en viewport |
| `SmoothScroll.tsx` | Smooth scroll para anchor links |
| `Footer.tsx` | Año dinámico (`useState` + `useEffect`) |

## Server Components (por defecto)

`Hero`, `Marquee`, `About`, `Values`, `Meetings`, `Location` — puros presentacionales, sin estado, sin hooks.

## Decisiones de migración

- **CSS global mantenido tal cual**: las custom properties (`--bg-dark`, `--accent`, etc.) y todas las clases se reutilizan idénticas. Cero refactor de estilos.
- **Imágenes con `<img>` + `loading="lazy"`**: igual que el original. Si en el futuro se quiere `next/image`, los paths son relativos a `/public/assets/`.
- **Fonts con `<link>` a Google Fonts**: mantiene la firma exacta del original (Inter, Playfair Display, Space Mono) sin hashing de `next/font`.
- **JSON-LD inline en `page.tsx`**: `dangerouslySetInnerHTML` con `JSON.stringify` del schema generado en `lib/seo.ts`.
- **Assets en `/public/assets/`**: rutas idénticas al proyecto Astro, no se cambió ninguna URL.

## Licencia

© Santa Iglesia del Señor. Todos los derechos reservados.
