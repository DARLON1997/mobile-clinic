import Link from "next/link"
import { BanIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

export const metadata = {
  title: "Compte suspendu — Mobile Clinic",
}

export default function SuspendedPage() {
  const adminPhone = process.env.NEXT_PUBLIC_ADMIN_PHONE ?? "+242 XX XXX XXXX"
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "admin@mobile-clinic.cg"

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-50 px-4 text-center">
      <div className="rounded-full bg-orange-100 p-5">
        <BanIcon className="h-12 w-12 text-orange-600" />
      </div>

      <div className="max-w-md">
        <h1 className="text-2xl font-bold text-gray-900">Compte suspendu</h1>
        <p className="mt-2 text-gray-500">
          Votre compte a été temporairement suspendu par l&apos;administration.
          Vous ne pouvez pas accéder à l&apos;application pour le moment.
        </p>
      </div>

      <div className="rounded-xl border border-orange-200 bg-orange-50 p-5 text-left text-sm text-gray-700 max-w-sm w-full">
        <p className="font-semibold text-orange-700 mb-2">Contactez l&apos;administration :</p>
        <p>
          <span className="font-medium">Tél :</span>{" "}
          <a href={`tel:${adminPhone}`} className="text-primary underline">
            {adminPhone}
          </a>
        </p>
        <p className="mt-1">
          <span className="font-medium">Email :</span>{" "}
          <a href={`mailto:${adminEmail}`} className="text-primary underline">
            {adminEmail}
          </a>
        </p>
      </div>

      <div className="flex gap-3">
        <Link href="/">
          <Button variant="outline">Retour à l&apos;accueil</Button>
        </Link>
        <Link href="/login">
          <Button variant="ghost">Changer de compte</Button>
        </Link>
      </div>
    </div>
  )
}
