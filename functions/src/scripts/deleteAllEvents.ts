import { initializeApp } from "firebase-admin/app";
import { getFirestore, WriteBatch } from "firebase-admin/firestore";
import * as path from "path";

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

  const confirm = process.argv.includes("--confirm");
  if (!confirm) {
    console.log("Este script borrará TODOS los eventos y sus dependencias (cronogramas, notificaciones).");
    console.log("Ejecutá: npm run delete-events -- --confirm");
    process.exit(0);
  }

  let batch = db.batch();
  let batchCount = 0;
  let totalEventos = 0;
  let totalCronogramas = 0;
  let totalNotifs = 0;
  let pageToken: FirebaseFirestore.QueryDocumentSnapshot | undefined;

  console.log("Borrando todos los eventos...");

  do {
    let query = db.collection("eventos").orderBy("__name__").limit(100);
    if (pageToken) query = query.startAfter(pageToken);

    const snap = await query.get();
    pageToken = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : undefined;

    for (const eventoDoc of snap.docs) {
      const eventoId = eventoDoc.id;

      const cronosSnap = await db
        .collection("cronogramas")
        .where("eventoId", "==", eventoId)
        .get();

      for (const cronDoc of cronosSnap.docs) {
        const prefix = `asignacion:${cronDoc.id}:`;
        const notifSnap = await db
          .collection("notificaciones")
          .where("referenciaId", ">=", prefix)
          .where("referenciaId", "<", prefix + "\uf8ff")
          .get();

        notifSnap.docs.forEach((d) => {
          batch.delete(d.ref);
          batchCount++;
          totalNotifs++;
        });

        batch.delete(cronDoc.ref);
        batchCount++;
        totalCronogramas++;
      }

      batch.delete(eventoDoc.ref);
      batchCount++;
      totalEventos++;

      if (batchCount >= 400) {
        await commitBatch(batch, batchCount);
        batch = db.batch();
        batchCount = 0;
      }
    }
  } while (pageToken);

  await commitBatch(batch, batchCount);

  console.log(`\nResumen:`);
  console.log(`  Eventos eliminados: ${totalEventos}`);
  console.log(`  Cronogramas eliminados: ${totalCronogramas}`);
  console.log(`  Notificaciones eliminadas: ${totalNotifs}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("ERROR:", err?.message || err);
  process.exit(1);
});
