// Numéro du Call Center Mobile Clinic — source de vérité unique.
// Format : international SANS le +, sans espaces (attendu par wa.me).
export const CALL_CENTER_WHATSAPP_NUMBER = "242067734369"

export function buildWhatsAppLink(message: string): string {
  return `https://wa.me/${CALL_CENTER_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
}
