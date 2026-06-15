import { createServerSupabase } from '@/lib/supabase-server'
import SignalementsClient from './SignalementsClient'

export const dynamic = 'force-dynamic'

export default async function SuperviseurSignalementsPage() {
  const supabase = await createServerSupabase()

  const { data: signalements } = await supabase
    .from('signalements')
    .select('id, candidature_id, type, description, traite, latitude, longitude, created_at, candidatures(nom_complet), enquetes(titre)')
    .order('created_at', { ascending: false })

  const mapped = (signalements || []).map((s: any) => ({
    id: s.id,
    candidature_id: s.candidature_id,
    nom: s.candidatures?.nom_complet || '—',
    enquete: s.enquetes?.titre || null,
    type: s.type,
    description: s.description,
    traite: s.traite,
    latitude: s.latitude,
    longitude: s.longitude,
    created_at: s.created_at,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Signalements terrain</h1>
        <p className="text-slate-500 text-sm mt-1">{mapped.length} signalement(s) au total · {mapped.filter(s => !s.traite).length} en attente</p>
      </div>
      <SignalementsClient signalements={mapped} />
    </div>
  )
}
