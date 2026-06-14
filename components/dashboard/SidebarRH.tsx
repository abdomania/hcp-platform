'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Briefcase, BookOpen } from 'lucide-react'

export default function SidebarRH() {
  return (
    <aside className="w-64 bg-slate-900 text-white p-6 flex flex-col gap-2 shrink-0 border-r border-slate-800">
      <h2 className="text-lg font-black mb-8 px-2 text-slate-100 tracking-wide">Espace RH — HCP</h2>
      
      {/* On utilise "exact={true}" pour le dashboard afin d'éviter qu'il ne s'allume quand on est sur /rh/candidatures */}
      <NavLink href="/rh" icon={<LayoutDashboard size={18} />} label="Tableau de bord" exact />
      <NavLink href="/rh/candidatures" icon={<Users size={18} />} label="Candidatures" />
      <NavLink href="/rh/postes" icon={<Briefcase size={18} />} label="Postes" exact />
      <NavLink href="/rh/postes/formation" icon={<BookOpen size={18} />} label="Formations" />
    </aside>
  )
}

function NavLink({ href, icon, label, exact = false }: { href: string; icon: React.ReactNode; label: string; exact?: boolean }) {
  const pathname = usePathname()
  
  // Logique pour vérifier si le lien correspond à la page actuelle
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
      <div className={isActive ? 'text-white' : 'text-slate-500'}>
        {icon}
      </div>
      <span>{label}</span>
    </Link>
  )
}