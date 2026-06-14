'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Users, ShieldCheck, LogOut } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function SidebarAdmin({ nomComplet }: { nomComplet: string }) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0 border-r border-slate-800">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <ShieldCheck size={16} />
          </div>
          <span className="font-black text-sm">Super Admin</span>
        </div>
        <p className="text-slate-400 text-xs pl-11 truncate">{nomComplet}</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        <NavLink href="/admin" icon={<LayoutDashboard size={18} />} label="Tableau de bord" exact pathname={pathname} />
        <NavLink href="/admin/utilisateurs" icon={<Users size={18} />} label="Utilisateurs & Comptes" pathname={pathname} />
      </nav>

      <div className="p-4 border-t border-slate-800">
        <Link href="/rh" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-all text-sm mb-1">
          <LayoutDashboard size={16} />
          Espace RH
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-red-900/40 hover:text-red-300 transition-all text-sm"
        >
          <LogOut size={16} />
          Déconnexion
        </button>
      </div>
    </aside>
  )
}

function NavLink({ href, icon, label, exact = false, pathname }: { href: string; icon: React.ReactNode; label: string; exact?: boolean; pathname: string }) {
  const isActive = exact ? pathname === href : pathname.startsWith(href)
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm ${
        isActive ? 'bg-indigo-600 text-white font-semibold' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
      }`}
    >
      <div className={isActive ? 'text-white' : 'text-slate-500'}>{icon}</div>
      <span>{label}</span>
    </Link>
  )
}
