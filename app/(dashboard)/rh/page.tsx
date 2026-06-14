import { createServerSupabase } from '@/lib/supabase-server'
import { KPICard } from '@/components/dashboard/KPICard'
import { StatutBadge } from '@/components/dashboard/StatutBadge'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function RHDashboardPage() {
  const supabase = await createServerSupabase()

  // 1. Récupérer uniquement les 5 candidatures les plus récentes pour le tableau
  const { data: recentes } = await supabase
    .from('candidatures')
    .select('id, statut, nom_complet, ville, score_cv, note_globale, created_at, postes(titre)')
    .order('created_at', { ascending: false })
    .limit(5) // On limite le téléchargement des données lourdes

  // 2. Compter les statuts de manière ultra-optimisée (sans télécharger les lignes)
  const [
    { count: total },
    { count: enAttente },
    { count: enEntretien },
    { count: enFormation },
    { count: valides },
    { count: rejetes },
    { count: postesOuverts }
  ] = await Promise.all([
    supabase.from('candidatures').select('id', { count: 'exact', head: true }),
    supabase.from('candidatures').select('id', { count: 'exact', head: true }).eq('statut', 'en_attente'),
    supabase.from('candidatures').select('id', { count: 'exact', head: true }).eq('statut', 'entretien'),
    supabase.from('candidatures').select('id', { count: 'exact', head: true }).eq('statut', 'formation'),
    supabase.from('candidatures').select('id', { count: 'exact', head: true }).eq('statut', 'valide'),
    supabase.from('candidatures').select('id', { count: 'exact', head: true }).eq('statut', 'rejete'),
    supabase.from('postes').select('id', { count: 'exact', head: true }).eq('statut', 'ouvert')
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tableau de bord RH</h1>
        <p className="text-slate-500 mt-1">Vue d'ensemble des candidatures — Plateforme HCP</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* On utilise les variables optimisées */}
        <KPICard label="Total candidatures" value={total ?? 0} color="slate" />
        <KPICard label="En attente" value={enAttente ?? 0} color="amber" />
        <KPICard label="En entretien" value={enEntretien ?? 0} color="blue" />
        <KPICard label="En formation" value={enFormation ?? 0} color="violet" />
        <KPICard label="Validés" value={valides ?? 0} color="emerald" />
        <KPICard label="Rejetés" value={rejetes ?? 0} color="red" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900">Candidatures récentes</h2>
          <Link href="/rh/candidatures" className="text-sm text-blue-600 hover:underline">
            Voir toutes →
          </Link>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200">
              <th className="py-2">Nom</th>
              <th className="py-2">Poste</th>
              <th className="py-2">Ville</th>
              <th className="py-2">Score CV</th>
              <th className="py-2">Note globale</th>
              <th className="py-2">Statut</th>
            </tr>
          </thead>
          <tbody>
            {recentes?.map((c: any) => (
              <tr key={c.id} className="border-b border-slate-100 last:border-0">
                <td className="py-2">
                  <Link href={`/rh/candidatures/${c.id}`} className="text-blue-600 hover:underline">
                    {c.nom_complet}
                  </Link>
                </td>
                <td className="py-2">{c.postes?.titre || '—'}</td>
                <td className="py-2">{c.ville || '—'}</td>
                <td className="py-2">{c.score_cv ?? '—'}</td>
                <td className="py-2">{c.note_globale ?? '—'}</td>
                <td className="py-2"><StatutBadge statut={c.statut} /></td>
              </tr>
            ))}
            {(!recentes || recentes.length === 0) && (
              <tr><td colSpan={6} className="py-6 text-center text-slate-400">Aucune candidature pour le moment</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-slate-500">{postesOuverts ?? 0} poste(s) actuellement ouvert(s)</p>
    </div>
  )
}