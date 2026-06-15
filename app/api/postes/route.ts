import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const { titre, description, enquete_id, date_limite, seuil_score_cv, seuil_note_globale, seuil_formation } = body

  if (!titre) return NextResponse.json({ error: 'Le titre est requis' }, { status: 400 })
  if (!description) return NextResponse.json({ error: 'La description est requise' }, { status: 400 })

  const { data, error } = await supabase.from('postes').insert({
    titre,
    description,
    enquete_id: enquete_id || null,
    date_limite: date_limite || null,
    seuil_score_cv: seuil_score_cv ?? 60,
    seuil_note_globale: seuil_note_globale ?? 50,
    seuil_formation: seuil_formation ?? 70,
    statut: 'ouvert',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ poste: data })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id, statut } = await req.json()
  if (!id || !statut) return NextResponse.json({ error: 'id et statut requis' }, { status: 400 })

  const { error } = await supabase.from('postes').update({ statut }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
