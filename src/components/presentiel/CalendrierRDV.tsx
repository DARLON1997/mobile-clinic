"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"

const HOURS = [
  "07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00",
]

const groups = [
  { label: "Matin", range: [0, 10] },
  { label: "Après-midi", range: [10, 20] },
  { label: "Soir", range: [20, 29] },
]

function buildCalendarDays(currentMonth: Date) {
  const weeks: Array<Array<Date | null>> = []
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
  const startDay = (firstDay.getDay() + 6) % 7
  let day = new Date(firstDay)
  day.setDate(day.getDate() - startDay)

  for (let week = 0; week < 6; week++) {
    const row: Array<Date | null> = []
    for (let i = 0; i < 7; i++) {
      row.push(new Date(day))
      day.setDate(day.getDate() + 1)
    }
    weeks.push(row)
  }
  return weeks
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

interface CalendrierRDVProps {
  doctorId: string
  onDateTimeSelect: (dateTime: Date) => void
}

export function CalendrierRDV({ doctorId, onDateTimeSelect }: CalendrierRDVProps) {
  const today = useMemo(() => {
    const t = new Date()
    t.setHours(0, 0, 0, 0)
    return t
  }, [])

  const [currentMonth, setCurrentMonth] = useState(new Date(today))
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [takenSlots, setTakenSlots] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const days = currentMonth.getDate()
    if (days !== 1) {
      const m = new Date(currentMonth)
      m.setDate(1)
      setCurrentMonth(m)
    }
  }, [currentMonth])

  useEffect(() => {
    if (!selectedDate) return
    setLoading(true)
    const dateParam = selectedDate.toISOString().slice(0, 10)
    fetch(`/api/presentiel/creneaux-pris?doctorId=${doctorId}&date=${dateParam}`)
      .then((res) => res.json())
      .then((json) => setTakenSlots(json.creneauxPris ?? []))
      .catch(() => setTakenSlots([]))
      .finally(() => setLoading(false))
  }, [doctorId, selectedDate])

  useEffect(() => {
    if (!selectedDate) return
    setSelectedTime(null)
  }, [selectedDate])

  useEffect(() => {
    if (selectedTime && takenSlots.includes(selectedTime)) {
      setSelectedTime(null)
    }
  }, [selectedTime, takenSlots])

  const weeks = useMemo(() => buildCalendarDays(currentMonth), [currentMonth])

  const selectedDateLabel = selectedDate
    ? selectedDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
    : "Aucune date sélectionnée"

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between pb-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">Choisissez votre date</p>
            <p className="text-xs text-gray-500">Tous les jours futurs sont disponibles.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}>
              ←
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}>
              →
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-gray-500">
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((label) => (
            <div key={label} className="py-2">{label}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2 text-sm">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="contents">
              {week.map((date, index) => {
                const isCurrentMonth = date?.getMonth() === currentMonth.getMonth()
                const isPast = date !== null && date < today
                const selected = selectedDate && date !== null && isSameDay(selectedDate, date)
                return (
                  <button
                    key={index}
                    type="button"
                    disabled={!date || !isCurrentMonth || isPast}
                    onClick={() => date && setSelectedDate(new Date(date))}
                    className={
                      `calendrier-jour ${selected ? 'selected' : ''} ${isPast ? 'past' : ''} ${!isCurrentMonth ? 'opacity-40 pointer-events-none' : ''}`
                    }
                  >
                    {date?.getDate()}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs text-emerald-600">✅ Tous les jours disponibles. Seuls les jours passés sont bloqués.</p>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">Choisissez votre heure</p>
            <p className="text-xs text-gray-500">Tous les créneaux de 07:00 à 21:00 sont ouverts.</p>
          </div>
          <p className="text-xs text-gray-500">{selectedDateLabel}</p>
        </div>

        {loading && (
          <div className="py-8 text-center text-sm text-gray-500">Chargement des créneaux pris…</div>
        )}

        {!loading && (
          <div className="space-y-4">
            {groups.map(({ label, range }) => (
              <div key={label}>
                <p className="mb-2 text-xs uppercase tracking-[0.18em] text-gray-400">{label}</p>
                <div className="creneaux-grid">
                  {HOURS.slice(range[0], range[1]).map((slot) => {
                    const taken = takenSlots.includes(slot)
                    const selected = selectedTime === slot
                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={!selectedDate || taken}
                        onClick={() => setSelectedTime(slot)}
                        className={
                          `creneau-btn ${selected ? 'selected' : ''} ${taken ? 'taken' : ''}`
                        }
                      >
                        {slot}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
          💡 Vous choisissez librement votre créneau. Notre équipe confirmera votre demande dans les plus brefs délais.
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-gray-600">
          <p className="font-semibold">Créneau sélectionné :</p>
          <p>{selectedDate ? `${selectedDate.toLocaleDateString('fr-FR')} ${selectedTime ?? ''}` : 'Aucun'}</p>
        </div>
        <Button
          disabled={!selectedDate || !selectedTime}
          onClick={() => {
            if (!selectedDate || !selectedTime) return
            const date = new Date(selectedDate)
            const [hours, minutes] = selectedTime.split(":").map(Number)
            date.setHours(hours, minutes, 0, 0)
            onDateTimeSelect(date)
          }}
          className="w-full sm:w-auto"
        >
          Confirmer le créneau
        </Button>
      </div>
    </div>
  )
}
