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
│   │       ├── setInitialRol.ts         # bootstrap del primer admin
│   │       └── testPush.ts             # enviar push de prueba a todos los tokens FCM
│   ├── package.json
│   ├── tsconfig.json
│   └── .gitignore
├── src/
│   ├── app/                            # (public), (auth), (dashboard)
│   ├── components/                     # ui/ (shadcn), auth/, layout/
│   ├── contexts/                       # AuthContext, ThemeContext
│   ├── hooks/                          # usePushNotifications, useNotificaciones, etc.
│   ├── lib/
│   │   ├── firebase.ts                 # inicializa Firebase + Functions + Messaging
│   │   ├── firestore.ts                # CRUD cliente (delete via CF)
│   │   ├── messaging.ts                # FCM helpers (requestPermission, onForegroundMessage)
│   │   └── roles.ts                    # asignarRolUsuario(uid, rol)
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

# Deploy orquestado
./deploy.sh                              # flujo completo (prereqs + deploy)
./deploy.sh --deploy-only                # solo deploy
./deploy.sh --set-rol --email X          # solo asignar rol
./deploy.sh --key /ruta/key.json         # custom key path
```

## 7. Estado al cierre de esta sesión (git log)

```
44db013 fix: enviarNotificacionPush HTTP function + testPush.ts + docs
d9ce378 chore: bump 1.4.4 → 1.5.0 + script para testear push notifications
ca014db fix: líderes/colaboradores no veían tickets enviados + notificaciones no llegaban en iOS
244d826 fix: notificaciones push no llegaban si el usuario fue creado por admin (doc ID != auth UID)
```

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
- ~~UI instantánea en consultas~~ — enviar, responder, cerrar, eliminar con optimistic UI
- ~~Botón "Marcar todas como leídas"~~ — notificaciones (pastor/admin)
- ~~Botón "Eliminar todas las consultas"~~ — consultas (pastor/admin)
- ~~Badge auto-clean~~ — al entrar a /notificaciones y /consultas se marcan como leídas
- ~~Script clean-orphans~~ — cleanup de notificaciones huérfanas
- ~~Fix tickets líder/colaborador~~ — useTickets con queries paralelas, sin índice compuesto
- ~~Feature Células~~ — CRUD completo con tipo, líder/colíder/anfitrión, dirección y horarios
- ~~Cascade delete células~~ — al borrar ministerio se eliminan sus células

Pendiente (notificaciones push):
- ~~Notificaciones dobles~~ — eliminado `onNotificacionCreated` trigger (causaba doble push). Deploy OK.
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
| Frontend | `https://sids-final.vercel.app` (y `santaiglesia.com.ar`) | ✅ Actualizado v1.8.0 |
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

### Para debuggear las notificaciones (pendiente #1)

Ver la sección **Pendiente** (punto 1 a 4) más arriba. El flujo recomendado:

1. Abrir Firebase Console → Firestore → ver si hay docs en `notificaciones` después de enviar un ticket
2. Revisar logs de Cloud Functions: `cd functions && firebase functions:log`
3. Correr `npm run test-push` desde `functions/` para confirmar que los tokens FCM funcionan
4. Si todo falla, probar la llamada directa a `enviarNotificacionPush` (comando en sección Pendiente punto 4)
