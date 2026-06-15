import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const { titre, description, enquete_id, date_limite, statut, seuil_score_cv, seuil_note_globale, seuil_formation } = body
  if (!titre) return NextResponse.json({ error: 'Le titre est requis' }, { status: 400 })

  const { error } = await supabase.from('postes').update({
    titre,
    description: description || null,
    enquete_id: enquete_id || null,
    date_limite: date_limite || null,
    statut: statut || 'ouvert',
    seuil_score_cv: seuil_score_cv ?? 60,
    seuil_note_globale: seuil_note_globale ?? 50,
    seuil_formation: seuil_formation ?? 70,
  }).eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { count } = await supabase
    .from('candidatures')
    .select('id', { count: 'exact', head: true })
    .eq('poste_id', id)

  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: 'Ce poste a des candidatures actives, impossible de le supprimer.' }, { status: 400 })
  }

  const { error } = await supabase.from('postes').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
