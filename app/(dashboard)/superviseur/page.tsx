import { createServerSupabase } from '@/lib/supabase-server'
import { Users, CheckCircle, AlertTriangle, Clock, MapPin } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function SuperviseurDashboard() {
  const supabase = await createServerSupabase()

  const [
    { data: reponses },
    { data: signalements },
    { data: positionsRaw },
    { data: enqueteurs },
  ] = await Promise.all([
    supabase.from('reponses_terrain').select('id, statut, duree_secondes, created_at, candidatures(nom_complet)'),
    supabase.from('signalements').select('id, type, traite, created_at, candidatures(nom_complet)'),
    supabase.from('positions_gps').select('user_id, created_at').order('created_at', { ascending: false }),
    supabase.from('candidatures')
      .select('id, nom_complet, email, statut, rh_validation')
      .eq('statut', 'valide')
      .eq('rh_validation', true),
  ])

  // Dernière position par user
  const seenUsers = new Set<string>()
  const dernierePositionParUser: Record<string, string> = {}
  for (const p of (positionsRaw || [])) {
    if (!seenUsers.has(p.user_id)) {
      seenUsers.add(p.user_id)
      dernierePositionParUser[p.user_id] = p.created_at
    }
  }
  const nbActifsAujourdhui = Object.values(dernierePositionParUser).filter(d => {
    const diff = Date.now() - new Date(d).getTime()
    return diff < 24 * 60 * 60 * 1000
  }).length

  const totalReponses = reponses?.length || 0
  const reponsesValides = reponses?.filter(r => r.statut === 'valide').length || 0
  const tauxValidation = totalReponses > 0 ? Math.round((reponsesValides / totalReponses) * 100) : 0
  const durees = reponses?.filter(r => r.duree_secondes).map(r => r.duree_secondes!) || []
  const dureeMoy = durees.length > 0 ? Math.round(durees.reduce((a, b) => a + b, 0) / durees.length / 60) : 0
  const sigOuverts = signalements?.filter(s => !s.traite).length || 0

  // Rendement par enquêteur
  const rendementMap: Record<string, { nom: string; total: number; valide: number }> = {}
  for (const r of (reponses || [])) {
    const nom = (r.candidatures as any)?.nom_complet || 'Inconnu'
    if (!rendementMap[nom]) rendementMap[nom] = { nom, total: 0, valide: 0 }
    rendementMap[nom].total++
    if (r.statut === 'valide') rendementMap[nom].valide++
  }
  const rendement = Object.values(rendementMap).sort((a, b) => b.total - a.total)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tableau de bord Superviseur</h1>
        <p className="text-slate-500 text-sm mt-1">Suivi en temps réel — ENE 2026</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Enquêteurs actifs (24h)', value: nbActifsAujourdhui, icon: <Users size={18} />, color: 'blue' },
          { label: 'Questionnaires soumis', value: totalReponses, icon: <CheckCircle size={18} />, color: 'emerald' },
          { label: 'Taux de validation', value: `${tauxValidation}%`, icon: <CheckCircle size={18} />, color: 'violet' },
          { label: 'Durée moyenne', value: `${dureeMoy} min`, icon: <Clock size={18} />, color: 'amber' },
          { label: 'Signalements ouverts', value: sigOuverts, icon: <AlertTriangle size={18} />, color: sigOuverts > 0 ? 'red' : 'slate' },
        ].map((k, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-${k.color}-50`}>
                <span className={`text-${k.color}-600`}>{k.icon}</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{k.value}</p>
                <p className="text-xs text-slate-500">{k.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rendement par enquêteur */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">Rendement par enquêteur</h2>
            <Link href="/superviseur/enqueteurs" className="text-xs text-blue-600 hover:underline">Voir tout →</Link>
          </div>
          <div className="space-y-3">
            {rendement.length === 0 && <p className="text-slate-400 text-sm text-center py-6">Aucune donnée</p>}
            {rendement.map((e, i) => {
              const pct = e.total > 0 ? Math.round((e.valide / e.total) * 100) : 0
              return (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-700 font-medium">{e.nom}</span>
                    <span className="text-slate-500">{e.valide}/{e.total} questionnaires</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Signalements récents */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">Signalements récents</h2>
            <Link href="/superviseur/signalements" className="text-xs text-blue-600 hover:underline">Voir tout →</Link>
          </div>
          <div className="space-y-2">
            {(!signalements || signalements.length === 0) && <p className="text-slate-400 text-sm text-center py-6">Aucun signalement</p>}
            {signalements?.slice(0, 5).map(s => (
              <div key={s.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-800">{(s.candidatures as any)?.nom_complet || '—'}</p>
                  <p className="text-xs text-slate-400">{s.type} · {new Date(s.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${s.traite ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {s.traite ? 'Traité' : 'Ouvert'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Accès rapide carte */}
      <Link href="/superviseur/carte"
        className="flex items-center gap-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-6 py-4 transition-colors">
        <MapPin size={24} />
        <div>
          <p className="font-bold">Voir la carte GPS en temps réel</p>
          <p className="text-emerald-100 text-sm">{Object.keys(dernierePositionParUser).length} enquêteur(s) localisé(s)</p>
        </div>
        <span className="ml-auto text-2xl">→</span>
      </Link>
    </div>
  )
}
