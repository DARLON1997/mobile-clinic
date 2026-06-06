import { auth }    from "@/auth"
import { redirect } from "next/navigation"
import { prisma }   from "@/lib/prisma"
import { formatDate } from "@/lib/utils"
import type { Prisma } from "@prisma/client"

interface SearchParams {
  searchParams: Promise<{ page?: string; userId?: string; action?: string; dateFrom?: string; dateTo?: string }>
}

export default async function AuditPage({ searchParams }: SearchParams) {
  const session = await auth()
  if (session?.user.role !== "SUPER_ADMIN") redirect("/unauthorized")

  const params = await searchParams
  const page  = Math.max(1, parseInt(params.page ?? "1"))
  const limit = 50

  const where: Prisma.AuditLogWhereInput = {}
  if (params.userId) where.userId = params.userId
  if (params.action) where.action = params.action
  if (params.dateFrom || params.dateTo) {
    where.createdAt = {
      ...(params.dateFrom ? { gte: new Date(params.dateFrom) } : {}),
      ...(params.dateTo   ? { lte: new Date(params.dateTo)   } : {}),
    }
  }

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { email: true, role: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Journal d&apos;audit</h1>
        <p className="text-sm text-gray-500">{total} entrée{total > 1 ? "s" : ""} au total</p>
      </div>

      {/* Filtres */}
      <form className="mb-6 flex flex-wrap gap-3 rounded-xl border border-gray-200 bg-white p-4">
        <input name="dateFrom" type="date" defaultValue={params.dateFrom}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none" />
        <input name="dateTo" type="date" defaultValue={params.dateTo}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none" />
        <input name="userId" placeholder="ID utilisateur" defaultValue={params.userId}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none" />
        <input name="action" placeholder="Action (ex: USER_LOGIN)" defaultValue={params.action}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none flex-1 min-w-[180px]" />
        <button type="submit"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          Filtrer
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-xs font-semibold uppercase text-gray-500">
              <th className="px-4 py-3 text-left">Date / Heure</th>
              <th className="px-4 py-3 text-left">Utilisateur</th>
              <th className="px-4 py-3 text-left">Rôle</th>
              <th className="px-4 py-3 text-left">Action</th>
              <th className="px-4 py-3 text-left">Ressource ciblée</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  Aucune entrée pour ces filtres.
                </td>
              </tr>
            ) : logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                  {formatDate(log.createdAt)}
                </td>
                <td className="px-4 py-3 text-gray-700">{log.user.email}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{log.user.role}</td>
                <td className="px-4 py-3">
                  <span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-700">
                    {log.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {log.targetType && <span className="font-medium">{log.targetType}</span>}
                  {log.targetId   && <span className="ml-1 font-mono opacity-60">#{log.targetId.slice(0, 8)}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <p className="text-gray-500">Page {page} sur {totalPages}</p>
          <div className="flex gap-2">
            {page > 1 && (
              <a href={`?page=${page - 1}`}
                className="rounded-lg border border-gray-200 px-3 py-1.5 hover:bg-gray-50">
                Précédent
              </a>
            )}
            {page < totalPages && (
              <a href={`?page=${page + 1}`}
                className="rounded-lg border border-gray-200 px-3 py-1.5 hover:bg-gray-50">
                Suivant
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
