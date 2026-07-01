import { onRequest } from "firebase-functions/v2/https";

import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getMessaging } from "firebase-admin/messaging";
import { logger, setGlobalOptions } from "firebase-functions/v2";
import { randomUUID } from "crypto";

setGlobalOptions({ region: "southamerica-east1", maxInstances: 10 });

initializeApp();
const db = getFirestore();
const auth = getAuth();

async function sendPushToUser(usuarioId: string, titulo: string, mensaje: string) {
  let userSnap = await db.collection("usuarios").doc(usuarioId).get();
  if (!userSnap.exists) {
    const q = await db.collection("usuarios").where("authUid", "==", usuarioId).limit(1).get();
    if (!q.empty) userSnap = q.docs[0];
  }
  if (!userSnap || !userSnap.exists) {
    logger.warn("sendPushToUser: usuario no encontrado", { usuarioId });
    return { sent: false, reason: "usuario_no_encontrado" };
  }

  const allTokens: string[] = userSnap.data()?.fcmTokens || [];
  if (allTokens.length === 0) {
    logger.warn("sendPushToUser: usuario sin fcmTokens", { usuarioId });
    return { sent: false, reason: "sin_tokens" };
  }

  const fcmTokens = [allTokens[allTokens.length - 1]];
  const notificationId = randomUUID();

  logger.info("sendPushToUser: enviando push", { usuarioId, tokenCount: fcmTokens.length, notificationId });

  try {
    const response = await getMessaging().sendEachForMulticast({
      notification: { title: titulo, body: mensaje },
      tokens: fcmTokens,
    });

    if (response.failureCount > 0) {
      const invalidTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          logger.warn("push fallido para token", {
            tokenIndex: idx,
            errorCode: resp.error?.code,
            errorMessage: resp.error?.message,
          });
          if (
            resp.error?.code === "messaging/registration-token-not-registered" ||
            resp.error?.code === "messaging/invalid-registration-token" ||
            resp.error?.code === "messaging/third-party-auth-error" ||
            resp.error?.message?.includes("Provider returned error")
          ) {
            invalidTokens.push(fcmTokens[idx]);
          }
        }
      });
      if (invalidTokens.length > 0) {
        await userSnap.ref.update({
          fcmTokens: FieldValue.arrayRemove(...invalidTokens),
        });
        logger.info("tokens inválidos eliminados", { count: invalidTokens.length, usuarioId });
      }
    }

    logger.info("push enviado", { usuarioId, notificationId, success: response.successCount, failure: response.failureCount });
    return { sent: true, success: response.successCount, failure: response.failureCount };
  } catch (err: any) {
    logger.error("Error enviando push", { error: err?.message });
    return { sent: false, reason: "error", error: err?.message };
  }
}

const ROLES_DESTRUCTIVOS = new Set(["pastor", "administrador"]);

const ROLES_VALIDOS = new Set([
  "pastor",
  "administrador",
  "lider",
  "lider_area",
  "lider_celula",
  "colider",
  "anfitrion",
  "maestra_escuela_biblica",
  "profesor_escuela_min",
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
  "consultas",
  "celulas",
  "ramas_celular",
  "personas",
  "miembros_iglesia",
  "escuela_ministerios",
  "asistencias_escuela_ministerios",
  "notas_escuela_ministerios",
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

const ALLOWED_ORIGINS = [
  "https://santaiglesia.com.ar",
  "https://www.santaiglesia.com.ar",
  "http://localhost:3000",
];

function setCors(res: any, req: any) {
  const origin = req.headers.origin || "";
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
  }
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
  setCors(res, req);
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

    if (coleccion === "usuarios" && esDestructivo) {
      const authUid = docData.authUid;
      if (authUid) {
        try {
          await auth.deleteUser(authUid);
          logger.info("usuario auth eliminado", { authUid, por: uid });
        } catch (err: any) {
          logger.warn("no se pudo eliminar usuario auth", { authUid, error: err?.message });
        }
      }

      const batch = db.batch();
      const notifSnap = await db.collection("notificaciones").where("usuarioId", "==", id).get();
      notifSnap.docs.forEach((doc) => batch.delete(doc.ref));
      if (authUid && authUid !== id) {
        const notifSnap2 = await db.collection("notificaciones").where("usuarioId", "==", authUid).get();
        notifSnap2.docs.forEach((doc) => batch.delete(doc.ref));
      }
      batch.delete(ref);
      await batch.commit();
    } else if (coleccion === "ministerios" && esDestructivo) {
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

      const celulasSnap = await db
        .collection("celulas")
        .where("ministerioId", "==", id)
        .get();
      celulasSnap.docs.forEach((doc) => batch.delete(doc.ref));

      batch.delete(ref);
      await batch.commit();
    } else if (coleccion === "ramas_celular" && esDestructivo) {
      const batch = db.batch();

      const celulasSnap = await db
        .collection("celulas")
        .where("ramaId", "==", id)
        .get();
      celulasSnap.docs.forEach((doc) => batch.delete(doc.ref));

      batch.delete(ref);
      await batch.commit();
    } else if (coleccion === "consultas" && esDestructivo) {
      const batch = db.batch();

      const notifSnap = await db
        .collection("notificaciones")
        .where("referenciaId", "==", `consulta:${id}`)
        .get();
      notifSnap.docs.forEach((doc) => batch.delete(doc.ref));

      batch.delete(ref);
      await batch.commit();
    } else if (coleccion === "eventos" && esDestructivo) {
      const batch = db.batch();

      const cronosSnap = await db
        .collection("cronogramas")
        .where("eventoId", "==", id)
        .get();
      for (const cronDoc of cronosSnap.docs) {
        const prefix = `asignacion:${cronDoc.id}:`;
        const notifSnap = await db
          .collection("notificaciones")
          .where("referenciaId", ">=", prefix)
          .where("referenciaId", "<", prefix + "\uf8ff")
          .get();
        notifSnap.docs.forEach((d) => batch.delete(d.ref));
        batch.delete(cronDoc.ref);
      }

      const asistSnap = await db
        .collection("asistencias")
        .where("eventoId", "==", id)
        .get();
      asistSnap.docs.forEach((d) => batch.delete(d.ref));

      batch.delete(ref);
      await batch.commit();
    } else if (coleccion === "cronogramas" && esDestructivo) {
      const batch = db.batch();

      const prefix = `asignacion:${id}:`;
      const notifSnap = await db
        .collection("notificaciones")
        .where("referenciaId", ">=", prefix)
        .where("referenciaId", "<", prefix + "\uf8ff")
        .get();
      notifSnap.docs.forEach((d) => batch.delete(d.ref));

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
  setCors(res, req);
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

export const enviarNotificacionPush = onRequest(async (req, res) => {
  setCors(res, req);
  if (req.method === "OPTIONS") {
    res.status(200).send();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).send({ error: "Method not allowed" });
    return;
  }

  try {
    await verifyAuth(req);

    const { usuarioId, titulo, mensaje, tipo, referenciaId } = req.body || {};

    if (typeof usuarioId !== "string" || !usuarioId) {
      res.status(400).send({ error: "usuarioId requerido" });
      return;
    }
    if (!isValidId(usuarioId)) {
      res.status(400).send({ error: "usuarioId inválido" });
      return;
    }

    const notifRef = await db.collection("notificaciones").add({
      usuarioId,
      titulo: typeof titulo === "string" ? titulo : "Nueva notificación",
      mensaje: typeof mensaje === "string" ? mensaje : "",
      leido: false,
      tipo: typeof tipo === "string" ? tipo : "tarea",
      referenciaId: typeof referenciaId === "string" ? referenciaId : "",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const result = await sendPushToUser(
      usuarioId,
      typeof titulo === "string" ? titulo : "Nueva notificación",
      typeof mensaje === "string" ? mensaje : ""
    );

    logger.info("notificación creada", { notifId: notifRef.id, usuarioId, pushResult: result });

    res.status(200).send({ ok: true, notifId: notifRef.id, push: result });
  } catch (err: any) {
    logger.error("enviarNotificacionPush error", { error: err?.message });
    const status = err?.status || 500;
    res.status(status).send({ error: err?.message || "Error al enviar notificación." });
  }
});

export const crearCursoEM = onRequest(async (req, res) => {
  setCors(res, req);
  if (req.method === "OPTIONS") { res.status(200).send(); return; }
  if (req.method !== "POST") { res.status(405).send({ error: "Method not allowed" }); return; }

  try {
    const { uid, token } = await verifyAuth(req);
    let rol = getRol(token);
    if (!rol) rol = await getRolFromFirestore(uid, token.email);
    if (!rol || !ROLES_DESTRUCTIVOS.has(rol)) {
      res.status(403).send({ error: "Solo pastor o administrador pueden crear cursos." });
      return;
    }

    const { nombre, encargadoId, profesores } = req.body;
    if (!nombre || !encargadoId) {
      res.status(400).send({ error: "nombre y encargadoId son requeridos." });
      return;
    }

    const docRef = await db.collection("escuela_ministerios").add({
      nombre,
      encargadoId,
      profesores: profesores || [],
      material: [],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    logger.info("curso EM creado", { id: docRef.id, nombre, por: uid });
    res.status(201).json({ id: docRef.id, message: "Curso creado exitosamente" });
  } catch (err: any) {
    logger.error("crearCursoEM error", { error: err?.message });
    res.status(err?.status || 500).send({ error: err?.message || "Error interno." });
  }
});

export const registrarAsistenciaEM = onRequest(async (req, res) => {
  setCors(res, req);
  if (req.method === "OPTIONS") { res.status(200).send(); return; }
  if (req.method !== "POST") { res.status(405).send({ error: "Method not allowed" }); return; }

  try {
    await verifyAuth(req);

    const { escuelaId, usuarioId, fecha, asistio } = req.body;
    if (!escuelaId || !usuarioId || !fecha) {
      res.status(400).send({ error: "escuelaId, usuarioId y fecha son requeridos." });
      return;
    }

    const docRef = await db.collection("asistencias_escuela_ministerios").add({
      escuelaId,
      usuarioId,
      fecha: new Date(fecha),
      asistio: asistio === true,
      createdAt: FieldValue.serverTimestamp(),
    });

    logger.info("asistencia EM registrada", { id: docRef.id, escuelaId, usuarioId });
    res.status(201).json({ id: docRef.id, message: "Asistencia registrada" });
  } catch (err: any) {
    logger.error("registrarAsistenciaEM error", { error: err?.message });
    res.status(err?.status || 500).send({ error: err?.message || "Error interno." });
  }
});

export const registrarNotaEM = onRequest(async (req, res) => {
  setCors(res, req);
  if (req.method === "OPTIONS") { res.status(200).send(); return; }
  if (req.method !== "POST") { res.status(405).send({ error: "Method not allowed" }); return; }

  try {
    await verifyAuth(req);

    const { escuelaId, usuarioId, nota, periodo, comentarios } = req.body;
    if (!escuelaId || !usuarioId || nota === undefined || !periodo) {
      res.status(400).send({ error: "escuelaId, usuarioId, nota y periodo son requeridos." });
      return;
    }
    if (typeof nota !== "number" || nota < 0 || nota > 100) {
      res.status(400).send({ error: "nota debe ser un número entre 0 y 100." });
      return;
    }

    const docRef = await db.collection("notas_escuela_ministerios").add({
      escuelaId,
      usuarioId,
      nota,
      periodo,
      comentarios: comentarios || "",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    logger.info("nota EM registrada", { id: docRef.id, escuelaId, usuarioId, nota, periodo });
    res.status(201).json({ id: docRef.id, message: "Nota registrada" });
  } catch (err: any) {
    logger.error("registrarNotaEM error", { error: err?.message });
    res.status(err?.status || 500).send({ error: err?.message || "Error interno." });
  }
});

