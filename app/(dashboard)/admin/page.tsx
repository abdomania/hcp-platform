import { createServerSupabase } from '@/lib/supabase-server'
import { Users, UserCheck, Shield, Briefcase } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const supabase = await createServerSupabase()

  const [
    { data: profiles },
    { data: candidatures }
  ] = await Promise.all([
    supabase.from('profiles').select('role'),
    supabase.from('candidatures').select('statut')
  ])

  const stats = {
    admins: profiles?.filter(p => p.role === 'admin').length ?? 0,
    rh: profiles?.filter(p => p.role === 'rh').length ?? 0,
    candidats: profiles?.filter(p => p.role === 'candidat').length ?? 0,
    total_candidatures: candidatures?.length ?? 0,
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-800">Tableau de bord Admin</h1>
        <p className="text-slate-500 text-sm mt-1">Vue globale de la plateforme HCP Recrutement</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        <StatCard icon={<Shield size={20} />} label="Administrateurs" value={stats.admins} color="indigo" />
        <StatCard icon={<UserCheck size={20} />} label="Responsables RH" value={stats.rh} color="blue" />
        <StatCard icon={<Users size={20} />} label="Candidats" value={stats.candidats} color="green" />
        <StatCard icon={<Briefcase size={20} />} label="Candidatures" value={stats.total_candidatures} color="orange" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm">
        <h2 className="font-bold text-slate-700 mb-2">Accès rapide</h2>
        <p className="text-slate-500 text-sm mb-6">Gérez les comptes et les accès à la plateforme depuis l'onglet <strong>Utilisateurs & Comptes</strong>.</p>
        <a
          href="/admin/utilisateurs"
          className="inline-flex items-center gap-2 bg-indigo-600 text-white font-semibold px-5 py-3 rounded-xl hover:bg-indigo-700 transition-colors text-sm"
        >
          <Users size={16} />
          Gérer les utilisateurs →
        </a>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
  }
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${colors[color]}`}>{icon}</div>
      <p className="text-3xl font-black text-slate-800">{value}</p>
      <p className="text-slate-500 text-sm mt-1">{label}</p>
    </div>
  )
}
