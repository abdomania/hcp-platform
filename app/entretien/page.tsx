'use client'
import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'

// On définit le type pour TypeScript
type Question = {
  id: number;
  type: 'texte' | 'oral';
  categorie: string;
  question: string;
  consigne: string;
}

function EntretienContent() {
  const params = useSearchParams()
  const router = useRouter()
  const candidatureId = params.get('id')

  // Nouveaux states pour gérer le chargement depuis l'API
  const [QUESTIONS, setQUESTIONS] = useState<Question[]>([])
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true)

  const [currentQ, setCurrentQ] = useState(0)
  const [reponses, setReponses] = useState<Record<number, string>>({})
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlobs, setAudioBlobs] = useState<Record<number, Blob>>({})
  const [recordingTime, setRecordingTime] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [note, setNote] = useState<number | null>(null)
  const [noteGlobale, setNoteGlobale] = useState<number | null>(null)
  const [credentials, setCredentials] = useState<{ email: string; mot_de_passe: string } | null>(null)
  const [copied, setCopied] = useState<'email' | 'mdp' | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const chunksRef = useRef<BlobPart[]>([])

  // FETCH des questions dynamiques au chargement du composant
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const res = await fetch('/api/questions')
        if (!res.ok) throw new Error('Erreur réseau')
        const data = await res.json()
        setQUESTIONS(data)
      } catch (error) {
        console.error("Impossible de charger les questions dynamiques", error)
        alert("Erreur de connexion au serveur d'IA.")
      } finally {
        setIsLoadingQuestions(false)
      }
    }
    fetchQuestions()
  }, [])

  // Timer enregistrement
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime(t => {
          if (t >= 60) { stopRecording(); return 0 }
          return t + 1
        })
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
      setRecordingTime(0)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isRecording])

  // --- Fonctions d'enregistrement ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunksRef.current = []
      const recorder = new MediaRecorder(stream)
      recorder.ondataavailable = e => chunksRef.current.push(e.data)
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlobs(prev => ({ ...prev, [QUESTIONS[currentQ].id]: blob }))
        stream.getTracks().forEach(t => t.stop())
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      setIsRecording(true)
    } catch {
      alert('Accès au microphone refusé. Autorisez le micro dans votre navigateur.')
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
  }

  // --- Navigation et Validation ---
  const canGoNext = () => {
    const q = QUESTIONS[currentQ]
    if (!q) return false
    if (q.type === 'texte') return (reponses[q.id] || '').length >= 20
    if (q.type === 'oral') return !!audioBlobs[q.id]
    return false
  }

  const handleNext = () => {
    if (currentQ < QUESTIONS.length - 1) setCurrentQ(c => c + 1)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const audiosBase64: Record<number, string> = {}
      for (const [qId, blob] of Object.entries(audioBlobs)) {
        const buffer = await blob.arrayBuffer()
        audiosBase64[Number(qId)] = Buffer.from(buffer).toString('base64')
      }

      const res = await fetch('/api/entretiens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidature_id: candidatureId,
          questions: QUESTIONS,
          reponses_texte: reponses,
          audios_base64: audiosBase64
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setNote(data.note_entretien)
      setNoteGlobale(data.note_globale)
      if (data.credentials) setCredentials(data.credentials)
      setSubmitted(true)
    } catch (err: any) {
      alert('Erreur : ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Écran de chargement initial (Pendant que Gemini crée les questions)
  if (isLoadingQuestions) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="w-12 h-12 border-4 border-blue-900 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600 font-medium animate-pulse">L'IA prépare vos questions d'entretien sur mesure...</p>
      </div>
    )
  }

  // Sécurité si aucune question n'est chargée
  if (!QUESTIONS || QUESTIONS.length === 0) return null

  // Variables calculées après le chargement
  const question = QUESTIONS[currentQ]
  const progress = ((currentQ) / QUESTIONS.length) * 100

  const copyToClipboard = (text: string, type: 'email' | 'mdp') => {
    navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  // Écran résultat
  if (submitted && note !== null) {
    const retenu = (noteGlobale ?? note) >= 50
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
        <div className="max-w-md w-full space-y-4">

          {/* Carte résultat */}
          <div className="bg-white rounded-2xl shadow border p-8 text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl
              ${retenu ? 'bg-green-100' : 'bg-orange-100'}`}>
              {retenu ? '🎉' : '📋'}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {retenu ? 'Entretien validé !' : 'Entretien terminé'}
            </h1>
            <div className={`text-4xl font-black my-4 ${retenu ? 'text-green-600' : 'text-orange-500'}`}>
              {note.toFixed(1)} / 100
            </div>
            <p className="text-gray-500 text-sm">
              {retenu
                ? 'Votre dossier est retenu. Accédez à votre formation avec les identifiants ci-dessous.'
                : 'Merci pour votre participation. Nous reviendrons vers vous prochainement.'}
            </p>
          </div>

          {/* Popup credentials — affiché uniquement si retenu */}
          {retenu && credentials && (
            <div className="bg-white rounded-2xl shadow border border-green-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-lg">🔑</div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Vos identifiants de connexion</p>
                  <p className="text-xs text-gray-400">Copiez-les avant de quitter cette page</p>
                </div>
              </div>

              {/* Email */}
              <div className="mb-3">
                <p className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">Email</p>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
                  <span className="flex-1 text-sm font-mono text-gray-800">{credentials.email}</span>
                  <button
                    onClick={() => copyToClipboard(credentials.email, 'email')}
                    className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all
                      ${copied === 'email' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>
                    {copied === 'email' ? '✓ Copié' : 'Copier'}
                  </button>
                </div>
              </div>

              {/* Mot de passe */}
              <div className="mb-4">
                <p className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">Mot de passe</p>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
                  <span className="flex-1 text-sm font-mono font-bold text-gray-900 tracking-widest">{credentials.mot_de_passe}</span>
                  <button
                    onClick={() => copyToClipboard(credentials.mot_de_passe, 'mdp')}
                    className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all
                      ${copied === 'mdp' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>
                    {copied === 'mdp' ? '✓ Copié' : 'Copier'}
                  </button>
                </div>
              </div>

              <a
                href="/login"
                className="block w-full bg-blue-900 text-white text-center font-semibold py-3 rounded-xl hover:bg-blue-800 transition-colors text-sm">
                Se connecter et accéder à la formation →
              </a>

              <p className="text-xs text-gray-400 text-center mt-3">
                Un email de confirmation vous a également été envoyé.
              </p>
            </div>
          )}

          {/* Cas retenu mais credentials déjà existants (compte déjà créé) */}
          {retenu && !credentials && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 text-center">
              <p className="text-blue-800 text-sm font-medium mb-3">
                Vos identifiants ont été envoyés à votre adresse email.
              </p>
              <a href="/login" className="text-blue-700 underline text-sm font-semibold">
                Se connecter →
              </a>
            </div>
          )}

          {!retenu && (
            <button onClick={() => router.push('/')}
              className="w-full bg-gray-800 text-white font-semibold px-6 py-3 rounded-xl hover:bg-gray-700 text-sm">
              Retour à l'accueil
            </button>
          )}

        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-900 text-white px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <span className="text-blue-900 font-black text-sm">H</span>
            </div>
            <span className="font-bold text-sm">Entretien interactif</span>
          </div>
          <span className="text-blue-300 text-sm">{currentQ + 1} / {QUESTIONS.length}</span>
        </div>
      </div>

      {/* Barre de progression */}
      <div className="h-1.5 bg-gray-200">
        <div className="h-full bg-blue-600 transition-all duration-500"
          style={{ width: `${progress}%` }} />
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="bg-white rounded-2xl shadow-sm border p-8">

          {/* Badge catégorie */}
          <div className="flex items-center gap-2 mb-6">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold
              ${question.type === 'oral' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
              {question.categorie}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-medium
              ${question.type === 'oral' ? 'bg-purple-50 text-purple-500' : 'bg-gray-100 text-gray-500'}`}>
              {question.type === 'oral' ? '🎤 Réponse orale' : '✍️ Réponse écrite'}
            </span>
          </div>

          {/* Question */}
          <h2 className="text-xl font-bold text-gray-900 mb-2 leading-snug">
            {question.question}
          </h2>
          <p className="text-gray-400 text-sm mb-6 italic">{question.consigne}</p>

          {/* Zone de réponse texte */}
          {question.type === 'texte' && (
            <div>
              <textarea
                value={reponses[question.id] || ''}
                onChange={e => setReponses(prev => ({ ...prev, [question.id]: e.target.value }))}
                rows={5}
                placeholder="Votre réponse..."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-blue-400 resize-none"
              />
              <p className={`text-xs mt-1 text-right
                ${(reponses[question.id] || '').length >= 20 ? 'text-green-500' : 'text-gray-400'}`}>
                {(reponses[question.id] || '').length} caractères (min. 20)
              </p>
            </div>
          )}

          {/* Zone enregistrement oral */}
          {question.type === 'oral' && (
            <div className="flex flex-col items-center py-6 gap-4">
              {!audioBlobs[question.id] ? (
                <>
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl shadow-lg transition-all
                      ${isRecording
                        ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                        : 'bg-blue-900 hover:bg-blue-800'}`}>
                    {isRecording ? '⏹' : '🎤'}
                  </button>
                  {isRecording && (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-red-500 font-medium text-sm">
                        Enregistrement : {recordingTime}s / 60s
                      </span>
                    </div>
                  )}
                  {!isRecording && (
                    <p className="text-gray-400 text-sm">Cliquez pour commencer l'enregistrement</p>
                  )}
                </>
              ) : (
                <div className="text-center">
                  <div className="text-4xl mb-2">✅</div>
                  <p className="text-green-600 font-semibold text-sm">Réponse enregistrée</p>
                  <button
                    onClick={() => setAudioBlobs(prev => {
                      const n = { ...prev }; delete n[question.id]; return n
                    })}
                    className="text-gray-400 text-xs mt-2 hover:text-gray-600 underline">
                    Ré-enregistrer
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-6">
            {currentQ > 0 && (
              <button onClick={() => setCurrentQ(c => c - 1)}
                className="px-5 py-2.5 border border-gray-300 rounded-xl text-gray-600 text-sm font-medium hover:bg-gray-50">
                ← Précédent
              </button>
            )}

            {currentQ < QUESTIONS.length - 1 ? (
              <button
                onClick={handleNext}
                disabled={!canGoNext()}
                className="flex-1 bg-blue-900 text-white font-semibold py-2.5 rounded-xl hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed text-sm">
                Question suivante →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canGoNext() || submitting}
                className="flex-1 bg-green-600 text-white font-bold py-2.5 rounded-xl hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm">
                {submitting ? 'Analyse en cours...' : 'Soumettre l\'entretien ✓'}
              </button>
            )}
          </div>

        </div>

        {/* Indicateurs questions */}
        <div className="flex gap-2 justify-center mt-6 flex-wrap">
          {QUESTIONS.map((q, i) => (
            <div key={q.id}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                ${i === currentQ ? 'bg-blue-900 text-white scale-110'
                  : reponses[q.id] || audioBlobs[q.id] ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-500'}`}>
              {i + 1}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function EntretienPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-blue-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <EntretienContent />
    </Suspense>
  )
}