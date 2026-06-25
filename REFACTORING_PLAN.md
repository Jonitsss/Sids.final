# Plan de Refactoring SIDS — Enfoque Targeted

> Plan realista basado en el estado actual del código.
> ~34 horas de trabajo distribuidas en 5 prioridades.
> Cada prioridad es independiente: se puede pausar entre ellas.

---

## Estado actual

| Aspecto | Estado |
|---------|--------|
| TypeScript strict | ✅ Ya activado |
| Zustand store | ✅ `dashboardStore` funciona con listeners en tiempo real |
| Firestore helpers | ✅ `src/lib/firestore.ts` con helpers genéricos reutilizables |
| CSS dual | ✅ Landing vanilla + Dashboard Tailwind (conviven sin conflicto) |
| Roles y permisos | ✅ Implementados (scoping por `ministerioIds`, `liderId`, etc.) |
| Error handling | ❌ No hay manejo centralizado de errores |
| Logging | ❌ No hay logger estructurado |
| Error tracking | ❌ No hay Sentry ni similar |
| Tests | ❌ No hay tests |
| CI/CD | ❌ No hay GitHub Actions |

---

## Lo que NO vamos a hacer

| Descartado | Motivo |
|------------|--------|
| AppStore centralizado (mega-store) | Anti-pattern Zustand. El store actual funciona con listeners en tiempo real. Stores pequeños por dominio es mejor. |
| Zod schemas para todo | Duplica TypeScript types. Solo útil para formularios y APIs externas, no para cada lectura de Firestore. |
| Firestore API wrapper | Capa extra sin valor. Los helpers actuales (`obtenerDocumentos`, `crearDocumento`, etc.) ya son suficientes. |
| Consolidar CSS vanilla a Tailwind | Landing usa vanilla CSS por diseño (AGENTS.md). Convertir 700+ líneas es esfuerzo sin beneficio. |
| Playwright E2E tests | Overkill para el tamaño del equipo. Primero unit tests, después E2E. |

---

## Prioridad 1: Error Handling + Logger + Sentry

**Tiempo estimado:** ~12 horas

### 1.1 — Logger centralizado (2h)

**Archivo nuevo:** `src/lib/logger.ts`

- Métodos: `info`, `warn`, `error`, `debug`
- En desarrollo: `console` con formato `[LEVEL] message`
- En producción: silencioso (solo errores van a Sentry)
- Sin `console.log` con datos personales (regla del proyecto)

**Checklist:**
- [ ] `src/lib/logger.ts` creado
- [ ] `npm run build` sin errores
- [ ] Reemplazar `console.log`/`console.error` existentes por `logger` en archivos clave

### 1.2 — Error Handler centralizado (4h)

**Archivo nuevo:** `src/lib/error-handler.ts`

- Clase `AppError` con `code`, `message`, `statusCode`, `details`
- Función `handleFirestoreError(error, context)` que mapea errores de Firebase a `AppError`:
  - `permission-denied` → 403 "No tenés permisos"
  - `not-found` → 404 "No encontrado"
  - `unauthenticated` → 401 "Debes estar autenticado"
  - `invalid-argument` → 400 "Datos inválidos"
  - default → 500 con mensaje original
- Hook `useErrorHandler()` para componentes:
  - Muestra toast con mensaje amigable (ya usamos `sonner`)
  - Loguea el error con `logger`

**Checklist:**
- [ ] `src/lib/error-handler.ts` creado con `AppError` y `handleFirestoreError`
- [ ] Hook `useErrorHandler` creado
- [ ] Integrar en 3 componentes críticos (ministerios, eventos, cronogramas)
- [ ] `npm run build` sin errores

### 1.3 — Toasts consistentes (2h)

- Revisar todos los `toast.error()` del proyecto
- Asegurar que usen mensajes consistentes y amigables
- Crear helper `showError(error)` que use `handleFirestoreError` internamente

**Checklist:**
- [ ] Revisar `toast.error` en todos los archivos
- [ ] Crear helper `showError`
- [ ] Migrar al menos 5 archivos al helper

### 1.4 — Sentry integration (4h)

**Archivo nuevo:** `sentry.client.config.ts` + `sentry.server.config.ts` + `sentry.edge.config.ts`

- Instalar `@sentry/nextjs`
- Configurar DSN como env var (`NEXT_PUBLIC_SENTRY_DSN`)
- Integrar con `logger.ts`: errores en producción van a Sentry
- Configurar `tracesSampleRate` bajo en producción (0.1)
- Configurar `replaysOnErrorSampleRate` (1.0)
- Actualizar `logger.ts` para enviar a Sentry en producción

**Checklist:**
- [ ] `@sentry/nextjs` instalado
- [ ] Configs creadas (client, server, edge)
- [ ] `NEXT_PUBLIC_SENTRY_DSN` agregado a `.env.local.example`
- [ ] `logger.ts` integrado con Sentry
- [ ] `npm run build` sin errores
- [ ] Verificar que errores aparecen en sentry.io

---

## Prioridad 2: Tests de Permisos y Lógica Crítica

**Tiempo estimado:** ~8 horas

### 2.1 — Setup Vitest (2h)

- Instalar `vitest`, `@testing-library/react`, `jsdom`
- Configurar `vitest.config.ts`
- Agregar script `"test": "vitest"` en `package.json`

**Checklist:**
- [ ] `vitest` instalado
- [ ] `vitest.config.ts` configurado
- [ ] Script `npm test` funcionando
- [ ] Un test de ejemplo pasando

### 2.2 — Tests de roles y permisos (4h)

**Archivo nuevo:** `src/lib/roles.spec.ts`

Testear la lógica de permisos que ya implementamos:

- `pastor` y `administrador` pueden borrar todo
- `lider` solo ve sus ministerios (`ministerioIds`)
- `lider_celula` solo edita su célula (`liderId === userData.id`)
- `colider` solo gestiona miembros de su célula
- `colaborador` solo ve sus asignaciones
- `RoleGuard` redirige correctamente
- `ProtectedRoute` bloquea usuarios no autenticados y no activos

**Checklist:**
- [ ] Tests para cada rol (7 roles)
- [ ] Tests para `RoleGuard`
- [ ] Tests para `ProtectedRoute`
- [ ] Tests para `rolLabel()`
- [ ] Cobertura >90% en `roles.ts` y `utils.ts`

### 2.3 — Tests de lógica de negocio (2h)

**Archivo nuevo:** `src/lib/firestore.spec.ts`

- Testear `mapDoc` (conversión de timestamps)
- Testear `slugify` (si existe)
- Testear helpers de `utils.ts`

**Checklist:**
- [ ] Tests para `mapDoc`
- [ ] Tests para helpers de `utils.ts`
- [ ] `npm test` pasa completo

---

## Prioridad 3: Fragmentar Componentes Grandes

**Tiempo estimado:** ~10 horas

### 3.1 — Auditoría de componentes grandes (1h)

Buscar archivos con más de 300 líneas:

```bash
# En src/app y src/components
find src -name "*.tsx" -type f | while read f; do
  lines=$(wc -l < "$f")
  if [ $lines -gt 300 ]; then echo "$f: $lines líneas"; fi
done
```

**Checklist:**
- [ ] Lista de componentes >300 líneas documentada
- [ ] Priorizar por uso y complejidad

### 3.2 — Fragmentar componentes identificados (9h)

Para cada componente >300 líneas:

1. Identificar responsabilidades separadas
2. Extraer sub-componentes en archivos propios
3. El componente padre queda como orquestador (<100 líneas)
4. Cada sub-componente <200 líneas

**Patrón:**
```
ANTES:  page.tsx (500 líneas)
  ↓
DESPUÉS: page.tsx (50 líneas, orquestador)
         ├── ComponentList.tsx (150 líneas)
         ├── ComponentCard.tsx (80 líneas)
         ├── ComponentForm.tsx (120 líneas)
         └── ComponentFilters.tsx (60 líneas)
```

**Checklist:**
- [ ] Cada componente fragmentado <200 líneas
- [ ] Componente padre <100 líneas
- [ ] `npm run build` sin errores después de cada fragmentación
- [ ] Funcionalidad idéntica verificada manualmente

---

## Prioridad 4: Documentación

**Tiempo estimado:** ~4 horas

### 4.1 — Arquitectura (2h)

**Archivo nuevo:** `docs/ARCHITECTURE.md`

Documentar:
- Principios de diseño (stores pequeños por dominio, CSS dual, etc.)
- Flujo de datos: Firestore → hooks → store → componentes
- Estructura de carpetas y responsabilidades
- Convenciones de código

### 4.2 — Roles y permisos (1h)

**Archivo nuevo:** `docs/ROLES.md`

Documentar:
- Tabla de 7 roles con permisos
- Qué puede ver/hacer cada rol
- Cómo se aplican los permisos (Firestore rules + frontend scoping)
- Cómo agregar un nuevo rol

### 4.3 — README update (1h)

- Agregar sección "Arquitectura" con link a `docs/ARCHITECTURE.md`
- Agregar sección "Roles" con link a `docs/ROLES.md`
- Agregar script `npm test` en comandos
- Actualizar versión si corresponde

**Checklist:**
- [ ] `docs/ARCHITECTURE.md` creado
- [ ] `docs/ROLES.md` creado
- [ ] `README.md` actualizado
- [ ] Links verificados

---

## Prioridad 5: GitHub Actions CI/CD

**Tiempo estimado:** ~2 horas

### 5.1 — Workflow de CI (2h)

**Archivo nuevo:** `.github/workflows/ci.yml`

```yaml
name: CI

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run build
      - run: npm test -- --run
```

**Checklist:**
- [ ] `.github/workflows/ci.yml` creado
- [ ] Workflow corre en cada push y PR
- [ ] `lint`, `build` y `test` pasan en CI

---

## Resumen de tiempos

| Prioridad | Tarea | Horas |
|-----------|-------|-------|
| 1 | Logger centralizado | 2 |
| 1 | Error Handler | 4 |
| 1 | Toasts consistentes | 2 |
| 1 | Sentry integration | 4 |
| 2 | Setup Vitest | 2 |
| 2 | Tests de permisos | 4 |
| 2 | Tests de lógica | 2 |
| 3 | Auditoría componentes | 1 |
| 3 | Fragmentar componentes | 9 |
| 4 | Arquitectura docs | 2 |
| 4 | Roles docs | 1 |
| 4 | README update | 1 |
| 5 | GitHub Actions CI | 2 |
| | **TOTAL** | **~36h** |

---

## Estrategia de ramas

```
main                              → Producción estable
├── refactor/error-handling       → Prioridad 1 (PR al terminar)
├── refactor/tests                → Prioridad 2 (PR al terminar)
├── refactor/components           → Prioridad 3 (PR al terminar)
├── refactor/docs                 → Prioridad 4 (PR al terminar)
└── refactor/ci                   → Prioridad 5 (PR al terminar)
```

Cada prioridad es independiente. Se puede pausar, revisar y mergear por separado.

---

## Deploy checklist (por cada PR)

- [ ] `npm run build` exitoso
- [ ] `npm run lint` sin errores nuevos
- [ ] `npm test` pasa
- [ ] Funcionalidad verificada manualmente
- [ ] `PROJECT.md` actualizado
- [ ] `README.md` actualizado si corresponde
- [ ] Versión bump si corresponde
