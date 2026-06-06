import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN:       "Super Admin",
  CALL_CENTER_AGENT: "Call Center",
  MEDECIN:           "Médecin",
  AGENT_TERRAIN:     "Agent",
  PATIENT:           "Patient",
}

export default async function UsersPage() {
  const session = await auth()
  if (session?.user.role !== "SUPER_ADMIN") redirect("/unauthorized")

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, phone: true, role: true, isActive: true, createdAt: true },
  })

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Utilisateurs ({users.length})</h1>
      <div className="grid gap-3">
        {users.map((u) => (
          <Card key={u.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-gray-900">{u.email}</p>
                <p className="text-sm text-gray-500">{u.phone}</p>
              </div>
              <div className="flex gap-2">
                <Badge variant="default">{ROLE_LABELS[u.role]}</Badge>
                <Badge variant={u.isActive ? "success" : "danger"}>
                  {u.isActive ? "Actif" : "Suspendu"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
