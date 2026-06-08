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
│   │   ├── index.ts                    # borrarDocumento, setRolUsuario
│   │   └── scripts/setInitialRol.ts    # bootstrap del primer admin
│   ├── package.json
│   ├── tsconfig.json
│   └── .gitignore
├── src/
│   ├── app/                            # (public), (auth), (dashboard)
│   ├── components/                     # ui/ (shadcn), auth/, layout/
│   ├── contexts/                       # AuthContext, ThemeContext
│   ├── hooks/
│   ├── lib/
│   │   ├── firebase.ts                 # inicializa Firebase + Functions
│   │   ├── firestore.ts                # CRUD cliente (delete via CF)
│   │   └── roles.ts                    # asignarRolUsuario(uid, rol)
│   ├── styles/                         # landing.css (vanilla)
│   └── types/
├── public/                             # assets + sitemap generado
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
59498c3 docs: agregar PROJECT.md con contexto técnico para resume de sesión
b337988 feat(deploy): setInitialRol acepta service account JSON inline
ec3534d chore(deploy): agregar deploy.sh y proteger secrets en .gitignore
f13a750 feat(functions): borrado y roles vía Cloud Functions
442e1de chore: cambiar dominio a santaiglesia.com.ar
```

Todo pusheado a `main` en `github.com/Jonitsss/Sids.final`.

## 8. Pendiente para próximas sesiones

Hecho en esta sesión:
- ~~Asignar roles desde la página `/usuarios`~~ — dropdown con `asignarRolUsuario`.
- ~~Auto-refresh del idToken~~ — `getIdToken(true)` en login y después de `asignarRolUsuario`.
- ~~Custom claim sync en login~~ — `login()` busca el documento por Auth UID → authUid → email, y llama `asignarRolUsuario` para setear el claim.
- ~~Cloud Functions: email fallback~~ — `getRolFromFirestore` busca por email si no encuentra por UID/authUid, y auto-linke `authUid`.
- ~~Cloud Functions: sparse doc fix~~ — `setRolUsuario` escribe `rol` al documento real encontrado por email/authUid, no crea documento duplicado.
- ~~firestore.rules: notificaciones read~~ — cambiado a `if isSignedIn()` (el query del cliente filtra por `usuarioId`).
- ~~firestore.rules: notificaciones create~~ — cambiado a `isSignedIn() && usuarioId != request.auth.uid`.

Pendiente:
1. **Endurecer `create/update` por colección con custom claims**
   - En `firestore.rules`, restringir `allow create, update: if ...` a
     `request.auth.token.rol in {pastor, administrador}` para colecciones
     sensibles. El `firestore.rules` ya tiene un comentario TODO al final
     marcando esto.

2. **Migrar de `next lint` a ESLint CLI**
   - `next lint` se depreca en Next 16. Usar `npx @next/codemod@canary
     next-lint-to-eslint-cli .`.

## 9. Convenciones y reglas de la casa

- TypeScript strict en raíz y en `functions/`. El `tsconfig.json` raíz excluye
  `functions/` para que cada codebase use el suyo.
- Sin comentarios en código (regla del system prompt de opencode).
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

## 10. Para empezar una nueva sesión de opencode

Pegar este prompt (o equivalente) al abrir opencode:

> "Estoy retomando el proyecto SIDS. Leé `PROJECT.md` (contexto técnico) y
> `README.md` (cara pública). El último commit es `b337988`. Revisá
> `git status` y `git log --oneline -10` para ver el estado, y consultá
> la sección 'Pendiente' de PROJECT.md para saber por dónde seguir."
