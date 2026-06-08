# AGENTS.md · SIDS · Reglas para agentes de IA

> Lee primero `PROJECT.md` para entender la arquitectura, estado, pendientes y convenciones del proyecto. Luego leé `README.md` para la cara pública.

## Reglas obligatorias

- **Antes de commitear, verificar si `README.md` o `PROJECT.md` necesitan actualizarse con los cambios realizados. Si hay cambios significativos (nueva funcionalidad, nuevas rutas, cambios de roles, nuevos comandos, cambios de seguridad), actualizar ambos archivos.**
- Usar siempre **TypeScript estricto** en raíz y en `functions/`.
- Componentes con `"use client"` cuando usen hooks (`useState`, `useEffect`, `useAuth`, etc.) o interactividad.
- Preferir **shadcn/ui** components sobre HTML nativo. Si no existe, crearlo con Radix primitives.
- Tailwind v4 para dashboard/auth, vanilla CSS (`src/styles/landing.css`) para la landing (`/`). No mezclar.
- Los estilos van en `globals.css` (Tailwind tokens), usar Tailwind classes en componentes.
- No agregar comentarios en el código a menos que sea estrictamente necesario (regla del system prompt).
- Sin `console.log` con datos personales (emails, UIDs, tokens) — usar solo `console.error` para errores sin exponer PII.

## Seguridad (CRÍTICO)

- El cliente **nunca** llama `deleteDoc()` directo. Usar `eliminarDocumento(coleccion, id)` en `src/lib/firestore.ts` que invoca la Cloud Function `borrarDocumento`.
- Si necesitás borrar algo nuevo, agregá el caso en la Cloud Function y en su allowlist.
- Custom claims (`rol`) se setean con la Cloud Function `setRolUsuario`. No modificar directo en Firestore.
- Firestore rules restringen `delete: if false;` en todas las colecciones operativas.
- CORS en Cloud Functions restringido a allowlist (no wildcard `*`).

## Comandos

```bash
npm run dev          # Desarrollo → localhost:3000
npm run build        # Producción (verificar antes de commits)
npm run lint         # ESLint (deprecado en Next 16, migrar a CLI próximamente)
```

Cloud Functions:
```bash
cd functions
npm run build        # tsc -> lib/
npm run deploy       # firebase deploy --only functions
```

## Contexto de la Landing Page (`/`)

- Fondo oscuro `#0a0a0a` con radial-gradients verdes (`#73A243`, `#2A6A47`, `#DAE953`) en ambos modos
- Day mode con switch (ThemeContext), letra oscura en light mode
- Fuente: Public Sans (Google Fonts)
- Iconos sociales: Font Awesome 4.7 (`fa-facebook`, `fa-youtube-play`, `fa-instagram`)
- Nav social: Facebook, YouTube, Instagram con URLs reales + theme toggle
- Secciones: Dra. Magdalena → Obispo → Sección full-width (imagen collage + horarios) → Mapa → Footer
- Sin links "Acceso" visibles — solo `/login` por URL directa
- Imágenes: `Dra.jpg`, `Obispo.jpg`, `Musicosection.jpg`
- Animaciones: framer-motion (fade-in-up al hacer scroll)
- La sección de horarios es full-width (edge-to-edge), el resto tiene `max-w-5xl`

## Dashboard protegido (`/dashboard/*`)

- Layout interno con meta `robots noindex` (no aparece en sitemap)
- Sidebar con `bg-card/90 backdrop-blur-xl`
- Route groups: `(public)`, `(auth)`, `(dashboard)` — cada uno con su propio `layout.tsx`
- Firebase solo se inicializa en cliente (`typeof window !== "undefined"` en `src/lib/firebase.ts`)
- Roles: `pastor`, `administrador`, `lider`, `colaborador` (custom claims)
- Helper `rolLabel()` en `utils.ts` para mostrar nombres legibles
- Cloud Functions en región `southamerica-east1` (São Paulo)

## PWA y Mobile

- `manifest.json`, Service Worker (`sw.js`), meta tags Apple
- iOS: `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style: black-translucent`
- Theme color dinámico según dark/light mode (ver `layout.tsx` script inline)
- Push notifications: Firebase Cloud Messaging (`firebase-messaging-sw.js`)

## Versionado (SemVer) — Regla obligatoria

- **Antes de commitear cualquier cambio de código, verificar si hay que actualizar la versión.**
- La versión se define en **dos lugares** que deben mantenerse sincronizados:
  - `package.json` → campo `"version"`
  - `src/lib/version.ts` → constante `APP_VERSION` (se muestra en el sidebar)
- **Siempre actualizar ambos archivos al mismo tiempo.** Nunca solo uno.

**Cuándo bump:**
- **Patch** (1.4.0 → 1.4.1): bug fixes, correcciones menores, ajustes de CSS, docs
- **Minor** (1.4.0 → 1.5.0): features nuevas, nuevas páginas, hooks, mejoras funcionales
- **Major** (1.4.0 → 2.0.0): breaking changes, reestructuración significativa, migraciones

## Para empezar una nueva sesión

```
Estoy retomando el proyecto SIDS. Leé AGENTS.md primero, luego PROJECT.md (contexto técnico) y README.md (cara pública). Revisá git status y git log --oneline -10 para ver el estado actual, y consultá la sección 'Pendiente' de PROJECT.md para saber por dónde seguir.
```
