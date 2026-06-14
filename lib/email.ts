import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)
const FROM = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

export async function envoyerEmailCredentials({
  to,
  nomComplet,
  email,
  motDePasse,
  noteGlobale,
  poste,
  platformeUrl,
}: {
  to: string
  nomComplet: string
  email: string
  motDePasse: string
  noteGlobale: number
  poste: string
  platformeUrl: string
}) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Félicitations — Vos accès à la Plateforme HCP`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a">
        <div style="background:#003366;padding:24px 32px;border-radius:8px 8px 0 0">
          <h1 style="color:#fff;margin:0;font-size:20px">Haut-Commissariat au Plan</h1>
          <p style="color:#a0b8d8;margin:4px 0 0;font-size:13px">Plateforme de recrutement des enquêteurs</p>
        </div>
        <div style="background:#f8fafc;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px">
          <p style="font-size:15px">Bonjour <strong>${nomComplet}</strong>,</p>
          <p>
            Félicitations ! Vous avez réussi votre entretien pour le poste de
            <strong>${poste}</strong> avec une note globale de
            <strong style="color:#059669">${noteGlobale}/100</strong>.
          </p>
          <p>Votre compte a été créé. Vous pouvez maintenant accéder à votre formation en ligne :</p>

          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:20px 0">
            <p style="margin:0 0 8px;font-size:13px;color:#64748b;font-weight:bold;text-transform:uppercase;letter-spacing:0.05em">Vos identifiants</p>
            <p style="margin:0 0 6px"><span style="color:#64748b;width:110px;display:inline-block">Email :</span> <strong>${email}</strong></p>
            <p style="margin:0"><span style="color:#64748b;width:110px;display:inline-block">Mot de passe :</span> <strong style="font-size:16px;letter-spacing:0.05em">${motDePasse}</strong></p>
          </div>

          <div style="text-align:center;margin:24px 0">
            <a href="${platformeUrl}/login"
               style="background:#003366;color:#fff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px;display:inline-block">
              Accéder à ma formation →
            </a>
          </div>

          <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:12px 16px;margin-top:16px">
            <p style="margin:0;font-size:12px;color:#92400e">
              ⚠️ <strong>Important :</strong> Changez votre mot de passe dès votre première connexion.
              Vous devez obtenir une note ≥ 70 à l'examen final pour valider votre formation.
            </p>
          </div>

          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
          <p style="font-size:11px;color:#94a3b8;margin:0">
            Haut-Commissariat au Plan · Maroc · hcp.ma<br/>
            Ce message est confidentiel — ne le partagez pas.
          </p>
        </div>
      </div>
    `,
  })
}

export async function envoyerEmailContrat({
  to,
  nomComplet,
  poste,
  contratUrl,
  contratPdfBuffer,
}: {
  to: string
  nomComplet: string
  poste: string
  contratUrl: string
  contratPdfBuffer: Buffer
}) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Félicitations — Votre contrat de mission HCP est disponible`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a">
        <div style="background:#003366;padding:24px 32px;border-radius:8px 8px 0 0">
          <h1 style="color:#fff;margin:0;font-size:20px">Haut-Commissariat au Plan</h1>
          <p style="color:#a0b8d8;margin:4px 0 0;font-size:13px">Plateforme de recrutement des enquêteurs</p>
        </div>
        <div style="background:#f8fafc;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px">
          <p style="font-size:15px">Bonjour <strong>${nomComplet}</strong>,</p>
          <p>Nous avons le plaisir de vous informer que votre dossier de candidature pour le poste de :</p>
          <div style="background:#003366;color:#fff;padding:12px 20px;border-radius:6px;margin:16px 0;font-weight:bold;font-size:15px">
            ${poste}
          </div>
          <p>a été <strong style="color:#059669">validé par le service RH du HCP</strong>.</p>
          <p>Votre contrat de mission est joint à cet email en pièce jointe. Veuillez le lire attentivement, le signer et le faire légaliser avant de le remettre à votre responsable.</p>
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:16px;margin:20px 0">
            <p style="margin:0;font-size:13px;color:#1d4ed8">
              <strong>Détails du contrat :</strong><br/>
              • Référence : DS01/2026/DS<br/>
              • Durée : 01/03/2026 — 28/02/2027<br/>
              • Rémunération journalière nette : <strong>140,00 MAD</strong> + 120 MAD/déplacement
            </p>
          </div>
          <p style="font-size:13px;color:#64748b">
            Pour toute question, contactez le service RH du HCP.
          </p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
          <p style="font-size:11px;color:#94a3b8;margin:0">
            Ce message a été envoyé automatiquement par la Plateforme HCP.<br/>
            Haut-Commissariat au Plan · Maroc · hcp.ma
          </p>
        </div>
      </div>
    `,
    attachments: [
      {
        filename: `Contrat_HCP_${nomComplet.replace(/\s+/g, '_')}.pdf`,
        content: contratPdfBuffer,
      },
    ],
  })
}

export async function envoyerEmailValidation({
  to,
  nomComplet,
  poste,
}: {
  to: string
  nomComplet: string
  poste: string
}) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Votre dossier HCP a été validé`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a">
        <div style="background:#003366;padding:24px 32px;border-radius:8px 8px 0 0">
          <h1 style="color:#fff;margin:0;font-size:20px">Haut-Commissariat au Plan</h1>
        </div>
        <div style="background:#f8fafc;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px">
          <p>Bonjour <strong>${nomComplet}</strong>,</p>
          <p>Votre dossier pour le poste <strong>${poste}</strong> a été validé. Votre contrat vous sera transmis séparément.</p>
        </div>
      </div>
    `,
  })
}
