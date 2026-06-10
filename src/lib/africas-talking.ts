/**
 * Africa's Talking — SMS pour le Congo-Brazzaville
 * Indicatif : +242
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const AfricasTalking = require("africastalking")

function getClient() {
  const AT = AfricasTalking({
    apiKey:   process.env.AT_API_KEY!,
    username: process.env.AT_USERNAME!,
  })
  return AT.SMS
}

/**
 * Envoie un SMS vers un numéro congolais.
 * @param to   Numéro au format +242XXXXXXXXX
 * @param message  Contenu du SMS (160 chars max recommandé)
 */
export async function sendSMS(to: string, message: string) {
  // Normaliser le numéro Congo +242
  const normalized = to.startsWith("+242") ? to : `+242${to.replace(/^0/, "")}`

  const sms = getClient()
  return sms.send({
    to:      [normalized],
    message,
    from:    process.env.AT_SENDER_ID ?? "MobileClinic",
  })
}

// ─── Templates SMS ────────────────────────────────────────────────────────────

export const smsTemplates = {
  appointmentConfirmed: (patientName: string, date: string, doctor: string) =>
    `Bonjour ${patientName}, votre RDV avec Dr ${doctor} est confirmé pour le ${date}. Mobile Clinic vous rappellera J-1. La sante plus proche de vous.`,

  appointmentReminder: (patientName: string, date: string, doctor: string) =>
    `Rappel : Votre consultation avec Dr ${doctor} est demain ${date}. Connectez-vous à Mobile Clinic 5 min avant. A demain !`,

  agentEnRoute: (patientName: string, agentName: string) =>
    `Bonjour ${patientName}, votre agent ${agentName} est en route vers chez vous. Estimé dans 15-30 min. Mobile Clinic`,

  agentArrived: (patientName: string) =>
    `Bonjour ${patientName}, votre agent Mobile Clinic vient d'arriver. Veuillez l'accueillir. Merci.`,

  missionCompleted: (patientName: string) =>
    `Bonjour ${patientName}, votre soin est terminé. Le rapport a été ajouté a votre dossier médical. Mobile Clinic`,

  paymentConfirmed: (patientName: string, amount: string) =>
    `Paiement recu : ${amount} XAF. Merci ${patientName} ! Votre RDV est validé. Mobile Clinic`,

  appointmentRejected: (patientName: string, reason?: string) =>
    `Bonjour ${patientName}, votre demande de RDV n'a pas pu etre acceptée${reason ? ` : ${reason}` : ""}. Contactez notre Call Center. Mobile Clinic`,

  // ── Pharmacie ────────────────────────────────────────────────────────────────

  commandeConfirmee: (patientName: string, pharmacie: string) =>
    `Mobile Clinic : Votre commande chez ${pharmacie} a ete confirmee. Preparation en cours.`,

  commandePrete: (patientName: string, pharmacie: string, adresse: string) =>
    `Mobile Clinic : Vos medicaments sont prets ! Retirez-les chez ${pharmacie}, ${adresse}.`,

  commandeLivraison: (_patientName: string) =>
    `Mobile Clinic : Votre livreur est en route. Preparez-vous a receptionner vos medicaments.`,

  commandeLivree: (_patientName: string) =>
    `Mobile Clinic : Vos medicaments ont ete livres. Bonne sante !`,

  ordonnanceTraitee: (patientName: string, status: string) =>
    `Mobile Clinic : Bonjour ${patientName}, votre ordonnance a ete traitee. Statut : ${status}. Connectez-vous pour plus de details.`,

  pharmacieBienvenue: (nomPharmacie: string, email: string, password: string) =>
    `Mobile Clinic : Bienvenue ${nomPharmacie} ! Votre espace partenaire est pret. Email : ${email} | Mot de passe : ${password}. Changez-le a la connexion.`,
} as const
