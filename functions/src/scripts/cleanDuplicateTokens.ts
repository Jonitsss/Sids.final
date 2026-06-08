import { initializeApp, applicationDefault, cert, App } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

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

  const snapshot = await db.collection("usuarios").get();
  console.log(`Total usuarios: ${snapshot.size}`);

  let cleaned = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const tokens: string[] = data.fcmTokens || [];

    if (tokens.length > 1) {
      const lastToken = tokens[tokens.length - 1];
      await doc.ref.update({
        fcmTokens: [lastToken],
        updatedAt: FieldValue.serverTimestamp(),
      });
      console.log(`  ${doc.id}: ${tokens.length} tokens → 1 (kept last)`);
      cleaned++;
    }
  }

  console.log(`✅ ${cleaned} usuarios limpiados (tokens duplicados → 1).`);
  process.exit(0);
}

main().catch((err) => {
  console.error("ERROR:", err?.message || err);
  process.exit(1);
});
