import { createServerSupabase } from '@/lib/supabase-server'
import { KPICard } from '@/components/dashboard/KPICard'
import { StatutBadge } from '@/components/dashboard/StatutBadge'
import DashboardCharts from '@/components/dashboard/DashboardCharts'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function RHDashboardPage() {
  const supabase = await createServerSupabase()

  const { data: recentes } = await supabase
    .from('candidatures')
    .select('id, statut, rh_validation, nom_complet, ville, score_cv, note_globale, created_at, postes(titre)')
    .order('created_at', { ascending: false })
    .limit(5)

  const [
    { count: total },
    { count: enAttente },
    { count: enEntretien },
    { count: enFormation },
    { count: valides },
    { count: rejetes },
    { count: postesOuverts },
  ] = await Promise.all([
    supabase.from('candidatures').select('id', { count: 'exact', head: true }),
    supabase.from('candidatures').select('id', { count: 'exact', head: true }).eq('statut', 'en_attente'),
    supabase.from('candidatures').select('id', { count: 'exact', head: true }).eq('statut', 'entretien'),
    supabase.from('candidatures').select('id', { count: 'exact', head: true }).eq('statut', 'formation'),
    supabase.from('candidatures').select('id', { count: 'exact', head: true }).eq('statut', 'valide'),
    supabase.from('candidatures').select('id', { count: 'exact', head: true }).eq('statut', 'rejete'),
    supabase.from('postes').select('id', { count: 'exact', head: true }).eq('statut', 'ouvert'),
  ])

  // Validés par IA vs RH
  const { count: valideRH } = await supabase
    .from('candidatures').select('id', { count: 'exact', head: true }).eq('statut', 'valide').eq('rh_validation', true)
  const valideIA = (valides ?? 0) - (valideRH ?? 0)

  // Évolution 7 derniers jours
  const sept = new Date(); sept.setDate(sept.getDate() - 6)
  const { data: recentes7j } = await supabase
    .from('candidatures')
    .select('created_at')
    .gte('created_at', sept.toISOString())

  const jourMap: Record<string, number> = {}
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    jourMap[d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })] = 0
  }
  recentes7j?.forEach(c => {
    const label = new Date(c.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
    if (jourMap[label] !== undefined) jourMap[label]++
  })
  const evolution = Object.entries(jourMap).map(([date, total]) => ({ date, total }))

  const stats = {
    en_attente: enAttente ?? 0,
    entretien: enEntretien ?? 0,
    formation: enFormation ?? 0,
    valide_ia: valideIA,
    valide_rh: valideRH ?? 0,
    rejete: rejetes ?? 0,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tableau de bord RH</h1>
          <p className="text-slate-500 mt-1 text-sm">Vue d'ensemble des candidatures — Plateforme HCP</p>
        </div>
        {(postesOuverts ?? 0) > 0 && (
          <Link href="/rh/postes" className="text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors">
            {postesOuverts} poste(s) ouvert(s) →
          </Link>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard label="Total" value={total ?? 0} color="slate" />
        <KPICard label="En attente" value={enAttente ?? 0} color="amber" />
        <KPICard label="En entretien" value={enEntretien ?? 0} color="blue" />
        <KPICard label="En formation" value={enFormation ?? 0} color="violet" />
        <KPICard label="Validés" value={valides ?? 0} color="emerald" />
        <KPICard label="Rejetés" value={rejetes ?? 0} color="red" />
      </div>

      {/* CHARTS */}
      <DashboardCharts stats={stats} evolution={evolution} />

      {/* CANDIDATURES RÉCENTES */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900">Candidatures récentes</h2>
          <Link href="/rh/candidatures" className="text-sm text-blue-600 hover:underline">Voir toutes →</Link>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200">
              <th className="py-2 font-medium">Nom</th>
              <th className="py-2 font-medium">Poste</th>
              <th className="py-2 font-medium">Ville</th>
              <th className="py-2 font-medium">Score CV</th>
              <th className="py-2 font-medium">Note globale</th>
              <th className="py-2 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody>
            {recentes?.map((c: any) => (
              <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="py-2.5">
                  <Link href={`/rh/candidatures/${c.id}`} className="text-blue-600 hover:underline font-medium">{c.nom_complet}</Link>
                </td>
                <td className="py-2.5 text-slate-500">{c.postes?.titre || '—'}</td>
                <td className="py-2.5 text-slate-500">{c.ville || '—'}</td>
                <td className="py-2.5 font-medium">{c.score_cv ?? '—'}</td>
                <td className="py-2.5 font-bold">{c.note_globale ?? '—'}</td>
                <td className="py-2.5"><StatutBadge statut={c.statut} rhValidation={c.rh_validation} /></td>
              </tr>
            ))}
            {(!recentes || recentes.length === 0) && (
              <tr><td colSpan={6} className="py-8 text-center text-slate-400">Aucune candidature pour le moment</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
