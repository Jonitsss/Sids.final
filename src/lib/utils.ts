import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

const ROL_LABELS: Record<string, string> = {
  pastor: "Pastor",
  administrador: "Administrador",
  lider: "Líder de área",
  lider_area: "Encargado de ministerio",
  lider_celula: "Líder de célula",
  colider: "Colíder",
  anfitrion: "Anfitrión",
  maestra_escuela_biblica: "Maestra Esc. Bíblica",
  profesor_escuela_min: "Profesor Esc. Ministerios",
  colaborador: "Colaborador",
}

export function rolLabel(rol?: string): string {
  return ROL_LABELS[rol || ""] || rol || ""
}
