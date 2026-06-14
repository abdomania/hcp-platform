'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Shield, UserCheck, User, X, Eye, EyeOff } from 'lucide-react'

type Utilisateur = {
  id: string
  email: string
  nom_complet: string
  role: 'admin' | 'rh' | 'candidat'
  created_at: string
}

const ROLE_CONFIG = {
  admin: { label: 'Administrateur', color: 'bg-indigo-100 text-indigo-700', icon: <Shield size={12} /> },
  rh: { label: 'Responsable RH', color: 'bg-blue-100 text-blue-700', icon: <UserCheck size={12} /> },
  candidat: { label: 'Candidat', color: 'bg-green-100 text-green-700', icon: <User size={12} /> },
}

export default function UtilisateursPage() {
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [supprimerId, setSupprimerId] = useState<string | null>(null)
  const [filtre, setFiltre] = useState<string>('tous')

  const [form, setForm] = useState({ email: '', mot_de_passe: '', nom: '', prenom: '', role: 'rh' })
  const [showMdp, setShowMdp] = useState(false)
  const [erreur, setErreur] = useState('')
  const [succes, setSucces] = useState('')
  const [saving, setSaving] = useState(false)

  const charger = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/utilisateurs')
    const data = await res.json()
    setUtilisateurs(data.utilisateurs || [])
    setLoading(false)
  }

  useEffect(() => { charger() }, [])

  const creerUtilisateur = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setErreur(''); setSucces('')
    const res = await fetch('/api/admin/utilisateurs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setErreur(data.error); return }
    setSucces(`Compte créé avec succès !`)
    setForm({ email: '', mot_de_passe: '', nom: '', prenom: '', role: 'rh' })
    setShowModal(false)
    charger()
  }

  const supprimerUtilisateur = async (id: string) => {
    const res = await fetch('/api/admin/utilisateurs', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    const data = await res.json()
    if (!res.ok) { alert(data.error); return }
    setSupprimerId(null)
    charger()
  }

  const filtres = [
    { key: 'tous', label: 'Tous' },
    { key: 'admin', label: 'Admins' },
    { key: 'rh', label: 'RH' },
    { key: 'candidat', label: 'Candidats' },
  ]

  const listeFiltrée = filtre === 'tous' ? utilisateurs : utilisateurs.filter(u => u.role === filtre)

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Utilisateurs & Comptes</h1>
          <p className="text-slate-500 text-sm mt-1">{utilisateurs.length} compte(s) sur la plateforme</p>
        </div>
        <button
          onClick={() => { setShowModal(true); setErreur(''); setSucces('') }}
          className="flex items-center gap-2 bg-indigo-600 text-white font-semibold px-5 py-3 rounded-xl hover:bg-indigo-700 transition-colors text-sm shadow-md"
        >
          <Plus size={16} /> Nouveau compte
        </button>
      </div>

      {succes && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 rounded-xl px-5 py-3 text-sm font-medium">
          {succes}
        </div>
      )}

      {/* Filtres */}
      <div className="flex gap-2 mb-6">
        {filtres.map(f => (
          <button
            key={f.key}
            onClick={() => setFiltre(f.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${filtre === f.key ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-400">Chargement...</div>
        ) : listeFiltrée.length === 0 ? (
          <div className="p-16 text-center text-slate-400">Aucun utilisateur trouvé.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-4 text-left">Nom complet</th>
                <th className="px-6 py-4 text-left">Email</th>
                <th className="px-6 py-4 text-left">Rôle</th>
                <th className="px-6 py-4 text-left">Créé le</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {listeFiltrée.map(u => {
                const cfg = ROLE_CONFIG[u.role]
                return (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-800 text-sm">{u.nom_complet || '—'}</td>
                    <td className="px-6 py-4 text-slate-500 text-sm">{u.email}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${cfg.color}`}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm">
                      {new Date(u.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSupprimerId(u.id)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="Supprimer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL CRÉATION */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">Créer un compte</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={creerUtilisateur} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1.5">Prénom</label>
                  <input
                    type="text" required value={form.prenom}
                    onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))}
                    placeholder="Ahmed"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1.5">Nom</label>
                  <input
                    type="text" required value={form.nom}
                    onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                    placeholder="Benali"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">Email</label>
                <input
                  type="email" required value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="ahmed@hcp.ma"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">Mot de passe</label>
                <div className="relative">
                  <input
                    type={showMdp ? 'text' : 'password'} required value={form.mot_de_passe} minLength={8}
                    onChange={e => setForm(f => ({ ...f, mot_de_passe: e.target.value }))}
                    placeholder="Min. 8 caractères"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                  />
                  <button type="button" onClick={() => setShowMdp(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {showMdp ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">Rôle</label>
                <select
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 bg-white"
                >
                  <option value="rh">Responsable RH</option>
                  <option value="admin">Administrateur</option>
                  <option value="candidat">Candidat</option>
                </select>
              </div>

              {erreur && <p className="text-red-500 text-sm bg-red-50 px-4 py-2 rounded-lg">{erreur}</p>}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50">
                  Annuler
                </button>
                <button type="submit" disabled={saving} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50">
                  {saving ? 'Création...' : 'Créer le compte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMATION SUPPRESSION */}
      {supprimerId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} className="text-red-500" />
            </div>
            <h3 className="font-bold text-slate-800 mb-2">Supprimer ce compte ?</h3>
            <p className="text-slate-500 text-sm mb-6">Cette action est irréversible. L'utilisateur perdra tout accès.</p>
            <div className="flex gap-3">
              <button onClick={() => setSupprimerId(null)} className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50">
                Annuler
              </button>
              <button onClick={() => supprimerUtilisateur(supprimerId)} className="flex-1 py-3 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
