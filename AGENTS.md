# AGENTS.md · SIDS · Reglas para agentes de IA

## Flujo obligatorio al finalizar cualquier tarea

1. Ejecutar `npm run build`.
2. Revisar si corresponde actualizar la versión (SemVer).
3. Si cambia la versión, sincronizar:
   - `package.json` → campo `"version"`
   - `src/lib/version.ts` → constante `APP_VERSION`
4. Revisar si `README.md` necesita actualizarse.
5. Revisar si `PROJECT.md` necesita actualizarse.
6. Mostrar el diff propuesto al usuario.
7. Generar mensaje de commit.
8. Ejecutar commit.
9. **NO ejecutar `git push` automáticamente** salvo que el usuario lo solicite explícitamente con frases como:
   - "hacé push"
   - "subí los cambios"
   - "dejalo en producción"
10. Después de hacer push, **informar la versión actual de la app** (leer de `src/lib/version.ts` o `package.json`).

Por defecto:
- hacer `git add`
- generar commit
- mostrar el comando `git push` sugerido

## Checklist antes de finalizar

El agente debe responder este checklist al finalizar cualquier tarea que modifique código:

- [ ] `npm run build` exitoso
- [ ] versión revisada (SemVer)
- [ ] `README.md` revisado
- [ ] `PROJECT.md` revisado
- [ ] sin `console.log` con PII
- [ ] TypeScript sin errores
- [ ] commit generado

## Decisiones del proyecto (NO cuestionar)

- Firebase Storage **NO se utiliza**.
- Eliminaciones siempre mediante Cloud Functions (`borrarDocumento`).
- Roles únicamente mediante custom claims (`setRolUsuario`).
- Dashboard oculto del sitemap (`robots noindex`).
- Tailwind solo en dashboard/auth.
- Landing con CSS vanilla (`src/styles/landing.css`).
- Cliente nunca llama `deleteDoc()` directo.
- Cloud Functions en región `southamerica-east1` (São Paulo).
- No agregar comentarios en el código a menos que sea estrictamente necesario.
- Sin `console.log` con datos personales (emails, UIDs, tokens).

## Reglas de seguridad (CRÍTICO)

- El cliente **nunca** llama `deleteDoc()` directo. Usar `eliminarDocumento(coleccion, id)` en `src/lib/firestore.ts` que invoca la Cloud Function `borrarDocumento`.
- Si necesitás borrar algo nuevo, agregá el caso en la Cloud Function y en su allowlist.
- Custom claims (`rol`) se setean con la Cloud Function `setRolUsuario`. No modificar directo en Firestore.
- Firestore rules restringen `delete: if false;` en todas las colecciones operativas.
- CORS en Cloud Functions restringido a allowlist (no wildcard `*`).

## Reglas anti-"inventar"

Si no existe evidencia en el código fuente, no asumir implementaciones.

Antes de:
- crear nuevas rutas,
- agregar nuevas colecciones,
- modificar Cloud Functions,
- cambiar reglas de Firestore,

**buscar primero implementaciones existentes y reutilizar los patrones del proyecto.**

## Reglas de código

- Usar siempre **TypeScript estricto** en raíz y en `functions/`.
- Componentes con `"use client"` cuando usen hooks (`useState`, `useEffect`, `useAuth`, etc.) o interactividad.
- Preferir **shadcn/ui** components sobre HTML nativo. Si no existe, crearlo con Radix primitives.
- Los estilos van en `globals.css` (Tailwind tokens), usar Tailwind classes en componentes.

## Arquitectura

### Landing Page (`/`)

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

### Dashboard protegido (`/dashboard/*`)

- Layout interno con meta `robots noindex` (no aparece en sitemap)
- Sidebar con `bg-card/90 backdrop-blur-xl`
- Route groups: `(public)`, `(auth)`, `(dashboard)` — cada uno con su propio `layout.tsx`
- Firebase solo se inicializa en cliente (`typeof window !== "undefined"` en `src/lib/firebase.ts`)
- Roles: `pastor`, `administrador`, `lider`, `colaborador` (custom claims)
- Helper `rolLabel()` en `utils.ts` para mostrar nombres legibles

### PWA y Mobile

- `manifest.json`, Service Worker (`sw.js`), meta tags Apple
- iOS: `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style: black-translucent`
- Theme color dinámico según dark/light mode (ver `layout.tsx` script inline)
- Push notifications: Firebase Cloud Messaging (`firebase-messaging-sw.js`)

## Versionado (SemVer)

**Cuándo bump:**
- **Patch** (1.4.0 → 1.4.1): bug fixes, correcciones menores, ajustes de CSS, docs
- **Minor** (1.4.0 → 1.5.0): features nuevas, nuevas páginas, hooks, mejoras funcionales
- **Major** (1.4.0 → 2.0.0): breaking changes, reestructuración significativa, migraciones

## Comandos

```bash
npm run dev          # Desarrollo → localhost:3000
npm run build        # Producción (verificar antes de commits)
npm run lint         # ESLint CLI (flat config)
```

Cloud Functions:
```bash
cd functions
npm run build        # tsc -> lib/
npm run deploy       # firebase deploy --only functions
```

## Estado actual

Ver `PROJECT.md` para:
- Estado actual del proyecto
- Pendientes y checklist
- Contexto técnico detallado
- Variables de entorno

## Para empezar una nueva sesión

```
Estoy retomando el proyecto SIDS.

Leé AGENTS.md primero.

Luego:
- PROJECT.md
- README.md

Después ejecutá:
git status
git log --oneline -10

y revisá la sección "Pendientes" de PROJECT.md.

No implementes cambios hasta resumir el estado actual del proyecto y confirmar el siguiente paso.
```
