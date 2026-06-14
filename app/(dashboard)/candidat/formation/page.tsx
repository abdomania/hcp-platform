'use client'
import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import { supabase } from '@/lib/supabase' // Assurez-vous que ce chemin est correct

function FormationContent() {
  const params = useSearchParams()
  const router = useRouter()
  const candidatureId = params.get('id')

  // --- ÉTATS ---
  const [loading, setLoading] = useState(true)
  const [formation, setFormation] = useState<any>(null)
  const [progression, setProgression] = useState<any>(null)
  const [chapitreActif, setChapitreActif] = useState(0)
  const [mode, setMode] = useState<'lecture' | 'quiz' | 'examen' | 'termine'>('lecture')
  
  // États Quiz
  const [questionIndex, setQuestionIndex] = useState(0)
  const [reponseSelectionnee, setReponseSelectionnee] = useState<number | null>(null)
  const [reponseValidee, setReponseValidee] = useState(false)
  const [currentQuizScore, setCurrentQuizScore] = useState(0)

  // États Examen
  const [reponsesExamen, setReponsesExamen] = useState<Record<number, number>>({})
  const [noteFinale, setNoteFinale] = useState<number | null>(null)
  const [erreur, setErreur] = useState('')

  // --- CHARGEMENT ---
  useEffect(() => { chargerDonnees() }, [candidatureId])

  const chargerDonnees = async () => {
    if (!candidatureId) return
    try {
      const res = await fetch(`/api/formations?candidature_id=${candidatureId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      
      setFormation(data.formation)
      setProgression(data.progression)

      // Reprendre là où l'utilisateur s'est arrêté
      if (data.progression?.chapitres_valides?.length > 0) {
        const indexSuivant = data.progression.chapitres_valides.length
        if (indexSuivant < data.formation.chapitres.length) {
          setChapitreActif(indexSuivant)
        } else {
          setChapitreActif(data.formation.chapitres.length - 1)
        }
      }
    } catch (e: any) {
      setErreur(e.message)
    } finally {
      setLoading(false)
    }
  }

  // --- LOGIQUE QUIZ ---
  const handleNextQuizQuestion = () => {
    const chapitre = formation.chapitres[chapitreActif]
    const currentQ = chapitre.quiz[questionIndex]
    
    // Calcul score temporaire
    if (reponseSelectionnee === currentQ.bonne_reponse) {
      setCurrentQuizScore(s => s + 1)
    }

    if (questionIndex < chapitre.quiz.length - 1) {
      setQuestionIndex(q => q + 1)
      setReponseSelectionnee(null)
      setReponseValidee(false)
    } else {
      finirQuiz()
    }
  }

  const finirQuiz = async () => {
    const chapitre = formation.chapitres[chapitreActif]
    const scoreFinal = Math.round(((currentQuizScore + (reponseSelectionnee === chapitre.quiz[questionIndex].bonne_reponse ? 1 : 0)) / chapitre.quiz.length) * 100)

    try {
      await fetch('/api/formations/progression', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidature_id: candidatureId,
          formation_id: formation.id,
          chapitre_id: chapitreActif + 1,
          score_quiz: scoreFinal
        })
      })
      await chargerDonnees()
      setMode('lecture')
      // Si c'est le dernier chapitre, proposer l'examen
      if (chapitreActif === formation.chapitres.length - 1) {
        setMode('lecture')
      }
    } catch (e) {
      console.error("Erreur sauvegarde progression", e)
    }
  }

  // --- LOGIQUE EXAMEN ---
  const soumettreExamenFinal = async () => {
    let bonnes = 0
    formation.examen_final.forEach((q: any, i: number) => {
      if (reponsesExamen[i] === q.bonne_reponse) bonnes++
    })
    const note = Math.round((bonnes / formation.examen_final.length) * 100)

    try {
      const res = await fetch('/api/formations/progression', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidature_id: candidatureId, note_examen: note })
      })
      const data = await res.json()
      setNoteFinale(note)
      setMode('termine')
    } catch (e) {
      alert("Erreur lors de la soumission de l'examen")
    }
  }

  // --- RENDU ---
  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div></div>
  if (erreur) return <div className="p-10 text-center text-red-500 font-bold">{erreur}</div>
  if (!formation) return <div className="p-10 text-center">Aucune formation trouvée.</div>

  const chapitre = formation.chapitres[chapitreActif]
  const pct = Math.round(((progression?.chapitres_valides?.length || 0) / formation.chapitres.length) * 100)

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* SIDEBAR */}
      <aside className="w-80 bg-white border-r border-slate-200 flex flex-col shadow-sm">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-900 text-white p-2 rounded-lg font-bold">HCP</div>
            <h1 className="font-bold text-sm leading-tight">Portail de Formation<br/><span className="text-blue-600">Enquêteur RGPH 2024</span></h1>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold text-slate-400 uppercase">
              <span>Progression</span>
              <span>{pct}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500 transition-all duration-500" style={{width: `${pct}%`}}></div>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {formation.chapitres.map((ch: any, i: number) => {
            const isValide = progression?.chapitres_valides?.includes(i + 1)
            const isActif = i === chapitreActif
            return (
              <button 
                key={i} 
                onClick={() => { setChapitreActif(i); setMode('lecture'); setQuestionIndex(0); setReponseSelectionnee(null); setReponseValidee(false); }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${isActif ? 'bg-blue-50 text-blue-900 ring-1 ring-blue-200' : 'hover:bg-slate-50'}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isValide ? 'bg-green-500 text-white' : isActif ? 'bg-blue-900 text-white' : 'bg-slate-200 text-slate-500'}`}>
                  {isValide ? '✓' : i + 1}
                </div>
                <span className={`text-sm font-medium ${isActif ? 'opacity-100' : 'opacity-70'}`}>{ch.titre}</span>
              </button>
            )
          })}
          
          {progression?.chapitres_valides?.length === formation.chapitres.length && (
            <button 
              onClick={() => setMode('examen')}
              className={`w-full mt-4 flex items-center gap-3 p-4 rounded-xl text-left bg-orange-500 text-white shadow-md hover:bg-orange-600 transition-all`}
            >
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-lg">🎓</div>
              <span className="text-sm font-bold">Examen Final de Certification</span>
            </button>
          )}
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto p-12">
        <div className="max-w-4xl mx-auto">
          
          {/* HEADER DYNAMIQUE */}
          <div className="mb-8">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">{mode === 'examen' ? 'Évaluation Finale' : `Module ${chapitreActif + 1}`}</span>
            <h2 className="text-3xl font-black text-slate-800 mt-2">{mode === 'examen' ? 'Examen de Certification' : chapitre.titre}</h2>
          </div>

          {/* LECTURE CONTENU */}
          {mode === 'lecture' && (
            <div className="bg-white rounded-3xl p-10 shadow-sm border border-slate-100 animate-in fade-in duration-500">
              <div className="bg-blue-50 border-l-4 border-blue-900 p-6 mb-8 rounded-r-xl">
                <h4 className="text-sm font-bold text-blue-900 mb-2 uppercase italic">Résumé du chapitre</h4>
                <p className="text-blue-800 leading-relaxed italic">{chapitre.resume}</p>
              </div>
              
              <div className="prose prose-slate max-w-none text-slate-700 leading-loose whitespace-pre-line mb-10 text-lg">
                {chapitre.contenu}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                {chapitre.points_cles?.map((p:string, i:number) => (
                  <div key={i} className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span className="text-sm font-semibold text-slate-600">{p}</span>
                  </div>
                ))}
              </div>

              {!progression?.chapitres_valides?.includes(chapitreActif + 1) && (
                <button 
                  onClick={() => { setMode('quiz'); setQuestionIndex(0); setCurrentQuizScore(0); }}
                  className="w-full bg-blue-900 text-white font-bold py-5 rounded-2xl hover:bg-blue-800 shadow-xl shadow-blue-900/20 transition-all flex items-center justify-center gap-3"
                >
                  Valider mes connaissances (Quiz) <i className="fa-solid fa-arrow-right"></i>
                </button>
              )}
            </div>
          )}

          {/* QUIZ INTERACTIF */}
          {mode === 'quiz' && (
            <div className="bg-white rounded-3xl p-10 shadow-sm border border-slate-100">
              <div className="mb-8 flex justify-between items-center">
                <span className="text-sm font-bold text-slate-400">Question {questionIndex + 1} / {chapitre.quiz.length}</span>
                <div className="flex gap-1">
                  {chapitre.quiz.map((_:any, i:number) => (
                    <div key={i} className={`w-3 h-1 rounded-full ${i <= questionIndex ? 'bg-blue-900' : 'bg-slate-100'}`}></div>
                  ))}
                </div>
              </div>

              <h3 className="text-2xl font-bold mb-8">{chapitre.quiz[questionIndex].question}</h3>

              <div className="space-y-4 mb-10">
                {chapitre.quiz[questionIndex].options.map((opt: string, i: number) => {
                  const isSelected = reponseSelectionnee === i
                  const isCorrect = i === chapitre.quiz[questionIndex].bonne_reponse
                  let colorClass = "border-slate-200 hover:border-blue-300"
                  if (reponseValidee) {
                    if (isCorrect) colorClass = "border-green-500 bg-green-50"
                    else if (isSelected) colorClass = "border-red-500 bg-red-50"
                  } else if (isSelected) {
                    colorClass = "border-blue-900 bg-blue-50"
                  }

                  return (
                    <button 
                      key={i} 
                      disabled={reponseValidee}
                      onClick={() => setReponseSelectionnee(i)}
                      className={`w-full p-5 rounded-2xl border-2 text-left transition-all flex items-center justify-between ${colorClass}`}
                    >
                      <span className="font-medium">{opt}</span>
                      {reponseValidee && isCorrect && <i className="fa-solid fa-check text-green-600"></i>}
                      {reponseValidee && isSelected && !isCorrect && <i className="fa-solid fa-xmark text-red-600"></i>}
                    </button>
                  )
                })}
              </div>

              {reponseValidee && (
                <div className="p-6 bg-slate-50 rounded-2xl mb-8 border border-slate-100">
                  <p className="text-sm text-slate-600"><span className="font-bold text-blue-900">Explication :</span> {chapitre.quiz[questionIndex].explication}</p>
                </div>
              )}

              {!reponseValidee ? (
                <button 
                  onClick={() => setReponseValidee(true)}
                  disabled={reponseSelectionnee === null}
                  className="w-full bg-blue-900 text-white font-bold py-4 rounded-2xl disabled:opacity-30"
                >
                  Confirmer la réponse
                </button>
              ) : (
                <button 
                  onClick={handleNextQuizQuestion}
                  className="w-full bg-blue-900 text-white font-bold py-4 rounded-2xl hover:bg-blue-800"
                >
                  {questionIndex < chapitre.quiz.length - 1 ? 'Question Suivante' : 'Terminer le Quiz'}
                </button>
              )}
            </div>
          )}

          {/* EXAMEN FINAL */}
          {mode === 'examen' && (
            <div className="space-y-6">
              {formation.examen_final.map((q:any, i:number) => (
                <div key={i} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                  <p className="font-bold text-lg mb-6"><span className="text-orange-500 mr-2">{i+1}.</span>{q.question}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {q.options.map((opt:string, oi:number) => (
                      <button 
                        key={oi}
                        onClick={() => setReponsesExamen(prev => ({...prev, [i]: oi}))}
                        className={`p-4 rounded-xl border text-left text-sm transition-all ${reponsesExamen[i] === oi ? 'bg-blue-900 text-white border-blue-900' : 'bg-white border-slate-100 hover:border-blue-200'}`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <button 
                onClick={soumettreExamenFinal}
                disabled={Object.keys(reponsesExamen).length < formation.examen_final.length}
                className="w-full bg-orange-500 text-white font-bold py-6 rounded-3xl shadow-2xl shadow-orange-500/30 hover:bg-orange-600 disabled:opacity-30 transition-all text-xl"
              >
                Soumettre mon Examen Final
              </button>
            </div>
          )}

          {/* ÉCRAN TERMINÉ */}
          {mode === 'termine' && (
            <div className="bg-white rounded-3xl p-16 text-center shadow-xl border border-slate-100">
              <div className="text-7xl mb-8">🎓</div>
              <h2 className="text-4xl font-black mb-4">Félicitations !</h2>
              <p className="text-slate-500 mb-10 text-lg">Vous avez complété votre formation d'enquêteur avec un score de :</p>
              <div className="inline-block p-10 bg-blue-50 rounded-full mb-10 ring-8 ring-blue-50/50">
                <span className="text-7xl font-black text-blue-900">{noteFinale}</span>
                <span className="text-2xl text-blue-400 font-bold">/100</span>
              </div>
              <p className="text-slate-600 max-w-md mx-auto leading-relaxed">
                Votre dossier est maintenant complet. Un responsable RH du HCP examinera vos résultats et vous contactera par email pour les prochaines étapes contractuelles.
              </p>
              <button onClick={() => router.push('/')} className="mt-12 bg-blue-900 text-white px-10 py-4 rounded-2xl font-bold hover:bg-blue-800 transition-all">
                Retour au portail
              </button>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}

export default function FormationPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center bg-slate-50">Chargement...</div>}>
      <FormationContent />
    </Suspense>
  )
}