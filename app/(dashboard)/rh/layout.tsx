import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'
import SidebarRH from '@/components/dashboard/SidebarRH'

export default async function RHLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['rh', 'admin'].includes(profile.role)) {
    redirect('/')
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Intégration du composant Client */}
      <SidebarRH />
      
      {/* Contenu principal de la page */}
      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}