import { createServerSupabase } from '@/lib/supabase-server'
import FormationsClient from './FormationsClient'

export const dynamic = 'force-dynamic'

export default async function FormationsPage() {
  const supabase = await createServerSupabase()

  const [{ data: formations }, { data: enquetes }] = await Promise.all([
    supabase
      .from('formations')
      .select('id, nb_chapitres, created_at, chapitres, examen_final, postes(id, titre, enquete_id, enquetes(id, titre))')
      .order('created_at', { ascending: false }),
    supabase.from('enquetes').select('id, titre, statut').order('created_at', { ascending: false }),
  ])

  return <FormationsClient formations={formations || []} enquetes={enquetes || []} />
}
