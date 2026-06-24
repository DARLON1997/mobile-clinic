import type { ReactNode } from "react"
import { auth }     from "@/auth"
import { redirect } from "next/navigation"
import { Sidebar }  from "@/components/shared/Sidebar"
import { PatientChatWidget } from "@/components/chat/PatientChatWidget"
import { QueryProvider } from "@/components/providers/QueryProvider"
import { InactivityGuard } from "@/components/providers/InactivityGuard"
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
    return (
      <QueryProvider>
        <InactivityGuard role={role}>
          <AgentShell>{children}</AgentShell>
        </InactivityGuard>
      </QueryProvider>
    )
  }

  const paymentEnabled = process.env.NEXT_PUBLIC_PAYMENT_ENABLED === "true"

  return (
    <QueryProvider>
      <InactivityGuard role={role}>
        <div className="flex min-h-screen bg-[#0A0A0A]">
          <Sidebar role={role} userName={session.user.name ?? session.user.email ?? null} />
          <div className="flex flex-1 flex-col overflow-hidden md:ml-0">
            {role === "PATIENT" && !paymentEnabled && (
              <div style={{
                background: "linear-gradient(135deg, rgba(200,144,106,0.15), rgba(200,144,106,0.05))",
                borderBottom: "1px solid rgba(200,144,106,0.3)",
                padding: "10px 24px",
                textAlign: "center" as const,
                fontSize: "13px",
                color: "#C8906A",
                letterSpacing: "0.04em",
              }}>
                💳 Paiement en ligne bientôt disponible.
              </div>
            )}
            <main className="mc-dashboard flex-1 overflow-y-auto p-4 md:p-8">
              {children}
            </main>
            {role === "PATIENT" && <PatientChatWidget userId={session.user.id} />}
          </div>
        </div>
      </InactivityGuard>
    </QueryProvider>
  )
}
