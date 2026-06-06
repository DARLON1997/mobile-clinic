import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { uploadFile } from "@/lib/cloudinary"

const ALLOWED_FOLDERS = ["prescriptions", "mission-photos", "avatars", "reports"] as const
type Folder = typeof ALLOWED_FOLDERS[number]

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "application/pdf"]

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const formData = await req.formData()
  const file     = formData.get("file") as File | null
  const folder   = (formData.get("folder") as Folder) ?? "avatars"

  if (!file) return NextResponse.json({ error: "Fichier manquant" }, { status: 400 })

  if (!ALLOWED_FOLDERS.includes(folder)) {
    return NextResponse.json({ error: "Dossier non autorisé" }, { status: 400 })
  }

  // Validation type MIME
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Type de fichier non autorisé. Formats acceptés : JPEG, PNG, PDF." },
      { status: 415 }
    )
  }

  // Limites : 10 MB pour PDFs, 5 MB pour les images
  const maxSize = file.type === "application/pdf" ? 10 * 1024 * 1024 : 5 * 1024 * 1024
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: `Fichier trop volumineux (max ${maxSize / 1024 / 1024} MB)` },
      { status: 413 }
    )
  }

  // Restriction dossier prescriptions/reports → médecin ou admin uniquement
  if (
    (folder === "prescriptions" || folder === "reports") &&
    session.user.role !== "MEDECIN" &&
    session.user.role !== "SUPER_ADMIN"
  ) {
    return NextResponse.json({ error: "Accès refusé à ce dossier." }, { status: 403 })
  }

  // Restriction mission-photos → agent terrain uniquement
  if (folder === "mission-photos" && session.user.role !== "AGENT_TERRAIN") {
    return NextResponse.json({ error: "Réservé aux agents terrain." }, { status: 403 })
  }

  try {
    const buffer   = Buffer.from(await file.arrayBuffer())
    const publicId = `${session.user.id}-${Date.now()}`
    const result   = await uploadFile(buffer, folder, publicId)

    return NextResponse.json({ success: true, data: result })
  } catch (err) {
    console.error("[upload]", err)
    return NextResponse.json({ error: "Erreur lors de l'upload" }, { status: 500 })
  }
}

export const config = {
  api: { bodyParser: false },
}
