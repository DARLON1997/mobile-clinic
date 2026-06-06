import Link from "next/link"
import { ShieldX } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-50 px-4 text-center">
      <div className="rounded-full bg-red-100 p-5">
        <ShieldX className="h-12 w-12 text-red-600" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Accès non autorisé</h1>
        <p className="mt-2 text-gray-500">
          Vous n&apos;avez pas les permissions nécessaires pour accéder à cette page.
        </p>
      </div>
      <div className="flex gap-3">
        <Link href="/">
          <Button variant="outline">Retour à l&apos;accueil</Button>
        </Link>
        <Link href="/login">
          <Button>Se connecter</Button>
        </Link>
      </div>
    </div>
  )
}
