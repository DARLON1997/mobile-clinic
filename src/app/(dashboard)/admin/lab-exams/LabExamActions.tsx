"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type Agent = { id: string; agentProfile: { firstName: string; lastName: string } | null }
type Exam = { id: string; status: string; resultFileUrl: string | null }

export function LabExamActions({ exam, agents }: { exam: Exam; agents: Agent[] }) {
  const router = useRouter()
  const [agentId,     setAgentId]     = useState("")
  const [resultUrl,   setResultUrl]   = useState("")
  const [resultNotes, setResultNotes] = useState("")
  const [loading,     setLoading]     = useState(false)

  async function assign() {
    if (!agentId) return
    setLoading(true)
    await fetch(`/api/lab-exams/${exam.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId }),
    })
    setLoading(false)
    router.refresh()
  }

  async function uploadResults() {
    if (!resultUrl) return
    setLoading(true)
    await fetch(`/api/lab-exams/${exam.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resultFileUrl: resultUrl, resultNotes }),
    })
    setLoading(false)
    setResultUrl(""); setResultNotes("")
    router.refresh()
  }

  if (exam.status === "PENDING") {
    return (
      <div className="flex items-center gap-2">
        <select value={agentId} onChange={e => setAgentId(e.target.value)}
          className="rounded-lg border border-gray-200 px-2 py-1 text-xs focus:outline-none">
          <option value="">Choisir agent...</option>
          {agents.map(a => (
            <option key={a.id} value={a.id}>
              {a.agentProfile ? `${a.agentProfile.firstName} ${a.agentProfile.lastName}` : a.id}
            </option>
          ))}
        </select>
        <button onClick={assign} disabled={!agentId || loading}
          className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {loading ? "..." : "Assigner"}
        </button>
      </div>
    )
  }

  if (exam.status === "SAMPLE_COLLECTED" || exam.status === "IN_ANALYSIS") {
    return (
      <div className="space-y-1">
        <input value={resultUrl} onChange={e => setResultUrl(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-2 py-1 text-xs focus:outline-none"
          placeholder="URL PDF résultats (Cloudinary)..." />
        <input value={resultNotes} onChange={e => setResultNotes(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-2 py-1 text-xs focus:outline-none"
          placeholder="Commentaires (optionnel)..." />
        <button onClick={uploadResults} disabled={!resultUrl || loading}
          className="rounded-lg bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50">
          {loading ? "..." : "Publier résultats"}
        </button>
      </div>
    )
  }

  if (exam.status === "RESULTS_READY" && exam.resultFileUrl) {
    return (
      <a href={exam.resultFileUrl} target="_blank" rel="noreferrer"
        className="rounded-lg bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200">
        Voir résultats
      </a>
    )
  }

  return <span className="text-xs text-gray-400">—</span>
}
