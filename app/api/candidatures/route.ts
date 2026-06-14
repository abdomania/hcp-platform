import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'
import Groq from 'groq-sdk'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })

// ── Extraction texte PDF ──────────────────────────────────────
async function extractTextFromPDF(pdfUrl: string): Promise<string> {
  try {
    const response = await fetch(pdfUrl)
    const buffer = await response.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    const decoder = new TextDecoder('latin1')
    const raw = decoder.decode(bytes)

    const textMatches = raw.match(/\(([^)]{2,})\)/g) || []
    let extracted = textMatches
      .map(m => m.slice(1, -1))
      .filter(t => /[a-zA-ZÀ-ÿ]{2,}/.test(t))
      .join(' ')
      .replace(/\\n/g, '\n')
      .replace(/\s+/g, ' ')
      .trim()

    if (extracted.length < 50) {
      const streamMatches = raw.match(/stream([\s\S]*?)endstream/g) || []
      extracted = streamMatches
        .map(s => s.replace(/stream|endstream/g, ''))
        .join(' ')
        .replace(/[^\x20-\x7E\xC0-\xFF]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 3000)
    }

    return extracted.length > 30 ? extracted.slice(0, 3000) : ''
  } catch {
    return ''
  }
}

// ── Analyse avec Gemini (principal) ──────────────────────────
async function analyserAvecGemini(
  cvBase64: string,
  nom: string,
  ville: string,
  niveau: string
): Promise<{ cvData: any; scoreCv: number }> {
  // MODIFICATION ICI : Utilisation du modèle fonctionnel et forçage du format JSON
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-3-flash-preview',
    generationConfig: { responseMimeType: "application/json" }
  })

  const prompt = `Tu es un expert RH au Maroc. Analyse ce CV pour un poste d'enquêteur terrain au HCP (Haut-Commissariat au Plan).

Informations déclarées :
- Nom : ${nom}
- Ville : ${ville}  
- Niveau d'études : ${niveau}

Critères d'évaluation :
- Niveau d'études (bac minimum, bonus si Licence/Master)
- Maîtrise français et/ou arabe
- Expérience communication ou terrain
- Compétences informatiques (tablettes, applications)
- Disponibilité et mobilité

IMPORTANT : Retourne UNIQUEMENT ce JSON valide :
{
  "competences": ["compétence1", "compétence2"],
  "experience_annees": 0,
  "formation_principale": "diplôme",
  "langues": ["Français", "Arabe"],
  "points_forts": ["point1", "point2"],
  "score_matching": 65,
  "justification_score": "explication courte du score"
}`

  const result = await model.generateContent([
    { text: prompt },
    { inlineData: { mimeType: 'application/pdf', data: cvBase64 } }
  ])

  // MODIFICATION ICI : Plus besoin d'utiliser un Regex complexe grâce au responseMimeType
  const rawText = result.response.text().trim()
  
  const cvData = JSON.parse(rawText)
  const scoreCv = Math.min(100, Math.max(0, Number(cvData.score_matching) || 35))
  return { cvData, scoreCv }
}

// ── Analyse avec Groq (secours) ───────────────────────────────
async function analyserAvecGroq(
  cvTexte: string,
  nom: string,
  ville: string,
  niveau: string
): Promise<{ cvData: any; scoreCv: number }> {
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: 'Tu es expert RH HCP Maroc. Retourne UNIQUEMENT un JSON valide sans texte avant ou après.'
      },
      {
        role: 'user',
        content: `Analyse ce candidat pour enquêteur terrain HCP.

Informations :
- Nom : ${nom}
- Ville : ${ville}
- Niveau d'études : ${niveau}

CV extrait :
"""${cvTexte || 'Non lisible automatiquement'}"""

Note de base selon niveau : Licence/Master=60-70, Bac+2=50-60, Bac=40-50.

Retourne ce JSON :
{
  "competences": ["Communication", "Terrain"],
  "experience_annees": 0,
  "formation_principale": "${niveau}",
  "langues": ["Français", "Arabe"],
  "points_forts": ["Niveau adapté"],
  "score_matching": 60,
  "justification_score": "Profil adapté"
}`
      }
    ],
    temperature: 0.3,
    max_tokens: 500,
  })

  const rawText = completion.choices[0]?.message?.content?.trim() || ''
  const jsonMatch = rawText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('JSON invalide Groq')

  const cvData = JSON.parse(jsonMatch[0])
  const scoreCv = Math.min(100, Math.max(0, Number(cvData.score_matching) || 35))
  return { cvData, scoreCv }
}

// ── Handler principal ─────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { nom_complet, email, telephone, ville, niveau_etudes, poste_id, cv_url } = body

    // Télécharger le CV
    const cvResponse = await fetch(cv_url)
    const cvBuffer = await cvResponse.arrayBuffer()
    const cvBase64 = Buffer.from(cvBuffer).toString('base64')
    const cvTexte = await extractTextFromPDF(cv_url)

    // Essayer Gemini d'abord, Groq en secours
    let cvData: any = {}
    let scoreCv = 35
    let modelUtilise = 'gemini'

    try {
      console.log('Tentative analyse avec Gemini...')
      const result = await analyserAvecGemini(cvBase64, nom_complet, ville, niveau_etudes)
      cvData = result.cvData
      scoreCv = result.scoreCv
      console.log('✅ Gemini OK — score:', scoreCv)
    } catch (geminiError: any) {
      console.warn('⚠️ Gemini échoué:', geminiError.message)
      console.log('Bascule sur Groq...')
      try {
        const result = await analyserAvecGroq(cvTexte, nom_complet, ville, niveau_etudes)
        cvData = result.cvData
        scoreCv = result.scoreCv
        modelUtilise = 'groq'
        console.log('✅ Groq OK — score:', scoreCv)
      } catch (groqError: any) {
        console.error('❌ Groq aussi échoué:', groqError.message)
        // Score de base selon niveau déclaré si les deux échouent
        const niveauxScores: Record<string, number> = {
          'Doctorat': 75, 'Master (Bac+5)': 70, 'Licence (Bac+3)': 60,
          'Bac+2 (DUT/BTS)': 50, 'Baccalauréat': 40, 'Autre': 35
        }
        scoreCv = niveauxScores[niveau_etudes] || 35
        cvData = {
          competences: ['Communication', 'Terrain'],
          formation_principale: niveau_etudes,
          langues: ['Français', 'Arabe'],
          score_matching: scoreCv,
          justification_score: 'Score basé sur le niveau d\'études déclaré'
        }
        modelUtilise = 'fallback'
      }
    }

    // Blind screening — anonymisation
    const nomAnonyme = `Candidat_${Date.now().toString().slice(-6)}`

    // Enregistrer en base
    const { data: candidature, error } = await supabase
      .from('candidatures')
      .insert({
        poste_id,
        nom_complet,
        email,
        telephone,
        ville,
        niveau_etudes,
        cv_url,
        cv_data: { ...cvData, nom_anonyme: nomAnonyme, model_utilise: modelUtilise },
        score_cv: scoreCv,
        statut: scoreCv >= 40 ? 'entretien' : 'en_attente'
      })
      .select()
      .single()

    if (error) throw new Error(error.message)

    return NextResponse.json({
      candidature_id: candidature.id,
      score_cv: scoreCv,
      statut: candidature.statut,
      model_utilise: modelUtilise,
      message: scoreCv >= 40
        ? 'Profil retenu — vous allez passer l\'entretien.'
        : 'Candidature reçue. Nous reviendrons vers vous.'
    })

  } catch (err: any) {
    console.error('Erreur API candidature:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}