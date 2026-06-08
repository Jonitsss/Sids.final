import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { logger, setGlobalOptions } from "firebase-functions/v2";

setGlobalOptions({ region: "southamerica-east1", maxInstances: 10 });

initializeApp();
const db = getFirestore();
const auth = getAuth();

const ROLES_DESTRUCTIVOS = new Set(["pastor", "administrador"]);

const ROLES_VALIDOS = new Set([
  "pastor",
  "administrador",
  "lider",
  "colaborador",
]);

const COLECCIONES_PERMITIDAS_PASTOR_ADMIN = new Set([
  "ministerios",
  "eventos",
  "cronogramas",
  "tareas",
  "asistencias",
  "miembros_ministerio",
  "usuarios",
  "notificaciones",
]);

function getRol(token: Record<string, unknown> | undefined): string | null {
  if (!token) return null;
  const r = (token as { rol?: unknown }).rol;
  return typeof r === "string" ? r : null;
}

function isValidId(id: string): boolean {
  return /^[A-Za-z0-9_-]{1,128}$/.test(id);
}

export const borrarDocumento = onCall(async (req) => {
  if (!req.auth) {
    throw new HttpsError("unauthenticated", "Debés estar autenticado.");
  }
  const rol = getRol(req.auth.token);
  const esDestructivo = rol !== null && ROLES_DESTRUCTIVOS.has(rol);

  const data = (req.data || {}) as { coleccion?: unknown; id?: unknown };
  const coleccion = typeof data.coleccion === "string" ? data.coleccion : "";
  const id = typeof data.id === "string" ? data.id : "";

  if (!coleccion || !id) {
    throw new HttpsError(
      "invalid-argument",
      "Parámetros 'coleccion' e 'id' son requeridos."
    );
  }
  if (!isValidId(id)) {
    throw new HttpsError("invalid-argument", "El 'id' tiene un formato inválido.");
  }
  if (!COLECCIONES_PERMITIDAS_PASTOR_ADMIN.has(coleccion)) {
    throw new HttpsError(
      "permission-denied",
      `La colección "${coleccion}" no puede borrarse desde la app.`
    );
  }

  const ref = db.collection(coleccion).doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "El documento no existe.");
  }
  const docData = snap.data() || {};

  if (!esDestructivo) {
    if (coleccion !== "notificaciones") {
      throw new HttpsError(
        "permission-denied",
        "Tu rol no permite eliminar este documento."
      );
    }
    const usuarioId = (docData as { usuarioId?: unknown }).usuarioId;
    if (typeof usuarioId !== "string" || usuarioId !== req.auth.uid) {
      throw new HttpsError(
        "permission-denied",
        "Solo podés eliminar tus propias notificaciones."
      );
    }
  }

  await ref.delete();
  logger.info("documento eliminado", {
    coleccion,
    id,
    por: req.auth.uid,
    rol,
  });
  return { ok: true };
});

export const setRolUsuario = onCall(async (req) => {
  if (!req.auth) {
    throw new HttpsError("unauthenticated", "Debés estar autenticado.");
  }
  const rolActual = getRol(req.auth.token);
  if (rolActual === null || !ROLES_DESTRUCTIVOS.has(rolActual)) {
    throw new HttpsError(
      "permission-denied",
      "Solo pastor o administrador pueden asignar roles."
    );
  }

  const data = (req.data || {}) as { uid?: unknown; rol?: unknown };
  const uid = typeof data.uid === "string" ? data.uid : "";
  const rol = typeof data.rol === "string" ? data.rol : "";

  if (!uid || !isValidId(uid)) {
    throw new HttpsError("invalid-argument", "El 'uid' es requerido y debe ser válido.");
  }
  if (!ROLES_VALIDOS.has(rol)) {
    throw new HttpsError(
      "invalid-argument",
      `Rol "${rol}" no es válido. Valores permitidos: ${Array.from(ROLES_VALIDOS).join(", ")}.`
    );
  }
  if (uid === req.auth.uid && (rol === "lider" || rol === "colaborador")) {
    throw new HttpsError(
      "failed-precondition",
      "No podés degradar tu propio rol desde la app."
    );
  }

  try {
    await auth.setCustomUserClaims(uid, { rol });
  } catch (err) {
    logger.error("setCustomUserClaims falló", { uid, rol, err });
    throw new HttpsError("internal", "No se pudo asignar el custom claim.");
  }

  await db
    .collection("usuarios")
    .doc(uid)
    .set(
      {
        rol,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

  logger.info("rol asignado", { uid, rol, por: req.auth.uid });
  return { ok: true, uid, rol };
});
