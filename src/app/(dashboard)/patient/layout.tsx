import { auth }     from "@/auth"
import { redirect } from "next/navigation"
import type { ReactNode } from "react"

export default async function PatientLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  if (session?.user.role !== "PATIENT") redirect("/unauthorized")
  return <>{children}</>
}
