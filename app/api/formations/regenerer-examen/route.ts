import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

async function generateWithRetry(model: any, prompt: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await model.generateContent(prompt)
    } catch (err: any) {
      if (i === retries - 1) throw err
      await new Promise(r => setTimeout(r, 3000))
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const { formation_id } = await req.json()
    if (!formation_id) return NextResponse.json({ error: 'formation_id requis' }, { status: 400 })

    const { data: formation, error } = await supabase
      .from('formations')
      .select('id, chapitres')
      .eq('id', formation_id)
      .single()

    if (error || !formation) return NextResponse.json({ error: 'Formation introuvable' }, { status: 404 })
    if (!formation.chapitres?.length) return NextResponse.json({ error: 'La formation n\'a pas de chapitres' }, { status: 400 })

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json', temperature: 0.7 },
    })

    const resumeChapitres = formation.chapitres
      .map((c: any) => `Chapitre ${c.id} — ${c.titre} : ${c.resume}`)
      .join('\n')

    const prompt = `Tu es un expert pédagogique. Génère un examen final de 20 questions basé UNIQUEMENT sur le contenu des chapitres ci-dessous. Chaque question doit tester une notion précise issue de ces chapitres.

CHAPITRES DE LA FORMATION :
${resumeChapitres}

Retourne UNIQUEMENT ce JSON (sans texte autour) :
{"questions": [{"id": number, "question": "string", "options": ["string","string","string","string"], "bonne_reponse": number, "explication": "string", "chapitre_source": number}]}`

    const result = await generateWithRetry(model, prompt)
    const examen = JSON.parse((result as any).response.text())

    await supabase
      .from('formations')
      .update({ examen_final: examen.questions })
      .eq('id', formation_id)

    return NextResponse.json({ questions: examen.questions, nb: examen.questions.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
