'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { StatutBadge } from '@/components/dashboard/StatutBadge'
import Link from 'next/link'
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronRight } from 'lucide-react'

type Candidature = {
  id: string
  nom_complet: string
  email?: string | null
  ville?: string | null
  niveau_etudes?: string | null
  score_cv?: number | null
  note_entretien?: number | null
  note_globale?: number | null
  statut: string
  rh_validation?: boolean | null
  created_at: string
  postes?: { id: string; titre: string } | null
}

type SortKey = 'score_cv' | 'note_globale' | 'note_entretien' | null
type SortDir = 'asc' | 'desc'

function SortBtn({ col, current, dir, onClick }: { col: SortKey; current: SortKey; dir: SortDir; onClick: () => void }) {
  const active = current === col
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1 group">
      {active ? (dir === 'asc' ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />) : <ArrowUpDown size={13} className="text-slate-400 group-hover:text-slate-600" />}
    </button>
  )
}

function ConfirmModal({ message, onOk, onCancel }: { message: string; onOk: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <p className="text-slate-700 text-sm mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50">Annuler</button>
          <button onClick={onOk} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700">Confirmer</button>
        </div>
      </div>
    </div>
  )
}

const STATUTS_LABELS: Record<string, string> = {
  en_attente: 'En attente', entretien: 'Entretien', formation: 'Formation', valide: 'Validé', rejete: 'Rejeté',
}

export default function CandidaturesClient({
  candidatures,
  postes,
  filtreStatut,
  filtrePoste,
  filtreQ,
}: {
  candidatures: Candidature[]
  postes: { id: string; titre: string }[]
  filtreStatut?: string
  filtrePoste?: string
  filtreQ?: string
}) {
  const router = useRouter()
  const [sortKey, setSortKey] = useState<SortKey>(null)
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkAction, setBulkAction] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState<{ message: string; onOk: () => void } | null>(null)

  const toggleSort = (col: SortKey) => {
    if (sortKey === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(col); setSortDir('desc') }
  }

  const sorted = useMemo(() => {
    if (!sortKey) return candidatures
    return [...candidatures].sort((a, b) => {
      const av = (a[sortKey] ?? -1) as number
      const bv = (b[sortKey] ?? -1) as number
      return sortDir === 'asc' ? av - bv : bv - av
    })
  }, [candidatures, sortKey, sortDir])

  const allIds = sorted.map(c => c.id)
  const allChecked = allIds.length > 0 && allIds.every(id => selected.has(id))
  const someChecked = allIds.some(id => selected.has(id))

  const toggleAll = () => {
    if (allChecked) setSelected(new Set())
    else setSelected(new Set(allIds))
  }
  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const execBulk = () => {
    if (!bulkAction || selected.size === 0) return
    const ids = [...selected]
    const label = bulkAction === 'valide' ? 'Valider' : bulkAction === 'rejete' ? 'Rejeter' : bulkAction
    setConfirm({
      message: `${label} ${ids.length} candidature(s) sélectionnée(s) ?`,
      onOk: async () => {
        setConfirm(null)
        setSaving(true)
        await Promise.all(ids.map(id =>
          fetch(`/api/candidatures/${id}/statut`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ statut: bulkAction }),
          })
        ))
        setSaving(false)
        setSelected(new Set())
        setBulkAction('')
        router.refresh()
      },
    })
  }

  return (
    <div className="space-y-6">
      {confirm && <ConfirmModal message={confirm.message} onOk={confirm.onOk} onCancel={() => setConfirm(null)} />}

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Candidatures</h1>
        <p className="text-slate-500 mt-1 text-sm">{candidatures.length} résultat(s)</p>
      </div>

      {/* FILTRES */}
      <form method="get" className="flex flex-wrap gap-3 bg-white border border-slate-200 rounded-xl p-4">
        <input type="text" name="q" defaultValue={filtreQ}
          placeholder="Rechercher par nom..."
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px] focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        />
        <select name="statut" defaultValue={filtreStatut || ''}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30">
          <option value="">Tous les statuts</option>
          {Object.entries(STATUTS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select name="poste" defaultValue={filtrePoste || ''}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30">
          <option value="">Tous les postes</option>
          {postes.map(p => <option key={p.id} value={p.id}>{p.titre}</option>)}
        </select>
        <button type="submit" className="bg-slate-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-slate-800 transition-colors">
          Filtrer
        </button>
        {(filtreQ || filtreStatut || filtrePoste) && (
          <Link href="/rh/candidatures" className="text-sm text-slate-500 px-3 py-2 hover:underline">Réinitialiser</Link>
        )}
      </form>

      {/* BULK ACTIONS */}
      {someChecked && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <span className="text-sm font-semibold text-blue-800">{selected.size} sélectionné(s)</span>
          <select value={bulkAction} onChange={e => setBulkAction(e.target.value)}
            className="border border-blue-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none">
            <option value="">— Action groupée —</option>
            <option value="valide">Valider</option>
            <option value="rejete">Rejeter</option>
            <option value="en_attente">Remettre en attente</option>
          </select>
          <button onClick={execBulk} disabled={!bulkAction || saving}
            className="bg-blue-600 text-white rounded-lg px-4 py-1.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors">
            {saving ? 'En cours...' : 'Appliquer'}
          </button>
          <button onClick={() => setSelected(new Set())} className="text-sm text-slate-500 hover:underline ml-auto">Désélectionner</button>
        </div>
      )}

      {/* TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide">
              <th className="py-3 px-4 w-8">
                <input type="checkbox" checked={allChecked} ref={el => { if (el) el.indeterminate = someChecked && !allChecked }}
                  onChange={toggleAll} className="rounded border-slate-300 text-blue-600 cursor-pointer" />
              </th>
              <th className="py-3 px-4">Candidat</th>
              <th className="py-3 px-4">Poste</th>
              <th className="py-3 px-4">Ville</th>
              <th className="py-3 px-4">Niveau</th>
              <th className="py-3 px-4">
                <span className="flex items-center gap-1">Score CV <SortBtn col="score_cv" current={sortKey} dir={sortDir} onClick={() => toggleSort('score_cv')} /></span>
              </th>
              <th className="py-3 px-4">
                <span className="flex items-center gap-1">Entretien <SortBtn col="note_entretien" current={sortKey} dir={sortDir} onClick={() => toggleSort('note_entretien')} /></span>
              </th>
              <th className="py-3 px-4">
                <span className="flex items-center gap-1">Note globale <SortBtn col="note_globale" current={sortKey} dir={sortDir} onClick={() => toggleSort('note_globale')} /></span>
              </th>
              <th className="py-3 px-4">Statut</th>
              <th className="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => (
              <tr key={c.id} className={`border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors ${selected.has(c.id) ? 'bg-blue-50/50' : ''}`}>
                <td className="py-3 px-4">
                  <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleOne(c.id)}
                    className="rounded border-slate-300 text-blue-600 cursor-pointer" />
                </td>
                <td className="py-3 px-4">
                  <p className="font-medium text-slate-800">{c.nom_complet}</p>
                  <p className="text-xs text-slate-400">{c.email}</p>
                </td>
                <td className="py-3 px-4 text-slate-600">{c.postes?.titre || '—'}</td>
                <td className="py-3 px-4 text-slate-500">{c.ville || '—'}</td>
                <td className="py-3 px-4 text-slate-500">{c.niveau_etudes || '—'}</td>
                <td className="py-3 px-4 font-medium text-slate-700">{c.score_cv ?? '—'}</td>
                <td className="py-3 px-4 text-slate-600">{c.note_entretien ?? '—'}</td>
                <td className="py-3 px-4 font-bold text-slate-800">{c.note_globale ?? '—'}</td>
                <td className="py-3 px-4"><StatutBadge statut={c.statut} rhValidation={c.rh_validation} /></td>
                <td className="py-3 px-4">
                  <Link href={`/rh/candidatures/${c.id}`}
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap">
                    Voir <ChevronRight size={14} />
                  </Link>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr><td colSpan={10} className="py-10 text-center text-slate-400">Aucune candidature ne correspond aux filtres</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
