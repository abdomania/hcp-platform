'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'

function UploadFormationContent() {
  const params = useSearchParams()
  const router = useRouter()
  const posteId = params.get('poste_id')

  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [etape, setEtape] = useState<'upload' | 'generation' | 'done'>('upload')
  const [resultat, setResultat] = useState<any>(null)
  const [erreur, setErreur] = useState('')

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f && f.type === 'application/pdf') {
      setFile(f)
      setErreur('')
    } else {
      setErreur('Fichier PDF uniquement.')
    }
  }

  const handleSubmit = async () => {
    if (!file || !posteId) return
    setLoading(true)
    setEtape('generation')
    setErreur('')

    try {
      // 1. Upload PDF vers Supabase Storage
      const fileName = `formation_${posteId}_${Date.now()}.pdf`
      const { error: uploadError } = await supabase.storage
        .from('formations')
        .upload(fileName, file)

      if (uploadError) throw new Error('Erreur upload : ' + uploadError.message)

      const { data: { publicUrl } } = supabase.storage
        .from('formations')
        .getPublicUrl(fileName)

      // 2. Mettre à jour le poste avec l'URL du fichier
      await supabase
        .from('postes')
        .update({ fichier_formation_url: publicUrl })
        .eq('id', posteId)

      // 3. Appeler l'API de génération IA
      const res = await fetch('/api/formations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poste_id: posteId, fichier_url: publicUrl })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setResultat(data)
      setEtape('done')

    } catch (err: any) {
      setErreur(err.message)
      setEtape('upload')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-lg w-full">

        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-blue-900 rounded-xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-xl">📚</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Générer la formation</h1>
          <p className="text-gray-500 text-sm mt-1">
            Uploadez le support de cours — l'IA génère la formation automatiquement
          </p>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-8">

          {/* ÉTAPE UPLOAD */}
          {etape === 'upload' && (
            <div className="space-y-6">
              <label className={`block border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors
                ${file ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'}`}>
                <input type="file" accept=".pdf" onChange={handleFile} className="hidden" />
                {file ? (
                  <div>
                    <div className="text-4xl mb-2">✅</div>
                    <p className="font-semibold text-green-700">{file.name}</p>
                    <p className="text-green-600 text-sm mt-1">
                      {(file.size / 1024 / 1024).toFixed(2)} Mo
                    </p>
                    <p className="text-gray-400 text-xs mt-2">Cliquez pour changer</p>
                  </div>
                ) : (
                  <div>
                    <div className="text-4xl mb-2">📄</div>
                    <p className="font-medium text-gray-700">
                      Cliquez pour sélectionner le support PDF
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                      Manuel d'enquête, guide terrain, protocole...
                    </p>
                  </div>
                )}
              </label>

              {erreur && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  <p className="text-red-600 text-sm">{erreur}</p>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={!file || loading}
                className="w-full bg-blue-900 text-white font-bold py-3.5 rounded-xl hover:bg-blue-800 disabled:opacity-40">
                Générer la formation avec l'IA →
              </button>
            </div>
          )}

          {/* ÉTAPE GÉNÉRATION */}
          {etape === 'generation' && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 border-4 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto" />
              <h2 className="text-lg font-bold text-gray-900">Génération en cours...</h2>
              <div className="space-y-2 text-sm text-gray-500">
                <p>📤 Upload du support terminé</p>
                <p>🔍 Analyse du contenu par l'IA...</p>
                <p>📝 Génération des chapitres et quiz...</p>
                <p>🎓 Création de l'examen final...</p>
              </div>
              <p className="text-xs text-gray-400 mt-4">
                Cette opération peut prendre 30 à 60 secondes
              </p>
            </div>
          )}

          {/* ÉTAPE DONE */}
          {etape === 'done' && resultat && (
            <div className="text-center space-y-4">
              <div className="text-5xl">🎉</div>
              <h2 className="text-xl font-bold text-gray-900">Formation générée !</h2>

              <div className="bg-blue-50 rounded-xl p-4 text-left space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Chapitres créés</span>
                  <span className="font-bold text-blue-900">{resultat.nb_chapitres}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Quiz par chapitre</span>
                  <span className="font-bold text-blue-900">5 questions</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Examen final</span>
                  <span className="font-bold text-blue-900">20 questions</span>
                </div>
              </div>

              <p className="text-gray-500 text-sm">
                Les candidats retenus peuvent maintenant accéder à cette formation.
              </p>

              <button
                onClick={() => router.push('/rh')}
                className="w-full bg-blue-900 text-white font-bold py-3 rounded-xl hover:bg-blue-800">
                Retour au dashboard RH →
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

export default function UploadFormationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Chargement...</p>
    </div>}>
      <UploadFormationContent />
    </Suspense>
  )
}