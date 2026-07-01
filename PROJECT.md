# PROJECT.md · SIDS · Contexto para retomar la sesión

> Documento de contexto técnico del proyecto. El `README.md` es la cara pública
> (instalación, deploy, comandos). Este archivo es para quien abre opencode en
> una nueva sesión y necesita ubicarse rápido: qué se hizo, por qué, qué falta
> y dónde tocar.

## 1. Resumen

**Santa Iglesia del Señor (SIDS)** — sitio web + sistema de gestión ministerial.

- Iglesia en Ingeniero Allan, Buenos Aires.
- Stack: **Next.js 15** (App Router, RSC) + **React 19** + **TypeScript strict**.
- Backend: **Firebase** (Auth + Firestore + Storage + Cloud Functions v2).
- Deploy frontend: **Vercel**. Backend: **Firebase** (región `southamerica-east1`).

## 2. Roles del sistema (custom claim `rol`)

Definidos como **custom claims** en Firebase Authentication, sincronizados con
el campo `usuarios.rol` en Firestore.

| Rol | Puede borrar | Notas |
|---|---|---|
| `pastor` | sí | Acceso total, dueña de la cuenta operativa. |
| `administrador` | sí | Mismos permisos que pastor. Creado para delegar operación. |
| `lider` | no | Crea eventos y cronogramas, ve todo, no borra. |
| `colaborador` | no | Solo lee sus asignaciones, edita su perfil. |

Roles "destructivos" (los que pueden borrar): `pastor`, `administrador`.
Se setean con la Cloud Function `setRolUsuario` o, para el bootstrap inicial,
con el script `functions/src/scripts/setInitialRol.ts`.

## 3. Arquitectura de seguridad (CRÍTICO)

Este es el cambio central de la sesión y la razón de ser de `functions/`.

- **Firestore rules**: `allow delete: if false;` en **todas** las colecciones
  operativas (`ministerios`, `eventos`, `cronogramas`, `tareas`, `asistencias`,
  `miembros_ministerio`, `usuarios`, `notificaciones`).
- **Borrado** se hace **únicamente** vía Cloud Function `borrarDocumento`
  (`functions/src/index.ts`) vía HTTP POST con Bearer token (no callable).
  - Usa Admin SDK → ignora Firestore rules.
  - Valida `req.auth.token.rol in {pastor, administrador}` con fallback a
    Firestore (`getRolFromFirestore` busca por Auth UID → authUid → email).
  - Aplica allowlist de colecciones (ningún path traversal).
  - Para roles no destructivos, solo permite borrar sus propias `notificaciones`.
  - Audita con `logger.info` (`uid`, `rol`, `coleccion`, `id`).
- **Asignación de roles** vía Cloud Function `setRolUsuario` (HTTP POST con
  Bearer token). Solo pastor/admin. Impide auto-degradación.
  - Escribe `rol` al documento real encontrado por authUid o email, y setea
    custom claims con `auth.setCustomUserClaims`.
  - Auto-linke `authUid` si encuentra el documento por email.

El cliente nunca llama `deleteDoc()` directo: `eliminarDocumento(coleccion, id)`
en `src/lib/firestore.ts:91` se redefinió para invocar la function.

### Caveat de tokens y sparse documents

Firebase Auth incluye los custom claims en el JWT. Si el usuario se logueó
**antes** de que se le asigne un claim, su idToken actual no lo incluye.

**Solución implementada**: `login()` en AuthContext tiene cadena completa de
fallbacks (Auth UID → query `authUid` → query `email`) y llama a
`asignarRolUsuario` para setear el custom claim antes de refrescar el token.

`getRolFromFirestore` en Cloud Functions también busca por email como fallback
y auto-linke `authUid` al encontrar el documento. Esto previene documentos
sparse (creados por la versión anterior de `setRolUsuario`).

`fetchUserData` detecta documentos sparse (sin `email` ni `nombre`) y los
salta, continuando con los fallbacks de `authUid` y `email`.

## 4. Estructura del repo (post-cambios)

```
sids-next/
├── functions/                          # Cloud Functions (TypeScript)
│   ├── src/
│   │   ├── index.ts                    # borrarDocumento, setRolUsuario, enviarNotificacionPush
│   │   └── scripts/
│   │       ├── setInitialRol.ts        # bootstrap del primer admin
│   │       └── testPush.ts             # enviar push de prueba a todos los tokens FCM
│   ├── package.json
│   ├── tsconfig.json
│   └── .gitignore
├── src/
│   ├── app/                            # (public), (auth), (dashboard)
│   ├── components/                     # ui/ (shadcn), auth/, layout/
│   ├── contexts/                       # AuthContext, ThemeContext
│   ├── hooks/                          # useEventos, useTareas, useDashboard, usePushNotifications, etc.
│   ├── lib/
│   │   ├── firebase.ts                 # inicializa Firebase + Functions + Messaging
│   │   ├── firestore.ts                # CRUD cliente (delete via CF), mapDoc, documentId
│   │   ├── messaging.ts                # FCM helpers (requestPermission, onForegroundMessage)
│   │   ├── roles.ts                    # asignarRolUsuario(uid, rol)
│   │   └── version.ts                  # APP_VERSION (sincronizado con package.json)
│   ├── stores/
│   │   └── dashboardStore.ts           # Zustand store global (ministerios, usuarios, notificaciones, consultas)
│   ├── styles/                         # landing.css (vanilla)
│   └── types/
├── public/                             # assets + sitemap + PWA files
│   ├── manifest.json                   # Web App Manifest
│   ├── sw.js                           # Service Worker (cache offline)
│   ├── firebase-messaging-sw.js        # Push notifications en background
│   ├── icon-192.png                    # Icono PWA
│   ├── icon-512.png                    # Icono PWA grande
│   ├── icon-maskable.png               # Icono Android adaptive
│   └── apple-touch-icon.png            # Icono iOS
├── deploy.sh                           # script de deploy interactivo
├── firebase.json                       # firestore + functions config
├── firestore.rules                     # reglas (delete=false en todo)
├── next.config.mjs
├── next-sitemap.config.js
├── tsconfig.json
└── package.json
```

## 5. Variables de entorno

**Frontend** (en `.env.local`, copiar de `.env.local.example`):

```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_VAPID_KEY            # para push notifications (FCM)
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true   # opcional, para dev local
```

**Service account JSON**: **NO** se commitea, no es env var, es un archivo
local. Se pasa por path al script de bootstrap o se setea como
`GOOGLE_APPLICATION_CREDENTIALS` (ver `deploy.sh`).

## 6. Comandos frecuentes

```bash
# Frontend
npm install
npm run dev          # localhost:3000
npm run build        # next build + postbuild sitemap
npm run lint         # next lint (deprecado en 16, migrar a eslint CLI)

# Cloud Functions
cd functions
npm install
npm run build        # tsc -> lib/
npm run deploy       # firebase deploy --only functions
npm run logs         # firebase functions:log
npm run delete-users # Elimina todos los usuarios excepto admin (requiere --confirm)
npm run delete-data  # Elimina ministerios, células, miembros y reportes (requiere --confirm)

# Deploy orquestado
./deploy.sh                              # flujo completo (prereqs + deploy)
./deploy.sh --deploy-only                # solo deploy
./deploy.sh --set-rol --email X          # solo asignar rol
./deploy.sh --key /ruta/key.json         # custom key path
```

## 7. Estado al cierre de esta sesión (git log)

```
ab58931 fix: agregar tipo 'aprobacion' a interfaz Notificacion
1cae6a0 fix: mejorar UI del panel de notificaciones
9eba37d fix: notificaciones no se marcan como leídas automáticamente al abrir el panel
3f5d364 fix(pwa): manifest name/short_name for notifications and home screen
4f4fd7e fix(pwa): redirect standalone mode to /login
44f2209 fix(pwa): start_url changed from /login to /
7f25a05 docs: update README and PROJECT with v1.14.3 changes
17725b9 chore: bump version to 1.14.3
9992c15 fix(manifest): remove short_name to change push notification label
65272df feat(usuarios): close edit modal instantly, save in background
```

Cambios de esta sesión (v1.20.0):
- **Acceso a ministerios para `lider_celula`** — Se agregó "Mi Ministerio" en la sidebar para líderes de célula y se corrigió el filtro en `/ministerios` para que muestre solo los ministerios donde el líder está asignado (`ministerioIds`). Antes no veía el link en la sidebar y al entrar a `/ministerios` se mostraba todo.
- **Refresh al volver de background (PWA)** — Cuando la app pasa a background y vuelve, ahora se re-inicializan los stores (ministerios, usuarios, notificaciones, consultas) y se refresca el `userData` + custom claims del usuario. Soluciona el problema donde había que cerrar y reabrir la app para ver cambios de rol/asignaciones.
  - `AuthContext` escucha `visibilitychange`, llama `getIdToken(true)` y re-fetcha el doc del usuario
  - `dashboardStore.refreshAll()` desuscribe y vuelve a suscribir los listeners
  - `DashboardLayout` dispara `refreshAll` cuando vuelve a `visible`

Cambios de esta sesión (v1.21.0):
- **Feature: Mis Asignaciones** — Nueva página `/mis-asignaciones` donde los usuarios pueden ver todas sus asignaciones en grillas de servicio, con filtros por estado (pendientes, confirmadas, rechazadas) y estadísticas resumen.
  - Aceptar/rechazar asignaciones directamente desde la página
  - Rechazo con justificación obligatoria (notifica a pastor/admin/líder)
  - Confirmación notifica a pastores/admin y líder del ministerio
  - Listado en tiempo real con listener de Firestore
  - Info de evento y ministerio con colores
- **Sidebar actualizada** — Todos los roles ahora tienen acceso a "Mis Asignaciones" con ícono `UserCheck`
- **Colaborador actualizado** — El link "Mis Asignaciones" ahora apunta a `/mis-asignaciones` (antes era `/cronogramas`)
- **Notificaciones** — Los botones de aceptar/rechazar ya funcionan correctamente en notificaciones tipo `asignacion`

Cambios de esta sesión (v1.22.0):
- **Tipos ERP — Persona como entidad central** — Agregados tipos TypeScript para la transición hacia un modelo de dominio ERP: `Persona`, `AsignacionMinisterio`, `HistorialPersona` con estados (`visitante`, `nuevo`, `en_consolidacion`, `miembro`, `bautizado`, `inactivo`) y tipos de historial (ministerio, célula, escuela, bautismo, rol, evento, servicio, membresía, presentación de niño, visita pastoral, consejería, discipulado). Preparan el terreno para migrar desde `Usuario` como entidad principal.
- **Dashboard — Card Asignaciones con total real** — `useDashboard` ahora consulta `cronogramas` y cuenta las asignaciones reales del usuario (en vez del hardcode `0`). El hook recibe `userData` para filtrar por `usuarioId`.
- **Mis Asignaciones — Notificaciones se actualizan al aceptar/rechazar** — Al confirmar o rechazar desde `/mis-asignaciones`, se busca la notificación original (`tipo: "asignacion"`) y se marca como `leida: true` + `tipo: "confirmacion"`. Soluciona el bug donde la notificación seguía apareciendo como pendiente aunque ya se había aceptado.
- **Mis Asignaciones — UI mobile compacta** — Mejoras responsive:
  - Grid de stats: `grid-cols-2` en mobile (antes `grid-cols-1`)
  - Padding reducido en tarjetas (`p-3 sm:p-4`)
  - Avatar más pequeño en mobile (`h-8 w-8`)
  - Fecha y evento apilados en mobile (`flex-col`)
  - Botones Aceptar/Rechazar apilados y más compactos
- **Sidebar — Líder de área con ministerio Celular ve "Células"** — El rol `lider` ahora muestra el link "Células" en el navbar **solo si** su `ministerioIds` incluye el ministerio "Celular". Roles `lider_celula`, `colider` y `anfitrion` ahora ven **"Mi Célula"** en vez de "Células" (más descriptivo de su alcance).
- **Permisos células — Líder de área puede crear y ver todas** —
  - `useCelulas` acepta `ministerioId` opcional; si `rol === "lider"` y se pasa el `ministerioId` del ministerio Celular, devuelve todas las células de ese ministerio.
  - `/ministerios/celulas` detecta si el `lider` pertenece al ministerio Celular (`esLiderCelular`) y le habilita el botón "Nueva Célula".
  - Eliminación sigue restringida a `pastor`/`administrador`.

Cambios de esta sesión (v1.23.0) — ERP Módulo Celular:
- **Tipos ERP — RamaCelular y modelo de células reestructurado** —
  - Nuevos tipos: `RamaCelular` (con `encargadoId`, `tipo`, `ministerioId`), `AsistenciaReporteCelula`
  - `Celula` ahora tiene `ramaId` (opcional durante migración, obligatorio post-migración)
  - `MiembroCelula` ahora tiene `estado` (`activo` | `inactivo` | `visitante` | `nuevo` | `en_consolidacion` | `bautizado`), `fechaIngreso`, `fechaSalida`, `motivoSalida`, `personaId`
  - `ReporteCelula` ahora tiene `semana` (ISO), `asistencia` (array detallado), `totalMiembros`, `asistentes`, `ausentes`
- **Script de migración** — `functions/src/scripts/migrarCelulasARamas.ts` crea 4 ramas a partir de los `tipo` existentes y backfill `ramaId` en todas las células. Pastor/Admin asigna encargados manualmente después.
- **Firestore Rules estrictas** — `ramas_celular` con reglas CRUD para pastor/admin. `celulas`, `miembros_celula` y `reporte_celulas` ahora validan lectura por:
  - pastor/admin (todo)
  - líder/colíder/anfitrión de la célula
  - encargado de la rama (vía `get()` a `ramas_celular`)
- **Hooks nuevos** — `useRamasCelular` (listener de ramas), `useReportesCelula` (reportes por célula con `orderBy("semana", "desc")`)
- **Store actualizado** — `dashboardStore` ahora incluye `ramas` con `initRamas()` y `setRamas()`
- **UI: Hub `/celular`** — Nueva página que muestra las 4 ramas como cards clickeables. Visible para pastor/admin/encargados.
- **UI: `/celular/ramas/[ramaId]`** — Lista de células filtrada por rama. Encargado de rama puede crear células (botón "Nueva Célula").
- **UI: Sidebar actualizado** — Links de "Células" ahora apuntan a `/celular` en vez de `/ministerios/celulas`.
- **Redirección** — `/ministerios/celulas` redirige automáticamente a `/celular` (a menos que tenga `?ramaId=` para creación desde rama).
- **Constantes compartidas** — `TIPO_LABELS` movido a `src/lib/celulas.ts` para evitar export desde page.tsx.
- **Página de detalle adaptada** — Formulario de reporte semanal ahora genera objetos compatibles con el nuevo tipo `ReporteCelula`.

Cambios de esta sesión (v1.25.2):
- **UI: Hub `/celular` rediseñado** — Reescrito `/celular/page.tsx` para alinearse con el diseño del ejemplo:
  - Cards con borde, contador de células por rama (`X células`), enlace "Ver detalles →"
  - Botón de eliminar rama (pastor/admin) con `Trash2`
  - Sección "Crear rama" con ramas predeterminadas (Adolescentes, Mujeres, Hombres, Matrimonios)
  - Hooks `useRamasCelular` y `useCelulas` directamente (sin store)
  - Wrapper `DashboardLayout` removido (ya lo provee el layout del route group)

Cambios de esta sesión (v1.25.1):
- **Fix: Ya no se requiere el ministerio "Celular" creado para crear células o ramas** — Removido el bloqueo que impedía crear células y ramas si no existía el ministerio "Celular" en la colección `ministerios`. Ahora pastor/administrador puede crear células y ramas independientemente de que el ministerio esté registrado.
  - `ministerioId` ahora es opcional en los tipos `Celula` y `RamaCelular`
  - Eliminado `toast.error("No se encontró el ministerio Celular")` y el `return` temprano en `handleCreate` de células
  - Eliminada la dependencia `ministerioCelular` en `handleCrearRama` de ramas
  - Eliminadas variables muertas `ministerioCelular` en `/celular/page.tsx` y `/celular/ramas/[ramaId]/page.tsx`
  - Removido el `Celula` duplicado en `src/types/index.ts`

Cambios de esta sesión (v1.25.0):
- **Sidebar: Ministerios como grupo expandible** — Reestructurado el sidebar para que "Ministerios" sea un menú desplegable con sub-items:
  - "Todos los Ministerios" → `/ministerios`
  - "Células" → `/celular`
  - "Escuela Bíblica" → `/escuela-biblica`
  - Íconos de flecha (ChevronDown/ChevronRight) indican estado expandido/colapsado
  - Estado expandido por defecto para pastor, administrador y líder
  - Para líderes de área sin ministerio Celular, el sub-item "Células" se oculta automáticamente
- **Eliminados links sueltos** — Removidos los links directos de "Células" y "Escuela Bíblica" del nivel raíz del sidebar; ahora solo aparecen dentro del grupo Ministerios

Cambios de esta sesión (v1.24.0) — ERP Sesión 2:
- **UI: Gestión de Ramas `/celular/ramas`** — Nueva página solo para pastor/admin donde pueden:
  - Ver todas las ramas del Ministerio Celular
  - Asignar o quitar encargados con un dropdown de usuarios activos
  - Guardado inmediato con feedback toast
- **Tipos: Escuela Bíblica** — Nuevos tipos `GrupoEscuelaBiblica` y `AsistenciaEscuelaBiblica`
- **Hook: `useEscuelaBiblica`** — Listener en tiempo real de grupos de escuela bíblica activos
- **UI: Hub `/escuela-biblica`** — Página básica que muestra los grupos de escuela bíblica con maestra y ayudantes. En construcción (placeholder para crear grupos).
- **Sidebar** — Agregado link "Escuela Bíblica" para pastor y administrador

Cambios de esta sesión (v1.19.3):
- **Permisos de creación de células** — El botón "Nueva Célula" ya no aparece para `lider_celula`. Solo `pastor` y `administrador` pueden crear células (también se ajustó la lógica de "puedeCrear" en la página de detalle).
- **UI mobile de células** — Mejorado el responsive en `/ministerios/celulas` y `/ministerios/celulas/[id]`:
  - Header del listado apilado en mobile (título arriba, botón abajo)
  - Header de detalle de célula con nombre+badges arriba y botones de edición en mobile
  - Input "Nombre del miembro..." con `flex-1` en mobile (antes tenía `w-64` fijo que rompía el layout)
  - Headers de "Miembros" y "Reportes Semanales" apilados en mobile
  - Lista de personas (Líder/Colíder/Anfitrión) con `min-w-0` y `truncate` para emails largos
  - Reportes: chip con total visible en mobile, chips M:/I:/T: solo en desktop

Cambios de esta sesión (v1.18.0):
- **Logger centralizado** — `src/lib/logger.ts` con interfaz unificada (info/warn/error/debug). Solo muestra logs en dev, captura errores en Sentry en producción.
- **Error Handler centralizado** — `src/lib/error-handler.ts` con clase `AppError`, `handleFirestoreError()` que mapea errores Firebase a mensajes amigables, y `useErrorHandler()` hook para componentes.
- **Toast helpers** — `src/lib/toast.ts` con `showError()` y `showSuccess()` que combinan toast + logger.
- **Sentry integrado** — `@sentry/nextjs` v10.61.0 con `instrumentation.ts`, `instrumentation-client.ts`, `global-error.tsx`. Solo activo en producción. Logger envía errores a Sentry automáticamente.
- **Env var `NEXT_PUBLIC_SENTRY_DSN`** — configurada en `.env.local`.
- **Vitest configurado** — `vitest.config.ts` con jsdom, 42 tests pasando.
- **Tests de permisos** — `src/lib/permissions.ts` + `src/lib/permissions.spec.ts` (22 tests).
- **Tests de error handler** — `src/lib/error-handler.spec.ts` (7 tests).
- **Tests de utilidades** — `src/lib/firestore.spec.ts` (13 tests para `mapDoc`, `slugify`, `rolLabel`, `cn`).
- **Fragmentación de componentes** — 4 páginas >300 líneas refactorizadas:
  - `usuarios/page.tsx` (508 → <300): extraídos `UsuarioForm` y `UsuarioRow`
  - `consultas/page.tsx` (429 → <300): extraídos `ConsultaForm` y `ConsultaDetail`
  - `eventos/page.tsx` (358 → <300): extraído `EventoForm`
  - `notificaciones/page.tsx` (352 → <300): extraído `NotificacionCard`

Cambios de esta sesión (v1.17.0):
- **Registro de asistencia funcional** — `/asistencia` ahora permite a cada usuario marcar su propia asistencia (Presente/Ausente/Justificado) para eventos donde tiene asignaciones confirmadas. Se guarda en la colección `asistencias` con `eventoId`, `usuarioId`, `estado`, `justificacion`, `fecha` y `registradoPor`. Hook `useAsistencias` creado para lectura en tiempo real.
- **Cascade delete asistencias** — Al borrar un evento, la Cloud Function ahora también elimina las asistencias asociadas (evita datos huérfanos).
- **Reportes funcionales** — La sección de reportes ahora mostrará datos reales de asistencia una vez los usuarios empiecen a registrar.

Cambios de esta sesión (v1.16.2):
- **Fix permisos ministerios** — `/ministerios` ahora filtra la lista por `ministerioIds` para líderes de área (solo ven su ministerio). Título cambia a "Mi Ministerio" para líderes.
- **Fix acceso a ministerios ajenos** — `/ministerios/[slug]` bloquea acceso si el usuario no es pastor/admin y no está en `ministerioIds` del ministerio. Muestra mensaje "No tenés permiso para ver este ministerio".
- **Fix permisos células** — `/ministerios/celulas/[id]` bloquea acceso si el usuario no es pastor/admin y no es líder/colíder/anfitrión de esa célula. `puedeEditarCelula` y `puedeGestionarMiembros` ahora verifican `celula.liderId === userData.id` en lugar de `esLiderCelula` (cualquier líder de célula).
- **Fix eliminación células** — `/ministerios/celulas` separa `puedeCrear` (pastor/admin + líder_celula) de `puedeEliminar` (solo pastor/admin). Líderes de célula ya no pueden eliminar células.
- **README.md actualizado** — nueva sección "Roles y Permisos" con tabla resumen y permisos detallados por rol.

Cambios de esta sesión (v1.16.1):
- **Perfil: mostrar ministerios del usuario** — en `/perfil` ahora se muestran los ministerios asignados al usuario como badges con el color del ministerio. Aparecen en dos lugares: debajo del rol en la tarjeta de header, y como campo "Ministerios" en la sección de información personal. Compatible con dark/light mode.

Cambios de esta sesión (v1.16.0):
- **Landing: sección "Nuestros ministerios"** — reemplaza la sección "Nuestros Valores" (portfolio grid + diagrama de Venn) por un layout de dos columnas: grid de 7 tarjetas con colores de la paleta SIDS (Grupo conexión Varones/Mujeres/Matrimonios/Adolescentes, Escuela de Ministerio, Adolescentes, Pre-Adolescentes) + panel CTA "SUMATE — Nuestros ministerios". Botón "Más información" como placeholder (sin link). Estilos CSS actualizados: eliminados `.portfolio-grid`, `.portfolio-card`, `.venn-*`; agregados `.groups-layout`, `.groups-grid`, `.group-card`, `.groups-cta`.

Cambios de esta sesión (v1.15.0):
- **Feature Células: Miembros** — lista simple de nombres por célula (colección `miembros_celula`). Líder, colíder y admin/pastor pueden agregar/eliminar.
- **Feature Células: Reportes Semanales** — formulario tipo "Reporte Celular" en papel (colección `reporte_celulas`). Solo el líder de la célula puede crear reportes; el creador puede editarlos. Campos: fecha, miembros, invitados, total, tema, versículo, ofrenda, observaciones, anfitrión/colíder/líder, supervisado.
- **Tab Células en detalle de ministerio** — el ministerio "Celular" muestra tab "Células" con listado de células asociadas. Resto de ministerios sin cambios.
- **Firestore rules** — agregadas reglas para `miembros_celula` y `reporte_celulas` (lectura: autenticados; creación/edición: según permisos; eliminación: deshabilitada).

Cambios de esta sesión (v1.14.7):
- **Notificaciones no se auto-marcan como leídas** — eliminado el `useEffect` que marcaba todas como leídas al abrir la página. Ahora cada notificación tiene un botón "Marcar como leída".
- **UI del panel de notificaciones mejorada** — botones "Marcar todas leídas" y "Eliminar leídas" son mutuamente excluyentes (solo uno visible a la vez). Disponible para todos los usuarios.
- **Tipo "aprobacion" agregado** — la interfaz `Notificacion` ahora incluye `"aprobacion"` como tipo válido (antes era un string que no coincidía con el type union).
- **Mensaje de notificación de rol simplificado** — eliminado texto "Cierra sesión y vuelve a ingresar para que los cambios tomen efecto" de las notificaciones push de cambio de rol.

Cambios de esta sesión (v1.14.0):
- **Zustand store global** (`src/stores/dashboardStore.ts`) — ministerios, usuarios, notificaciones y consultas con listeners centralizados. Elimina duplicación de onSnapshot en Sidebar + páginas.
- **DashboardLayout inicializa listeners** — un solo set de listeners al montar, cleanup al desmontar.
- **8 páginas migradas** al store: notificaciones, consultas, tareas, asistencia, usuarios, ministerios, cronogramas/[id], ministerios/celulas.
- **Batch fetch en notificaciones** — `where(documentId(), "in", [...])` para grillas y eventos (2 queries vs 2*N).
- **Cascading delete server-side** — Cloud Function `borrarDocumento` ahora maneja eventos → cronogramas → notificaciones en batch. `eventos/page.tsx` simplificado a una sola llamada CF.
- **Fix Firestore index error** — removido `where("estado", "!=", "completada")` del dashboard (requería índice compuesto), filtrado en cliente.
- **Null guard en dashboard** — previene crash cuando el fetch falla.
- **Scrollbar tipo macOS** — scrollbars delgadas que aparecen al hover, aplicadas globalmente en `globals.css`.
- **Unified parseDoc** — `mapDoc` exportado desde `firestore.ts`, eliminados `parseDoc` duplicados en hooks.

Cambios de esta sesión (v1.13.0-1.13.1):
- **Optimización de queries** — eventos filtrados por fecha futura, tareas por estado, límite de 5 resultados.
- **Fix useEffect deps** — stale closures corregidos en useConsultas y useNotificaciones con useRef.
- **useReportes** — rango expandido a 6 meses para reportes con datos.
- **Firestore rules** — self-registration habilitado (`allow create: if isSignedIn() && request.auth.uid == userId`).
- **Notificación al aprobar** — `enviarNotificacion` en `handleToggleActivo` envía push + in-app al aprobar usuario.

Cambios de esta sesión (v1.12.1):
- **Fix eliminación de usuarios** — Cloud Function `borrarDocumento` ahora elimina la cuenta de Firebase Authentication (`auth.deleteUser`) al borrar un documento de `usuarios`. También elimina notificaciones asociadas (cascade delete).
- **Protección estado fantasma** — `AuthContext` detecta usuarios autenticados sin datos en Firestore (`user` existe pero `userData` es `null`) y fuerza `logout` + redirección a `/login`.

Cambios de esta sesión (v1.10.0):
- **Feature Células** — sub-colección de ministerios con tipo, día/hora, dirección, líder/colíder/anfitrión
- **Rutas nuevas** — `/ministerios/celulas` (lista) y `/ministerios/celulas/[id]` (detalle)
- **Permisos** — pastor/admin: CRUD total, líder: ve solo sus células, colaborador: solo lectura de las suyas
- **Cascade delete** — al borrar un ministerio, se eliminan sus células asociadas
- **Filtros** — por tipo y ministerio en la lista
- **UI optimista** — crear/eliminar con feedback inmediato

Cambios de esta sesión (v1.8.0):
- **UI instantánea en consultas**: enviar, responder, cerrar y eliminar cierran el dialog inmediatamente y ejecutan en background
- **Botón "Marcar todas como leídas"** en notificaciones (solo pastor/admin)
- **Botón "Eliminar todas las consultas"** en consultas (solo pastor/admin)
- **Badge auto-clean**: al entrar a /notificaciones o /consultas se marcan automáticamente como leídas las entrantes
- **Script clean-orphans**: limpia notificaciones huérfanas (ticket:* sin ticket)

Cambios de sesiones anteriores (v1.7.x):
- **Fix notificaciones dobles iOS**: service worker con Firebase SDK, sin onBackgroundMessage, payload con notification field
- **Optimistic token update**: siempre llama getToken al cargar la app (fix token mismatch PWA/Safari)
- **Cascade delete tickets**: borrarDocumento elimina notificaciones asociadas al borrar ticket
- **notificationId UUID**: payload incluye UUID para tracking de notificaciones

Cambios de sesiones anteriores (v1.6.x):
- **Sistema de aprobación de cuentas**: usuarios nuevos se registran con `activo: false` y no pueden acceder hasta que un Pastor/Admin los apruebe.
- **Pantalla "Cuenta pendiente"**: componente `PendingApproval.tsx` que se muestra cuando el usuario no está activo.
- **Login con estado pendiente**: si el usuario está logueado pero `activo: false`, muestra mensaje de pendiente en vez de redirigir.
- **Botón Aprobar/Desactivar** en la página de Usuarios: Pastor/Admin puede activar o desactivar usuarios.
- **Usuarios pendientes aparecen primero** en la lista, con badge "Pendiente".
- **Fix notificaciones dobles**: eliminado `onNotificacionCreated` trigger (causaba doble push). Deploy OK.
- **Mejorado cleanup de tokens inválidos** en Cloud Functions (captura más códigos de error FCM).
- **Versión visible** en login, register y pantalla de carga.

Cambios de sesiones anteriores (v1.5.x):
- **Fix tickets líder/colaborador** — useTickets con queries paralelas, sin índice compuesto
- **Fix notificaciones push iOS** — PushPrompt con botón Habilitar (user gesture)
- **Función enviarNotificacionPush** — HTTP function sincrónica para push confiable
- **Tabs recibidos/enviados para todos** — ya no solo pastor/admin

## 8. Pendiente para próximas sesiones

Hecho en sesiones anteriores:
- ~~PWA instalable~~ — manifest, service worker, icons, meta tags
- ~~Push notifications~~ — FCM completo (cliente + servidor + trigger)
- ~~Icono actualizado~~ — logo_sin_fondo.png en web, PWA y OG image
- ~~Endurecer Firestore rules~~ — restringir create/update por rol con custom claims
- ~~Seguridad cronogramas~~ — colaborador solo ve sus asignaciones, no puede editar

Hecho en esta sesión:
- ~~Logger centralizado~~ — `src/lib/logger.ts` con interfaz unificada
- ~~Error Handler centralizado~~ — `src/lib/error-handler.ts` con `AppError` y `handleFirestoreError()`
- ~~Toast helpers~~ — `src/lib/toast.ts` con `showError()` y `showSuccess()`
- ~~Sentry integrado~~ — `@sentry/nextjs` v10.61.0 con instrumentation, solo en producción
- ~~Vitest configurado~~ — 42 tests pasando (permisos, error handler, utilidades)
- ~~Fragmentación de componentes~~ — 4 páginas >300 líneas refactorizadas:
  - ~~usuarios/page.tsx~~ — extraídos `UsuarioForm` y `UsuarioRow`
  - ~~consultas/page.tsx~~ — extraídos `ConsultaForm` y `ConsultaDetail`
  - ~~eventos/page.tsx~~ — extraído `EventoForm`
  - ~~notificaciones/page.tsx~~ — extraído `NotificacionCard`
- ~~Landing: sección "Nuestros ministerios"~~ — reemplaza "Nuestros Valores" con grid de 7 tarjetas + CTA
- ~~Perfil: mostrar ministerios~~ — badges con color del ministerio en header y campo "Ministerios" en info
- ~~Fix permisos ministerios~~ — líderes solo ven su ministerio en `/ministerios`
- ~~Fix acceso ministerios ajenos~~ — bloquea `/ministerios/[slug]` si no pertenece
- ~~Fix permisos células~~ — bloquea `/ministerios/celulas/[id]` si no es líder/colíder/anfitrión
- ~~Fix eliminación células~~ — solo pastor/admin puede eliminar células
- ~~README.md con roles~~ — nueva sección "Roles y Permisos" con tabla y detalles
- ~~Registro de asistencia~~ — cada usuario marca su asistencia (Presente/Ausente/Justificado)
- ~~Cascade delete asistencias~~ — al borrar evento se eliminan asistencias asociadas
- ~~Notificaciones no se auto-marcan~~ — eliminado auto-read, botón "Marcar como leída" por notificación
- ~~UI notificaciones mejorada~~ — botones mutuamente excluyentes, disponible para todos
- ~~Tipo "aprobacion"~~ — agregado a interfaz `Notificacion`
- ~~Mensaje de notificación de rol~~ — simplificado (sin "Cierra sesión...")
- ~~UI instantánea en consultas~~ — enviar, responder, cerrar, eliminar con optimistic UI
- ~~Botón "Marcar todas como leídas"~~ — disponible para todos los usuarios
- ~~Botón "Eliminar todas las consultas"~~ — consultas (pastor/admin)
- ~~Badge auto-clean~~ — al entrar a /notificaciones y /consultas se marcan como leídas
- ~~Script clean-orphans~~ — cleanup de notificaciones huérfanas
- ~~Fix tickets líder/colaborador~~ — useTickets con queries paralelas, sin índice compuesto
- ~~Feature Células~~ — CRUD completo con tipo, líder/colíder/anfitrión, dirección y horarios
- ~~Cascade delete células~~ — al borrar ministerio se eliminan sus células
- ~~Tab Células en ministerio Celular~~ — listado de células en detalle del ministerio
- ~~Miembros de célula~~ — lista simple de nombres con CRUD
- ~~Reportes semanales de célula~~ — formulario tipo papel con historial

Pendiente (notificaciones push):
- ~~Notificaciones dobles~~ — eliminado `onNotificacionCreated` trigger (causaba doble push). Deploy OK.
- ~~Push notifications no llegaban~~ — fix: payload `data` → `notification` en `sendPushToUser`. Deploy OK.
- ~~"from SIDS" en notificaciones~~ — eliminado `short_name` del manifest.
1. **Verificar si las notificaciones llegan al celular ahora**
   - Enviar un ticket desde la web y revisar en Firebase Console:
     - ¿Aparece un documento en `notificaciones`? Si no, el frontend no lo crea (Firestore rules o error cliente).
      - ¿Aparece en `consultas`? Si no, la consulta tampoco se crea.
   - Firebase Console → Firestore Database → colección `notificaciones` → ordenar por `createdAt` descendente.

2. **Verificar logs de Cloud Functions**
   - `cd functions && firebase functions:log` o Firebase Console → Functions → Logs.
   - Buscar `enviarNotificacionPush`:
     - `"usuario no encontrado"` → el `usuarioId` del notification no coincide con ningún doc en `usuarios`.
     - `"usuario sin fcmTokens"` → el usuario existe pero no tiene tokens FCM guardados.
     - `"push enviado"` → el push se envió correctamente.

3. **Forzar guardado de FCM token desde el teléfono**
    - Abrir la app en el celular, ir a la página de consultas, tocar **Habilitar** cuando aparezca el cartel.
   - Si el cartel no aparece, abrir `https://sids-final.vercel.app/perfil` y verificar que `notificaciones` esté habilitado.
   - Después de Habilitar, esperar 10 segundos y correr: `cd functions && npm run test-push "Test" "Verificar token" "../serviceAccountKey.json"`.
   - Si antes mostraba 2 tokens y después muestra 3+, el teléfono registró el token correctamente.

4. **Probar enviarNotificacionPush directo** (sin pasar por el frontend):
   ```bash
   cd functions && npx ts-node -e "
   import {initializeApp, getApps} from 'firebase-admin/app';
   import {getFirestore} from 'firebase-admin/firestore';
   process.env.GOOGLE_APPLICATION_CREDENTIALS = '../serviceAccountKey.json';
   if (getApps().length === 0) initializeApp();
   const db = getFirestore();
   async function main() {
     const userSnap = await db.collection('usuarios').where('rol', '==', 'pastor').limit(1).get();
     if (userSnap.empty) { console.log('Pastor no encontrado'); return; }
     const pastor = userSnap.docs[0];
     const uid = pastor.data()?.authUid || pastor.id;
     console.log('Pastor UID:', uid, '- nombre:', pastor.data()?.nombre);
     const tokens = pastor.data()?.fcmTokens || [];
     console.log('Tokens:', tokens.length);
     // Llamar a la CF directamente via fetch
     const {getAuth} = await import('firebase-admin/auth');
     const auth = getAuth();
     const customToken = await auth.createCustomToken(uid);
     const res = await fetch('https://southamerica-east1-sids-eb607.cloudfunctions.net/enviarNotificacionPush', {
       method: 'POST',
       headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + customToken},
       body: JSON.stringify({usuarioId: uid, titulo: 'Test directo CF', mensaje: 'Este push se envio directo desde la funcion HTTP'})
     });
     const data = await res.json();
     console.log('Respuesta CF:', JSON.stringify(data, null, 2));
   }
   main().catch(e => console.error(e));
   "
   ```

~~5. **Migrar de `next lint` a ESLint CLI**~~
   - ~~`next lint` se depreca en Next 16. Migrado a ESLint CLI con flat config (`eslint.config.mjs`).~~

## 9. Convenciones y reglas de la casa

- **Documentación**: siempre mantener actualizados `README.md` y `PROJECT.md` después de cambios significativos:
  - `README.md`: cara pública del proyecto (instalación, deploy, comandos, roles)
  - `PROJECT.md`: contexto técnico para retomar sesiones (estado, pendientes, convenciones)
  - Actualizar sección 7 (estado) y sección 8 (pendientes) de PROJECT.md
  - Actualizar README.md si hay cambios en roles, comandos, estructura o funcionalidad pública
- **Versionado** (SemVer): la versión se define en dos lugares que deben mantenerse sincronizados:
  - `package.json` → campo `"version"`
  - `src/lib/version.ts` → constante `APP_VERSION` (se muestra en el sidebar)
  - **Patch** (1.3.0 → 1.3.1): bug fixes, correcciones menores
  - **Minor** (1.3.0 → 1.4.0): features nuevas, mejoras funcionales
  - **Major** (1.3.0 → 2.0.0): breaking changes, reestructuración significativa
  - Siempre actualizar ambos archivos al hacer un cambio de versión
- TypeScript strict en raíz y en `functions/`. El `tsconfig.json` raíz excluye
  `functions/` para que cada codebase use el suyo.
- Sin comentarios en código (regla del system prompt de opencode).
- Sin `console.log` con datos personales (emails, UIDs, tokens) — usar solo
  `console.error` para errores sin exponer PII.
- CORS en Cloud Functions restringido a allowlist (no wildcard `*`).
- Tailwind v4 para dashboard/auth, vanilla CSS (`src/styles/landing.css`) para
  la landing (`/`). Coexisten sin colisión.
- Route groups: `(public)`, `(auth)`, `(dashboard)`.
- Componentes UI en `src/components/ui/` (shadcn/Radix).
- Firebase solo se inicializa en cliente (`typeof window !== "undefined"` en
  `src/lib/firebase.ts`).
- Las Cloud Functions usan región `southamerica-east1` (São Paulo) por cercanía
  a Argentina.
- El client nunca llama `deleteDoc` directo. `eliminarDocumento` en
  `src/lib/firestore.ts` llama a `borrarDocumento` vía HTTP POST con Bearer
  token. Si necesitás borrar algo, agregá el caso en la function y en la
  allowlist.
- Helper `rolLabel()` en `utils.ts` para mostrar nombres de rol legibles.
  Usar en vez de mostrar `u.rol` directamente.

## 10. Para empezar una nueva sesión de opencode

Pegar este prompt (o equivalente) al abrir opencode:

> "Estoy retomando el proyecto SIDS. Leé `PROJECT.md` (contexto técnico) y
> `README.md` (cara pública). Revisá `git status` y `git log --oneline -10`
> para ver el estado, y consultá la sección 'Pendiente' de PROJECT.md para
> saber por dónde seguir."

## 11. Checklist para continuar en casa

### Qué está deployado

| Componente | URL | Estado |
|---|---|---|
| Frontend | `https://sids-final.vercel.app` (y `santaiglesia.com.ar`) | ✅ Actualizado v1.25.2 |
| Cloud Functions | Firebase `southamerica-east1` | ✅ 3 funciones deployadas (borrarDocumento, setRolUsuario, enviarNotificacionPush) |
| Código fuente | GitHub `main` | ✅ Actualizado |

### Qué necesitás en tu PC de casa

1. **Git** — clonar el repo: `git clone https://github.com/Jonitsss/Sids.final.git`
2. **Node.js 20+** — [nodejs.org](https://nodejs.org/)
3. **Firebase CLI** — `npm install -g firebase-tools`
4. **Vercel CLI** — `npm install -g vercel` (ya instalado en esta PC)
5. **Service account key** — el archivo `serviceAccountKey.json` de Firebase. Está en la raíz del proyecto local. **No está en GitHub**. Tenés que descargarlo de Firebase Console → Project Settings → Service Accounts → Generate new private key.
6. **Variables de entorno** — `.env.local` con las credenciales de Firebase (copiar de `.env.local.example`).

### Primeros pasos al llegar a casa

```bash
git clone https://github.com/Jonitsss/Sids.final.git
cd Sids.final
npm install
cd functions && npm install && cd ..
# Copiar serviceAccountKey.json a la raíz
# Copiar .env.local.example a .env.local y completar creds
```

### Para debuggear las notificaciones

1. Correr `npm run test-push` desde `functions/` con serviceAccountKey.json para confirmar que los tokens FCM funcionan
2. Revisar logs de Cloud Functions: `cd functions && firebase functions:log`
3. Si hay problemas, verificar que el payload use `notification` (no `data`) en `sendPushToUser`
