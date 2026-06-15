'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, X, Trash2, Pencil, ChevronDown, ChevronUp, Plus } from 'lucide-react'
import Link from 'next/link'

type Question = {
  id: number
  question: string
  options: string[]
  bonne_reponse: number
  explication?: string
}

type EnqueteJoin = { id: string; titre: string }

type PosteJoin = {
  id: string
  titre: string
  enquete_id?: string | null
  enquetes?: EnqueteJoin | EnqueteJoin[] | null
}

type Formation = {
  id: string
  nb_chapitres: number
  created_at: string
  chapitres: any[]
  examen_final: Question[]
  // Supabase peut renvoyer un objet ou un tableau selon la FK
  postes?: PosteJoin | PosteJoin[] | null
}

type Enquete = { id: string; titre: string; statut?: string | null }

function getPoste(p: PosteJoin | PosteJoin[] | null | undefined): PosteJoin | null {
  if (!p) return null
  const poste = Array.isArray(p) ? (p[0] ?? null) : p
  if (!poste) return null
  // Normaliser aussi enquetes (peut être un tableau ou un objet)
  return {
    ...poste,
    enquetes: poste.enquetes
      ? (Array.isArray(poste.enquetes) ? (poste.enquetes[0] ?? null) : poste.enquetes)
      : null,
  }
}

export default function FormationsClient({
  formations,
  enquetes,
}: {
  formations: Formation[]
  enquetes: Enquete[]
}) {
  const router = useRouter()

  // Modal d'association enquête
  const [modalAssoc, setModalAssoc] = useState<Formation | null>(null)
  const [enqueteChoisie, setEnqueteChoisie] = useState('')
  const [savingAssoc, setSavingAssoc] = useState(false)

  // Modal questionnaire
  const [modalQuiz, setModalQuiz] = useState<Formation | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [savingQuiz, setSavingQuiz] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [expandedQ, setExpandedQ] = useState<number | null>(null)
  const [confirm, setConfirm] = useState<{ message: string; onOk: () => void } | null>(null)

  // État erreur global
  const [erreur, setErreur] = useState('')

  const openAssoc = (f: Formation) => {
    setModalAssoc(f)
    setEnqueteChoisie(getPoste(f.postes)?.enquete_id || '')
    setErreur('')
  }

  const sauvegarderAssoc = async () => {
    if (!modalAssoc) return
    setSavingAssoc(true)
    const res = await fetch('/api/formations/manage', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: modalAssoc.id, enquete_id: enqueteChoisie || null }),
    })
    setSavingAssoc(false)
    if (!res.ok) { const d = await res.json(); setErreur(d.error); return }
    setModalAssoc(null)
    router.refresh()
  }

  const openQuiz = (f: Formation) => {
    setModalQuiz(f)
    setQuestions(f.examen_final ? JSON.parse(JSON.stringify(f.examen_final)) : [])
    setErreur('')
    setExpandedQ(null)
  }

  const regenererParIA = async () => {
    if (!modalQuiz) return
    setConfirm({
      message: 'Régénérer les questions par IA ? Les questions actuelles seront remplacées par de nouvelles basées sur le contenu de la formation.',
      onOk: async () => {
        setConfirm(null)
        setRegenerating(true); setErreur('')
    const res = await fetch('/api/formations/regenerer-examen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ formation_id: modalQuiz.id }),
    })
    const data = await res.json()
        setRegenerating(false)
        if (!res.ok) { setErreur(data.error); return }
        setQuestions(data.questions)
        setExpandedQ(null)
      },
    })
  }

  const ajouterQuestion = () => {
    const newQ: Question = {
      id: Date.now(),
      question: '',
      options: ['', '', '', ''],
      bonne_reponse: 0,
      explication: '',
    }
    setQuestions(q => [...q, newQ])
    setExpandedQ(questions.length)
  }

  const updateQuestion = (idx: number, field: keyof Question, value: any) => {
    setQuestions(qs => qs.map((q, i) => i === idx ? { ...q, [field]: value } : q))
  }

  const updateOption = (qIdx: number, oIdx: number, value: string) => {
    setQuestions(qs => qs.map((q, i) => {
      if (i !== qIdx) return q
      const options = [...q.options]
      options[oIdx] = value
      return { ...q, options }
    }))
  }

  const supprimerQuestion = (idx: number) => {
    setQuestions(qs => qs.filter((_, i) => i !== idx))
    setExpandedQ(null)
  }

  const sauvegarderQuiz = async () => {
    if (!modalQuiz) return
    setSavingQuiz(true)
    const res = await fetch('/api/formations/manage', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: modalQuiz.id, examen_final: questions }),
    })
    setSavingQuiz(false)
    if (!res.ok) { const d = await res.json(); setErreur(d.error); return }
    setModalQuiz(null)
    router.refresh()
  }

  const supprimer = (f: Formation) => {
    setConfirm({
      message: `Supprimer la formation "${getPoste(f.postes)?.titre || 'cette formation'}" ? Cette action est irréversible.`,
      onOk: async () => {
        setConfirm(null)
        await fetch('/api/formations/manage', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: f.id }),
        })
        router.refresh()
      },
    })
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Formations</h1>
          <p className="text-slate-500 text-sm mt-1">{formations.length} formation(s) générée(s)</p>
        </div>
        <Link
          href="/rh/postes"
          className="flex items-center gap-2 bg-blue-900 text-white font-semibold px-4 py-2.5 rounded-xl hover:bg-blue-800 transition-colors text-sm shadow-sm"
        >
          <Plus size={16} /> Générer une formation
        </Link>
      </div>

      {/* LISTE */}
      {formations.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
          <BookOpen size={40} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 font-medium">Aucune formation générée</p>
          <p className="text-slate-400 text-sm mt-1">
            Allez dans <Link href="/rh/postes" className="text-blue-600 hover:underline">Postes</Link> et cliquez sur "Générer" pour créer une formation via l'IA.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide">
                <th className="py-3 px-4">Poste / Formation</th>
                <th className="py-3 px-4">Enquête associée</th>
                <th className="py-3 px-4">Chapitres</th>
                <th className="py-3 px-4">Questionnaire</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {formations.map((f) => {
                const poste = getPoste(f.postes)
                const nbQ = f.examen_final?.length || 0
                const enquete = poste?.enquetes

                return (
                  <tr key={f.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <BookOpen size={16} className="text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{poste?.titre || 'Formation sans poste'}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{f.nb_chapitres} chapitre(s)</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {enquete ? (
                        <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                          {enquete.titre}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Non associée</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col gap-0.5">
                        {(f.chapitres || []).slice(0, 3).map((c: any, i: number) => (
                          <span key={i} className="text-xs text-slate-500 truncate max-w-[180px]">· {c.titre}</span>
                        ))}
                        {(f.chapitres?.length || 0) > 3 && (
                          <span className="text-xs text-slate-400">+{(f.chapitres?.length || 0) - 3} autres</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <button
                        onClick={() => openQuiz(f)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                          nbQ > 0
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {nbQ > 0 ? `${nbQ} question(s) ✓` : '+ Ajouter questionnaire'}
                      </button>
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-400">
                      {new Date(f.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openAssoc(f)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Associer à une enquête"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => supprimer(f)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL CONFIRMATION */}
      {confirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <p className="text-slate-800 font-medium text-sm leading-relaxed">{confirm.message}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirm(null)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                onClick={confirm.onOk}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ASSOCIATION ENQUÊTE */}
      {modalAssoc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <h2 className="font-bold text-slate-800">Associer à une enquête</h2>
                <p className="text-xs text-slate-400 mt-0.5">{getPoste(modalAssoc.postes)?.titre}</p>
              </div>
              <button onClick={() => setModalAssoc(null)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2">Enquête</label>
                <select
                  value={enqueteChoisie}
                  onChange={e => setEnqueteChoisie(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white"
                >
                  <option value="">— Aucune association —</option>
                  {enquetes.map(e => <option key={e.id} value={e.id}>{e.titre}</option>)}
                </select>
              </div>
              {erreur && <p className="text-red-500 text-sm bg-red-50 px-4 py-2 rounded-lg">{erreur}</p>}
              <div className="flex gap-3">
                <button onClick={() => setModalAssoc(null)} className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50">
                  Annuler
                </button>
                <button onClick={sauvegarderAssoc} disabled={savingAssoc} className="flex-1 py-3 bg-blue-900 text-white rounded-xl text-sm font-bold hover:bg-blue-800 disabled:opacity-50">
                  {savingAssoc ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL QUESTIONNAIRE */}
      {modalQuiz && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 flex-shrink-0">
              <div>
                <h2 className="font-bold text-slate-800">Questionnaire d'examen</h2>
                <p className="text-xs text-slate-400 mt-0.5">{getPoste(modalQuiz.postes)?.titre} — {questions.length} question(s)</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={regenererParIA}
                  disabled={regenerating}
                  className="flex items-center gap-2 bg-violet-600 text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
                  title="Régénérer les questions via l'IA à partir des chapitres"
                >
                  {regenerating ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Génération...
                    </>
                  ) : (
                    <>🤖 Régénérer par IA</>
                  )}
                </button>
                <button onClick={() => setModalQuiz(null)} className="p-2 hover:bg-slate-100 rounded-lg">
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {questions.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  <p className="text-sm">Aucune question. Cliquez sur "Ajouter une question" pour commencer.</p>
                </div>
              )}
              {questions.map((q, idx) => (
                <div key={q.id} className="border border-slate-200 rounded-xl overflow-hidden">
                  {/* En-tête de question */}
                  <div
                    className="flex items-center justify-between px-4 py-3 bg-slate-50 cursor-pointer"
                    onClick={() => setExpandedQ(expandedQ === idx ? null : idx)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-xs font-bold text-slate-400 flex-shrink-0">Q{idx + 1}</span>
                      <p className="text-sm font-medium text-slate-700 truncate">
                        {q.question || <span className="text-slate-400 italic">Question vide</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={e => { e.stopPropagation(); supprimerQuestion(idx) }}
                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={13} />
                      </button>
                      {expandedQ === idx ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                    </div>
                  </div>

                  {/* Corps de question */}
                  {expandedQ === idx && (
                    <div className="p-4 space-y-3 border-t border-slate-100">
                      <div>
                        <label className="text-xs font-semibold text-slate-500 mb-1 block">Question</label>
                        <input
                          type="text"
                          value={q.question}
                          onChange={e => updateQuestion(idx, 'question', e.target.value)}
                          placeholder="Énoncé de la question..."
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-500 mb-2 block">Options de réponse</label>
                        <div className="space-y-2">
                          {q.options.map((opt, oIdx) => (
                            <div key={oIdx} className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => updateQuestion(idx, 'bonne_reponse', oIdx)}
                                className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors ${
                                  q.bonne_reponse === oIdx
                                    ? 'border-emerald-500 bg-emerald-500'
                                    : 'border-slate-300 hover:border-emerald-400'
                                }`}
                              />
                              <input
                                type="text"
                                value={opt}
                                onChange={e => updateOption(idx, oIdx, e.target.value)}
                                placeholder={`Option ${oIdx + 1}${q.bonne_reponse === oIdx ? ' (bonne réponse)' : ''}`}
                                className={`flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${
                                  q.bonne_reponse === oIdx ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200'
                                }`}
                              />
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">Cliquez sur le cercle pour marquer la bonne réponse</p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-500 mb-1 block">Explication <span className="font-normal">(optionnel)</span></label>
                        <input
                          type="text"
                          value={q.explication || ''}
                          onChange={e => updateQuestion(idx, 'explication', e.target.value)}
                          placeholder="Explication de la bonne réponse..."
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <button
                onClick={ajouterQuestion}
                className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={16} /> Ajouter une question
              </button>
            </div>

            <div className="p-6 border-t border-slate-100 flex-shrink-0">
              {erreur && <p className="text-red-500 text-sm bg-red-50 px-4 py-2 rounded-lg mb-3">{erreur}</p>}
              <div className="flex gap-3">
                <button onClick={() => setModalQuiz(null)} className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50">
                  Annuler
                </button>
                <button onClick={sauvegarderQuiz} disabled={savingQuiz} className="flex-1 py-3 bg-blue-900 text-white rounded-xl text-sm font-bold hover:bg-blue-800 disabled:opacity-50">
                  {savingQuiz ? 'Enregistrement...' : 'Sauvegarder le questionnaire'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
