"use client"

import { useState } from "react"
import { FileText, Download, X, ImageIcon, ZoomIn } from "lucide-react"

type OrdonnanceItem = {
  id:         string
  type:       "photo" | "pdf"
  url:        string
  doctorName: string
  speciality: string | null
  date:       string
  numero:     string
}

async function downloadToGallery(url: string, filename: string) {
  try {
    const res  = await fetch(url)
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href     = blobUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(blobUrl)
  } catch {
    window.open(url, "_blank")
  }
}

export function OrdonnancesGrid({ items }: { items: OrdonnanceItem[] }) {
  const [preview, setPreview] = useState<OrdonnanceItem | null>(null)

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#2A2A2A] py-20 text-center">
        <FileText className="mb-3 h-12 w-12 text-[#333333]" />
        <p className="text-[#666666]">Aucune ordonnance disponible.</p>
        <p className="mt-1 text-xs text-[#444444]">Vos ordonnances apparaîtront ici après chaque consultation.</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div key={item.id}
            className="flex flex-col overflow-hidden rounded-2xl border border-[#2A2A2A] bg-[#141414] transition-shadow hover:border-[rgba(200,144,106,0.3)]">

            {/* Aperçu */}
            {item.type === "photo" ? (
              <button onClick={() => setPreview(item)} className="group relative block aspect-[4/3] overflow-hidden bg-[#1A1A1A]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.url} alt="Ordonnance" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
                  <ZoomIn className="h-8 w-8 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <span className="absolute left-2 top-2 rounded-full bg-[#C8906A] px-2 py-0.5 text-[10px] font-bold text-[#0A0A0A]">
                  📷 PHOTO
                </span>
              </button>
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center bg-[#1A1A1A]">
                <div className="flex flex-col items-center gap-2 text-center">
                  <FileText className="h-12 w-12 text-[#C8906A]" />
                  <span className="text-xs font-semibold text-[#AAAAAA]">PDF</span>
                </div>
              </div>
            )}

            {/* Infos */}
            <div className="flex flex-1 flex-col p-4">
              <p className="font-montserrat text-[11px] font-semibold uppercase tracking-widest text-[#666666]">
                {item.numero}
              </p>
              <p className="mt-1 font-medium text-white">{item.doctorName}</p>
              {item.speciality && <p className="text-xs text-[#666666]">{item.speciality}</p>}
              <p className="mt-1 text-xs text-[#444444]">{item.date}</p>

              {/* Actions */}
              <div className="mt-4 flex gap-2">
                {item.type === "photo" ? (
                  <>
                    <button onClick={() => setPreview(item)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[rgba(200,144,106,0.12)] px-3 py-2 text-xs font-semibold text-[#C8906A] transition-colors hover:bg-[rgba(200,144,106,0.2)]">
                      <ZoomIn className="h-3.5 w-3.5" />
                      Voir
                    </button>
                    <button onClick={() => downloadToGallery(item.url, `ordonnance-${item.numero}.jpg`)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#C8906A] px-3 py-2 text-xs font-bold text-[#0A0A0A] transition-opacity hover:opacity-90">
                      <Download className="h-3.5 w-3.5" />
                      Télécharger
                    </button>
                  </>
                ) : (
                  <a href={item.url} target="_blank" rel="noreferrer"
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#C8906A] px-3 py-2 text-xs font-bold text-[#0A0A0A] transition-opacity hover:opacity-90">
                    <Download className="h-3.5 w-3.5" />
                    Télécharger PDF
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox image */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
          onClick={() => setPreview(null)}>
          <button onClick={() => setPreview(null)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
            <X className="h-5 w-5" />
          </button>

          <div className="flex max-h-[90vh] max-w-2xl flex-col gap-4" onClick={e => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview.url} alt="Ordonnance"
              className="max-h-[75vh] w-full rounded-xl object-contain"
            />
            <div className="flex items-center justify-between gap-4 rounded-xl bg-white/5 px-4 py-3">
              <div>
                <p className="font-medium text-white">{preview.doctorName}</p>
                <p className="text-xs text-[#AAAAAA]">{preview.date} · {preview.numero}</p>
              </div>
              <button onClick={() => downloadToGallery(preview.url, `ordonnance-${preview.numero}.jpg`)}
                className="flex shrink-0 items-center gap-2 rounded-xl bg-[#C8906A] px-5 py-2.5 text-sm font-bold text-[#0A0A0A] transition-opacity hover:opacity-90 active:opacity-75">
                <Download className="h-4 w-4" />
                Enregistrer dans ma galerie
              </button>
            </div>
            <p className="text-center text-xs text-[#555555]">
              Présentez cette ordonnance à votre pharmacien pour obtenir vos médicaments.
            </p>
          </div>
        </div>
      )}
    </>
  )
}

export { ImageIcon }
