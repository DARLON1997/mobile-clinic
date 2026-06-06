import type { ReactNode } from "react"
import { auth }     from "@/auth"
import { redirect } from "next/navigation"
import { Sidebar }  from "@/components/shared/Sidebar"
import type { UserRole } from "@/types"

function AgentShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {children}
    </div>
  )
}

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")

  const role = session.user.role as UserRole

  if (role === "AGENT_TERRAIN") {
    return <AgentShell>{children}</AgentShell>
  }

  return (
    <div className="flex min-h-screen bg-[#0A0A0A]">
      <Sidebar role={role} userName={session.user.name ?? session.user.email ?? null} />
      <div className="flex flex-1 flex-col overflow-hidden md:ml-0">
        <main className="mc-dashboard flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
