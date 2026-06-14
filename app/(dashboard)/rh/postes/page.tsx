import { createServerSupabase } from '@/lib/supabase-server'
import Link from 'next/link'
import PostesActions from '@/components/dashboard/PostesActions'

export const dynamic = 'force-dynamic'

export default async function PostesListPage() {
  const supabase = await createServerSupabase()

  const [{ data: postes }, { data: enquetes }] = await Promise.all([
    supabase
      .from('postes')
      .select('id, titre, statut, date_limite, formation_id, enquetes(titre), candidatures(count)')
      .order('created_at', { ascending: false }),
    supabase.from('enquetes').select('id, titre').order('created_at', { ascending: false }),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Postes</h1>
          <p className="text-slate-500 mt-1 text-sm">{postes?.length || 0} poste(s) au total</p>
        </div>
        <PostesActions enquetes={enquetes || []} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide">
              <th className="py-3 px-4">Titre</th>
              <th className="py-3 px-4">Enquête</th>
              <th className="py-3 px-4">Date limite</th>
              <th className="py-3 px-4">Candidatures</th>
              <th className="py-3 px-4">Formation</th>
              <th className="py-3 px-4">Statut</th>
              <th className="py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {postes?.map((p: any) => {
              const nbCandidatures = p.candidatures?.[0]?.count || 0
              const isOuvert = p.statut === 'ouvert'

              return (
                <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-medium text-slate-800">{p.titre}</td>
                  <td className="py-3 px-4 text-slate-500">{p.enquetes?.titre || '—'}</td>
                  <td className="py-3 px-4 text-slate-500">
                    {p.date_limite ? new Date(p.date_limite).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td className="py-3 px-4">
                    <Link href={`/rh/candidatures?poste=${p.id}`} className="text-blue-600 hover:underline font-bold">
                      {nbCandidatures}
                    </Link>
                  </td>
                  <td className="py-3 px-4">
                    {p.formation_id
                      ? <span className="text-emerald-600 font-medium text-xs">✓ Prête</span>
                      : <Link href={`/rh/postes/formation?poste_id=${p.id}`} className="text-amber-600 text-xs hover:underline font-medium">+ Générer</Link>
                    }
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${isOuvert ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {isOuvert ? 'Ouvert' : 'Fermé'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <Link href={`/rh/postes/formation?poste_id=${p.id}`} className="text-blue-600 hover:underline text-xs font-medium">
                        {p.formation_id ? 'Formation →' : 'Générer →'}
                      </Link>
                    </div>
                  </td>
                </tr>
              )
            })}

            {(!postes || postes.length === 0) && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  <p className="text-base mb-1">Aucun poste créé</p>
                  <p className="text-sm">Cliquez sur "Nouveau poste" pour commencer</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
