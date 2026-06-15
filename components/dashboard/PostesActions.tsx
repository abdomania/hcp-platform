'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'

type Enquete = { id: string; titre: string }

export default function PostesActions({ enquetes }: { enquetes: Enquete[] }) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [erreur, setErreur] = useState('')
  const [form, setForm] = useState({
    titre: '',
    description: '',
    enquete_id: '',
    date_limite: '',
    seuil_score_cv: 60,
    seuil_note_globale: 50,
    seuil_formation: 70,
  })

  const creer = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setErreur('')
    const res = await fetch('/api/postes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setErreur(data.error); return }
    setShowModal(false)
    setForm({ titre: '', description: '', enquete_id: '', date_limite: '', seuil_score_cv: 60, seuil_note_globale: 50, seuil_formation: 70 })
    router.refresh()
  }

  const toggleStatut = async (id: string, statut: string) => {
    const nouveau = statut === 'ouvert' ? 'ferme' : 'ouvert'
    await fetch('/api/postes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, statut: nouveau }),
    })
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => { setShowModal(true); setErreur('') }}
        className="flex items-center gap-2 bg-blue-900 text-white font-semibold px-4 py-2.5 rounded-xl hover:bg-blue-800 transition-colors text-sm shadow-sm"
      >
        <Plus size={16} /> Nouveau poste
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">Créer un nouveau poste</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={creer} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">Titre du poste *</label>
                <input
                  type="text" required value={form.titre}
                  onChange={e => setForm(f => ({ ...f, titre: e.target.value }))}
                  placeholder="ex: Enquêteur Terrain — Région Rabat-Salé"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">Description *</label>
                <textarea
                  required value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Description du poste, missions, profil recherché..."
                  rows={3}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none"
                />
              </div>
              {enquetes.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1.5">Enquête associée</label>
                  <select
                    value={form.enquete_id}
                    onChange={e => setForm(f => ({ ...f, enquete_id: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white"
                  >
                    <option value="">— Aucune —</option>
                    {enquetes.map(e => <option key={e.id} value={e.id}>{e.titre}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">Date limite de candidature</label>
                <input
                  type="date" value={form.date_limite}
                  onChange={e => setForm(f => ({ ...f, date_limite: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Seuil CV</label>
                  <input type="number" min={0} max={100} value={form.seuil_score_cv}
                    onChange={e => setForm(f => ({ ...f, seuil_score_cv: +e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Seuil entretien</label>
                  <input type="number" min={0} max={100} value={form.seuil_note_globale}
                    onChange={e => setForm(f => ({ ...f, seuil_note_globale: +e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Seuil formation</label>
                  <input type="number" min={0} max={100} value={form.seuil_formation}
                    onChange={e => setForm(f => ({ ...f, seuil_formation: +e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
              </div>

              {erreur && <p className="text-red-500 text-sm bg-red-50 px-4 py-2 rounded-lg">{erreur}</p>}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50">
                  Annuler
                </button>
                <button type="submit" disabled={saving} className="flex-1 py-3 bg-blue-900 text-white rounded-xl text-sm font-bold hover:bg-blue-800 disabled:opacity-50">
                  {saving ? 'Création...' : 'Créer le poste'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
