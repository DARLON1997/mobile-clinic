/**
 * Cloudinary — Stockage fichiers et photos
 * Dossiers : prescriptions, mission-photos, avatars, reports
 */

import { v2 as cloudinary, type UploadApiOptions } from "cloudinary"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
})

type Folder = "prescriptions" | "mission-photos" | "avatars" | "reports"

/**
 * Upload un fichier Buffer vers Cloudinary.
 */
export async function uploadFile(
  file: Buffer,
  folder: Folder,
  publicId?: string
): Promise<{ url: string; publicId: string }> {
  const options: UploadApiOptions = {
    folder:        `mobile-clinic/${folder}`,
    public_id:     publicId,
    resource_type: folder === "prescriptions" || folder === "reports" ? "raw" : "image",
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err || !result) return reject(err ?? new Error("Upload échoué"))
      resolve({ url: result.secure_url, publicId: result.public_id })
    })
    stream.end(file)
  })
}

/**
 * Supprime un fichier Cloudinary par son publicId.
 */
export async function deleteFile(publicId: string) {
  await cloudinary.uploader.destroy(publicId)
}

/**
 * Génère une URL signée temporaire.
 */
export function getSignedUrl(publicId: string, expiresIn = 3600): string {
  const timestamp = Math.floor(Date.now() / 1000) + expiresIn
  return cloudinary.url(publicId, {
    sign_url:   true,
    expires_at: timestamp,
    resource_type: "raw",
  })
}
