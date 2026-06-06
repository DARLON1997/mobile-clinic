"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input }  from "@/components/ui/input"
import { FileText, Plus, Trash2 } from "lucide-react"

type PrescriptionLine = { medication: string; dosage: string; duration: string; instructions: string }

interface PrescriptionFormProps {
  appointmentId: string
  patientName:   string | null
  onSaved:       () => void
}

export function PrescriptionForm({ appointmentId, patientName, onSaved }: PrescriptionFormProps) {
  const [lines, setLines] = useState<PrescriptionLine[]>([
    { medication: "", dosage: "", duration: "", instructions: "" },
  ])
  const [notes, setNotes]     = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState("")

  function addLine() {
    setLines((l) => [...l, { medication: "", dosage: "", duration: "", instructions: "" }])
  }

  function updateLine(idx: number, field: keyof PrescriptionLine, value: string) {
    setLines((l) => l.map((line, i) => (i === idx ? { ...line, [field]: value } : line)))
  }

  function removeLine(idx: number) {
    setLines((l) => l.filter((_, i) => i !== idx))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (lines.some((l) => !l.medication.trim())) {
      setError("Veuillez renseigner tous les médicaments.")
      return
    }

    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId, lines, notes }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Erreur.")
      onSaved()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inattendue.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 text-gray-700">
        <FileText className="h-5 w-5 text-blue-600" />
        <h2 className="font-semibold">Ordonnance — {patientName}</h2>
      </div>

      {lines.map((line, idx) => (
        <div key={idx} className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">Médicament {idx + 1}</p>
            {lines.length > 1 && (
              <button type="button" onClick={() => removeLine(idx)} className="text-red-400 hover:text-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="Nom du médicament *" value={line.medication}
              onChange={(e) => updateLine(idx, "medication", e.target.value)} />
            <Input placeholder="Dosage (ex: 500mg)" value={line.dosage}
              onChange={(e) => updateLine(idx, "dosage", e.target.value)} />
            <Input placeholder="Durée (ex: 7 jours)" value={line.duration}
              onChange={(e) => updateLine(idx, "duration", e.target.value)} />
            <Input placeholder="Instructions (ex: 1 cp matin/soir)" value={line.instructions}
              onChange={(e) => updateLine(idx, "instructions", e.target.value)} />
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addLine}
        className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
      >
        <Plus className="h-4 w-4" />
        Ajouter un médicament
      </button>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">Notes complémentaires</label>
        <textarea
          className="min-h-[80px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-600"
          placeholder="Conseils, régime, suivi…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" loading={loading} className="w-full">
        Générer et envoyer l&apos;ordonnance (PDF)
      </Button>
    </form>
  )
}
