'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Pencil, Trash2, MoreVertical, Briefcase } from 'lucide-react'
import Link from 'next/link'

type Enquete = { id: string; titre: string }

type Poste = {
  id: string
  titre: string
  description?: string | null
  statut: string
  date_limite?: string | null
  formation_id?: string | null
  enquete_id?: string | null
  seuil_score_cv?: number | null
  seuil_note_globale?: number | null
  seuil_formation?: number | null
  enquetes?: { id: string; titre: string } | null
  candidatures?: { count: number }[]
}

const defaultForm = {
  titre: '',
  description: '',
  enquete_id: '',
  date_limite: '',
  seuil_score_cv: 60,
  seuil_note_globale: 50,
  seuil_formation: 70,
}

function ConfirmModal({ message, onOk, onCancel }: { message: string; onOk: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <p className="text-slate-700 text-sm mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50">Annuler</button>
          <button onClick={onOk} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700">Supprimer</button>
        </div>
      </div>
    </div>
  )
}

function DropdownMenu({ items }: { items: { label: string; icon: React.ReactNode; onClick: () => void; danger?: boolean }[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
        <MoreVertical size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 min-w-[160px] py-1 overflow-hidden">
          {items.map((item, i) => (
            <button key={i} onClick={() => { setOpen(false); item.onClick() }}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left hover:bg-slate-50 transition-colors ${item.danger ? 'text-red-600' : 'text-slate-700'}`}>
              {item.icon}{item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function PostesActions({ postes, enquetes }: { postes: Poste[]; enquetes: Enquete[] }) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Poste | null>(null)
  const [saving, setSaving] = useState(false)
  const [erreur, setErreur] = useState('')
  const [form, setForm] = useState(defaultForm)
  const [confirm, setConfirm] = useState<{ message: string; onOk: () => void } | null>(null)

  const openCreate = () => {
    setEditTarget(null)
    setForm(defaultForm)
    setErreur('')
    setShowModal(true)
  }

  const openEdit = (p: Poste) => {
    setEditTarget(p)
    setForm({
      titre: p.titre,
      description: p.description || '',
      enquete_id: p.enquete_id || '',
      date_limite: p.date_limite?.slice(0, 10) || '',
      seuil_score_cv: p.seuil_score_cv ?? 60,
      seuil_note_globale: p.seuil_note_globale ?? 50,
      seuil_formation: p.seuil_formation ?? 70,
    })
    setErreur('')
    setShowModal(true)
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setErreur('')
    const url = editTarget ? `/api/postes/${editTarget.id}` : '/api/postes'
    const method = editTarget ? 'PATCH' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setErreur(data.error); return }
    setShowModal(false)
    router.refresh()
  }

  const toggleStatut = async (p: Poste) => {
    const nouveau = p.statut === 'ouvert' ? 'ferme' : 'ouvert'
    await fetch(`/api/postes/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titre: p.titre, statut: nouveau }),
    })
    router.refresh()
  }

  const supprimer = (p: Poste) => {
    const nb = p.candidatures?.[0]?.count || 0
    if (nb > 0) {
      setConfirm({ message: `Impossible de supprimer "${p.titre}" : ${nb} candidature(s) y sont associées.`, onOk: () => setConfirm(null) })
      return
    }
    setConfirm({
      message: `Supprimer le poste "${p.titre}" ? Cette action est irréversible.`,
      onOk: async () => {
        setConfirm(null)
        const res = await fetch(`/api/postes/${p.id}`, { method: 'DELETE' })
        if (!res.ok) {
          const data = await res.json()
          setConfirm({ message: data.error || 'Erreur lors de la suppression.', onOk: () => setConfirm(null) })
          return
        }
        router.refresh()
      },
    })
  }

  return (
    <div className="space-y-6">
      {confirm && <ConfirmModal message={confirm.message} onOk={confirm.onOk} onCancel={() => setConfirm(null)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Postes</h1>
          <p className="text-slate-500 mt-1 text-sm">{postes.length} poste(s) au total</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-blue-900 text-white font-semibold px-4 py-2.5 rounded-xl hover:bg-blue-800 transition-colors text-sm shadow-sm">
          <Plus size={16} /> Nouveau poste
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide">
              <th className="py-3 px-4">Titre</th>
              <th className="py-3 px-4">Enquête</th>
              <th className="py-3 px-4">Date limite</th>
              <th className="py-3 px-4">Candidatures</th>
              <th className="py-3 px-4">Formation</th>
              <th className="py-3 px-4">Statut</th>
              <th className="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {postes.map((p) => {
              const nb = p.candidatures?.[0]?.count || 0
              const isOuvert = p.statut === 'ouvert'
              return (
                <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-medium text-slate-800">{p.titre}</td>
                  <td className="py-3 px-4 text-slate-500">{p.enquetes?.titre || '—'}</td>
                  <td className="py-3 px-4 text-slate-500">{p.date_limite ? new Date(p.date_limite).toLocaleDateString('fr-FR') : '—'}</td>
                  <td className="py-3 px-4">
                    <Link href={`/rh/candidatures?poste=${p.id}`} className="text-blue-600 hover:underline font-bold">{nb}</Link>
                  </td>
                  <td className="py-3 px-4">
                    {p.formation_id
                      ? <Link href={`/rh/postes/formation?poste_id=${p.id}`} className="text-emerald-600 font-medium text-xs hover:underline">✓ Prête</Link>
                      : <Link href={`/rh/postes/formation?poste_id=${p.id}`} className="text-amber-600 text-xs hover:underline font-medium">+ Générer</Link>
                    }
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${isOuvert ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {isOuvert ? 'Ouvert' : 'Fermé'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <DropdownMenu items={[
                      { label: 'Modifier', icon: <Pencil size={14} />, onClick: () => openEdit(p) },
                      { label: isOuvert ? 'Fermer le poste' : 'Ouvrir le poste', icon: <Briefcase size={14} />, onClick: () => toggleStatut(p) },
                      { label: 'Supprimer', icon: <Trash2 size={14} />, onClick: () => supprimer(p), danger: true },
                    ]} />
                  </td>
                </tr>
              )
            })}
            {postes.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  <p className="text-base mb-1">Aucun poste créé</p>
                  <p className="text-sm">Cliquez sur "Nouveau poste" pour commencer</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h2 className="font-bold text-slate-800">{editTarget ? 'Modifier le poste' : 'Créer un nouveau poste'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={16} /></button>
            </div>
            <form onSubmit={save} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">Titre du poste *</label>
                <input type="text" required value={form.titre}
                  onChange={e => setForm(f => ({ ...f, titre: e.target.value }))}
                  placeholder="ex: Enquêteur Terrain — Région Rabat-Salé"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">Description *</label>
                <textarea required value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Description du poste, missions, profil recherché..."
                  rows={3}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none"
                />
              </div>
              {enquetes.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1.5">Enquête associée</label>
                  <select value={form.enquete_id} onChange={e => setForm(f => ({ ...f, enquete_id: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white">
                    <option value="">— Aucune —</option>
                    {enquetes.map(e => <option key={e.id} value={e.id}>{e.titre}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">Date limite de candidature</label>
                <input type="date" value={form.date_limite}
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
                  {saving ? 'Enregistrement...' : (editTarget ? 'Enregistrer' : 'Créer le poste')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
