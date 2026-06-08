import { initializeApp, applicationDefault, cert, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function getApp(): App {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return initializeApp({ credential: applicationDefault() });
  }
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (projectId && clientEmail && privateKey) {
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  }
  throw new Error(
    "Configurá credenciales: GOOGLE_APPLICATION_CREDENTIALS o FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY."
  );
}

async function main() {
  const keyFile = process.argv[2];
  if (keyFile) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = keyFile;
  }

  const app = getApp();
  const db = getFirestore(app);

  const snapshot = await db.collection("notificaciones").orderBy("createdAt", "desc").get();
  console.log(`Total notificaciones: ${snapshot.size}`);

  const seen = new Map<string, string[]>();
  const duplicates: string[] = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const key = `${data.usuarioId || ""}_${data.tipo || ""}_${data.referenciaId || ""}_${data.titulo || ""}`;

    if (seen.has(key)) {
      duplicates.push(doc.id);
    } else {
      seen.set(key, [doc.id]);
    }
  }

  if (duplicates.length === 0) {
    console.log("No hay notificaciones duplicadas.");
    process.exit(0);
  }

  console.log(`Eliminando ${duplicates.length} notificaciones duplicadas...`);

  const batch = db.batch();
  for (const id of duplicates) {
    batch.delete(db.collection("notificaciones").doc(id));
  }
  await batch.commit();

  console.log(`✅ ${duplicates.length} duplicados eliminados.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("ERROR:", err?.message || err);
  process.exit(1);
});
