import { auth }     from "@/auth"
import { redirect } from "next/navigation"
import type { ReactNode } from "react"

export default async function CallCenterLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  if (session?.user.role !== "CALL_CENTER_AGENT") redirect("/unauthorized")
  return <>{children}</>
}
