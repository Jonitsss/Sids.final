# 🚨 URGENTE — Reglas de Firestore (Firestore Rules)

**Tus reglas actuales:**
```
match /{document=**} {
  allow read, write: if request.time < timestamp.date(2026, 7, 1);
}
```

Eso es la regla de "demo de 30 días" de Firebase. **Permite que CUALQUIERA lea/escriba/borre TODO** y vence el **1 de julio de 2026**. Cuando vence, TODO se bloquea (ni vos vas a poder entrar).

**Tenés ~3 semanas para reemplazarla.**

## Acción inmediata (5 minutos)

### 1. Abrí la consola
https://console.firebase.google.com/project/sids-eb607/firestore/rules

### 2. Borrá TODO el contenido y pegá esto:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() {
      return request.auth != null;
    }

    // usuarios
    match /usuarios/{userId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn();
      allow update: if isSignedIn()
        && (resource.data.authUid == request.auth.uid
            || request.auth.uid == userId);
      allow delete: if false;
    }

    // ministerios
    match /ministerios/{ministerioId} {
      allow read: if isSignedIn();
      allow create, update: if isSignedIn();
      allow delete: if false;
    }

    // eventos
    match /eventos/{eventoId} {
      allow read: if isSignedIn();
      allow create, update: if isSignedIn();
      allow delete: if false;
    }

    // cronogramas
    match /cronogramas/{cronogramaId} {
      allow read: if isSignedIn();
      allow create, update: if isSignedIn();
      allow delete: if false;
    }

    // tareas
    match /tareas/{tareaId} {
      allow read: if isSignedIn();
      allow create, update: if isSignedIn();
      allow delete: if false;
    }

    // notificaciones: SOLO el destinatario
    match /notificaciones/{notifId} {
      allow read: if isSignedIn() && resource.data.usuarioId == request.auth.uid;
      allow create: if false;
      allow update: if isSignedIn() && resource.data.usuarioId == request.auth.uid;
      allow delete: if isSignedIn() && resource.data.usuarioId == request.auth.uid;
    }

    // asistencias
    match /asistencias/{asistenciaId} {
      allow read: if isSignedIn();
      allow create, update: if isSignedIn();
      allow delete: if false;
    }

    // miembros_ministerio
    match /miembros_ministerio/{miembroId} {
      allow read: if isSignedIn();
      allow create, update: if isSignedIn();
      allow delete: if false;
    }

    // Fail-safe: bloquear todo lo no listado
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### 3. Click en **Publish**

Listo. Eso ya no vence nunca, y bloquea el acceso público.

## Verificación

Después de publicar, en la consola debería aparecer el badge **"Published"** (no "Draft"). Si quedó en Draft, clickealo para publicar.

## Próxima iteración (opcional pero recomendado)

Las reglas actuales permiten a CUALQUIER usuario autenticado crear/borrar ministerios, eventos, etc. Para que solo el pastor pueda hacerlo, hay que usar **custom claims** en Firebase Auth. Eso requiere:

1. Una Cloud Function que copie `usuarios.rol` a `auth.token.rol` cuando se crea/modifica un usuario
2. Cambiar las reglas a `if request.auth.token.rol == 'pastor'`

Es un cambio de ~1 hora y se puede hacer después. Lo urgente es reemplazar la regla de 30 días.
