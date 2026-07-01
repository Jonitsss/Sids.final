'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'

interface AsistenciaMensual {
  mes: string
  presente: number
  ausente: number
  justificado: number
}

interface PorMinisterio {
  ministerioNombre: string
  ministerioColor: string
  miembros: number
  presente: number
  ausente: number
}

const COLORS = ['#73A243', '#2A6A47', '#DAE953', '#4CAF50', '#FF9800', '#2196F3', '#9C27B0']

export function BarraAsistencia({ data }: { data: AsistenciaMensual[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <XAxis dataKey="mes" fontSize={12} />
        <YAxis fontSize={12} />
        <Tooltip />
        <Legend />
        <Bar dataKey="presente" fill="#73A243" name="Presente" stackId="a" />
        <Bar dataKey="ausente" fill="#ef4444" name="Ausente" stackId="a" />
        <Bar dataKey="justificado" fill="#f59e0b" name="Justificado" stackId="a" />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function LineaAsistencia({ data }: { data: AsistenciaMensual[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <XAxis dataKey="mes" fontSize={12} />
        <YAxis fontSize={12} />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="presente" stroke="#73A243" strokeWidth={2} name="Presente" />
        <Line type="monotone" dataKey="ausente" stroke="#ef4444" strokeWidth={2} name="Ausente" />
        <Line type="monotone" dataKey="justificado" stroke="#f59e0b" strokeWidth={2} name="Justificado" />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function PieDistribucion({ data }: { data: PorMinisterio[] }) {
  const pieData = data.map((m) => ({
    name: m.ministerioNombre,
    value: m.miembros,
    color: m.ministerioColor,
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={pieData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
          label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
        >
          {pieData.map((entry, index) => (
            <Cell key={entry.name} fill={entry.color || COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  )
}
