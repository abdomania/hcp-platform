import { createServerSupabase } from '@/lib/supabase-server'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function PostesListPage() {
  const supabase = await createServerSupabase()

  // 1. Requête optimisée : on demande à Supabase de compter les candidatures (count)
  // directement côté base de données pour éviter de télécharger des milliers de lignes
  const { data: postes } = await supabase
    .from('postes')
    .select(`
      id, 
      titre, 
      statut, 
      date_limite, 
      formation_id, 
      enquetes(titre),
      candidatures(count)
    `)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Postes</h1>
        <p className="text-slate-500 mt-1">{postes?.length || 0} poste(s) ouvert(s) ou clôturé(s)</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200 bg-slate-50">
              <th className="py-3 px-4">Titre</th>
              <th className="py-3 px-4">Enquête</th>
              <th className="py-3 px-4">Date limite</th>
              <th className="py-3 px-4">Candidatures</th>
              <th className="py-3 px-4">Formation</th>
              <th className="py-3 px-4">Statut</th>
              <th className="py-3 px-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {postes?.map((p: any) => {
              // Extraction sécurisée du compteur renvoyé par Supabase
              // PostgREST renvoie le count sous forme de tableau d'objet : [{ count: X }]
              const nbCandidatures = p.candidatures?.[0]?.count || 0

              return (
                <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium">{p.titre}</td>
                  <td className="py-3 px-4">{p.enquetes?.titre || '—'}</td>
                  <td className="py-3 px-4">{p.date_limite ? new Date(p.date_limite).toLocaleDateString('fr-FR') : '—'}</td>
                  <td className="py-3 px-4">
                    <Link href={`/rh/candidatures?poste=${p.id}`} className="text-blue-600 hover:underline font-bold">
                      {nbCandidatures}
                    </Link>
                  </td>
                  <td className="py-3 px-4">{p.formation_id ? '✅ Prête' : '—'}</td>
                  <td className="py-3 px-4 capitalize">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.statut === 'ouvert' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                      {p.statut}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {/* Correction du lien : on passe le poste_id en paramètre pour la page de formation */}
                    <Link href={`/rh/postes/formation?poste_id=${p.id}`} className="text-sm text-blue-600 hover:underline font-medium">
                      Gérer la formation →
                    </Link>
                  </td>
                </tr>
              )
            })}
            
            {(!postes || postes.length === 0) && (
              <tr><td colSpan={7} className="py-8 text-center text-slate-400">Aucun poste disponible</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}