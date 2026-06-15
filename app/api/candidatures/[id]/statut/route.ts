import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { statut } = await req.json()
  const valides = ['en_attente', 'entretien', 'formation', 'valide', 'rejete']
  if (!valides.includes(statut)) return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })

  const { error } = await supabase.from('candidatures').update({ statut }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
