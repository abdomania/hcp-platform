import { createServerSupabase } from '@/lib/supabase-server'
import { Users, MapPin, CheckCircle, Clock } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function SuperviseurEnqueteursPage() {
  const supabase = await createServerSupabase()

  const [{ data: enqueteurs }, { data: reponses }, { data: positionsRaw }, { data: signalements }] = await Promise.all([
    supabase.from('candidatures')
      .select('id, nom_complet, email, telephone')
      .eq('statut', 'valide')
      .eq('rh_validation', true),
    supabase.from('reponses_terrain')
      .select('candidature_id, statut, duree_secondes, created_at'),
    supabase.from('positions_gps')
      .select('user_id, latitude, longitude, created_at, profiles(nom, prenom)')
      .order('created_at', { ascending: false })
      .limit(500),
    supabase.from('signalements')
      .select('candidature_id, traite'),
  ])

  // Dernière position par user
  const seenUsers = new Set<string>()
  const lastPos: Record<string, { lat: number; lng: number; at: string }> = {}
  for (const p of (positionsRaw || [])) {
    if (!seenUsers.has(p.user_id)) {
      seenUsers.add(p.user_id)
      lastPos[p.user_id] = { lat: p.latitude, lng: p.longitude, at: p.created_at }
    }
  }

  // Stats par candidature
  const statsMap: Record<string, { total: number; valide: number; durees: number[]; sigs: number }> = {}
  for (const r of (reponses || [])) {
    if (!statsMap[r.candidature_id]) statsMap[r.candidature_id] = { total: 0, valide: 0, durees: [], sigs: 0 }
    statsMap[r.candidature_id].total++
    if (r.statut === 'valide') statsMap[r.candidature_id].valide++
    if (r.duree_secondes) statsMap[r.candidature_id].durees.push(r.duree_secondes)
  }
  for (const s of (signalements || [])) {
    if (!statsMap[s.candidature_id]) statsMap[s.candidature_id] = { total: 0, valide: 0, durees: [], sigs: 0 }
    if (!s.traite) statsMap[s.candidature_id].sigs++
  }

  const now = Date.now()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Enquêteurs</h1>
        <p className="text-slate-500 text-sm mt-1">{enqueteurs?.length || 0} enquêteur(s) validé(s)</p>
      </div>

      <div className="grid gap-4">
        {(!enqueteurs || enqueteurs.length === 0) && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Users size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">Aucun enquêteur validé pour le moment</p>
          </div>
        )}
        {enqueteurs?.map(e => {
          const stats = statsMap[e.id] || { total: 0, valide: 0, durees: [], sigs: 0 }
          const taux = stats.total > 0 ? Math.round((stats.valide / stats.total) * 100) : 0
          const dureeMoy = stats.durees.length > 0
            ? Math.round(stats.durees.reduce((a, b) => a + b, 0) / stats.durees.length / 60)
            : null

          // Trouver user_id via profiles (nom_complet match)
          const userEntry = Array.from(seenUsers).find(uid => {
            const p = positionsRaw?.find(p => p.user_id === uid)
            if (!p?.profiles) return false
            const fullName = `${(p.profiles as any).prenom || ''} ${(p.profiles as any).nom || ''}`.trim().toUpperCase()
            return fullName === e.nom_complet.toUpperCase() || e.nom_complet.toUpperCase().includes((p.profiles as any).nom?.toUpperCase())
          })
          const pos = userEntry ? lastPos[userEntry] : null
          const minutesAgo = pos ? Math.round((now - new Date(pos.at).getTime()) / 60000) : null
          const isRecent = minutesAgo !== null && minutesAgo < 60

          return (
            <div key={e.id} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${isRecent ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                    <Users size={20} className={isRecent ? 'text-emerald-600' : 'text-slate-400'} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{e.nom_complet}</p>
                    <p className="text-xs text-slate-400">{e.email} · {e.telephone}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      {pos ? (
                        <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${isRecent ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          <MapPin size={10} />
                          {isRecent ? `Actif il y a ${minutesAgo} min` : `Inactif · ${new Date(pos.at).toLocaleDateString('fr-FR')}`}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300 italic">Pas encore localisé</span>
                      )}
                      {stats.sigs > 0 && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                          {stats.sigs} signalement(s)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stats rapides */}
                <div className="flex items-center gap-6 flex-shrink-0 text-center">
                  <div>
                    <p className="text-xl font-bold text-slate-900">{stats.total}</p>
                    <p className="text-xs text-slate-400">Questionnaires</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-emerald-600">{taux}%</p>
                    <p className="text-xs text-slate-400">Taux validation</p>
                  </div>
                  {dureeMoy !== null && (
                    <div>
                      <p className="text-xl font-bold text-slate-900">{dureeMoy}<span className="text-sm font-normal"> min</span></p>
                      <p className="text-xs text-slate-400">Durée moy.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Barre de progression */}
              {stats.total > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-50">
                  <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                    <span>{stats.valide} validé(s) / {stats.total} soumis</span>
                    <span className="font-semibold">{taux}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${taux}%` }} />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
