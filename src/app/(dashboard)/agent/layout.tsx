import { auth }     from "@/auth"
import { redirect } from "next/navigation"
import type { ReactNode } from "react"

export default async function AgentLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  if (session?.user.role !== "AGENT_TERRAIN") redirect("/unauthorized")
  return <>{children}</>
}
