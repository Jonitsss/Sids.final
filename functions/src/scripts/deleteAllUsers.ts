import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, WriteBatch } from "firebase-admin/firestore";
import * as path from "path";

const ADMIN_EMAIL = "jonathan0gab24@gmail.com";

function getApp() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return initializeApp();
  }
  const keyFile = path.join(__dirname, "../../../serviceAccountKey.json");
  process.env.GOOGLE_APPLICATION_CREDENTIALS = keyFile;
  return initializeApp();
}

async function commitBatch(batch: WriteBatch, count: number) {
  if (count > 0) {
    await batch.commit();
    console.log(`  Lote de ${count} documentos eliminados.`);
  }
  return 0;
}

async function main() {
  getApp();
  const db = getFirestore();
  const auth = getAuth();

  const confirm = process.argv.includes("--confirm");
  if (!confirm) {
    console.log("Este script borrará TODOS los usuarios excepto el admin.");
    console.log(`Admin que se mantiene: ${ADMIN_EMAIL}`);
    console.log("Ejecutá: npm run delete-users -- --confirm");
    process.exit(0);
  }

  console.log(`\nBuscando usuarios en Firestore...`);

  const usuariosSnap = await db.collection("usuarios").get();
  console.log(`  Total de usuarios encontrados: ${usuariosSnap.size}`);

  const usuariosAEliminar = usuariosSnap.docs.filter(
    (doc) => doc.data().email !== ADMIN_EMAIL
  );

  console.log(`  Usuarios a eliminar: ${usuariosAEliminar.length}`);
  console.log(`  Usuarios que se mantienen: ${usuariosSnap.size - usuariosAEliminar.length}\n`);

  if (usuariosAEliminar.length === 0) {
    console.log("No hay usuarios para eliminar.");
    process.exit(0);
  }

  let batch = db.batch();
  let batchCount = 0;
  let totalUsuarios = 0;
  let totalAuth = 0;
  let totalNotifs = 0;

  for (const usuarioDoc of usuariosAEliminar) {
    const data = usuarioDoc.data();
    const email = data.email;
    const authUid = data.authUid || usuarioDoc.id;

    console.log(`Eliminando: ${data.nombre} ${data.apellido} (${email})`);

    const notifsSnap = await db
      .collection("notificaciones")
      .where("usuarioId", "==", authUid)
      .get();

    notifsSnap.docs.forEach((d) => {
      batch.delete(d.ref);
      batchCount++;
      totalNotifs++;
    });

    batch.delete(usuarioDoc.ref);
    batchCount++;
    totalUsuarios++;

    try {
      await auth.deleteUser(authUid);
      totalAuth++;
    } catch (err: any) {
      if (err.code === "auth/user-not-found") {
        console.log(`  Auth ya no existía para ${email}`);
      } else {
        console.log(`  Error eliminando auth para ${email}: ${err.message}`);
      }
    }

    if (batchCount >= 400) {
      await commitBatch(batch, batchCount);
      batch = db.batch();
      batchCount = 0;
    }
  }

  await commitBatch(batch, batchCount);

  console.log(`\nResumen:`);
  console.log(`  Usuarios eliminados: ${totalUsuarios}`);
  console.log(`  Cuentas Auth eliminadas: ${totalAuth}`);
  console.log(`  Notificaciones eliminadas: ${totalNotifs}`);
  console.log(`\nListo. Los usuarios ahora deben registrarse desde /register`);
  process.exit(0);
}

main().catch((err) => {
  console.error("ERROR:", err?.message || err);
  process.exit(1);
});
