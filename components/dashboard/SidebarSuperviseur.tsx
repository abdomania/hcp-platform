'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { MapPin, Users, AlertTriangle, BarChart2, LogOut } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'

export default function SidebarSuperviseur() {
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
      <div className="mb-8 px-2">
        <h2 className="text-lg font-black text-slate-100 tracking-wide">Superviseur — HCP</h2>
        <p className="text-xs text-slate-500 mt-1">Suivi terrain ENE 2026</p>
      </div>
      <nav className="flex flex-col gap-1 flex-1">
        <NavLink href="/superviseur" icon={<BarChart2 size={18} />} label="Tableau de bord" exact />
        <NavLink href="/superviseur/carte" icon={<MapPin size={18} />} label="Carte GPS" />
        <NavLink href="/superviseur/enqueteurs" icon={<Users size={18} />} label="Enquêteurs" />
        <NavLink href="/superviseur/signalements" icon={<AlertTriangle size={18} />} label="Signalements" />
      </nav>
      <button
        onClick={signOut}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-red-600/20 border border-transparent hover:border-red-500/30 transition-all duration-200 text-sm mt-4"
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
          ? 'bg-emerald-600 text-white font-semibold shadow-md'
          : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
      }`}
    >
      <div className={isActive ? 'text-white' : 'text-slate-500'}>{icon}</div>
      <span>{label}</span>
    </Link>
  )
}
