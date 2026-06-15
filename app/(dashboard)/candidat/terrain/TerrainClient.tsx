'use client'

import { useState, useEffect, useCallback } from 'react'
import { MapPin, AlertTriangle, CheckCircle, Send, Navigation, Wifi, WifiOff } from 'lucide-react'

type Questionnaire = {
  id: string
  titre: string
  description?: string | null
  questions: { id: string; texte: string; type: 'texte' | 'oui_non' | 'nombre'; requis?: boolean }[]
}

type Props = {
  candidatureId: string
  questionnaires: Questionnaire[]
  enqueteId?: string | null
}

const TYPE_SIGNALEMENS = [
  { value: 'refus', label: 'Ménage refuse de répondre' },
  { value: 'absent', label: 'Ménage absent' },
  { value: 'adresse_incorrecte', label: 'Adresse incorrecte' },
  { value: 'probleme_technique', label: 'Problème technique' },
  { value: 'autre', label: 'Autre' },
]

export default function TerrainClient({ candidatureId, questionnaires, enqueteId }: Props) {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null)
  const [gpsError, setGpsError] = useState('')
  const [tracking, setTracking] = useState(false)
  const [activeTab, setActiveTab] = useState<'questionnaire' | 'signalement'>('questionnaire')
  const [selectedQ, setSelectedQ] = useState<Questionnaire | null>(questionnaires[0] || null)
  const [reponses, setReponses] = useState<Record<string, string>>({})
  const [startTime] = useState(Date.now())
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState<string[]>([])

  // Signalement
  const [sigType, setSigType] = useState(TYPE_SIGNALEMENS[0].value)
  const [sigDesc, setSigDesc] = useState('')
  const [sigSubmitting, setSigSubmitting] = useState(false)
  const [sigSuccess, setSigSuccess] = useState(false)

  const getGPS = useCallback(() => {
    if (!navigator.geolocation) { setGpsError('GPS non disponible'); return }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setPosition(coords)
        setGpsError('')
        // Envoyer position au serveur
        fetch('/api/terrain/positions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidature_id: candidatureId, latitude: coords.lat, longitude: coords.lng }),
        }).catch(() => {})
      },
      err => setGpsError('Impossible d\'obtenir le GPS. Vérifiez les permissions.'),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [candidatureId])

  // Tracking auto toutes les 2 minutes
  useEffect(() => {
    if (!tracking) return
    getGPS()
    const interval = setInterval(getGPS, 120000)
    return () => clearInterval(interval)
  }, [tracking, getGPS])

  const submitQuestionnaire = async () => {
    if (!selectedQ) return
    setSubmitting(true)
    const dureeSecondes = Math.round((Date.now() - startTime) / 1000)
    await fetch('/api/terrain/reponses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionnaire_id: selectedQ.id,
        candidature_id: candidatureId,
        reponses,
        latitude: position?.lat,
        longitude: position?.lng,
        duree_secondes: dureeSecondes,
      }),
    })
    setSubmitting(false)
    setSubmitted(prev => [...prev, selectedQ.id])
    setReponses({})
  }

  const submitSignalement = async () => {
    setSigSubmitting(true)
    await fetch('/api/terrain/signalements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidature_id: candidatureId,
        enquete_id: enqueteId || null,
        type: sigType,
        description: sigDesc || null,
        latitude: position?.lat,
        longitude: position?.lng,
      }),
    })
    setSigSubmitting(false)
    setSigSuccess(true)
    setSigDesc('')
    setTimeout(() => setSigSuccess(false), 3000)
  }

  return (
    <div className="max-w-lg mx-auto space-y-6 pb-10">
      {/* GPS STATUS */}
      <div className={`rounded-xl border p-4 flex items-center justify-between ${position ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${position ? 'bg-emerald-100' : 'bg-amber-100'}`}>
            <Navigation size={18} className={position ? 'text-emerald-600' : 'text-amber-600'} />
          </div>
          <div>
            {position
              ? <><p className="text-sm font-semibold text-emerald-800">GPS actif</p><p className="text-xs text-emerald-600">{position.lat.toFixed(5)}, {position.lng.toFixed(5)}</p></>
              : <><p className="text-sm font-semibold text-amber-800">GPS non actif</p><p className="text-xs text-amber-600">{gpsError || 'Activez le tracking pour partager votre position'}</p></>
            }
          </div>
        </div>
        <button
          onClick={() => { setTracking(t => !t); if (!tracking) getGPS() }}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-colors ${tracking ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-amber-500 text-white hover:bg-amber-600'}`}
        >
          {tracking ? <><Wifi size={13} /> Actif</> : <><WifiOff size={13} /> Activer</>}
        </button>
      </div>

      {/* TABS */}
      <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
        <button onClick={() => setActiveTab('questionnaire')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'questionnaire' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
          📋 Questionnaire
        </button>
        <button onClick={() => setActiveTab('signalement')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'signalement' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
          ⚠️ Signalement
        </button>
      </div>

      {/* QUESTIONNAIRE */}
      {activeTab === 'questionnaire' && (
        <div className="space-y-4">
          {questionnaires.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400">
              <MapPin size={32} className="mx-auto mb-3 text-slate-300" />
              <p>Aucun questionnaire assigné pour le moment</p>
            </div>
          ) : (
            <>
              {/* Sélection questionnaire */}
              {questionnaires.length > 1 && (
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <label className="block text-sm font-semibold text-slate-600 mb-2">Questionnaire</label>
                  <select value={selectedQ?.id || ''} onChange={e => setSelectedQ(questionnaires.find(q => q.id === e.target.value) || null)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                    {questionnaires.map(q => <option key={q.id} value={q.id}>{q.titre}</option>)}
                  </select>
                </div>
              )}

              {selectedQ && (
                submitted.includes(selectedQ.id) ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-8 text-center">
                    <CheckCircle size={36} className="mx-auto text-emerald-500 mb-3" />
                    <p className="font-semibold text-emerald-800">Questionnaire soumis !</p>
                    <p className="text-sm text-emerald-600 mt-1">Vos réponses ont été enregistrées.</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
                    <div>
                      <h2 className="font-bold text-slate-900">{selectedQ.titre}</h2>
                      {selectedQ.description && <p className="text-sm text-slate-500 mt-1">{selectedQ.description}</p>}
                    </div>
                    {selectedQ.questions.map((q, i) => (
                      <div key={q.id} className="space-y-1.5">
                        <label className="block text-sm font-semibold text-slate-700">
                          {i + 1}. {q.texte} {q.requis && <span className="text-red-500">*</span>}
                        </label>
                        {q.type === 'oui_non' ? (
                          <div className="flex gap-3">
                            {['Oui', 'Non'].map(v => (
                              <button key={v} onClick={() => setReponses(r => ({ ...r, [q.id]: v }))}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${reponses[q.id] === v ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                                {v}
                              </button>
                            ))}
                          </div>
                        ) : q.type === 'nombre' ? (
                          <input type="number" value={reponses[q.id] || ''}
                            onChange={e => setReponses(r => ({ ...r, [q.id]: e.target.value }))}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                          />
                        ) : (
                          <textarea value={reponses[q.id] || ''} rows={2}
                            onChange={e => setReponses(r => ({ ...r, [q.id]: e.target.value }))}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
                          />
                        )}
                      </div>
                    ))}
                    <button onClick={submitQuestionnaire} disabled={submitting}
                      className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                      {submitting ? 'Envoi...' : <><Send size={15} /> Soumettre les réponses</>}
                    </button>
                  </div>
                )
              )}
            </>
          )}
        </div>
      )}

      {/* SIGNALEMENT */}
      {activeTab === 'signalement' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle size={20} className="text-amber-500" />
            <h2 className="font-bold text-slate-900">Signaler un problème</h2>
          </div>
          {sigSuccess ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
              <CheckCircle size={32} className="mx-auto text-emerald-500 mb-2" />
              <p className="font-semibold text-emerald-800">Signalement envoyé !</p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">Type de problème</label>
                <select value={sigType} onChange={e => setSigType(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                  {TYPE_SIGNALEMENS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">Description <span className="text-slate-400 font-normal">(optionnel)</span></label>
                <textarea value={sigDesc} onChange={e => setSigDesc(e.target.value)} rows={3}
                  placeholder="Détails supplémentaires..."
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none" />
              </div>
              {!position && (
                <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                  ⚠️ Activez le GPS pour inclure votre position dans le signalement
                </p>
              )}
              <button onClick={submitSignalement} disabled={sigSubmitting}
                className="w-full py-3 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center gap-2">
                {sigSubmitting ? 'Envoi...' : <><Send size={15} /> Envoyer le signalement</>}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
