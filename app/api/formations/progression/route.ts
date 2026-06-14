import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// POST — mettre à jour la progression d'un chapitre
export async function POST(req: NextRequest) {
  try {
    const { candidature_id, formation_id, chapitre_id, score_quiz } = await req.json()

    const { data: existing } = await supabase
      .from('progressions')
      .select('*')
      .eq('candidature_id', candidature_id)
      .single()

    if (existing) {
      const chapitresValides: number[] = existing.chapitres_valides || []
      if (!chapitresValides.includes(chapitre_id)) chapitresValides.push(chapitre_id)
      const scoresQuiz = { ...(existing.scores_quiz || {}), [chapitre_id]: score_quiz }

      await supabase
        .from('progressions')
        .update({ chapitres_valides: chapitresValides, scores_quiz: scoresQuiz, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
    } else {
      await supabase.from('progressions').insert({
        candidature_id,
        formation_id,
        chapitres_valides: [chapitre_id],
        scores_quiz: { [chapitre_id]: score_quiz },
      })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PUT — soumettre l'examen final
export async function PUT(req: NextRequest) {
  try {
    const { candidature_id, note_examen } = await req.json()

    await supabase
      .from('progressions')
      .update({ note_examen, complete: true, updated_at: new Date().toISOString() })
      .eq('candidature_id', candidature_id)

    if (note_examen >= 70) {
      await supabase
        .from('candidatures')
        .update({ statut: 'valide' })
        .eq('id', candidature_id)
    }

    return NextResponse.json({ success: true, note_examen, valide: note_examen >= 70 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
