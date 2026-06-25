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

const COLLECTIONS_TO_DELETE = [
  "ministerios",
  "celulas",
  "miembros_celula",
  "reporte_celulas",
];

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
    console.log("Este script eliminará TODOS los documentos de:");
    console.log("  - ministerios");
    console.log("  - celulas");
    console.log("  - miembros_celula");
    console.log("  - reporte_celulas");
    console.log("  - notificaciones de tipo ministerio");
    console.log("  - ministerioIds de todos los usuarios");
    console.log("");
    console.log("Ejecutá con --confirm para proceder.");
    return;
  }

  console.log("Eliminando datos...\n");

  let totalCount = 0;

  for (const col of COLLECTIONS_TO_DELETE) {
    const snap = await db.collection(col).get();
    let batch = db.batch();
    let count = 0;

    for (const doc of snap.docs) {
      batch.delete(doc.ref);
      count++;
      totalCount++;

      if (count % 500 === 0) {
        await commitBatch(batch, count);
        batch = db.batch();
        count = 0;
      }
    }

    await commitBatch(batch, count);
    console.log(`  ${col}: ${count} documentos eliminados`);
  }

  const notifSnap = await db
    .collection("notificaciones")
    .where("tipo", "==", "ministerio")
    .get();

  let notifBatch = db.batch();
  let notifCount = 0;

  for (const doc of notifSnap.docs) {
    notifBatch.delete(doc.ref);
    notifCount++;
    totalCount++;

    if (notifCount % 500 === 0) {
      await commitBatch(notifBatch, notifCount);
      notifBatch = db.batch();
      notifCount = 0;
    }
  }

  await commitBatch(notifBatch, notifCount);
  console.log(`  notificaciones (ministerio): ${notifCount} eliminadas`);

  const userSnap = await db.collection("usuarios").get();
  let usersUpdated = 0;

  for (const doc of userSnap.docs) {
    const data = doc.data();
    if (Array.isArray(data.ministerioIds) && data.ministerioIds.length > 0) {
      await doc.ref.update({
        ministerioIds: [],
        updatedAt: new Date(),
      });
      usersUpdated++;
    }
  }

  console.log(`  usuarios (ministerioIds limpiados): ${usersUpdated}`);
  console.log(`\n  Total eliminado: ${totalCount}`);
  console.log("\nListo. Las colecciones están vacías.");
}

main()
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  })
  .then(() => process.exit(0));
