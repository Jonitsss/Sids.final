"use client"

import { useRef, useState, useEffect } from "react"
import { Evento } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { isSameDay } from "date-fns"

const SUGERENCIAS_REUNION = [
  { titulo: "Reunión General Jueves", hora: "20:00" },
  { titulo: "Reunión General Domingo", hora: "18:00" },
]

interface EventoFormProps {
  form: { titulo: string; fecha: Date; horaInicio: string; tipo: Evento["tipo"] }
  setForm: (fn: (prev: { titulo: string; fecha: Date; horaInicio: string; tipo: Evento["tipo"] }) => { titulo: string; fecha: Date; horaInicio: string; tipo: Evento["tipo"] }) => void
  eventos: Evento[]
  onSubmit: () => void
}

export function EventoForm({ form, setForm, eventos, onSubmit }: EventoFormProps) {
  const [showSuggestions, setShowSuggestions] = useState(false)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  const sugerenciasFiltradas = form.titulo.length >= 3
    ? SUGERENCIAS_REUNION.filter((s) => s.titulo.toLowerCase().includes(form.titulo.toLowerCase()))
    : []

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) setShowSuggestions(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Título</Label>
        <div className="relative" ref={suggestionsRef}>
          <Input value={form.titulo} onChange={(e) => { setForm((prev) => ({ ...prev, titulo: e.target.value })); setShowSuggestions(true) }}
            onFocus={() => setShowSuggestions(true)} placeholder="Ej: Reunión General..." />
          {showSuggestions && sugerenciasFiltradas.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-md z-50">
              {sugerenciasFiltradas.map((s) => (
                <button key={s.titulo} onClick={() => { setForm((prev) => ({ ...prev, titulo: s.titulo, horaInicio: s.hora })); setShowSuggestions(false) }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors">
                  {s.titulo} <span className="text-muted-foreground">({s.hora})</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <Label>Fecha</Label>
        <Calendar mode="single" selected={form.fecha} onSelect={(d) => d && setForm((prev) => ({ ...prev, fecha: d }))}
          hasEvents={(date) => eventos.some((e) => isSameDay(e.fecha, date))} />
      </div>
      <div className="space-y-2">
        <Label>Horario</Label>
        <Input type="time" value={form.horaInicio} onChange={(e) => setForm((prev) => ({ ...prev, horaInicio: e.target.value }))} />
      </div>
      <div className="space-y-2">
        <Label>Tipo</Label>
        <Select value={form.tipo} onValueChange={(v: Evento["tipo"]) => setForm((prev) => ({ ...prev, tipo: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="reunion_general">Reunión General</SelectItem>
            <SelectItem value="reunion_coordinacion">Reunión de Coordinación</SelectItem>
            <SelectItem value="ensayo">Ensayo</SelectItem>
            <SelectItem value="jovenes">Jóvenes</SelectItem>
            <SelectItem value="escuela_biblica">Escuela Bíblica</SelectItem>
            <SelectItem value="evento_especial">Evento Especial</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button onClick={onSubmit} className="w-full">Crear Evento</Button>
    </div>
  )
}
