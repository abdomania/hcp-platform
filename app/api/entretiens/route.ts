import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'
import Groq from 'groq-sdk'
import { envoyerEmailCredentials } from '@/lib/email'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Client admin (service role) pour créer des utilisateurs
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

function genererMotDePasse(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let mdp = 'HCP'
  for (let i = 0; i < 6; i++) mdp += chars[Math.floor(Math.random() * chars.length)]
  return mdp + '!'
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })

// ── Évaluation réponse avec Gemini ────────────────────────────
async function evaluerAvecGemini(question: string, categorie: string, reponse: string): Promise<number> {
  // MODIFICATION ICI : Modèle fonctionnel et force JSON
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-3-flash-preview',
    generationConfig: { responseMimeType: "application/json" }
  })
  
  const result = await model.generateContent(
    `Tu évalues une réponse d'entretien pour enquêteur HCP Maroc.
Question (${categorie}) : ${question}
Réponse : ${reponse}
Critères : pertinence, clarté, connaissance HCP, qualité communication.
Retourne UNIQUEMENT ce JSON : {"score": 70}`
  )
  
  // Plus besoin de regex complexe, le résultat est garanti en JSON
  const json = JSON.parse(result.response.text())
  return Math.min(100, Math.max(0, Number(json.score) || 50))
}

// ── Évaluation réponse avec Groq (secours) ───────────────────
async function evaluerAvecGroq(question: string, categorie: string, reponse: string): Promise<number> {
  const result = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: 'Évaluateur RH. Retourne UNIQUEMENT {"score": 70}' },
      { role: 'user', content: `Question (${categorie}): ${question}\nRéponse: ${reponse}\nNote sur 100.` }
    ],
    temperature: 0.2,
    max_tokens: 50,
  })
  const txt = result.choices[0]?.message?.content || ''
  const match = txt.match(/"score"\s*:\s*(\d+)/)
  return Math.min(100, Math.max(0, parseInt(match?.[1] || '50')))
}

// ── Évaluation avec fallback auto ────────────────────────────
async function evaluerReponse(question: string, categorie: string, reponse: string): Promise<number> {
  if (!reponse || reponse.length < 5) return 0
  try {
    return await evaluerAvecGemini(question, categorie, reponse)
  } catch (e) {
    console.error('Erreur Gemini évaluation:', e)
    try {
      return await evaluerAvecGroq(question, categorie, reponse)
    } catch {
      return reponse.length > 50 ? 55 : 30
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const { candidature_id, questions, reponses_texte, audios_base64 } = await req.json()

    const scoresParQuestion: Record<number, number> = {}
    const transcriptions: Record<number, string> = {}

    for (const question of questions) {
      let reponse = ''

      // Transcription audio
      if (question.type === 'oral' && audios_base64?.[question.id]) {
        try {
          const audioBuffer = Buffer.from(audios_base64[question.id], 'base64')
          // Correction pour Next.js (Node.js) : utiliser un Blob ou directement le buffer
          const transcription = await groq.audio.transcriptions.create({
            file: new File([audioBuffer], 'reponse.webm', { type: 'audio/webm' }),
            model: 'whisper-large-v3',
            language: 'fr'
          })
          reponse = transcription.text
          transcriptions[question.id] = reponse
        } catch {
          reponse = reponses_texte?.[question.id] || ''
        }
      } else {
        reponse = reponses_texte?.[question.id] || ''
      }

      scoresParQuestion[question.id] = await evaluerReponse(
        question.question,
        question.categorie,
        reponse
      )
    }

    const scores = Object.values(scoresParQuestion)
    const noteEntretien = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0

    const { data: candidature } = await supabase
      .from('candidatures')
      .select('score_cv')
      .eq('id', candidature_id)
      .single()

    const scoreCv = candidature?.score_cv || 0
    const noteGlobale = Math.round((scoreCv * 0.4) + (noteEntretien * 0.6))

    await supabase.from('entretiens').insert({
      candidature_id,
      questions,
      reponses: { ...reponses_texte, ...transcriptions },
      scores: scoresParQuestion,
      note_finale: noteEntretien
    })

    const statut = noteGlobale >= 50 ? 'formation' : 'rejete'

    await supabase.from('candidatures').update({
      note_entretien: noteEntretien,
      note_globale: noteGlobale,
      statut,
    }).eq('id', candidature_id)

    // ── Création de compte + envoi credentials si entretien réussi ──
    if (noteGlobale >= 50) {
      try {
        // Récupérer les infos du candidat + poste
        const { data: candidatureData } = await supabase
          .from('candidatures')
          .select('nom_complet, email, user_id, postes(titre)')
          .eq('id', candidature_id)
          .single()

        // Ne créer le compte que si le candidat n'en a pas déjà un
        if (candidatureData && !candidatureData.user_id) {
          const motDePasse = genererMotDePasse()
          const parts = (candidatureData.nom_complet || '').trim().split(/\s+/)
          const prenom = parts[0] || ''
          const nom = parts.slice(1).join(' ') || ''

          // Créer l'utilisateur Supabase Auth
          const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: candidatureData.email,
            password: motDePasse,
            email_confirm: true,
          })

          if (!authError && authData.user) {
            // Créer le profil candidat
            await supabaseAdmin.from('profiles').insert({
              id: authData.user.id,
              role: 'candidat',
              nom,
              prenom,
              actif: true,
            })

            // Lier le compte à la candidature
            await supabase
              .from('candidatures')
              .update({ user_id: authData.user.id })
              .eq('id', candidature_id)

            // Envoyer l'email avec les credentials
            const platformeUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
            await envoyerEmailCredentials({
              to: candidatureData.email,
              nomComplet: candidatureData.nom_complet,
              email: candidatureData.email,
              motDePasse,
              noteGlobale,
              poste: (candidatureData.postes as any)?.titre || 'Enquêteur terrain HCP',
              platformeUrl,
            })
          }
        }
      } catch (e) {
        // Ne pas bloquer la réponse si la création de compte échoue
        console.error('[entretien] Création compte/email échouée:', e)
      }
    }

    return NextResponse.json({
      note_entretien: noteEntretien,
      note_globale: noteGlobale,
      statut,
    })

  } catch (err: any) {
    console.error('Erreur entretien:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}