import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800">
      
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-blue-700/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
            <span className="text-blue-900 font-black text-lg">H</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">HCP Recrutement</p>
            <p className="text-blue-300 text-xs">Plateforme intelligente</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login"
            className="text-blue-200 hover:text-white text-sm transition-colors px-4 py-2">
            Connexion
          </Link>
          <Link href="/candidature"
            className="bg-white text-blue-900 font-semibold text-sm px-5 py-2.5 rounded-lg hover:bg-blue-50 transition-colors">
            Postuler maintenant
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-8 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-800/50 border border-blue-600/40 rounded-full px-4 py-1.5 mb-8">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-blue-200 text-sm">Recrutement ouvert — Enquête nationale 2025</span>
        </div>

        <h1 className="text-5xl font-extrabold text-white leading-tight mb-6">
          Rejoignez les équipes terrain
          <span className="block text-blue-300 mt-1">du Haut-Commissariat au Plan</span>
        </h1>

        <p className="text-blue-200 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
          Postulez en quelques minutes. Notre plateforme analyse votre profil, 
          vous prépare à la mission et vous accompagne jusqu'au contrat.
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link href="/candidature"
            className="bg-white text-blue-900 font-bold px-8 py-4 rounded-xl hover:bg-blue-50 transition-all hover:scale-105 shadow-lg">
            Déposer ma candidature →
          </Link>
          <Link href="/login"
            className="border border-blue-500 text-white font-semibold px-8 py-4 rounded-xl hover:bg-blue-800/50 transition-colors">
            Espace RH / Admin
          </Link>
        </div>
      </section>

      {/* Étapes du processus */}
      <section className="max-w-5xl mx-auto px-8 pb-24">
        <p className="text-blue-300 text-sm text-center uppercase tracking-widest mb-10">
          Comment ça fonctionne
        </p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { num: "01", titre: "Déposez votre CV", desc: "Sans créer de compte. L'IA analyse votre profil en quelques secondes." },
            { num: "02", titre: "Passez l'entretien", desc: "Questions ciblées à l'écrit et à l'oral, adaptées au poste visé." },
            { num: "03", titre: "Suivez la formation", desc: "Formation générée automatiquement, avec quiz et examen final." },
            { num: "04", titre: "Signez le contrat", desc: "Contrat généré et envoyé par email dès validation de votre dossier." },
          ].map((step) => (
            <div key={step.num}
              className="bg-blue-800/30 border border-blue-700/40 rounded-2xl p-6 hover:bg-blue-800/50 transition-colors">
              <span className="text-blue-400 font-black text-3xl">{step.num}</span>
              <h3 className="text-white font-bold mt-3 mb-2">{step.titre}</h3>
              <p className="text-blue-300 text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-blue-700/40 px-8 py-6 text-center">
        <p className="text-blue-400 text-sm">
          © 2026 Haut-Commissariat au Plan — Maroc
        </p>
      </footer>

    </main>
  )
}