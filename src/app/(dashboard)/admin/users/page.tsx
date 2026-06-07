import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CreateUserModal } from "@/components/admin/CreateUserModal"

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN:       "Super Admin",
  CALL_CENTER_AGENT: "Call Center",
  MEDECIN:           "Médecin",
  AGENT_TERRAIN:     "Agent",
  PATIENT:           "Patient",
}

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN:       "bg-purple-500/10 text-purple-400 border-purple-500/20",
  CALL_CENTER_AGENT: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  MEDECIN:           "bg-teal-500/10 text-teal-400 border-teal-500/20",
  AGENT_TERRAIN:     "bg-orange-500/10 text-orange-400 border-orange-500/20",
  PATIENT:           "bg-gray-500/10 text-gray-400 border-gray-500/20",
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
      {/* En-tête */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Utilisateurs</h1>
          <p className="text-sm text-gray-500 mt-0.5">{users.length} comptes au total</p>
        </div>
        <CreateUserModal />
      </div>

      {/* Liste */}
      <div className="grid gap-3">
        {users.map((u) => (
          <Card key={u.id} className="border border-gray-100 shadow-sm">
            <CardContent className="flex items-center justify-between p-4">
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate">{u.email}</p>
                <p className="text-sm text-gray-500 mt-0.5">{u.phone}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Inscrit le {new Date(u.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-4">
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[u.role] ?? ""}`}>
                  {ROLE_LABELS[u.role] ?? u.role}
                </span>
                <Badge variant={u.isActive ? "success" : "danger"}>
                  {u.isActive ? "Actif" : "Suspendu"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}

        {users.length === 0 && (
          <div className="py-16 text-center text-gray-400">
            <p className="text-sm">Aucun utilisateur pour le moment.</p>
          </div>
        )}
      </div>
    </div>
  )
}
