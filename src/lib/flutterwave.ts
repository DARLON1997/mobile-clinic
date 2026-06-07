/**
 * Flutterwave — Helper pour les paiements
 * Devise : XAF (Franc CFA congolais)
 * Méthodes : MTN Money, Airtel Money, Carte bancaire
 */

const FLW_BASE = "https://api.flutterwave.com/v3"

async function flwRequest(path: string, body: object) {
  const res = await fetch(`${FLW_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Flutterwave error: ${err.message ?? res.status}`)
  }

  return res.json()
}

type PaymentMethod = "MTN_MONEY" | "AIRTEL_MONEY" | "CARD"

const PAYMENT_TYPE: Record<PaymentMethod, string> = {
  MTN_MONEY:    "mobilemoneycongo",
  AIRTEL_MONEY: "mobilemoneycongo",
  CARD:         "card",
}

/**
 * Initialise un paiement et retourne le lien de paiement Flutterwave.
 */
export async function initializePayment(params: {
  amount:        number
  currency:      "XAF"
  email:         string
  phone:         string
  name:          string
  appointmentId: string
  method:        PaymentMethod
}) {
  const txRef = `MC-${params.appointmentId}-${Date.now()}`

  const data = await flwRequest("/payments", {
    tx_ref:         txRef,
    amount:         params.amount,
    currency:       params.currency,
    payment_options: PAYMENT_TYPE[params.method],
    redirect_url:   `${process.env.NEXTAUTH_URL}/patient/appointments?payment=success`,
    customer: {
      email: params.email,
      phone_number: params.phone,
      name:  params.name,
    },
    customizations: {
      title:       "Mobile Clinic",
      description: `Consultation médicale — RDV #${params.appointmentId}`,
      logo:        `${process.env.NEXTAUTH_URL}/images/logo-light.png`,
    },
    meta: {
      appointmentId: params.appointmentId,
    },
  })

  return {
    paymentLink: data.data?.link as string,
    txRef,
  }
}

/**
 * Vérifie le statut d'un paiement après callback Flutterwave.
 */
export async function verifyPayment(transactionId: string) {
  const res = await fetch(`${FLW_BASE}/transactions/${transactionId}/verify`, {
    headers: {
      Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
    },
  })

  if (!res.ok) throw new Error("Impossible de vérifier le paiement.")

  const data = await res.json()
  const tx   = data.data

  return {
    success:  tx.status === "successful",
    amount:   tx.amount as number,
    currency: tx.currency as string,
    method:   tx.payment_type as string,
    txRef:    tx.tx_ref as string,
  }
}

/**
 * Vérifie la signature du webhook Flutterwave.
 * À appeler dans /api/payments/webhook avant tout traitement.
 */
export function verifyWebhookSignature(
  signature: string | null,
  secret: string
): boolean {
  return signature === secret
}
