'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CheckCircle } from 'lucide-react'

type Signalement = {
  id: string
  candidature_id: string
  nom?: string
  type: string
  description?: string | null
  traite: boolean
  created_at: string
}

const TYPE_COLORS: Record<string, string> = {
  refus: 'bg-red-100 text-red-700',
  absent: 'bg-orange-100 text-orange-700',
  adresse_incorrecte: 'bg-violet-100 text-violet-700',
  probleme_technique: 'bg-blue-100 text-blue-700',
  autre: 'bg-slate-100 text-slate-600',
}

const TYPE_LABELS: Record<string, string> = {
  refus: 'Refus', absent: 'Absent', adresse_incorrecte: 'Adresse incorrecte',
  probleme_technique: 'Problème technique', autre: 'Autre',
}

export default function SignalementsTable({ signalements }: { signalements: Signalement[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  const marquerTraite = async (id: string) => {
    setLoading(id)
    await fetch(`/api/terrain/signalements/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ traite: true }),
    })
    setLoading(null)
    router.refresh()
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <h2 className="font-semibold text-slate-800 text-sm">Tous les signalements</h2>
        <span className="text-xs text-slate-500">{signalements.length} au total</span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500 border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide">
            <th className="py-3 px-4">Enquêteur</th>
            <th className="py-3 px-4">Type</th>
            <th className="py-3 px-4">Description</th>
            <th className="py-3 px-4">Date</th>
            <th className="py-3 px-4">Statut</th>
            <th className="py-3 px-4"></th>
          </tr>
        </thead>
        <tbody>
          {signalements.map(s => (
            <tr key={s.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
              <td className="py-3 px-4 font-medium text-slate-800">{s.nom}</td>
              <td className="py-3 px-4">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${TYPE_COLORS[s.type] || 'bg-slate-100 text-slate-600'}`}>
                  {TYPE_LABELS[s.type] || s.type}
                </span>
              </td>
              <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{s.description || '—'}</td>
              <td className="py-3 px-4 text-slate-400 text-xs">{new Date(s.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
              <td className="py-3 px-4">
                {s.traite
                  ? <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold"><CheckCircle size={13} /> Traité</span>
                  : <span className="flex items-center gap-1 text-xs text-amber-600 font-semibold"><AlertTriangle size={13} /> En attente</span>
                }
              </td>
              <td className="py-3 px-4">
                {!s.traite && (
                  <button
                    onClick={() => marquerTraite(s.id)}
                    disabled={loading === s.id}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline disabled:opacity-40"
                  >
                    {loading === s.id ? '...' : 'Marquer traité'}
                  </button>
                )}
              </td>
            </tr>
          ))}
          {signalements.length === 0 && (
            <tr><td colSpan={6} className="py-10 text-center text-slate-400">Aucun signalement pour le moment</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
