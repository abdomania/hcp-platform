import { createServerSupabase } from '@/lib/supabase-server'
import { StatutBadge } from '@/components/dashboard/StatutBadge'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function CandidatureDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabase()

  const { data: candidature } = await supabase
    .from('candidatures')
    .select('*, postes(id, titre, seuil_score_cv, seuil_note_globale, seuil_formation)')
    .eq('id', id)
    .single()

  if (!candidature) {
    return <div className="p-10 text-slate-500">Candidature introuvable.</div>
  }

  const [{ data: entretien }, { data: progression }] = await Promise.all([
    supabase.from('entretiens').select('*').eq('candidature_id', id).single(),
    supabase.from('progressions').select('*').eq('candidature_id', id).single(),
  ])

  async function validerCandidature() {
    'use server'
    const supabase = await createServerSupabase()
    await supabase.from('candidatures').update({ rh_validation: true, statut: 'valide' }).eq('id', id)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    fetch(`${baseUrl}/api/contrats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidature_id: id }),
    }).catch((e) => console.error('[valider] Contrat fetch error:', e))
    revalidatePath(`/rh/candidatures/${id}`)
    revalidatePath('/rh/candidatures')
    revalidatePath('/rh')
  }

  async function rejeterCandidature() {
    'use server'
    const supabase = await createServerSupabase()
    await supabase.from('candidatures').update({ rh_validation: false, statut: 'rejete' }).eq('id', id)
    revalidatePath(`/rh/candidatures/${id}`)
    revalidatePath('/rh/candidatures')
    revalidatePath('/rh')
  }

  const cvData = candidature.cv_data || {}
  const statut = candidature.statut
  const rhValidation = candidature.rh_validation === true
  const dejaRejeté = statut === 'rejete'
  const dejaValidéRH = statut === 'valide' && rhValidation
  const validéParIA = statut === 'valide' && !rhValidation
  const formationComplete = progression?.note_examen !== null && progression?.note_examen !== undefined
  const formationReussie = formationComplete && progression.note_examen >= (candidature.postes?.seuil_formation ?? 70)
  // RH peut valider si : validé par IA (formation réussie) ou formation complète et réussie
  const peutValider = validéParIA || (statut === 'formation' && formationReussie)

  // Étapes du pipeline
  const etapes = [
    { key: 'cv', label: 'CV reçu', done: true },
    { key: 'entretien', label: 'Entretien', done: !!entretien },
    { key: 'formation', label: 'Formation', done: formationComplete },
    { key: 'decision', label: 'Décision RH', done: dejaDecide },
    { key: 'contrat', label: 'Contrat', done: !!candidature.contrat_url },
  ]

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/rh/candidatures" className="hover:text-blue-600 transition-colors">Candidatures</Link>
        <span>/</span>
        <span className="text-slate-600 font-medium">{candidature.nom_complet}</span>
      </div>

      {/* HEADER */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{candidature.nom_complet}</h1>
          <p className="text-slate-500 text-sm mt-1">
            {candidature.postes?.titre || '—'} · {candidature.ville || '—'}
          </p>
        </div>
        <StatutBadge statut={statut} rhValidation={candidature.rh_validation} />
      </div>

      {/* PIPELINE */}
      {validéParIA && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-5 py-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-lg flex-shrink-0">🤖</div>
          <div>
            <p className="font-semibold text-orange-800 text-sm">Formation validée par l'IA — En attente de décision RH</p>
            <p className="text-orange-600 text-xs mt-0.5">Le candidat a réussi l'examen de formation. Vous pouvez maintenant valider son dossier et générer son contrat.</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 right-0 top-4 h-0.5 bg-slate-100 z-0 mx-8" />
          {etapes.map((e, i) => (
            <div key={e.key} className="flex flex-col items-center gap-2 z-10 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                e.done
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : i === etapes.findIndex(x => !x.done)
                  ? 'bg-white border-blue-500 text-blue-500'
                  : 'bg-white border-slate-200 text-slate-300'
              }`}>
                {e.done ? '✓' : i + 1}
              </div>
              <span className={`text-xs font-medium text-center ${e.done ? 'text-emerald-600' : 'text-slate-400'}`}>
                {e.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* INFOS GÉNÉRALES */}
      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-900 mb-4">Informations générales</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <Info label="Email" value={candidature.email} />
          <Info label="Téléphone" value={candidature.telephone} />
          <Info label="Ville" value={candidature.ville} />
          <Info label="Niveau d'études" value={candidature.niveau_etudes} />
          <Info label="Date de candidature" value={new Date(candidature.created_at).toLocaleDateString('fr-FR')} />
          <Info label="CV" value={
            candidature.cv_url
              ? <a href={candidature.cv_url} target="_blank" className="text-blue-600 hover:underline">Voir le CV ↗</a>
              : '—'
          } />
        </div>
      </section>

      {/* SCORES */}
      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-900 mb-4">Scores & Évaluation</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <ScoreBlock label="Score CV" value={candidature.score_cv} seuil={candidature.postes?.seuil_score_cv} />
          <ScoreBlock label="Note entretien" value={candidature.note_entretien} />
          <ScoreBlock label="Note globale" value={candidature.note_globale} seuil={candidature.postes?.seuil_note_globale} />
          <ScoreBlock label="Examen formation" value={progression?.note_examen} seuil={candidature.postes?.seuil_formation} />
        </div>
        {cvData.points_forts?.length > 0 && (
          <div>
            <p className="text-xs text-slate-400 mb-2">Points forts (analyse IA)</p>
            <div className="flex flex-wrap gap-2">
              {cvData.points_forts.map((p: string, i: number) => (
                <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">{p}</span>
              ))}
            </div>
          </div>
        )}
        {cvData.justification_score && (
          <p className="text-xs text-slate-400 mt-3 italic">{cvData.justification_score}</p>
        )}
      </section>

      {/* ENTRETIEN */}
      {entretien && (
        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 mb-4">Entretien IA — Détail des réponses</h2>
          <div className="space-y-3">
            {entretien.questions?.map((q: any, i: number) => (
              <div key={i} className="bg-slate-50 rounded-lg p-4">
                <p className="font-medium text-sm text-slate-800">{i + 1}. {q.question}</p>
                <p className="text-sm text-slate-600 mt-2">{entretien.reponses?.[i] || '—'}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${((entretien.scores?.[i] ?? 0) / 10) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-500">{entretien.scores?.[i] ?? '—'}/10</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* FORMATION */}
      {progression && (
        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 mb-4">Suivi Formation</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <Info label="Chapitres validés" value={`${progression.chapitres_valides?.length || 0} chapitre(s)`} />
            <Info label="Formation terminée" value={formationComplete ? 'Oui ✓' : 'En cours...'} />
            <ScoreBlock label="Note examen final" value={progression.note_examen} seuil={candidature.postes?.seuil_formation} />
          </div>
          {!formationComplete && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
              Le candidat n'a pas encore terminé son examen final de formation.
            </div>
          )}
          {formationComplete && !formationReussie && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              Le candidat n'a pas atteint le seuil requis ({candidature.postes?.seuil_formation ?? 70}/100) à l'examen de formation.
            </div>
          )}
        </section>
      )}

      {/* DÉCISION RH */}
      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-900 mb-4">Décision RH</h2>

        {/* Dossier validé par le RH */}
        {dejaValidéRH && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4">
              <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0">✓</div>
              <div>
                <p className="font-bold text-emerald-800">Dossier validé par le responsable RH</p>
                <p className="text-sm text-emerald-600 mt-0.5">Le candidat a été retenu pour ce poste.</p>
              </div>
            </div>
            {candidature.contrat_url ? (
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-5 py-4">
                <div>
                  <p className="font-semibold text-slate-800 text-sm">Contrat PDF généré et envoyé</p>
                  <p className="text-xs text-slate-400 mt-0.5">Le contrat a été envoyé par email au candidat ({candidature.email})</p>
                </div>
                <a
                  href={candidature.contrat_url}
                  target="_blank"
                  className="flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Télécharger le PDF ↗
                </a>
              </div>
            ) : (
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
                <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Génération du contrat PDF en cours...</p>
                  <p className="text-xs text-amber-600 mt-0.5">Le contrat sera envoyé automatiquement par email au candidat.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dossier rejeté */}
        {dejaRejeté && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-5 py-4">
            <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0">✗</div>
            <div>
              <p className="font-bold text-red-800">Dossier rejeté</p>
              <p className="text-sm text-red-600 mt-0.5">Ce candidat n'a pas été retenu pour ce poste.</p>
            </div>
          </div>
        )}

        {/* Décision en attente */}
        {!dejaValidéRH && !dejaRejeté && (
          <div className="space-y-4">
            {!peutValider && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-500">
                {statut === 'formation' && !formationComplete && 'En attente de la fin de la formation.'}
                {statut === 'formation' && formationComplete && !formationReussie && `Note insuffisante (${progression?.note_examen}/100 — seuil requis : ${candidature.postes?.seuil_formation ?? 70}).`}
                {statut !== 'formation' && statut !== 'valide' && `La validation est disponible après la formation (statut actuel : ${statut}).`}
              </div>
            )}

            <div className="flex gap-3 flex-wrap">
              <form action={validerCandidature}>
                <button
                  type="submit"
                  disabled={!peutValider}
                  className="bg-emerald-600 text-white rounded-xl px-6 py-3 text-sm font-bold hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  ✓ Valider et générer le contrat
                </button>
              </form>
              <form action={rejeterCandidature}>
                <button
                  type="submit"
                  className="bg-white text-red-600 border border-red-200 rounded-xl px-6 py-3 text-sm font-semibold hover:bg-red-50 transition-colors"
                >
                  ✗ Rejeter le dossier
                </button>
              </form>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-slate-400 text-xs mb-0.5">{label}</p>
      <p className="text-slate-900 text-sm">{value || '—'}</p>
    </div>
  )
}

function ScoreBlock({ label, value, seuil }: { label: string; value?: number | null; seuil?: number }) {
  const ok = seuil !== undefined && value !== null && value !== undefined ? value >= seuil : null
  return (
    <div className="border border-slate-100 rounded-xl p-4 bg-slate-50">
      <p className="text-xs text-slate-400 mb-2">{label}</p>
      <p className="text-3xl font-black text-slate-800">{value ?? '—'}</p>
      {seuil !== undefined && (
        <p className={`text-xs mt-1.5 font-medium ${ok === null ? 'text-slate-400' : ok ? 'text-emerald-600' : 'text-red-500'}`}>
          Seuil {seuil} {ok === null ? '' : ok ? '✓' : '✗'}
        </p>
      )}
    </div>
  )
}
