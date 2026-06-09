import { initializeApp } from "firebase-admin/app";
import { getFirestore, WriteBatch, QueryDocumentSnapshot, DocumentData } from "firebase-admin/firestore";
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

  let batch = db.batch();
  let batchCount = 0;
  let total = 0;
  let pageToken: QueryDocumentSnapshot<DocumentData> | undefined;

  console.log("Buscando notificaciones huérfanas tipo consulta...");

  do {
    let query = db.collection("notificaciones")
      .orderBy("__name__")
      .limit(500);
    if (pageToken) query = query.startAfter(pageToken);

    const snap = await query.get();
    pageToken = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : undefined;

    for (const doc of snap.docs) {
      const refId = doc.data().referenciaId;
      if (typeof refId !== "string" || !refId.startsWith("consulta:")) continue;

      const consultaId = refId.replace("consulta:", "");
      const consultaDoc = await db.collection("consultas").doc(consultaId).get();
      if (!consultaDoc.exists) {
        batch.delete(doc.ref);
        batchCount++;
        total++;
      }

      if (batchCount >= 400) {
        await commitBatch(batch, batchCount);
        batch = db.batch();
        batchCount = 0;
      }
    }
  } while (pageToken);

  await commitBatch(batch, batchCount);
  console.log(`Total: ${total} notificaciones huérfanas eliminadas.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("ERROR:", err?.message || err);
  process.exit(1);
});
