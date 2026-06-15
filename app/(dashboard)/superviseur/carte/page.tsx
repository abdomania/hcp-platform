import { createServerSupabase } from '@/lib/supabase-server'
import TerrainMapWrapper from '@/app/(dashboard)/rh/terrain/TerrainMapWrapper'
import SignalementsTable from './SignalementsTable'
import { MapPin } from 'lucide-react'

export const dynamic = 'force-dynamic'

const TYPE_LABELS: Record<string, string> = {
  refus: 'Refus', absent: 'Absent', adresse_incorrecte: 'Adresse incorrecte',
  probleme_technique: 'Problème technique', autre: 'Autre',
}

export default async function SuperviseurCartePage() {
  const supabase = await createServerSupabase()

  const { data: positionsRaw } = await supabase
    .from('positions_gps')
    .select('id, user_id, latitude, longitude, created_at, profiles(nom, prenom)')
    .order('created_at', { ascending: false })
    .limit(500)

  const seenUsers = new Set<string>()
  const positions = (positionsRaw || [])
    .filter((p: any) => {
      if (seenUsers.has(p.user_id)) return false
      seenUsers.add(p.user_id)
      return true
    })
    .map((p: any) => ({
      id: p.id,
      candidature_id: p.user_id,
      latitude: p.latitude,
      longitude: p.longitude,
      created_at: p.created_at,
      nom: p.profiles ? `${p.profiles.prenom || ''} ${p.profiles.nom || ''}`.trim() || 'Enquêteur' : 'Enquêteur',
    }))

  const { data: signalementsRaw } = await supabase
    .from('signalements')
    .select('id, candidature_id, latitude, longitude, type, description, traite, created_at, candidatures(nom_complet)')
    .order('created_at', { ascending: false })
    .limit(200)

  const signalements = (signalementsRaw || []).map((s: any) => ({
    id: s.id,
    candidature_id: s.candidature_id,
    latitude: s.latitude,
    longitude: s.longitude,
    type: s.type,
    description: s.description,
    traite: s.traite,
    created_at: s.created_at,
    nom: s.candidatures?.nom_complet || 'Enquêteur',
  }))

  const signalementsOuverts = signalements.filter(s => !s.traite).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Carte GPS</h1>
        <p className="text-slate-500 text-sm mt-1">Positions en temps réel · {positions.length} enquêteur(s) localisé(s)</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Carte */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden" style={{ height: '520px' }}>
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
              <MapPin size={15} className="text-emerald-600" /> Carte des enquêteurs
            </h2>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />{positions.length} actifs</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-red-500 inline-block" />{signalements.length} signalements</span>
            </div>
          </div>
          <div className="h-[calc(100%-49px)]">
            <TerrainMapWrapper positions={positions} signalements={signalements} />
          </div>
        </div>

        {/* Stats signalements */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="font-semibold text-slate-800 text-sm">Signalements par type</h2>
          {Object.entries(TYPE_LABELS).map(([type, label]) => {
            const count = signalements.filter(s => s.type === type).length
            const pct = signalements.length > 0 ? Math.round((count / signalements.length) * 100) : 0
            return (
              <div key={type}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-600">{label}</span>
                  <span className="font-bold text-slate-800">{count}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
          {signalements.length === 0 && <p className="text-slate-400 text-sm text-center py-4">Aucun signalement</p>}
          {signalementsOuverts > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs font-semibold text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                ⚠ {signalementsOuverts} signalement(s) en attente de traitement
              </p>
            </div>
          )}
        </div>
      </div>

      <SignalementsTable signalements={signalements} />
    </div>
  )
}
