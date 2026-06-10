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
    "Configurá credenciales de Admin SDK: definí GOOGLE_APPLICATION_CREDENTIALS, " +
      "o FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY."
  );
}

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.error("Uso: npx ts-node src/scripts/fixSelfRegisteredUser.ts <email>");
    process.exit(1);
  }

  const app = getApp();
  const auth = getAuth(app);
  const db = getFirestore(app);

  const user = await auth.getUserByEmail(email);
  const existingDoc = await db.collection("usuarios").doc(user.uid).get();

  if (existingDoc.exists) {
    console.log(`Documento ya existe para uid=${user.uid}`);
    return;
  }

  await db.collection("usuarios").doc(user.uid).set({
    id: user.uid,
    email: user.email?.toLowerCase() || "",
    nombre: user.displayName?.split(" ")[0] || "",
    apellido: user.displayName?.split(" ").slice(1).join(" ") || "",
    telefono: "",
    rol: "colaborador",
    ministerioIds: [],
    fotoURL: "",
    authUid: user.uid,
    notificaciones: true,
    activo: false,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  console.log(`OK: documento creado para uid=${user.uid} email=${email} activo=false`);
}

main().catch((err) => {
  console.error("ERROR:", err?.message || err);
  process.exit(1);
});
