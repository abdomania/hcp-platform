import { createServerSupabase } from '@/lib/supabase-server'
import CandidaturesClient from './CandidaturesClient'

export const dynamic = 'force-dynamic'

export default async function CandidaturesListPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; poste?: string; q?: string }>
}) {
  const params = await searchParams
  const supabase = await createServerSupabase()

  let query = supabase
    .from('candidatures')
    .select('id, nom_complet, email, ville, niveau_etudes, score_cv, note_entretien, note_globale, statut, rh_validation, created_at, postes(id, titre)')
    .order('created_at', { ascending: false })

  if (params.statut) query = query.eq('statut', params.statut)
  if (params.poste) query = query.eq('poste_id', params.poste)
  if (params.q) query = query.ilike('nom_complet', `%${params.q}%`)

  const { data: candidatures } = await query
  const { data: postes } = await supabase.from('postes').select('id, titre').order('created_at', { ascending: false })

  return (
    <CandidaturesClient
      candidatures={(candidatures as any[]) || []}
      postes={postes || []}
      filtreStatut={params.statut}
      filtrePoste={params.poste}
      filtreQ={params.q}
    />
  )
}
