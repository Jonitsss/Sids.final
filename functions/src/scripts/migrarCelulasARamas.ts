import { initializeApp, applicationDefault, cert, App } from "firebase-admin/app"
import { getFirestore, FieldValue } from "firebase-admin/firestore"

const RAMAS_CONFIG: Record<string, { nombre: string; tipo: string }> = {
  mujeres: { nombre: "Rama de Mujeres", tipo: "mujeres" },
  hombres: { nombre: "Rama de Hombres", tipo: "hombres" },
  adolescentes_varones: { nombre: "Rama de Adolescentes Varones", tipo: "adolescentes_varones" },
  adolescentes_mujeres: { nombre: "Rama de Adolescentes Mujeres", tipo: "adolescentes_mujeres" },
  matrimonios: { nombre: "Rama de Matrimonios", tipo: "matrimonios" },
}

function getApp(): App {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return initializeApp({ credential: applicationDefault() })
  }
  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")
  if (projectId && clientEmail && privateKey) {
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    })
  }
  throw new Error(
    "Configurá credenciales de Admin SDK: pasá un JSON como argumento, " +
      "o definí GOOGLE_APPLICATION_CREDENTIALS, " +
      "o FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY."
  )
}

async function main() {
  const keyFile = process.argv[2]
  if (keyFile) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = keyFile
  }

  const app = getApp()
  const db = getFirestore(app)

  const ministeriosSnap = await db.collection("ministerios").where("nombre", "==", "Celular").where("activo", "==", true).limit(1).get()
  if (ministeriosSnap.empty) {
    console.error("No se encontró el ministerio 'Celular'")
    process.exit(1)
  }
  const ministerioCelular = ministeriosSnap.docs[0]
  const ministerioId = ministerioCelular.id
  console.log(`Ministerio Celular encontrado: ${ministerioId}`)

  const celulasSnap = await db.collection("celulas").where("activo", "==", true).get()
  if (celulasSnap.empty) {
    console.log("No hay células activas para migrar.")
    process.exit(0)
  }

  const celulasPorTipo: Record<string, any[]> = {}
  for (const doc of celulasSnap.docs) {
    const data = doc.data()
    const tipo = data.tipo || "mujeres"
    if (!celulasPorTipo[tipo]) celulasPorTipo[tipo] = []
    celulasPorTipo[tipo].push({ id: doc.id, ...data })
  }

  const ramasCreadas: Record<string, string> = {}

  for (const [tipo, celulas] of Object.entries(celulasPorTipo)) {
    const config = RAMAS_CONFIG[tipo] || { nombre: `Rama de ${tipo}`, tipo }
    const ramaRef = db.collection("ramas_celular").doc()
    await ramaRef.set({
      nombre: config.nombre,
      tipo: config.tipo,
      encargadoId: null,
      descripcion: `",
      ministerioId,
      activo: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
    ramasCreadas[tipo] = ramaRef.id
    console.log(`✅ Rama creada: ${config.nombre} (${ramaRef.id}) — ${celulas.length} células`)
  }

  let actualizadas = 0
  for (const [tipo, celulas] of Object.entries(celulasPorTipo)) {
    const ramaId = ramasCreadas[tipo]
    for (const c of celulas) {
      await db.collection("celulas").doc(c.id).update({
        ramaId,
        updatedAt: FieldValue.serverTimestamp(),
      })
      actualizadas++
    }
  }

  console.log(`\n🎉 Migración completa:`)
  console.log(`   Ramas creadas: ${Object.keys(ramasCreadas).length}`)
  console.log(`   Células actualizadas: ${actualizadas}`)
  console.log(`\n⚠️  Acción requerida: Asigná encargados a cada rama desde la app.`)
}

main().catch((err) => {
  console.error("ERROR:", err?.message || err)
  process.exit(1)
})
