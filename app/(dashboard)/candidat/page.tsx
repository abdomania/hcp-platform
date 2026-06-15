import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'

export default async function CandidatPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Chercher la candidature active de ce candidat
  const { data: candidature } = await supabase
    .from('candidatures')
    .select('id, statut')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!candidature) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Aucune candidature trouvée.</p>
          <a href="/candidature" className="text-blue-600 hover:underline text-sm">
            Déposer une candidature →
          </a>
        </div>
      </div>
    )
  }

  // Redirection selon le statut
  if (candidature.statut === 'valide') {
    redirect('/candidat/terrain')
  }

  redirect('/candidat/formation')
}
