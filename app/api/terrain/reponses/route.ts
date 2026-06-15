import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { questionnaire_id, candidature_id, reponses, latitude, longitude, duree_secondes } = await req.json()
  if (!questionnaire_id || !candidature_id) return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })

  const { error } = await supabase.from('reponses_terrain').insert({
    questionnaire_id,
    candidature_id,
    reponses,
    latitude: latitude || null,
    longitude: longitude || null,
    duree_secondes: duree_secondes || null,
    statut: 'soumis',
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
