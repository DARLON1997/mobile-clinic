import { auth }     from "@/auth"
import { redirect } from "next/navigation"
import type { ReactNode } from "react"

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  if (session?.user.role !== "SUPER_ADMIN") redirect("/unauthorized")
  return <>{children}</>
}
