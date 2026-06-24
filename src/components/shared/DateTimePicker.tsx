"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

const MOIS = [
  "Janvier","Février","Mars","Avril","Mai","Juin",
  "Juillet","Août","Septembre","Octobre","Novembre","Décembre",
]
const JOURS_ABBR = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"]
const HEURES = [7,8,9,10,11,12,13,14,15,16,17,18,19,20]
const MINUTES = [0,15,30,45]

function pad(n: number) { return String(n).padStart(2, "0") }

type Props = {
  value: Date | null
  onChange: (date: Date) => void
  minDate?: Date
}

export function DateTimePicker({ value, onChange, minDate }: Props) {
  const today = new Date()
  const min   = minDate ?? new Date(Date.now() + 5 * 60 * 1000)
  const minDay = new Date(min.getFullYear(), min.getMonth(), min.getDate())

  const [year,  setYear]  = useState(value?.getFullYear()  ?? today.getFullYear())
  const [month, setMonth] = useState(value?.getMonth()     ?? today.getMonth())
  const [selDay,   setSelDay]   = useState<Date | null>(value ?? null)
  const [selHour,  setSelHour]  = useState<number | null>(value?.getHours()   ?? null)
  const [selMin,   setSelMin]   = useState<number | null>(value?.getMinutes() ?? null)

  function emit(d: Date, h: number, m: number) {
    const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m, 0, 0)
    onChange(dt)
  }

  function pickDay(d: Date) {
    setSelDay(d)
    if (selHour !== null && selMin !== null) emit(d, selHour, selMin)
  }

  function pickHour(h: number) {
    setSelHour(h)
    if (selDay && selMin !== null) emit(selDay, h, selMin)
  }

  function pickMin(m: number) {
    setSelMin(m)
    if (selDay && selHour !== null) emit(selDay, selHour, m)
  }

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  // Grille du mois
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7 // Lun=0
  const daysCount = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array<null>(firstDow).fill(null),
    ...Array.from({ length: daysCount }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  function isDisabled(day: number) {
    return new Date(year, month, day) < minDay
  }
  function isSel(day: number) {
    return selDay?.getFullYear() === year
      && selDay?.getMonth() === month
      && selDay?.getDate() === day
  }
  function isToday(day: number) {
    return today.getFullYear() === year
      && today.getMonth() === month
      && today.getDate() === day
  }

  return (
    <div className="space-y-4">
      {/* Calendrier */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        {/* Navigation mois */}
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={prevMonth}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold text-gray-900">
            {MOIS[month]} {year}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* En-têtes jours */}
        <div className="mb-1 grid grid-cols-7">
          {JOURS_ABBR.map(j => (
            <div key={j} className="py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              {j}
            </div>
          ))}
        </div>

        {/* Cellules */}
        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((day, i) =>
            day === null ? <div key={i} /> : (
              <button
                key={i}
                type="button"
                disabled={isDisabled(day)}
                onClick={() => pickDay(new Date(year, month, day))}
                className={cn(
                  "mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition-colors",
                  isDisabled(day) && "cursor-not-allowed text-gray-300",
                  !isDisabled(day) && !isSel(day) && "text-gray-800 hover:bg-blue-50 hover:text-blue-700",
                  !isDisabled(day) && isToday(day) && !isSel(day) && "ring-1 ring-blue-300",
                  isSel(day) && "bg-blue-600 text-white shadow-sm",
                )}
              >
                {day}
              </button>
            )
          )}
        </div>
      </div>

      {/* Sélection de l'heure — visible après un jour sélectionné */}
      {selDay && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-gray-900">Heure</p>
          <div className="flex flex-wrap gap-2">
            {HEURES.map(h => (
              <button
                key={h}
                type="button"
                onClick={() => pickHour(h)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  selHour === h
                    ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                    : "border-gray-200 text-gray-700 hover:border-blue-400 hover:text-blue-700"
                )}
              >
                {pad(h)}h
              </button>
            ))}
          </div>

          {selHour !== null && (
            <>
              <p className="mb-3 mt-4 text-sm font-semibold text-gray-900">Minutes</p>
              <div className="grid grid-cols-4 gap-2">
                {MINUTES.map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => pickMin(m)}
                    className={cn(
                      "rounded-lg border py-2.5 text-sm font-medium transition-colors",
                      selMin === m
                        ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                        : "border-gray-200 text-gray-700 hover:border-blue-400 hover:text-blue-700"
                    )}
                  >
                    :{pad(m)}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Récapitulatif date + heure sélectionnées */}
      {selDay && selHour !== null && selMin !== null && (
        <p className="text-sm font-medium text-blue-700">
          ✓{" "}
          {new Date(selDay.getFullYear(), selDay.getMonth(), selDay.getDate(), selHour, selMin)
            .toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          {" à "}
          {pad(selHour)}:{pad(selMin)}
        </p>
      )}
    </div>
  )
}
