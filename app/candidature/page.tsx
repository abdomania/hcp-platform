'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const VILLES = ['Casablanca','Rabat','Fès','Marrakech','Agadir','Tanger','Meknès','Oujda','Kenitra','Tétouan','Settat','Beni Mellal','El Jadida','Nador','Khouribga']
const NIVEAUX = ['Baccalauréat','Bac+2 (DUT/BTS)','Licence (Bac+3)','Master (Bac+5)','Doctorat','Autre']

export default function CandidaturePage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [form, setForm] = useState({
    nom_complet: '',
    email: '',
    telephone: '',
    ville: '',
    niveau_etudes: '',
    poste_id: '56eaa427-0f2b-4352-a5e4-3a415333436b', // on le rendra dynamique plus tard
  })
  const [cvFile, setCvFile] = useState<File | null>(null)

  const updateForm = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type === 'application/pdf') {
      setCvFile(file)
      setError('')
    } else {
      setError('Veuillez sélectionner un fichier PDF uniquement.')
    }
  }

  const handleSubmit = async () => {
    if (!cvFile) { setError('Veuillez uploader votre CV.'); return }
    setLoading(true)
    setError('')

    try {
      // 1. Upload CV vers Supabase Storage
      const fileName = `cv_${Date.now()}_${cvFile.name.replace(/\s/g, '_')}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('cvs')
        .upload(fileName, cvFile)

      if (uploadError) throw new Error('Erreur upload CV : ' + uploadError.message)

      const { data: { publicUrl } } = supabase.storage
        .from('cvs')
        .getPublicUrl(fileName)

      // 2. Envoyer vers l'API de traitement IA
      const response = await fetch('/api/candidatures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, cv_url: publicUrl })
      })

      const result = await response.json()

      if (!response.ok) throw new Error(result.error || 'Erreur serveur')

      // 3. Rediriger selon le résultat
      router.push(`/candidature/resultat?id=${result.candidature_id}&statut=${result.statut}`)

    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* Header */}
      <div className="bg-blue-900 text-white px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
          <span className="text-blue-900 font-black">H</span>
        </div>
        <div>
          <p className="font-bold text-sm">HCP Recrutement</p>
          <p className="text-blue-300 text-xs">Dépôt de candidature</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-white border-b px-6 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          {[1,2].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                ${step >= s ? 'bg-blue-900 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {s}
              </div>
              <span className={`text-sm ${step >= s ? 'text-blue-900 font-medium' : 'text-gray-400'}`}>
                {s === 1 ? 'Informations' : 'CV & Soumission'}
              </span>
              {s < 2 && <div className={`h-px w-12 ${step > s ? 'bg-blue-900' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>
      </div>

      {/* Formulaire */}
      <div className="max-w-2xl mx-auto px-6 py-10">
        
        <div className="bg-white rounded-2xl shadow-sm border p-8">

          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Vos informations</h2>
                <p className="text-gray-500 text-sm mt-1">Aucun compte requis pour postuler.</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet *</label>
                  <input
                    type="text"
                    value={form.nom_complet}
                    onChange={e => updateForm('nom_complet', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                    placeholder="Prénom NOM"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => updateForm('email', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                    placeholder="votre@email.com"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                    <input
                      type="tel"
                      value={form.telephone}
                      onChange={e => updateForm('telephone', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                      placeholder="06XXXXXXXX"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ville *</label>
                    <select
                      value={form.ville}
                      onChange={e => updateForm('ville', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500">
                      <option value="">Choisir...</option>
                      {VILLES.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Niveau d'études *</label>
                  <select
                    value={form.niveau_etudes}
                    onChange={e => updateForm('niveau_etudes', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500">
                    <option value="">Choisir...</option>
                    {NIVEAUX.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>

              <button
                onClick={() => {
                  if (!form.nom_complet || !form.email || !form.ville || !form.niveau_etudes) {
                    setError('Veuillez remplir tous les champs obligatoires.')
                    return
                  }
                  setError('')
                  setStep(2)
                }}
                className="w-full bg-blue-900 text-white font-semibold py-3 rounded-xl hover:bg-blue-800 transition-colors">
                Continuer →
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Votre CV</h2>
                <p className="text-gray-500 text-sm mt-1">Format PDF uniquement. Taille max : 5 Mo.</p>
              </div>

              {/* Zone upload */}
              <label className={`block border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors
                ${cvFile ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'}`}>
                <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
                {cvFile ? (
                  <div>
                    <div className="text-4xl mb-3">✅</div>
                    <p className="font-semibold text-green-700">{cvFile.name}</p>
                    <p className="text-green-600 text-sm mt-1">{(cvFile.size / 1024 / 1024).toFixed(2)} Mo</p>
                    <p className="text-gray-400 text-xs mt-2">Cliquez pour changer</p>
                  </div>
                ) : (
                  <div>
                    <div className="text-4xl mb-3">📄</div>
                    <p className="font-medium text-gray-700">Cliquez pour sélectionner votre CV</p>
                    <p className="text-gray-400 text-sm mt-1">ou glissez-déposez ici</p>
                  </div>
                )}
              </label>

              {/* Récap */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Récapitulatif</p>
                {[
                  ['Nom', form.nom_complet],
                  ['Email', form.email],
                  ['Ville', form.ville],
                  ['Niveau', form.niveau_etudes],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-medium text-gray-800">{value}</span>
                  </div>
                ))}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 border border-gray-300 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-50">
                  ← Retour
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || !cvFile}
                  className="flex-2 flex-grow bg-blue-900 text-white font-bold py-3 px-8 rounded-xl hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                      </svg>
                      Analyse en cours...
                    </span>
                  ) : 'Soumettre ma candidature →'}
                </button>
              </div>
            </div>
          )}

          {error && step === 1 && (
            <p className="text-red-500 text-sm mt-3">{error}</p>
          )}

        </div>
      </div>
    </div>
  )
}