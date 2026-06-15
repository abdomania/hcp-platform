import { createServerSupabase } from '@/lib/supabase-server'
import FormationsClient from './FormationsClient'

export const dynamic = 'force-dynamic'

export default async function FormationsPage() {
  const supabase = await createServerSupabase()

  const [{ data: formations, error: errF }, { data: enquetes }] = await Promise.all([
    supabase
      .from('formations')
      .select('id, nb_chapitres, created_at, chapitres, examen_final, postes!poste_id(id, titre, enquete_id, enquetes!enquete_id(id, titre))')
      .order('created_at', { ascending: false }),
    supabase.from('enquetes').select('id, titre, statut').order('created_at', { ascending: false }),
  ])

  if (errF) console.error('[Formations page] Erreur Supabase:', errF.message, errF.details)

  return <FormationsClient formations={formations || []} enquetes={enquetes || []} />
}
