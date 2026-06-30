import { initializeApp, applicationDefault, cert, App } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore, FieldValue } from "firebase-admin/firestore"

const COLECCIONES_A_BORRAR = [
  "ministerios",
  "eventos",
  "cronogramas",
  "tareas",
  "asistencias",
  "celulas",
  "ramas_celular",
  "miembros_celula",
  "reporte_celulas",
  "notificaciones",
  "consultas",
  "grupos_escuela_biblica",
  "asistencias_escuela_biblica",
  "cursos_escuela_ministerio",
  "material_escuela_ministerio",
  "asistencias_escuela_ministerio",
  "notas_escuela_ministerio",
  "historial_persona",
  "asignaciones_ministerio",
  "personas",
]

const EMAIL_ADMIN = "jonathan0gab24@gmail.com"

function getApp(): App {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return initializeApp({ credential: applicationDefault() })
  }
  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")
  if (projectId && clientEmail && privateKey) {
    return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })
  }
  throw new Error("Faltan credenciales de Admin SDK")
}

async function main() {
  const keyFile = process.argv[2]
  if (!keyFile) {
    console.error("Uso: npx ts-node src/scripts/resetTotal.ts <path/to/serviceAccountKey.json>")
    process.exit(1)
  }

  process.env.GOOGLE_APPLICATION_CREDENTIALS = keyFile
  const app = getApp()
  const auth = getAuth(app)
  const db = getFirestore(app)

  console.log("🚨 INICIANDO RESET TOTAL")
  console.log("========================")

  // 1. Encontrar usuario admin
  let adminUser
  try {
    adminUser = await auth.getUserByEmail(EMAIL_ADMIN)
    console.log(`✅ Usuario admin encontrado: ${adminUser.uid} (${EMAIL_ADMIN})`)
  } catch {
    console.error(`❌ Usuario ${EMAIL_ADMIN} no encontrado en Auth`)
    process.exit(1)
  }

  // 2. Setear custom claims de admin
  await auth.setCustomUserClaims(adminUser.uid, { rol: "administrador" })
  console.log(`✅ Custom claim 'administrador' asignado`)

  // 3. Actualizar/crear documento en usuarios
  const userRef = db.collection("usuarios").doc(adminUser.uid)
  await userRef.set({
    authUid: adminUser.uid,
    email: EMAIL_ADMIN,
    nombre: "Jonathan",
    apellido: "Admin",
    rol: "administrador",
    ministerioIds: [],
    activo: true,
    notificaciones: true,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true })
  console.log(`✅ Documento en 'usuarios' actualizado`)

  // 4. Borrar todos los demás usuarios de Auth
  const listUsersResult = await auth.listUsers(1000)
  const usersToDelete = listUsersResult.users.filter((u) => u.uid !== adminUser.uid)

  console.log(`🗑️  Borrando ${usersToDelete.length} usuarios de Firebase Auth...`)
  for (const u of usersToDelete) {
    try {
      await auth.deleteUser(u.uid)
      console.log(`   Auth: ${u.email || u.uid} eliminado`)
    } catch (err: any) {
      console.error(`   Auth: Error borrando ${u.uid}:`, err.message)
    }
  }

  // 5. Borrar documentos de usuarios (excepto admin)
  const usuariosSnap = await db.collection("usuarios").get()
  console.log(`🗑️  Borrando ${usuariosSnap.size - 1} documentos de 'usuarios'...`)
  for (const doc of usuariosSnap.docs) {
    if (doc.id !== adminUser.uid) {
      await doc.ref.delete()
    }
  }

  // 6. Borrar todas las colecciones
  for (const coleccion of COLECCIONES_A_BORRAR) {
    const snap = await db.collection(coleccion).limit(500).get()
    if (snap.empty) {
      console.log(`⏭️  ${coleccion}: vacía`)
      continue
    }

    console.log(`🗑️  ${coleccion}: borrando ${snap.size} documentos...`)
    const batch = db.batch()
    for (const doc of snap.docs) {
      batch.delete(doc.ref)
    }
    await batch.commit()

    // Si hay más de 500, repetir
    const remaining = await db.collection(coleccion).limit(1).get()
    if (!remaining.empty) {
      console.log(`   ⚠️  Quedan más documentos en ${coleccion}, ejecutá el script de nuevo`)
    }
  }

  console.log("")
  console.log("========================")
  console.log("✅ RESET COMPLETADO")
  console.log("========================")
  console.log(`👤 Usuario admin: ${EMAIL_ADMIN}`)
  console.log(`🔑 UID: ${adminUser.uid}`)
  console.log(`🛡️  Rol: administrador`)
  console.log("")
  console.log("Todas las colecciones han sido eliminadas.")
  console.log("La app está lista para usar desde cero.")
}

main().catch((err) => {
  console.error("ERROR:", err?.message || err)
  process.exit(1)
})
