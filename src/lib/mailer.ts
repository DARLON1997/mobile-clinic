import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendEmail(to: string, subject: string, html: string) {
  const { error } = await resend.emails.send({
    from:    "Mobile Clinic <onboarding@resend.dev>",
    to,
    subject,
    html,
  })
  if (error) throw new Error(error.message)
}

// ─── Layout HTML commun ───────────────────────────────────────────────────────

function emailLayout(title: string, content: string): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);max-width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1e5fa8,#1e40af);padding:28px 32px;text-align:center;">
            <p style="margin:0;font-size:24px;font-weight:700;color:#fff;letter-spacing:-.5px;">
              ❤️ Mobile Clinic
            </p>
            <p style="margin:4px 0 0;font-size:13px;color:#bfdbfe;">
              La santé plus proche de vous
            </p>
          </td>
        </tr>
        <!-- Content -->
        <tr>
          <td style="padding:32px;">
            ${content}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f1f5f9;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">
              © ${new Date().getFullYear()} Mobile Clinic — Congo-Brazzaville<br/>
              <em>« La santé plus proche de vous, partout où vous êtes. »</em>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function btn(text: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;background:#1e5fa8;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:15px;margin-top:16px;">${text}</a>`
}

// ─── Templates (welcome, appointmentConfirmed, appointmentReminder, prescriptionReady, paymentReceipt, otp) ───

export const emailTemplates = {
  welcome: (patientName: string) =>
    emailLayout("Bienvenue sur Mobile Clinic", `
      <h2 style="color:#1e5fa8;margin-top:0;">Bienvenue, ${patientName} ! 👋</h2>
      <p style="color:#475569;line-height:1.6;">
        Votre compte Mobile Clinic a été créé avec succès. Vous pouvez maintenant
        consulter des médecins en vidéo, demander des soins à domicile et
        des prélèvements biologiques, depuis chez vous.
      </p>
      ${btn("Accéder à mon espace", `${process.env.NEXTAUTH_URL}/patient`)}
    `),

  appointmentConfirmed: (
    patientName: string,
    date: string,
    doctorName: string,
    amount: string
  ) =>
    emailLayout("Votre rendez-vous est confirmé", `
      <h2 style="color:#16a34a;margin-top:0;">✅ RDV confirmé</h2>
      <p style="color:#475569;line-height:1.6;">
        Bonjour <strong>${patientName}</strong>,<br/>
        Votre rendez-vous a été approuvé par notre équipe.
      </p>
      <table style="background:#f0fdf4;border-radius:8px;padding:16px;width:100%;margin:16px 0;">
        <tr><td style="color:#166534;font-size:14px;padding:4px 0;">📅 <strong>Date :</strong> ${date}</td></tr>
        <tr><td style="color:#166534;font-size:14px;padding:4px 0;">👨‍⚕️ <strong>Médecin :</strong> Dr ${doctorName}</td></tr>
        <tr><td style="color:#166534;font-size:14px;padding:4px 0;">💳 <strong>Montant :</strong> ${amount} XAF</td></tr>
      </table>
      <p style="color:#475569;">Procédez au paiement pour valider définitivement votre consultation.</p>
      ${btn("Payer maintenant", `${process.env.NEXTAUTH_URL}/patient/appointments`)}
    `),

  appointmentReminder: (patientName: string, date: string, doctorName: string) =>
    emailLayout("Rappel — Votre consultation est demain", `
      <h2 style="color:#d97706;margin-top:0;">⏰ Rappel de rendez-vous</h2>
      <p style="color:#475569;line-height:1.6;">
        Bonjour <strong>${patientName}</strong>,<br/>
        Votre consultation avec <strong>Dr ${doctorName}</strong> a lieu <strong>demain le ${date}</strong>.
      </p>
      <p style="color:#475569;">
        Le bouton « Rejoindre » sera disponible 5 minutes avant l'heure.
        Assurez-vous d'avoir une bonne connexion Internet.
      </p>
      ${btn("Voir mes rendez-vous", `${process.env.NEXTAUTH_URL}/patient/appointments`)}
    `),

  prescriptionReady: (patientName: string, prescriptionUrl: string) =>
    emailLayout("Votre ordonnance est prête", `
      <h2 style="color:#1e5fa8;margin-top:0;">📄 Ordonnance disponible</h2>
      <p style="color:#475569;line-height:1.6;">
        Bonjour <strong>${patientName}</strong>,<br/>
        Votre médecin a rédigé votre ordonnance numérique.
        Vous pouvez la télécharger dès maintenant.
      </p>
      ${btn("Télécharger l'ordonnance (PDF)", prescriptionUrl)}
      <p style="color:#94a3b8;font-size:12px;margin-top:16px;">
        Cette ordonnance est valable 3 mois. Présentez-la à votre pharmacien.
      </p>
    `),

  paymentReceipt: (patientName: string, amount: string, txRef: string) =>
    emailLayout("Reçu de paiement Mobile Clinic", `
      <h2 style="color:#16a34a;margin-top:0;">✅ Paiement confirmé</h2>
      <p style="color:#475569;line-height:1.6;">
        Bonjour <strong>${patientName}</strong>, votre paiement a bien été reçu.
      </p>
      <table style="background:#f0fdf4;border-radius:8px;padding:16px;width:100%;margin:16px 0;">
        <tr><td style="color:#166534;font-size:14px;padding:4px 0;">💰 <strong>Montant :</strong> ${amount} XAF</td></tr>
        <tr><td style="color:#166534;font-size:14px;padding:4px 0;">🔖 <strong>Référence :</strong> ${txRef}</td></tr>
      </table>
      <p style="color:#475569;">Conservez cette référence pour tout litige.</p>
      ${btn("Voir mes rendez-vous", `${process.env.NEXTAUTH_URL}/patient/appointments`)}
    `),
  otp: (code: string, purpose: "login" | "reset") =>
    emailLayout(
      purpose === "login" ? "Code de connexion — Mobile Clinic" : "Réinitialisation de mot de passe",
      `
      <h2 style="color:#1e5fa8;margin-top:0;">
        ${purpose === "login" ? "🔐 Code de connexion" : "🔑 Réinitialisation de mot de passe"}
      </h2>
      <p style="color:#475569;line-height:1.6;">
        Voici votre code à usage unique. Il est valable <strong>5 minutes</strong>.
      </p>
      <div style="text-align:center;margin:24px 0;">
        <span style="display:inline-block;background:#f1f5f9;border:2px dashed #C8906A;border-radius:12px;padding:16px 40px;font-size:36px;font-weight:700;letter-spacing:12px;color:#1e293b;">
          ${code}
        </span>
      </div>
      <p style="color:#94a3b8;font-size:13px;margin-top:8px;">
        Ne partagez jamais ce code. Mobile Clinic ne vous le demandera jamais par téléphone.
      </p>
    `
    ),
} as const
