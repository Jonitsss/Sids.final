import { auth, FUNCTIONS_REGION } from "./firebase"
import type { Administer } from "@/types"

export type RolValido = "pastor" | "administrador"

const FUNCTION_URL = `https://${FUNCTIONS_REGION}-sids-eb607.cloudfunctions.net`

export async function asignarRolUsuario(
  uid: string,
  rol?: RolValido,
  administer?: Administer,
): Promise<void> {
  if (!auth?.currentUser) throw new Error("No hay usuario autenticado.")
  const token = await auth.currentUser.getIdToken()
  const body: Record<string, unknown> = {}
  if (rol) body.rol = rol
  if (administer) body.administer = administer
  const res = await fetch(`${FUNCTION_URL}/setRolUsuario`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Error al asignar rol.")
}
