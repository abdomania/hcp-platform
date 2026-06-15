import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

// GET — toutes les formations avec leur poste et enquête associés
export async function GET() {
  const supabase = await createServerSupabase()

  const { data, error } = await supabase
    .from('formations')
    .select(`
      id, nb_chapitres, created_at, chapitres, examen_final,
      postes(id, titre, enquete_id, enquetes(id, titre))
    `)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ formations: data })
}

// PATCH — modifier l'enquête associée ou le questionnaire
export async function PATCH(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id, enquete_id, examen_final } = await req.json()
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  // Mise à jour du questionnaire/examen sur la formation
  if (examen_final !== undefined) {
    const { error } = await supabase.from('formations').update({ examen_final }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Mise à jour de l'enquête associée via le poste
  if (enquete_id !== undefined) {
    const { data: formation } = await supabase.from('formations').select('postes(id)').eq('id', id).single()
    const posteId = (formation as any)?.postes?.id
    if (posteId) {
      const { error } = await supabase.from('postes').update({ enquete_id }).eq('id', posteId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}

// DELETE — supprimer une formation
export async function DELETE(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await req.json()

  // Délier du poste avant suppression
  const { data: formation } = await supabase.from('formations').select('postes(id)').eq('id', id).single()
  const posteId = (formation as any)?.postes?.id
  if (posteId) {
    await supabase.from('postes').update({ formation_id: null }).eq('id', posteId)
  }

  const { error } = await supabase.from('formations').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
