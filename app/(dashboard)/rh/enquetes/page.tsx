import { createServerSupabase } from '@/lib/supabase-server'
import EnquetesClient from './EnquetesClient'

export const dynamic = 'force-dynamic'

export default async function EnquetesPage() {
  const supabase = await createServerSupabase()

  const { data: enquetes } = await supabase
    .from('enquetes')
    .select('id, titre, description, date_debut, date_fin, statut, created_at')
    .order('created_at', { ascending: false })

  // Nombre de postes liés à chaque enquête
  const { data: postes } = await supabase
    .from('postes')
    .select('enquete_id')

  const postesParEnquete: Record<string, number> = {}
  postes?.forEach((p: any) => {
    if (p.enquete_id) postesParEnquete[p.enquete_id] = (postesParEnquete[p.enquete_id] || 0) + 1
  })

  return <EnquetesClient enquetes={enquetes || []} postesParEnquete={postesParEnquete} />
}
