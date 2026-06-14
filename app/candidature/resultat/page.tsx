'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

function ResultatContent() {
  const params = useSearchParams()
  const statut = params.get('statut')
  const id = params.get('id')
  
  // Vérification de la condition selon votre paramètre d'URL (statut === 'entretien')
  const retenu = statut === 'entretien'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border p-8 text-center">
        
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl
          ${retenu ? 'bg-green-100' : 'bg-orange-100'}`}>
          {retenu ? '🎉' : '📋'}
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          {retenu ? 'Profil retenu !' : 'Candidature reçue'}
        </h1>

        <p className="text-gray-600 mb-6 leading-relaxed">
          {retenu
            ? 'Votre profil correspond au poste. Vous pouvez dès maintenant passer votre entretien interactif en ligne.'
            : 'Votre candidature a bien été enregistrée. Nous l\'examinerons et vous contacterons si votre profil correspond à nos besoins.'}
        </p>

        {retenu && (
          <div className="bg-blue-50 rounded-xl p-4 mb-6 text-left">
            <p className="text-blue-800 font-semibold text-sm mb-1">Prochaine étape</p>
            <p className="text-blue-600 text-sm">
              L'entretien se déroule directement depuis votre navigateur et dure environ 20 minutes. Assurez-vous d'être au calme.
            </p>
          </div>
        )}

        {id && (
          <p className="text-gray-400 text-xs mb-6">Référence : {id.slice(0, 8).toUpperCase()}</p>
        )}

        {/* Section des boutons mise à jour */}
        <div className="flex flex-col gap-3">
          {retenu && id && (
            <Link 
              href={`/entretien?id=${id}`}
              className="inline-block bg-blue-900 text-white font-bold px-6 py-3 rounded-xl hover:bg-blue-800 transition-colors shadow-sm"
            >
              Passer l'entretien maintenant →
            </Link>
          )}
          
          <Link 
            href="/"
            className="inline-block text-gray-500 text-sm hover:text-gray-700 font-medium py-2 transition-colors"
          >
            Retour à l'accueil
          </Link>
        </div>

      </div>
    </div>
  )
}

export default function ResultatPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Chargement...</p>
      </div>
    }>
      <ResultatContent />
    </Suspense>
  )
}