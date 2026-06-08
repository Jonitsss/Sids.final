# Santa Iglesia del Señor · SIDS

Sitio web + sistema de gestión ministerial de la **Santa Iglesia del Señor** (SIDS).

🌐 **Sitio**: [sidsiglesia.com.ar](https://sidsiglesia.com.ar)
📍 **Dirección**: Calle 21 y 7, Barrio el Parque, Ingeniero Allan
⛪ **Fundada**: 1974

## Rutas

| Ruta | Tipo | Descripción |
|---|---|---|
| `/` | Pública | Landing page (estilo editorial, vanilla CSS) |
| `/login` | Auth | Inicio de sesión (Firebase Auth) |
| `/register` | Auth | Registro de usuarios |
| `/dashboard` | Protegida | Panel principal según rol |
| `/ministerios` | Protegida | CRUD de ministerios (con detalle `/ministerios/[slug]`) |
| `/eventos` | Protegida | Calendario de eventos (con detalle `/eventos/[id]`) |
| `/cronogramas` | Protegida | Grillas de servicio (con detalle `/cronogramas/[id]`) |
| `/tareas` | Protegida | Gestión de tareas |
| `/asistencia` | Protegida | Registro de asistencia (solo pastor) |
| `/notificaciones` | Protegida | Bandeja de notificaciones |
| `/perfil` | Protegida | Perfil de usuario editable |
| `/reportes` | Protegida | Reportes ministeriales |
| `/usuarios` | Protegida | CRUD de usuarios (solo pastor) |

## Stack técnico

- **[Next.js 15](https://nextjs.org/)** — App Router + Server Components + Route Groups
- **React 19** — client components para interactividad
- **CSS dual**:
  - `src/styles/landing.css` — vanilla CSS para `/` (1:1 con el diseño Astro original)
  - `src/app/globals.css` — Tailwind v4 + shadcn tokens para `/login`, `/register`, `/dashboard/*`
- **TypeScript** — strict mode
- **Firebase** — Auth + Firestore + Storage
- **framer-motion** — animaciones dashboard
- **shadcn/ui** — componentes accesibles (Radix primitives)
- **[next-sitemap](https://github.com/iamvishnusankar/next-sitemap)** — sitemap + robots en postbuild
- **Despliegue**: Vercel

## Estructura

```
sids-next/
├── public/
│   ├── assets/                  # logo + imágenes (logo.png, img/*.jpg|png)
│   ├── robots.txt               # generado por next-sitemap
│   ├── sitemap.xml              # generado por next-sitemap
│   └── sitemap-0.xml            # generado por next-sitemap
├── src/
│   ├── app/
│   │   ├── (public)/            # Landing page (/)
│   │   │   ├── layout.tsx       # Importa landing.css
│   │   │   └── page.tsx         # Hero, About, Values, Stats, Meetings, Location, Footer
│   │   ├── (auth)/              # /login, /register
│   │   ├── (dashboard)/         # Rutas protegidas (con sidebar)
│   │   │   ├── dashboard/
│   │   │   ├── ministerios/  (+ [slug])
│   │   │   ├── eventos/      (+ [id])
│   │   │   ├── cronogramas/  (+ [id])
│   │   │   ├── tareas/
│   │   │   ├── asistencia/
│   │   │   ├── notificaciones/
│   │   │   ├── perfil/
│   │   │   ├── reportes/
│   │   │   └── usuarios/
│   │   ├── globals.css          # Tailwind v4 + tema tokens + dark mode
│   │   ├── layout.tsx           # html, fonts, scroll restoration, providers
│   │   └── providers.tsx        # AuthProvider + ThemeProvider
│   ├── components/
│   │   ├── *.tsx                # Componentes del landing (Hero, Nav, Marquee, etc.)
│   │   ├── ui/                  # shadcn/ui (Button, Card, Input, ...)
│   │   ├── auth/                # ProtectedRoute, RoleGuard
│   │   └── layout/              # DashboardLayout, Sidebar
│   ├── contexts/                # AuthContext, ThemeContext
│   ├── data/content.ts          # stats, schedule, navLinks, heroLines
│   ├── hooks/                   # useEventos, useTareas, useDashboard, etc.
│   ├── lib/                     # firebase, firestore, seo, utils, constants
│   ├── styles/landing.css       # CSS vanilla del landing (700+ líneas)
│   └── types/index.ts           # Tipos TypeScript del sistema
├── next.config.mjs
├── next-sitemap.config.js
├── postcss.config.mjs
├── tailwind.config (vía @theme en globals.css)
├── tsconfig.json
└── package.json
```

## Configuración

### Variables de entorno

Copiá `.env.local.example` a `.env.local` y completá las credenciales de Firebase:

```bash
cp .env.local.example .env.local
```

Necesitás:
- Una cuenta de Firebase con Authentication (Email/Password) habilitado
- Una base de datos Firestore
- Un proyecto Firebase con las credenciales web (apiKey, authDomain, projectId, etc.)

### Roles

El sistema distingue tres roles en Firestore (`usuarios.rol`):

- **Pastor** — acceso total, puede crear/eliminar ministerios, eventos, tareas, usuarios
- **Líder** — crea eventos y cronogramas, ve todo pero no elimina
- **Colaborador** — solo visualiza sus asignaciones, edita su perfil

El primer usuario que se registre debe ser promovido a `pastor` manualmente desde Firebase Console → Firestore → `usuarios` → cambiar `rol` a `pastor`.

## Comandos

```bash
npm install          # Instalar dependencias
npm run dev          # Servidor de desarrollo → http://localhost:3000
npm run build        # Build de producción (genera .next/)
npm start            # Servidor de producción
npm run lint         # ESLint
```

`npm run build` ejecuta automáticamente `next-sitemap` (vía `postbuild`) para generar `robots.txt` y `sitemap.xml` en `public/`.

## Decisiones técnicas

### Coexistencia de dos sistemas de CSS

El proyecto usa **dos CSS completamente diferentes** que conviven sin conflicto:

1. **Landing (`src/styles/landing.css`)** — vanilla CSS con custom properties y clases BEM-like (`.hero`, `.section`, `.portfolio-card`, etc.). Importado en `app/(public)/layout.tsx`.
2. **Auth + Dashboard (`src/app/globals.css`)** — Tailwind v4 con tokens de tema y dark mode. Importado en `app/layout.tsx` (root).

Como las clases del landing (`.hero`, `.section`, etc.) no colisionan con las clases utility de Tailwind (`flex`, `text-xl`, etc.), no hay conflicto. El body se estiliza con los defaults de Tailwind para auth/dashboard, y con las reglas del landing para la página principal.

### Route Groups

Los paréntesis en `(public)`, `(auth)`, `(dashboard)` organizan las rutas sin afectar la URL. Cada grupo tiene su propio `layout.tsx` que provee estilos, providers y chrome específicos:

- `(public)/layout.tsx` — importa `landing.css` (vanilla CSS)
- `(dashboard)/layout.tsx` — `ProtectedRoute` + `DashboardLayout` (sidebar)
- `(auth)/layout.tsx` — centrado, sin chrome

### Auth SSR-safe

`lib/firebase.ts` inicializa Firebase solo en el cliente (`typeof window !== 'undefined'`) y retorna `null` en el servidor. Esto evita errores de SSR con Firebase.

### SEO y Sitemap

- `Metadata API` de Next.js para OG, Twitter, canonical, JSON-LD (en landing)
- `next-sitemap` genera `sitemap.xml` y `robots.txt` en postbuild
- Solo `/` está en el sitemap (las rutas de auth/dashboard son `noindex`)
- `robots.txt` bloquea explícitamente las rutas protegidas con `Disallow`

## Despliegue en Vercel

1. Conectá el repo en [vercel.com/new](https://vercel.com/new)
2. Vercel detecta Next.js automáticamente
3. Configurá las variables de entorno en *Settings → Environment Variables*:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
4. (Opcional) Configurá el dominio personalizado `sidsiglesia.com.ar`

## Licencia

© Santa Iglesia del Señor. Todos los derechos reservados.
