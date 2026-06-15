import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { candidature_id, enquete_id, type, description, latitude, longitude } = await req.json()
  if (!candidature_id || !type) return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })

  const { error } = await supabase.from('signalements').insert({
    candidature_id, enquete_id: enquete_id || null, type, description: description || null,
    latitude: latitude || null, longitude: longitude || null,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
