import { createServerSupabase } from '@/lib/supabase-server'
import { StatutBadge } from '@/components/dashboard/StatutBadge'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const STATUTS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'en_attente', label: 'En attente' },
  { value: 'entretien', label: 'Entretien' },
  { value: 'formation', label: 'Formation' },
  { value: 'valide', label: 'Validé' },
  { value: 'rejete', label: 'Rejeté' },
]

export default async function CandidaturesListPage({
  searchParams,
}: {
  searchParams: { statut?: string; poste?: string; q?: string }
}) {
  const supabase = createServerSupabase()

  let query = supabase
    .from('candidatures')
    .select('id, nom_complet, email, ville, niveau_etudes, score_cv, note_entretien, note_globale, statut, created_at, postes(id, titre)')
    .order('created_at', { ascending: false })

  if (searchParams.statut) query = query.eq('statut', searchParams.statut)
  if (searchParams.poste) query = query.eq('poste_id', searchParams.poste)
  if (searchParams.q) query = query.ilike('nom_complet', `%${searchParams.q}%`)

  const { data: candidatures } = await query
  const { data: postes } = await supabase.from('postes').select('id, titre').order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Candidatures</h1>
        <p className="text-slate-500 mt-1">{candidatures?.length || 0} résultat(s)</p>
      </div>

      <form method="get" className="flex flex-wrap gap-3 bg-white border border-slate-200 rounded-xl p-4">
        <input
          type="text"
          name="q"
          defaultValue={searchParams.q}
          placeholder="Rechercher par nom..."
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px]"
        />
        <select name="statut" defaultValue={searchParams.statut || ''} className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
          {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select name="poste" defaultValue={searchParams.poste || ''} className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
          <option value="">Tous les postes</option>
          {postes?.map(p => <option key={p.id} value={p.id}>{p.titre}</option>)}
        </select>
        <button type="submit" className="bg-slate-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-slate-800">
          Filtrer
        </button>
        {(searchParams.q || searchParams.statut || searchParams.poste) && (
          <Link href="/rh/candidatures" className="text-sm text-slate-500 px-3 py-2 hover:underline">
            Réinitialiser
          </Link>
        )}
      </form>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200 bg-slate-50">
              <th className="py-3 px-4">Candidat</th>
              <th className="py-3 px-4">Poste</th>
              <th className="py-3 px-4">Ville</th>
              <th className="py-3 px-4">Niveau</th>
              <th className="py-3 px-4">Score CV</th>
              <th className="py-3 px-4">Entretien</th>
              <th className="py-3 px-4">Note globale</th>
              <th className="py-3 px-4">Statut</th>
            </tr>
          </thead>
          <tbody>
            {candidatures?.map((c: any) => (
              <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="py-3 px-4">
                  <Link href={`/rh/candidatures/${c.id}`} className="font-medium text-blue-600 hover:underline">
                    {c.nom_complet}
                  </Link>
                  <p className="text-xs text-slate-400">{c.email}</p>
                </td>
                <td className="py-3 px-4">{c.postes?.titre || '—'}</td>
                <td className="py-3 px-4">{c.ville || '—'}</td>
                <td className="py-3 px-4">{c.niveau_etudes || '—'}</td>
                <td className="py-3 px-4">{c.score_cv ?? '—'}</td>
                <td className="py-3 px-4">{c.note_entretien ?? '—'}</td>
                <td className="py-3 px-4 font-medium">{c.note_globale ?? '—'}</td>
                <td className="py-3 px-4"><StatutBadge statut={c.statut} /></td>
              </tr>
            ))}
            {(!candidatures || candidatures.length === 0) && (
              <tr><td colSpan={8} className="py-8 text-center text-slate-400">Aucune candidature ne correspond aux filtres</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}