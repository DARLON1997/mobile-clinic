import { auth }     from "@/auth"
import { redirect } from "next/navigation"
import type { ReactNode } from "react"

export default async function DoctorLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  if (session?.user.role !== "MEDECIN") redirect("/unauthorized")
  return <>{children}</>
}
