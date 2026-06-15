'use client'

import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Legend } from 'recharts'

type Props = {
  stats: { en_attente: number; entretien: number; formation: number; valide_ia: number; valide_rh: number; rejete: number }
  evolution: { date: string; total: number }[]
}

const COLORS = ['#f59e0b', '#3b82f6', '#8b5cf6', '#f97316', '#10b981', '#ef4444']

export default function DashboardCharts({ stats, evolution }: Props) {
  const donutData = [
    { name: 'En attente', value: stats.en_attente },
    { name: 'Entretien', value: stats.entretien },
    { name: 'Formation', value: stats.formation },
    { name: 'Validé par IA', value: stats.valide_ia },
    { name: 'Validé RH', value: stats.valide_rh },
    { name: 'Rejeté', value: stats.rejete },
  ].filter(d => d.value > 0)

  const total = donutData.reduce((s, d) => s + d.value, 0)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* DONUT */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-4 text-sm">Répartition des candidatures</h3>
        {total === 0 ? (
          <div className="flex items-center justify-center h-40 text-slate-400 text-sm">Aucune donnée</div>
        ) : (
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={donutData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" strokeWidth={2}>
                  {donutData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => [`${v} candidat(s)`, '']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 flex-1">
              {donutData.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-slate-600">{d.name}</span>
                  </div>
                  <span className="font-bold text-slate-800">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* BAR CHART */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-4 text-sm">Candidatures — 7 derniers jours</h3>
        {evolution.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-slate-400 text-sm">Aucune donnée</div>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={evolution} barSize={24}>
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={24} />
              <Tooltip formatter={(v: any) => [`${v} candidature(s)`, '']} cursor={{ fill: '#f1f5f9' }} />
              <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
