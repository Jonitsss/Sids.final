import { auth, FUNCTIONS_REGION } from "./firebase"

export type RolValido = "pastor" | "administrador" | "lider" | "colaborador"

const FUNCTION_URL = `https://${FUNCTIONS_REGION}-sids-eb607.cloudfunctions.net`

export async function asignarRolUsuario(
  uid: string,
  rol: RolValido
): Promise<void> {
  if (!auth?.currentUser) throw new Error("No hay usuario autenticado.")
  const token = await auth.currentUser.getIdToken()
  const res = await fetch(`${FUNCTION_URL}/setRolUsuario`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ uid, rol }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Error al asignar rol.")
}
