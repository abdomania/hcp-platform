import { createServerSupabase } from '@/lib/supabase-server'
import nextDynamic from 'next/dynamic'
import { MapPin, AlertTriangle, Users, CheckCircle, Clock } from 'lucide-react'
import SignalementsTable from './SignalementsTable'

export const dynamic = 'force-dynamic'

const TerrainMap = nextDynamic(() => import('@/components/dashboard/TerrainMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-100 rounded-xl flex items-center justify-center">
      <div className="text-slate-400 text-sm flex items-center gap-2">
        <MapPin size={18} className="animate-pulse" /> Chargement de la carte...
      </div>
    </div>
  ),
})

const TYPE_LABELS: Record<string, string> = {
  refus: 'Refus', absent: 'Absent', adresse_incorrecte: 'Adresse incorrecte',
  probleme_technique: 'Problème technique', autre: 'Autre',
}

export default async function TerrainPage() {
  const supabase = await createServerSupabase()

  // Dernières positions par enquêteur (1 par candidature)
  const { data: positionsRaw } = await supabase
    .from('positions')
    .select('id, candidature_id, latitude, longitude, created_at, candidatures(nom_complet)')
    .order('created_at', { ascending: false })
    .limit(200)

  // Dédupliquer : garder seulement la dernière position par candidature
  const seenCandidatures = new Set<string>()
  const positions = (positionsRaw || [])
    .filter(p => {
      if (seenCandidatures.has(p.candidature_id)) return false
      seenCandidatures.add(p.candidature_id)
      return true
    })
    .map(p => ({
      id: p.id,
      candidature_id: p.candidature_id,
      latitude: p.latitude,
      longitude: p.longitude,
      created_at: p.created_at,
      nom: (p.candidatures as any)?.nom_complet || 'Enquêteur',
    }))

  // Signalements
  const { data: signalementsRaw } = await supabase
    .from('signalements')
    .select('id, candidature_id, latitude, longitude, type, description, traite, created_at, candidatures(nom_complet)')
    .order('created_at', { ascending: false })
    .limit(100)

  const signalements = (signalementsRaw || []).map(s => ({
    id: s.id,
    candidature_id: s.candidature_id,
    latitude: s.latitude,
    longitude: s.longitude,
    type: s.type,
    description: s.description,
    traite: s.traite,
    created_at: s.created_at,
    nom: (s.candidatures as any)?.nom_complet || 'Enquêteur',
  }))

  // Réponses terrain pour KPIs
  const { data: reponses } = await supabase
    .from('reponses_terrain')
    .select('id, statut, duree_secondes, created_at')

  const totalReponses = reponses?.length || 0
  const reponsesValides = reponses?.filter(r => r.statut === 'valide').length || 0
  const tauxValidation = totalReponses > 0 ? Math.round((reponsesValides / totalReponses) * 100) : 0
  const dureesMoyenne = reponses?.filter(r => r.duree_secondes).map(r => r.duree_secondes!) || []
  const dureeMoyenne = dureesMoyenne.length > 0
    ? Math.round(dureesMoyenne.reduce((a, b) => a + b, 0) / dureesMoyenne.length / 60)
    : 0

  const signalementsOuverts = signalements.filter(s => !s.traite).length
  const refusCount = signalements.filter(s => s.type === 'refus').length

  return (
    <div className="space-y-6 h-full">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Suivi Terrain</h1>
        <p className="text-slate-500 text-sm mt-1">Positions GPS en temps réel · Signalements · KPIs terrain</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center"><Users size={18} className="text-blue-600" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{positions.length}</p>
              <p className="text-xs text-slate-500">Enquêteurs actifs</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center"><CheckCircle size={18} className="text-emerald-600" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{totalReponses}</p>
              <p className="text-xs text-slate-500">Questionnaires soumis</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center"><CheckCircle size={18} className="text-violet-600" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{tauxValidation}%</p>
              <p className="text-xs text-slate-500">Taux de validation</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center"><Clock size={18} className="text-amber-600" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{dureeMoyenne}<span className="text-sm font-normal text-slate-500 ml-0.5">min</span></p>
              <p className="text-xs text-slate-500">Durée moyenne</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${signalementsOuverts > 0 ? 'bg-red-50' : 'bg-slate-50'}`}>
              <AlertTriangle size={18} className={signalementsOuverts > 0 ? 'text-red-600' : 'text-slate-400'} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{signalementsOuverts}</p>
              <p className="text-xs text-slate-500">Signalements ouverts</p>
            </div>
          </div>
        </div>
      </div>

      {/* CARTE + SIGNALEMENTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Carte */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden" style={{ height: '480px' }}>
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800 text-sm">Carte des enquêteurs</h2>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />{positions.length} actifs</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-red-500 inline-block" />{signalements.length} signalements</span>
            </div>
          </div>
          <div className="h-[calc(100%-49px)]">
            <TerrainMap positions={positions} signalements={signalements} />
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
                  <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
          {signalements.length === 0 && (
            <p className="text-slate-400 text-sm text-center py-4">Aucun signalement</p>
          )}
        </div>
      </div>

      {/* TABLE SIGNALEMENTS */}
      <SignalementsTable signalements={signalements} />
    </div>
  )
}
