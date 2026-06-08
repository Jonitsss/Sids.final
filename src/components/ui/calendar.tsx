"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = {
  mode?: "single"
  selected?: Date
  onSelect?: (date: Date | undefined) => void
  month?: Date
  onMonthChange?: (date: Date) => void
  className?: string
  showOutsideDays?: boolean
  disabled?: (date: Date) => boolean
  fromDate?: Date
  toDate?: Date
}

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

const DAYS = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"]

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function Calendar({
  mode,
  selected,
  onSelect,
  className,
  showOutsideDays = true,
  disabled,
  fromDate,
  toDate,
}: CalendarProps) {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = React.useState(
    selected || today
  )

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)

  const isDisabled = (day: Date) => {
    if (disabled && disabled(day)) return true
    if (fromDate && day < new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate())) return true
    if (toDate && day > new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate())) return true
    return false
  }

  const prevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1))
  }

  const handleDayClick = (day: number) => {
    if (mode !== "single" || !onSelect) return
    const date = new Date(year, month, day)
    if (isDisabled(date)) return
    onSelect(date)
  }

  const isSelected = (day: number) => {
    if (!selected) return false
    return (
      selected.getFullYear() === year &&
      selected.getMonth() === month &&
      selected.getDate() === day
    )
  }

  const isToday = (day: number) => {
    return (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === day
    )
  }

  const days: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) {
    days.push(null)
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(d)
  }

  return (
    <div className={cn("p-3", className)}>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="font-medium text-sm">
          {MONTHS[month]} {year}
        </div>
        <button
          onClick={nextMonth}
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {DAYS.map((day) => (
          <div
            key={day}
            className="text-center text-xs text-muted-foreground font-medium py-1"
          >
            {day}
          </div>
        ))}
        {days.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="h-8" />
          }
          const date = new Date(year, month, day)
          const disabled = isDisabled(date)
          return (
            <button
              key={day}
              onClick={() => handleDayClick(day)}
              disabled={disabled}
              className={cn(
                "h-8 w-8 text-sm rounded-md flex items-center justify-center",
                isSelected(day) && "bg-primary text-primary-foreground",
                isToday(day) && !isSelected(day) && "border border-primary",
                !isSelected(day) && !disabled && "hover:bg-accent",
                disabled && "opacity-40 cursor-not-allowed",
                !isSelected(day) && !disabled && "text-foreground"
              )}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
