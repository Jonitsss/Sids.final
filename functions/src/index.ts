import { onRequest } from "firebase-functions/v2/https";
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

async function getRolFromFirestore(uid: string, email?: string): Promise<string | null> {
  const userDoc = await db.collection("usuarios").doc(uid).get();
  if (userDoc.exists) {
    const rol = userDoc.data()?.rol;
    if (typeof rol === "string") return rol;
  }
  const q = await db.collection("usuarios").where("authUid", "==", uid).limit(1).get();
  if (!q.empty) {
    const rol = q.docs[0].data()?.rol;
    if (typeof rol === "string") return rol;
  }
  if (email) {
    const emailQ = await db.collection("usuarios").where("email", "==", email.toLowerCase()).limit(1).get();
    if (!emailQ.empty) {
      const doc = emailQ.docs[0];
      const rol = doc.data()?.rol;
      await doc.ref.set({ authUid: uid, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      if (typeof rol === "string") return rol;
    }
  }
  return null;
}

function isValidId(id: string): boolean {
  return /^[A-Za-z0-9_-]{1,128}$/.test(id);
}

function setCors(res: any) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

async function verifyAuth(req: any): Promise<{ uid: string; token: any }> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    throw { status: 401, message: "Debés estar autenticado." };
  }
  const idToken = authHeader.split("Bearer ")[1];
  const decoded = await auth.verifyIdToken(idToken);
  return { uid: decoded.uid, token: decoded };
}

export const borrarDocumento = onRequest(async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") {
    res.status(200).send();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).send({ error: "Method not allowed" });
    return;
  }

  try {
    const { uid, token } = await verifyAuth(req);
    let rol = getRol(token);
    if (!rol) {
      rol = await getRolFromFirestore(uid, token.email);
    }
    const esDestructivo = rol !== null && ROLES_DESTRUCTIVOS.has(rol);

    const { coleccion, id } = req.body || {};

    if (!coleccion || !id) {
      res.status(400).send({ error: "Parámetros 'coleccion' e 'id' son requeridos." });
      return;
    }
    if (!isValidId(id)) {
      res.status(400).send({ error: "El 'id' tiene un formato inválido." });
      return;
    }
    if (!COLECCIONES_PERMITIDAS_PASTOR_ADMIN.has(coleccion)) {
      res.status(403).send({ error: `La colección "${coleccion}" no puede borrarse desde la app.` });
      return;
    }

    const ref = db.collection(coleccion).doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      res.status(404).send({ error: "El documento no existe." });
      return;
    }
    const docData = snap.data() || {};

    if (!esDestructivo) {
      if (coleccion !== "notificaciones") {
        res.status(403).send({ error: "Tu rol no permite eliminar este documento." });
        return;
      }
      const usuarioId = (docData as { usuarioId?: unknown }).usuarioId;
      if (typeof usuarioId !== "string" || usuarioId !== uid) {
        res.status(403).send({ error: "Solo podés eliminar tus propias notificaciones." });
        return;
      }
    }

    if (coleccion === "ministerios" && esDestructivo) {
      const batch = db.batch();

      const notifSnap = await db
        .collection("notificaciones")
        .where("tipo", "==", "ministerio")
        .where("referenciaId", "==", id)
        .get();
      notifSnap.docs.forEach((doc) => batch.delete(doc.ref));

      const usuariosSnap = await db
        .collection("usuarios")
        .where("ministerioIds", "array-contains", id)
        .get();
      usuariosSnap.docs.forEach((doc) => {
        batch.update(doc.ref, {
          ministerioIds: FieldValue.arrayRemove(id),
          updatedAt: FieldValue.serverTimestamp(),
        });
      });

      batch.delete(ref);
      await batch.commit();
    } else {
      await ref.delete();
    }

    logger.info("documento eliminado", { coleccion, id, por: uid, rol });
    res.status(200).send({ ok: true });
  } catch (err: any) {
    logger.error("borrarDocumento error", { error: err?.message, stack: err?.stack });
    const status = err?.status || 500;
    res.status(status).send({ error: err?.message || "Error interno al eliminar." });
  }
});

export const setRolUsuario = onRequest(async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") {
    res.status(200).send();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).send({ error: "Method not allowed" });
    return;
  }

  try {
    const { uid: callerUid, token: callerToken } = await verifyAuth(req);
    const callerRol = await getRolFromFirestore(callerUid, callerToken.email);
    if (!callerRol || !ROLES_DESTRUCTIVOS.has(callerRol)) {
      res.status(403).send({ error: "Solo pastor o administrador pueden asignar roles." });
      return;
    }

    const { uid, rol } = req.body || {};

    if (!uid || !isValidId(uid)) {
      res.status(400).send({ error: "El 'uid' es requerido y debe ser válido." });
      return;
    }
    if (!ROLES_VALIDOS.has(rol)) {
      res.status(400).send({ error: `Rol "${rol}" no es válido.` });
      return;
    }
    if (uid === callerUid && (rol === "lider" || rol === "colaborador")) {
      res.status(400).send({ error: "No podés degradar tu propio rol desde la app." });
      return;
    }

    await auth.setCustomUserClaims(uid, { rol });

    const targetToken = uid === callerUid ? callerToken : await auth.getUser(uid).then(u => ({ email: u.email }));
    const targetEmail = targetToken?.email;

    const q = await db.collection("usuarios").where("authUid", "==", uid).limit(1).get();
    if (!q.empty) {
      await q.docs[0].ref.set(
        { rol, updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );
    } else if (targetEmail) {
      const emailQ = await db.collection("usuarios").where("email", "==", targetEmail.toLowerCase()).limit(1).get();
      if (!emailQ.empty) {
        await emailQ.docs[0].ref.set(
          { rol, authUid: uid, updatedAt: FieldValue.serverTimestamp() },
          { merge: true }
        );
      } else {
        await db.collection("usuarios").doc(uid).set(
          { rol, email: targetEmail, updatedAt: FieldValue.serverTimestamp() },
          { merge: true }
        );
      }
    } else {
      await db.collection("usuarios").doc(uid).set(
        { rol, updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );
    }

    logger.info("rol asignado", { uid, rol, por: callerUid });
    res.status(200).send({ ok: true, uid, rol });
  } catch (err: any) {
    logger.error("setRolUsuario error", { error: err?.message });
    const status = err?.status || 500;
    res.status(status).send({ error: err?.message || "Error al asignar rol." });
  }
});
