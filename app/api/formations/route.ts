import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// Fonction utilitaire pour gérer les erreurs de saturation
async function generateWithRetry(model: any, prompt: any, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await model.generateContent(prompt);
    } catch (err: any) {
      if (i === retries - 1) throw err;
      await new Promise(resolve => setTimeout(resolve, 3000)); // Pause de 3s avant de réessayer
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const { poste_id, fichier_url } = await req.json()

    const fileResponse = await fetch(fichier_url)
    const fileBuffer = await fileResponse.arrayBuffer()
    const fileBase64 = Buffer.from(fileBuffer).toString('base64')

    // Modèle basculé sur 1.5-flash pour une meilleure stabilité sur les PDF
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash', 
      generationConfig: { 
        responseMimeType: "application/json",
        temperature: 0.7 
      } 
    })

    const promptStructure = [
      {
        text: `Tu es un expert pédagogique. Analyse ce document et génère une formation structurée pour des enquêteurs terrain du HCP Maroc.
IMPORTANT : Développe le contenu de manière exhaustive. Chaque chapitre doit être détaillé, explicatif, et utiliser un ton professionnel et pédagogique.
Retourne UNIQUEMENT cet objet JSON :
{
  "titre_formation": "string",
  "objectifs": ["string"],
  "chapitres": [
    {
      "id": number,
      "titre": "string",
      "contenu": "Contenu riche et détaillé (explications approfondies, exemples concrets).",
      "resume": "Résumé en 2-3 phrases.",
      "points_cles": ["string"],
      "quiz": [{"id": number, "question": "string", "options": ["string","string","string","string"], "bonne_reponse": number, "explication": "string"}]
    }
  ]
}`
      },
      { inlineData: { mimeType: 'application/pdf', data: fileBase64 } }
    ]

    const structureResult = await generateWithRetry(model, promptStructure)
    const formation = JSON.parse(structureResult.response.text())

    const promptExamen = `Génère un examen final JSON pour cette formation. 
      Format: {"questions": [{"id": number, "question": "string", "options": ["string","string","string","string"], "bonne_reponse": number, "explication": "string", "chapitre_source": number}]}`
    
    const examResult = await generateWithRetry(model, promptExamen)
    const examen = JSON.parse(examResult.response.text())

    const { data: formationCreee, error } = await supabase
      .from('formations')
      .insert({
        poste_id,
        chapitres: formation.chapitres,
        examen_final: examen.questions,
        nb_chapitres: formation.chapitres.length
      })
      .select()
      .single()

    if (error) throw new Error(error.message)

    await supabase.from('postes').update({ formation_id: formationCreee.id }).eq('id', poste_id)

    return NextResponse.json({
      formation_id: formationCreee.id,
      nb_chapitres: formation.chapitres.length,
      titre: formation.titre_formation
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const candidature_id = searchParams.get('candidature_id')
  
  if (!candidature_id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

  const { data: candidature } = await supabase.from('candidatures').select('poste_id').eq('id', candidature_id).single()
  const { data: poste } = await supabase.from('postes').select('formation_id, titre').eq('id', candidature?.poste_id).single()
  const { data: formation } = await supabase.from('formations').select('*').eq('id', poste?.formation_id).single()
  const { data: progression } = await supabase.from('progressions').select('*').eq('candidature_id', candidature_id).single()

  return NextResponse.json({ formation, progression, poste_titre: poste?.titre })
}