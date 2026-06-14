import { createServerSupabase } from '@/lib/supabase-server'
import { StatutBadge } from '@/components/dashboard/StatutBadge'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function CandidatureDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabase()

  // 1. On récupère d'abord la candidature
  const { data: candidature } = await supabase
    .from('candidatures')
    .select('*, postes(id, titre, seuil_score_cv, seuil_note_globale, seuil_formation)')
    .eq('id', params.id)
    .single()

  if (!candidature) {
    return <div className="text-slate-500">Candidature introuvable.</div>
  }

  // 2. Parallélisation pour gagner en vitesse
  const [
    { data: entretien },
    { data: progression }
  ] = await Promise.all([
    supabase.from('entretiens').select('*').eq('candidature_id', params.id).single(),
    supabase.from('progressions').select('*').eq('candidature_id', params.id).single()
  ])

  async function validerCandidature() {
    'use server'
    const supabase = createServerSupabase()
    await supabase.from('candidatures').update({ rh_validation: true, statut: 'valide' }).eq('id', params.id)
    revalidatePath(`/rh/candidatures/${params.id}`)
    revalidatePath('/rh/candidatures')
    revalidatePath('/rh')
  }

  async function rejeterCandidature() {
    'use server'
    const supabase = createServerSupabase()
    await supabase.from('candidatures').update({ rh_validation: false, statut: 'rejete' }).eq('id', params.id)
    revalidatePath(`/rh/candidatures/${params.id}`)
    revalidatePath('/rh/candidatures')
    revalidatePath('/rh')
  }

  const cvData = candidature.cv_data || {}

  return (
    <div className="space-y-6">
      <Link href="/rh/candidatures" className="text-sm text-blue-600 hover:underline">← Retour aux candidatures</Link>

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{candidature.nom_complet}</h1>
          <p className="text-slate-500">
            Candidature pour : <span className="font-medium">{candidature.postes?.titre || '—'}</span>
          </p>
        </div>
        <StatutBadge statut={candidature.statut} />
      </div>

      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-900 mb-4">Informations générales</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <Info label="Email" value={candidature.email} />
          <Info label="Téléphone" value={candidature.telephone} />
          <Info label="Ville" value={candidature.ville} />
          <Info label="Niveau d'études" value={candidature.niveau_etudes} />
          <Info label="Profil anonyme" value={cvData.nom_anonyme} />
          <Info label="Candidature créée le" value={new Date(candidature.created_at).toLocaleDateString('fr-FR')} />
          <Info label="CV" value={<a href={candidature.cv_url} target="_blank" className="text-blue-600 hover:underline">Voir le CV ↗</a>} />
        </div>
      </section>

      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-900 mb-4">Scores</h2>
        <div className="grid grid-cols-3 gap-4">
          <ScoreBlock label="Score CV" value={candidature.score_cv} seuil={candidature.postes?.seuil_score_cv} />
          <ScoreBlock label="Note entretien" value={candidature.note_entretien} />
          <ScoreBlock label="Note globale" value={candidature.note_globale} seuil={candidature.postes?.seuil_note_globale} />
        </div>
        {cvData.points_forts?.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-slate-500 mb-1">Points forts détectés (analyse IA)</p>
            <div className="flex flex-wrap gap-2">
              {cvData.points_forts.map((p: string, i: number) => (
                <span key={i} className="text-xs bg-slate-100 px-2 py-1 rounded-full">{p}</span>
              ))}
            </div>
          </div>
        )}
        {cvData.justification_score && (
          <p className="text-sm text-slate-500 mt-3">{cvData.justification_score}</p>
        )}
      </section>

      {entretien && (
        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 mb-4">Entretien IA — détail des réponses</h2>
          <div className="space-y-4">
            {entretien.questions?.map((q: any, i: number) => (
              <div key={i} className="border border-slate-100 rounded-lg p-3">
                <p className="font-medium text-sm">{i + 1}. {q.question}</p>
                <p className="text-sm text-slate-600 mt-1">Réponse : {entretien.reponses?.[i] || '—'}</p>
                <p className="text-xs text-slate-400 mt-1">Score : {entretien.scores?.[i] ?? '—'} / 10</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {progression && (
        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 mb-4">Suivi formation</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <Info label="Chapitres validés" value={`${progression.chapitres_valides?.length || 0}`} />
            <Info label="Formation terminée" value={progression.complete ? 'Oui' : 'Non'} />
            <ScoreBlock label="Note examen final" value={progression.note_examen} seuil={candidature.postes?.seuil_formation} />
          </div>
        </section>
      )}

      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-900 mb-4">Décision RH</h2>
        <p className="text-sm text-slate-500 mb-4">
          Validation RH actuelle : <span className="font-medium">{candidature.rh_validation ? 'Validé ✅' : 'Non validé'}</span>
        </p>
        <div className="flex gap-3">
          <form action={validerCandidature}>
            <button type="submit" className="bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-emerald-700">
              Valider le dossier
            </button>
          </form>
          <form action={rejeterCandidature}>
            <button type="submit" className="bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-2 text-sm font-medium hover:bg-red-100">
              Rejeter le dossier
            </button>
          </form>
        </div>
      </section>
    </div>
  )
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-slate-400 text-xs mb-0.5">{label}</p>
      <p className="text-slate-900">{value || '—'}</p>
    </div>
  )
}

function ScoreBlock({ label, value, seuil }: { label: string; value?: number | null; seuil?: number }) {
  const ok = seuil !== undefined && value !== null && value !== undefined ? value >= seuil : null
  return (
    <div className="border border-slate-100 rounded-lg p-3">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="text-2xl font-semibold">{value ?? '—'}</p>
      {seuil !== undefined && (
        <p className={`text-xs mt-1 ${ok ? 'text-emerald-600' : 'text-red-500'}`}>
          Seuil : {seuil} {ok === null ? '' : ok ? '✓ atteint' : '✗ non atteint'}
        </p>
      )}
    </div>
  )
}