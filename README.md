# Santa Iglesia del Señor · SIDS

Sitio web + sistema de gestión ministerial de la **Santa Iglesia del Señor** (SIDS).

🌐 **Sitio**: [santaiglesia.com.ar](https://santaiglesia.com.ar)
📍 **Dirección**: Calle 21 y 7, Barrio el Parque, Ingeniero Allan
⛪ **Fundada**: 1974

> 📋 **Contexto técnico completo** (arquitectura, roles, deploy, pendientes) en
> [`PROJECT.md`](./PROJECT.md). Es el documento de cabecera para retomar trabajo
> en una nueva sesión de opencode.

## Rutas

| Ruta | Tipo | Descripción |
|---|---|---|
| `/` | Pública | Landing page (estilo editorial, vanilla CSS) |
| `/login` | Auth | Inicio de sesión (Firebase Auth) |
| `/register` | Auth | Registro de usuarios |
| `/dashboard` | Protegida | Panel principal según rol |
| `/ministerios` | Protegida | CRUD de ministerios (con detalle `/ministerios/[slug]`) |
| `/celular` | Protegida | Hub del Ministerio Celular: ramas y células |
| `/celular/ramas/[ramaId]` | Protegida | Células de una rama (Mujeres, Hombres, Adolescentes, Matrimonios) |
| `/celular/ramas` | Protegida | Gestión de ramas y encargados (solo pastor/admin) |
| `/ministerios/celulas/[id]` | Protegida | Detalle de célula: información, miembros y reportes semanales |
| `/escuela-biblica` | Protegida | Escuela Bíblica: grupos, maestras, asistencias (en construcción) |
| `/eventos` | Protegida | Calendario de eventos (con detalle `/eventos/[id]`) |
| `/cronogramas` | Protegida | Grillas de servicio (con detalle `/cronogramas/[id]`) |
| `/mis-asignaciones` | Protegida | Mis asignaciones en grillas de servicio |
| `/tareas` | Protegida | Gestión de tareas |
| `/asistencia` | Protegida | Registro de asistencia (cada usuario marca la suya) |
| `/consultas` | Protegida | Sistema de consultas (líder → pastor/admin) |
| `/notificaciones` | Protegida | Bandeja de notificaciones |
| `/perfil` | Protegida | Perfil de usuario editable |
| `/reportes` | Protegida | Reportes ministeriales |
| `/usuarios` | Protegida | CRUD de usuarios (solo pastor) |

## Roles y Permisos

El sistema tiene 7 roles con diferentes niveles de acceso. Los roles se almacenan como **custom claims** en Firebase Authentication y se sincronizan con el campo `usuarios.rol`.

### Resumen de roles

| Rol | Nivel | ¿Borra? | Acceso principal |
|-----|-------|---------|------------------|
| **Pastor** | 🔴 Máximo | ✅ Sí | Todo: ministerios, células, eventos, cronogramas, tareas, usuarios, reportes |
| **Administrador** | 🔴 Máximo | ✅ Sí | Igual que Pastor |
| **Líder de área** | 🟡 Medio | ❌ No | Su ministerio, eventos, cronogramas, tareas, consultas, asistencia |
| **Líder de célula** | 🟢 Bajo | ❌ No | Sus células asignadas, eventos |
| **Colíder** | 🟢 Bajo | ❌ No | Sus células asignadas, eventos |
| **Anfitrión** | 🟢 Bajo | ❌ No | Sus células asignadas, eventos |
| **Colaborador** | 🔵 Mínimo | ❌ No | Sus asignaciones de cronograma, tareas, eventos, consultas |

### Permisos detallados por rol

#### Pastor / Administrador (roles destructivos)
- **Acceso total** a todas las secciones del dashboard
- Pueden **crear, editar y eliminar** ministerios, células, eventos, cronogramas, tareas
- Pueden **gestionar usuarios**: cambiar roles, aprobar cuentas, desactivar
- Pueden **ver reportes** ministeriales
- El borrado se hace vía **Cloud Function** (`borrarDocumento`) que valida el rol

#### Líder de área
- Ve **solo su ministerio** en `/ministerios` (filtrado por `ministerioIds`)
- Si su ministerio es **Celular**, puede **ver todas las células** del ministerio y **crear nuevas células**
- Puede **crear eventos y cronogramas** (pero no eliminarlos)
- Puede ver **Asistencia** (solo lectura, pastor puede editar)
- Puede enviar y recibir **Consultas**
- No puede ver ministerios ajenos ni gestionar usuarios

#### Líder de célula / Colíder / Anfitrión
- Ve **solo sus células asignadas** (donde es líder, colíder o anfitrión)
- Puede **editar** solo su propia célula (nombre, dirección, horario)
- Puede **gestionar miembros** solo de su célula
- Puede **crear reportes** solo de su célula (líder de célula)
- No puede ver células de otros líderes

#### Colaborador
- Ve **solo sus asignaciones** de cronograma ("Mis Asignaciones")
- Ve **solo sus tareas** ("Mis Tareas")
- Puede enviar **Consultas** a pastores/admin
- Solo lectura del resto

### Seguridad

- **Firestore Rules**: `allow delete: if false;` en todas las colecciones operativas
- **Borrado**: solo vía Cloud Function `borrarDocumento` con validación de rol
- **Acceso a ministerios**: filtrado por `ministerioIds` del usuario
- **Acceso a células**: filtrado por `liderId`, `coliderId` o `anfitrionId`
- **Custom claims**: se asignan con la Cloud Function `setRolUsuario` (solo pastor/admin)
- **Acceso a células por rama**: el encargado de una rama puede ver todas las células de su rama (validado en Firestore Rules vía `get()` a `ramas_celular`)

## Modelo de datos ERP (en construcción)

SIDS está evolucionando hacia un ERP para iglesias con `Persona` como entidad central.

### Colecciones principales

| Colección | Descripción |
|---|---|
| `personas` | Ficha central de cada individuo (miembro, visitante, niño) |
| `usuarios` | Autenticación y roles globales (pastor, administrador, usuario) |
| `ministerios` | Áreas de la iglesia (Alabanza, Diáconos, Celular, Escuela Bíblica, Multimedia, Sonido) |
| `asignaciones_ministerio` | Quién hace qué en cada ministerio |
| `ramas_celular` | Ramas del ministerio celular (Mujeres, Hombres, Adolescentes, Matrimonios) |
| `celulas` | Grupos pequeños que se reúnen en casas |
| `miembros_celula` | Membresía de cada célula con estados (activo, visitante, en consolidación, etc.) |
| `reporte_celulas` | Reportes semanales con asistencia detallada |
| `historial_persona` | Línea de tiempo de cada persona (ministerios, bautismos, escuelas) |

### Ministerio Celular

- **4 ramas**: Mujeres, Hombres, Adolescentes, Matrimonios
- Cada rama tiene un **encargado** (asignado por pastor/admin)
- El encargado puede crear células y ver todas las de su rama
- Cada célula tiene: líder, colíder, anfitrión, miembros, reportes semanales
- Los reportes incluyen: asistencia por persona, tema, versículo, ofrenda

## Stack técnico

- **[Next.js 15](https://nextjs.org/)** — App Router + Server Components + Route Groups
- **React 19** — client components para interactividad
- **CSS dual**:
  - `src/styles/landing.css` — vanilla CSS para `/` (1:1 con el diseño Astro original)
  - `src/app/globals.css` — Tailwind v4 + shadcn tokens para `/login`, `/register`, `/dashboard/*`
- **TypeScript** — strict mode
- **Firebase** — Auth + Firestore + Storage + Cloud Messaging
- **Zustand** — store global para datos compartidos (ministerios, usuarios, notificaciones, consultas)
- **framer-motion** — animaciones dashboard
- **shadcn/ui** — componentes accesibles (Radix primitives)
- **[Vitest](https://vitest.dev/)** — testing framework (42+ tests)
- **[Sentry](https://sentry.io/)** — error tracking en producción
- **[next-sitemap](https://github.com/iamvishnusankar/next-sitemap)** — sitemap + robots en postbuild
- **Despliegue**: Vercel (frontend) + Firebase (backend + push notifications)

## PWA (Progressive Web App)

La aplicación es instalable como PWA en Android e iOS:

- **Manifest**: `public/manifest.json` — nombre, iconos, theme color, display standalone
- **Service Worker**: `public/sw.js` — cache offline de assets estáticos
- **Push Notifications**: Firebase Cloud Messaging
  - `public/firebase-messaging-sw.js` — notificaciones en background
  - `src/lib/messaging.ts` — helpers para `getToken()` y `onMessage()`
  - `src/hooks/usePushNotifications.ts` — hook de registro y foreground messages
  - Cloud Function `enviarNotificacionPush` — HTTP function que crea la notificación y envía el push sincrónicamente

Para activar notificaciones push:
1. Generar VAPID key en Firebase Console → Project Settings → Cloud Messaging → Web Push certificates
2. Agregar `NEXT_PUBLIC_FIREBASE_VAPID_KEY` en `.env.local` y en Vercel
3. Deploy: `firebase deploy --only functions`

## Estructura

```
sids-next/
├── public/
│   ├── assets/                  # logo + imágenes (logo.jpeg, img/*.jpg|png)
│   ├── manifest.json            # Web App Manifest (PWA)
│   ├── sw.js                    # Service Worker (cache offline)
│   ├── firebase-messaging-sw.js # Push notifications en background
│   ├── icon-192.png             # Icono PWA 192x192
│   ├── icon-512.png             # Icono PWA 512x512
│   ├── icon-maskable.png        # Icono Android adaptive
│   ├── apple-touch-icon.png     # Icono iOS 180x180
│   ├── robots.txt               # generado por next-sitemap
│   ├── sitemap.xml              # generado por next-sitemap
│   └── sitemap-0.xml            # generado por next-sitemap
├── functions/                   # Cloud Functions (TypeScript)
│   ├── src/
│   │   ├── index.ts             # borrarDocumento, setRolUsuario, enviarNotificacionPush
│   │   └── scripts/
│   │       ├── setInitialRol.ts # bootstrap del primer pastor/admin
│   │       ├── testPush.ts      # enviar push de prueba a todos los tokens FCM
│   │       └── clearAllTokens.ts # limpiar todos los tokens FCM
│   ├── package.json
│   └── tsconfig.json
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
│   │   ├── layout.tsx           # html, fonts, scroll restoration, providers, PWA meta tags
│   │   └── providers.tsx        # AuthProvider + ThemeProvider
│   ├── components/
│   │   ├── *.tsx                # Componentes del landing (Hero, Nav, Marquee, etc.)
│   │   ├── ui/                  # shadcn/ui (Button, Card, Input, ...)
│   │   ├── auth/                # ProtectedRoute, RoleGuard
│   │   ├── layout/              # DashboardLayout, Sidebar
│   │   ├── usuarios/            # UsuarioForm, UsuarioRow
│   │   ├── consultas/           # ConsultaForm, ConsultaDetail
│   │   ├── eventos/             # EventoForm
│   │   └── notificaciones/      # NotificacionCard
│   ├── contexts/                # AuthContext, ThemeContext
│   ├── data/content.ts          # stats, schedule, navLinks, heroLines
│   ├── hooks/                   # useEventos, useTareas, useDashboard, usePushNotifications, etc.
│   ├── lib/                     # firebase, firestore, messaging, roles, seo, utils, constants, logger, error-handler, permissions, toast
│   ├── stores/                  # Zustand stores (dashboardStore)
│   ├── styles/landing.css       # CSS vanilla del landing (700+ líneas)
│   └── types/index.ts           # Tipos TypeScript del sistema
├── firestore.rules              # reglas de seguridad (delete = false, via CF)
├── firebase.json                # firestore + functions
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

El sistema distingue cuatro roles, almacenados como **custom claim** `rol` en
Firebase Authentication (sincronizado con el campo `usuarios.rol`):

- **Pastor** — acceso total. Puede borrar ministerios, eventos, cronogramas, tareas, usuarios, etc.
- **Administrador** — mismos permisos que Pastor. Creado para delegar la operación sin entregar la cuenta pastor.
- **Líder de área** — crea eventos y cronogramas, ve todo pero no elimina ni gestiona miembros.
- **Colaborador** — solo visualiza sus asignaciones en cronogramas, puede aceptar/rechazar con justificación, edita su perfil.

#### Aprobación de cuentas

Los usuarios nuevos se registran con `activo: false` y **no pueden acceder** al
sistema hasta que un Pastor o Administrador los apruebe desde la página de
Usuarios (`/usuarios`). Al aprobar, se cambia `activo: true` y el usuario
puede iniciar sesión normalmente.

- **Pantalla de pendiente**: si un usuario intenta acceder sin estar activo,
  ve una pantalla indicando que su cuenta está pendiente de aprobación.
- **Aprobar/Desactivar**: en la página de Usuarios, el botón "Aprobar" cambia
  `activo: false` → `true`. El botón "Desactivar" hace lo contrario.
- **Perfiles pre-creados**: si un admin creó un perfil con `activo: true` antes
  de que el usuario se registre, el usuario puede acceder inmediatamente.

#### Cómo se aplican los permisos

- **Borrado**: el cliente **nunca** borra directo en Firestore. Llama a la
  Cloud Function `borrarDocumento` (`functions/src/index.ts`), que valida el
  custom claim `rol in {pastor, administrador}` y aplica una allowlist de
  colecciones. Los usuarios con otros roles solo pueden borrar **sus propias
  notificaciones** (mismo criterio que las reglas originales).
- **Creación/edición**: las reglas de Firestore restringen `create/update` por colección:
  - `ministerios`, `tareas`, `asistencias`, `miembros_ministerio`: solo pastor/administrador
  - `eventos`, `cronogramas`: pastor/administrador/líder
  - `usuarios` (crear): solo pastor/administrador
- **Custom claims**: se asignan con la Cloud Function `setRolUsuario` (solo
  pastor/administrador). Sincroniza el campo `rol` en `usuarios/{uid}`.

#### Bootstrap del primer Pastor/Administrador

Como la función `setRolUsuario` requiere un rol destructivo previo, el primer
admin debe configurarse con un script local usando Admin SDK:

```bash
cd functions
npm install

# Opción A: con service account JSON
export GOOGLE_APPLICATION_CREDENTIALS="/ruta/a/serviceAccountKey.json"
npm run set-initial-rol -- juan@sids.org pastor

# Opción B: con variables de entorno
export FIREBASE_PROJECT_ID="..."
export FIREBASE_CLIENT_EMAIL="..."
export FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
npm run set-initial-rol -- juan@sids.org administrador
```

A partir de ahí, ese usuario (o cualquier pastor/administrador) puede asignar
roles desde la app usando `asignarRolUsuario(uid, rol)` de `src/lib/roles.ts`.

> Importante: el cambio de custom claim se refleja en el token del usuario
> después de un refresh del idToken (forzar re-login o esperar ~1 h).

### Notificaciones

El sistema envía notificaciones in-app (Firestore) y push (FCM) con formato consistente:

- **Estructura**: qué pasó → quién → función/ministerio → evento → fecha/hora
- **Tipos**:
  - `asignacion` — nueva asignación en grilla
  - `confirmacion` — respuesta a asignación (aceptar/rechazar)
  - `tarea` — nueva tarea asignada
  - `ministerio` — incorporación a ministerio
  - `rol` — cambio de rol
  - `aprobacion` — cuenta aprobada por admin
- **Rechazo**: requiere justificación obligatoria, notifica a Pastor/Administrador/Líder del ministerio
- **Push**: 
  - `enviarNotificacionPush` (HTTP, llamado desde el cliente) — crea el documento y envía el push sincrónicamente
  - Service worker con Firebase SDK para push subscription en iOS PWA
- **Leído/no leído**: las notificaciones NO se marcan automáticamente como leídas. Cada notificación tiene un botón "Marcar como leída". Botón "Marcar todas leídas" disponible para todos los usuarios.
- **Badge**: contador en sidebar
- **Test local**: `cd functions && npm run test-push "Título" "Mensaje"` envía a todos los tokens FCM registrados

### Consultas

Sistema de consultas entre líderes/colaboradores y pastores/administradores:

- **Enviar**: líderes y colaboradores envían consultas a pastores/admin
- **Responder**: pastores/admin pueden responder y cerrar consultas
- **UI instantánea**: enviar, responder, cerrar y eliminar se ejecutan en background sin bloquear la interfaz
- **Eliminar todas**: botón para pastor/admin que elimina todas las consultas y sus notificaciones asociadas
- **Badge**: contador de consultas no leídas en sidebar, se auto-limpia al entrar a /consultas
- **Huérfanas**: script `clean-orphans` limpia notificaciones de consultas eliminadas

## Comandos

```bash
npm install          # Instalar dependencias (raíz)
cd functions && npm install && cd ..   # Dependencias de Cloud Functions
npm run dev          # Servidor de desarrollo → http://localhost:3000
npm run build        # Build de producción (genera .next/)
npm start            # Servidor de producción
npm run lint         # ESLint
npm run test         # Ejecutar tests (Vitest)
npm run test:watch   # Tests en modo watch
```

`npm run build` ejecuta automáticamente `next-sitemap` (vía `postbuild`) para generar `robots.txt` y `sitemap.xml` en `public/`.

### Cloud Functions

```bash
cd functions
npm run build        # Compila TypeScript -> lib/
npm run deploy       # Despliega a Firebase (firebase deploy --only functions)
npm run logs         # Ver logs en producción
npm run test-push    # Envía notificación push de prueba a todos los tokens FCM registrados
npm run clear-tokens # Limpia todos los tokens FCM (usuarios deben re-aceptar push)
npm run delete-users # Elimina todos los usuarios excepto admin (requiere --confirm)
npm run delete-data  # Elimina ministerios, células, miembros y reportes (requiere --confirm)
```

Región: `southamerica-east1` (São Paulo) por cercanía a Argentina.

## Decisiones técnicas

### Coexistencia de dos sistemas de CSS

El proyecto usa **dos CSS completamente diferentes** que conviven sin conflicto:

1. **Landing (`src/styles/landing.css`)** — vanilla CSS con custom properties y clases BEM-like (`.hero`, `.section`, `.group-card`, etc.). Importado en `app/(public)/layout.tsx`.
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
   - `NEXT_PUBLIC_FIREBASE_VAPID_KEY` (para push notifications)
4. (Opcional) Configurá el dominio personalizado `santaiglesia.com.ar`

## Licencia

© Santa Iglesia del Señor. Todos los derechos reservados.
