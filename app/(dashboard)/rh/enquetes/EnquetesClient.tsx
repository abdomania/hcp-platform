'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Trash2, ClipboardList } from 'lucide-react'

type Enquete = {
  id: string
  titre: string
  description?: string | null
  date_debut?: string | null
  date_fin?: string | null
  statut?: string | null
  created_at: string
}

const STATUTS = [
  { value: 'planifiee', label: 'Planifiée', color: 'bg-slate-100 text-slate-600' },
  { value: 'active',    label: 'Active',    color: 'bg-emerald-100 text-emerald-700' },
  { value: 'terminee', label: 'Terminée',  color: 'bg-blue-100 text-blue-700' },
]

function StatutEnquete({ statut }: { statut?: string | null }) {
  const s = STATUTS.find(x => x.value === statut) || STATUTS[0]
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${s.color}`}>{s.label}</span>
}

export default function EnquetesClient({
  enquetes,
  postesParEnquete,
}: {
  enquetes: Enquete[]
  postesParEnquete: Record<string, number>
}) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [erreur, setErreur] = useState('')
  const [form, setForm] = useState({
    titre: '', description: '', date_debut: '', date_fin: '', statut: 'planifiee',
  })

  const creer = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setErreur('')
    const res = await fetch('/api/enquetes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setErreur(data.error); return }
    setShowModal(false)
    setForm({ titre: '', description: '', date_debut: '', date_fin: '', statut: 'planifiee' })
    router.refresh()
  }

  const supprimer = async (id: string, titre: string) => {
    const nb = postesParEnquete[id] || 0
    if (nb > 0) {
      alert(`Impossible de supprimer "${titre}" : ${nb} poste(s) y sont associés.`)
      return
    }
    if (!confirm(`Supprimer l'enquête "${titre}" ?`)) return
    await fetch('/api/enquetes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    router.refresh()
  }

  const fmt = (d?: string | null) => d ? new Date(d).toLocaleDateString('fr-FR') : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Enquêtes</h1>
          <p className="text-slate-500 text-sm mt-1">{enquetes.length} enquête(s) enregistrée(s)</p>
        </div>
        <button
          onClick={() => { setShowModal(true); setErreur('') }}
          className="flex items-center gap-2 bg-blue-900 text-white font-semibold px-4 py-2.5 rounded-xl hover:bg-blue-800 transition-colors text-sm shadow-sm"
        >
          <Plus size={16} /> Nouvelle enquête
        </button>
      </div>

      {enquetes.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
          <ClipboardList size={40} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 font-medium">Aucune enquête pour le moment</p>
          <p className="text-slate-400 text-sm mt-1">Cliquez sur "Nouvelle enquête" pour en créer une.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {enquetes.map((e) => {
            const nb = postesParEnquete[e.id] || 0
            const periode = fmt(e.date_debut) && fmt(e.date_fin)
              ? `${fmt(e.date_debut)} → ${fmt(e.date_fin)}`
              : fmt(e.date_debut) || fmt(e.date_fin) || null

            return (
              <div key={e.id} className="bg-white rounded-xl border border-slate-200 px-6 py-5 flex items-center justify-between gap-4 hover:border-slate-300 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <ClipboardList size={20} className="text-blue-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{e.titre}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <StatutEnquete statut={e.statut} />
                      {periode && <span className="text-xs text-slate-400">{periode}</span>}
                      {e.description && <span className="text-xs text-slate-400 truncate max-w-xs">{e.description}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-lg font-bold text-slate-800">{nb}</p>
                    <p className="text-xs text-slate-400">poste(s)</p>
                  </div>
                  <button
                    onClick={() => supprimer(e.id, e.titre)}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">Nouvelle enquête</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={creer} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">Titre *</label>
                <input
                  type="text" required value={form.titre}
                  onChange={e => setForm(f => ({ ...f, titre: e.target.value }))}
                  placeholder="ex: Enquête Nationale Emploi 2026"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">Statut</label>
                <select
                  value={form.statut}
                  onChange={e => setForm(f => ({ ...f, statut: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white"
                >
                  {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1.5">Date début</label>
                  <input type="date" value={form.date_debut}
                    onChange={e => setForm(f => ({ ...f, date_debut: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1.5">Date fin</label>
                  <input type="date" value={form.date_fin}
                    onChange={e => setForm(f => ({ ...f, date_fin: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">Description <span className="text-slate-400 font-normal">(optionnel)</span></label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Contexte, objectifs..."
                  rows={3}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none"
                />
              </div>

              {erreur && <p className="text-red-500 text-sm bg-red-50 px-4 py-2 rounded-lg">{erreur}</p>}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50">
                  Annuler
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-3 bg-blue-900 text-white rounded-xl text-sm font-bold hover:bg-blue-800 disabled:opacity-50">
                  {saving ? 'Création...' : "Créer l'enquête"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
