'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Users, Briefcase, ClipboardList, BookOpen, LogOut } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'

export default function SidebarRH() {
  const router = useRouter()

  const signOut = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="w-64 bg-slate-900 text-white p-6 flex flex-col shrink-0 border-r border-slate-800">
      <h2 className="text-lg font-black mb-8 px-2 text-slate-100 tracking-wide">Espace RH — HCP</h2>
      <nav className="flex flex-col gap-1 flex-1">
        <NavLink href="/rh" icon={<LayoutDashboard size={18} />} label="Tableau de bord" exact />
        <NavLink href="/rh/candidatures" icon={<Users size={18} />} label="Candidatures" />
        <NavLink href="/rh/postes" icon={<Briefcase size={18} />} label="Postes" />
        <NavLink href="/rh/enquetes" icon={<ClipboardList size={18} />} label="Enquêtes" />
        <NavLink href="/rh/formations" icon={<BookOpen size={18} />} label="Formations" />
      </nav>
      <button
        onClick={signOut}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-red-600/20 hover:border-red-500/30 border border-transparent transition-all duration-200 text-sm mt-4"
      >
        <LogOut size={18} />
        <span>Déconnexion</span>
      </button>
    </aside>
  )
}

function NavLink({ href, icon, label, exact = false }: { href: string; icon: React.ReactNode; label: string; exact?: boolean }) {
  const pathname = usePathname()
  const isActive = exact ? pathname === href : pathname.startsWith(href)

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
        isActive
          ? 'bg-blue-600 text-white font-semibold shadow-md'
          : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
      }`}
    >
      <div className={isActive ? 'text-white' : 'text-slate-500'}>{icon}</div>
      <span>{label}</span>
    </Link>
  )
}
