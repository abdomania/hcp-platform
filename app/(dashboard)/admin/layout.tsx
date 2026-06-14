import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'
import SidebarAdmin from '@/components/dashboard/SidebarAdmin'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, nom_complet')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') redirect('/')

  return (
    <div className="flex min-h-screen bg-slate-50">
      <SidebarAdmin nomComplet={profile.nom_complet} />
      <main className="flex-1 p-8 overflow-y-auto">{children}</main>
    </div>
  )
}
