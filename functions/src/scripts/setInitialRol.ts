import { initializeApp, applicationDefault, cert, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
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
    "Configurá las credenciales de Admin SDK (GOOGLE_APPLICATION_CREDENTIALS o FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY)."
  );
}

async function main() {
  const email = process.argv[2];
  const rol = process.argv[3] || "pastor";
  if (!email) {
    console.error(
      "Uso: npm run set-initial-rol -- <email> [rol=pastor|administrador|lider|colaborador]"
    );
    process.exit(1);
  }

  const app = getApp();
  const auth = getAuth(app);
  const db = getFirestore(app);

  const user = await auth.getUserByEmail(email);
  await auth.setCustomUserClaims(user.uid, { rol });

  await db
    .collection("usuarios")
    .doc(user.uid)
    .set(
      {
        authUid: user.uid,
        email: user.email,
        rol,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

  console.log(`OK: uid=${user.uid} email=${email} rol=${rol}`);
}

main().catch((err) => {
  console.error("ERROR:", err?.message || err);
  process.exit(1);
});
