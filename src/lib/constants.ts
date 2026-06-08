import {
  Building2,
  Music,
  Volume2,
  Monitor,
  BookOpen,
  Calendar,
} from "lucide-react"

export const MINISTERIOS_PREDETERMINADOS = [
  {
    nombre: "Diáconos",
    descripcion: "Limpieza del templo, orden, recepción y apoyo logístico",
    roles: ["Recepción", "Limpieza", "Apoyo Logístico"],
    color: "#3B82F6",
    icono: "Building2",
  },
  {
    nombre: "Músicos",
    descripcion: "Programación musical y alabanza",
    roles: [
      "Voz Principal",
      "Coros",
      "Guitarra",
      "Bajo",
      "Teclado",
      "Batería",
    ],
    color: "#8B5CF6",
    icono: "Music",
  },
  {
    nombre: "Sonido",
    descripcion: "Control de sonido PA, streaming y escenario",
    roles: ["PA", "Stream", "Escenario"],
    color: "#10B981",
    icono: "Volume2",
  },
  {
    nombre: "Multimedia",
    descripcion: "Pantalla, fotografía, video y cámaras",
    roles: [
      "Pantalla",
      "Fotografía",
      "Video",
      "Cámara 1",
      "Cámara 2",
      "Cámara 3",
      "Director de Cámaras",
    ],
    color: "#F59E0B",
    icono: "Monitor",
  },
  {
    nombre: "Escuela Bíblica",
    descripcion: "Enseñanza y ayuda en clases bíblicas",
    roles: ["Maestro", "Ayudante"],
    color: "#EF4444",
    icono: "BookOpen",
  },
]

export const EVENTOS_PREDETERMINADOS = [
  { dia: "Jueves", titulo: "Reunión General", hora: "20:00", tipo: "reunion_general" },
  { dia: "Viernes", titulo: "Ensayo de Músicos", hora: "20:00", tipo: "ensayo" },
  { dia: "Sábado", titulo: "Reunión de Jóvenes", hora: "20:00", tipo: "jovenes" },
  { dia: "Domingo", titulo: "Reunión General", hora: "10:00", tipo: "reunion_general" },
]

export const DIAS_SEMANA = [
  "Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado",
]

export const MAPA_ICONOS: Record<string, React.ComponentType> = {
  Building2,
  Music,
  Volume2,
  Monitor,
  BookOpen,
  Calendar,
}
