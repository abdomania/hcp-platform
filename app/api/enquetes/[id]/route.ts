import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const { titre, description, date_debut, date_fin, statut } = body
  if (!titre) return NextResponse.json({ error: 'Le titre est requis' }, { status: 400 })

  const { error } = await supabase.from('enquetes').update({
    titre, description: description || null,
    date_debut: date_debut || null, date_fin: date_fin || null, statut,
  }).eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
