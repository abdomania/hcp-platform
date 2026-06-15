import { createServerSupabase } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import TerrainClient from './TerrainClient'

export const dynamic = 'force-dynamic'

export default async function CandidatTerrainPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Trouver la candidature validée de cet utilisateur
  const { data: candidature } = await supabase
    .from('candidatures')
    .select('id, statut, rh_validation, postes(id, enquete_id, enquetes(id, titre))')
    .eq('email', user.email)
    .eq('statut', 'valide')
    .eq('rh_validation', true)
    .single()

  if (!candidature) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
          <span className="text-3xl">🗺️</span>
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Accès terrain non disponible</h2>
        <p className="text-slate-500 text-sm max-w-sm">Le module terrain est accessible uniquement après validation RH et assignation à une enquête active.</p>
      </div>
    )
  }

  const poste = Array.isArray(candidature.postes) ? candidature.postes[0] : candidature.postes
  const enquete = poste ? (Array.isArray((poste as any).enquetes) ? (poste as any).enquetes[0] : (poste as any).enquetes) : null
  const enqueteId = enquete?.id || null

  // Questionnaires liés à cette enquête
  const { data: questionnaires } = enqueteId
    ? await supabase
        .from('questionnaires_terrain')
        .select('id, titre, description, questions')
        .eq('enquete_id', enqueteId)
    : { data: [] }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Interface Terrain</h1>
        <p className="text-slate-500 text-sm mt-1">
          {enquete ? `Enquête : ${enquete.titre}` : 'Collecte de données terrain'}
        </p>
      </div>
      <TerrainClient
        candidatureId={candidature.id}
        questionnaires={(questionnaires as any[]) || []}
        enqueteId={enqueteId}
      />
    </div>
  )
}
