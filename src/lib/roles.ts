import { httpsCallable } from "firebase/functions"
import { functions } from "./firebase"

export type RolValido = "pastor" | "administrador" | "lider" | "colaborador"

export async function asignarRolUsuario(
  uid: string,
  rol: RolValido
): Promise<void> {
  if (!functions) {
    throw new Error("Firebase Functions no está inicializado.")
  }
  const fn = httpsCallable<
    { uid: string; rol: RolValido },
    { ok: true; uid: string; rol: RolValido }
  >(functions, "setRolUsuario")
  await fn({ uid, rol })
}
