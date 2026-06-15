'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CheckCircle, Filter } from 'lucide-react'

type Signalement = {
  id: string
  candidature_id: string
  nom: string
  enquete?: string | null
  type: string
  description?: string | null
  traite: boolean
  latitude?: number | null
  longitude?: number | null
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

export default function SignalementsClient({ signalements }: { signalements: Signalement[] }) {
  const router = useRouter()
  const [filtreType, setFiltreType] = useState('')
  const [filtreTraite, setFiltreTraite] = useState<'' | 'ouvert' | 'traite'>('')
  const [loading, setLoading] = useState<string | null>(null)

  const filtered = signalements.filter(s => {
    if (filtreType && s.type !== filtreType) return false
    if (filtreTraite === 'ouvert' && s.traite) return false
    if (filtreTraite === 'traite' && !s.traite) return false
    return true
  })

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
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex flex-wrap gap-3 bg-white border border-slate-200 rounded-xl p-4">
        <select value={filtreType} onChange={e => setFiltreType(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30">
          <option value="">Tous les types</option>
          {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={filtreTraite} onChange={e => setFiltreTraite(e.target.value as any)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30">
          <option value="">Tous les statuts</option>
          <option value="ouvert">En attente</option>
          <option value="traite">Traités</option>
        </select>
        <span className="text-sm text-slate-500 self-center ml-auto">{filtered.length} résultat(s)</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide">
              <th className="py-3 px-4">Enquêteur</th>
              <th className="py-3 px-4">Enquête</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Description</th>
              <th className="py-3 px-4">GPS</th>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Statut</th>
              <th className="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="py-3 px-4 font-medium text-slate-800">{s.nom}</td>
                <td className="py-3 px-4 text-slate-500 text-xs">{s.enquete || '—'}</td>
                <td className="py-3 px-4">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${TYPE_COLORS[s.type] || 'bg-slate-100 text-slate-600'}`}>
                    {TYPE_LABELS[s.type] || s.type}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{s.description || '—'}</td>
                <td className="py-3 px-4 text-xs text-slate-400">
                  {s.latitude && s.longitude
                    ? <a href={`https://www.google.com/maps?q=${s.latitude},${s.longitude}`} target="_blank" rel="noreferrer"
                        className="text-blue-600 hover:underline">📍 Voir</a>
                    : '—'}
                </td>
                <td className="py-3 px-4 text-slate-400 text-xs whitespace-nowrap">
                  {new Date(s.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="py-3 px-4">
                  {s.traite
                    ? <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold"><CheckCircle size={13} /> Traité</span>
                    : <span className="flex items-center gap-1 text-xs text-amber-600 font-semibold"><AlertTriangle size={13} /> En attente</span>
                  }
                </td>
                <td className="py-3 px-4">
                  {!s.traite && (
                    <button onClick={() => marquerTraite(s.id)} disabled={loading === s.id}
                      className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 disabled:opacity-40 font-medium transition-colors">
                      {loading === s.id ? '...' : 'Traiter'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="py-10 text-center text-slate-400">Aucun signalement</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
