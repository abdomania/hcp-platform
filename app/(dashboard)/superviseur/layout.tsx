import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'
import SidebarSuperviseur from '@/components/dashboard/SidebarSuperviseur'

export default async function SuperviseurLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['superviseur', 'admin'].includes(profile.role)) {
    redirect('/')
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <SidebarSuperviseur />
      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
