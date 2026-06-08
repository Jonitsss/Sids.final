import { initializeApp, applicationDefault, cert, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

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
    "Configurá credenciales de Admin SDK: " +
      "GOOGLE_APPLICATION_CREDENTIALS, " +
      "o FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY."
  );
}

async function main() {
  const title = process.argv[2] || "🧪 Notificación de prueba";
  const body = process.argv[3] || "Este es un mensaje de prueba del sistema SIDS.";

  const keyFile = process.argv[4];
  if (keyFile) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = keyFile;
  }

  const app = getApp();
  const db = getFirestore(app);

  const snapshot = await db.collection("usuarios").get();
  const allTokens: string[] = [];

  snapshot.docs.forEach((doc) => {
    const tokens: string[] = doc.data()?.fcmTokens || [];
    tokens.forEach((t) => {
      if (typeof t === "string" && t.length > 0) {
        allTokens.push(t);
      }
    });
  });

  if (allTokens.length === 0) {
    console.log("No hay usuarios con tokens FCM registrados.");
    process.exit(0);
  }

  console.log(`Enviando push a ${allTokens.length} token(s)...`);

  const response = await getMessaging(app).sendEachForMulticast({
    data: {
      title,
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
    },
    tokens: allTokens,
  });

  console.log(`Éxitos: ${response.successCount}`);
  console.log(`Fallos:  ${response.failureCount}`);

  if (response.failureCount > 0) {
    const invalidTokens: string[] = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        console.log(`  Token[${idx}] FALLÓ: ${resp.error?.code} — ${resp.error?.message}`);
        if (
          resp.error?.code === "messaging/registration-token-not-registered" ||
          resp.error?.code === "messaging/invalid-registration-token" ||
          resp.error?.code === "messaging/third-party-auth-error" ||
          resp.error?.message?.includes("Provider returned error")
        ) {
          invalidTokens.push(allTokens[idx]);
        }
      }
    });
    if (invalidTokens.length > 0) {
      console.log(`Tokens inválidos encontrados: ${invalidTokens.length}`);
    }
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("ERROR:", err?.message || err);
  process.exit(1);
});
