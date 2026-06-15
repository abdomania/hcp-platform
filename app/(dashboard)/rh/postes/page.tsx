import { createServerSupabase } from '@/lib/supabase-server'
import PostesActions from '@/components/dashboard/PostesActions'

export const dynamic = 'force-dynamic'

export default async function PostesListPage() {
  const supabase = await createServerSupabase()

  const [{ data: postes }, { data: enquetes }] = await Promise.all([
    supabase
      .from('postes')
      .select('id, titre, description, statut, date_limite, formation_id, enquete_id, seuil_score_cv, seuil_note_globale, seuil_formation, enquetes(id, titre), candidatures(count)')
      .order('created_at', { ascending: false }),
    supabase.from('enquetes').select('id, titre').order('created_at', { ascending: false }),
  ])

  return (
    <PostesActions
      postes={(postes as any[]) || []}
      enquetes={enquetes || []}
    />
  )
}
