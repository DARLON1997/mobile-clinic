"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type Agent = { id: string; agentProfile: { firstName: string; lastName: string } | null }
type Care  = { id: string; status: string }

export function ElderlyCareActions({ care, agents }: { care: Care; agents: Agent[] }) {
  const router = useRouter()
  const [agentId, setAgentId] = useState("")
  const [loading, setLoading] = useState(false)

  async function assign() {
    if (!agentId) return
    setLoading(true)
    await fetch(`/api/elderly-cares/${care.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId }),
    })
    setLoading(false)
    router.refresh()
  }

  if (care.status === "PENDING") {
    return (
      <div className="flex items-center gap-2">
        <select value={agentId} onChange={e => setAgentId(e.target.value)}
          className="rounded-lg border border-gray-200 px-2 py-1 text-xs focus:outline-none">
          <option value="">Choisir soignant...</option>
          {agents.map(a => (
            <option key={a.id} value={a.id}>
              {a.agentProfile ? `${a.agentProfile.firstName} ${a.agentProfile.lastName}` : a.id}
            </option>
          ))}
        </select>
        <button onClick={assign} disabled={!agentId || loading}
          className="rounded-lg bg-teal-600 px-3 py-1 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-50">
          {loading ? "..." : "Assigner"}
        </button>
      </div>
    )
  }

  return <span className="text-xs text-gray-400">—</span>
}
