import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { genererContratPDF } from '@/lib/contrat-pdf'
import { envoyerEmailContrat } from '@/lib/email'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { candidature_id } = await req.json()
    if (!candidature_id) {
      return NextResponse.json({ error: 'candidature_id requis' }, { status: 400 })
    }

    // 1. Récupérer les données de la candidature + poste
    const { data: candidature, error: errCandidature } = await supabase
      .from('candidatures')
      .select('*, postes(id, titre)')
      .eq('id', candidature_id)
      .single()

    if (errCandidature || !candidature) {
      return NextResponse.json({ error: 'Candidature introuvable' }, { status: 404 })
    }

    // 2. Préparer les données du contrat
    // On découpe nom_complet en prénom / nom (premier mot = prénom)
    const parts = (candidature.nom_complet || '').trim().split(/\s+/)
    const prenom = parts[0] || candidature.nom_complet
    const nom = parts.slice(1).join(' ') || ''

    const dateGeneration = new Date().toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric',
    })

    const contratData = {
      prenom,
      nom,
      email: candidature.email,
      telephone: candidature.telephone || undefined,
      adresse: candidature.ville || 'Maroc',
      cin: undefined,
      cnss: undefined,
      poste_titre: candidature.postes?.titre || 'Enquêteur terrain HCP',
      date_generation: dateGeneration,
    }

    // 3. Générer le PDF
    const pdfBuffer = await genererContratPDF(contratData)

    // 4. Uploader vers Supabase Storage (bucket 'contrats')
    const fileName = `contrat_${candidature_id}_${Date.now()}.pdf`
    const { error: uploadError } = await supabase.storage
      .from('contrats')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      })

    if (uploadError) {
      // On continue même si le bucket n'existe pas encore — on log et on envoie quand même l'email
      console.error('[contrats] Upload Storage échoué :', uploadError.message)
    }

    // 5. Récupérer l'URL publique
    const { data: urlData } = supabase.storage.from('contrats').getPublicUrl(fileName)
    const contratUrl = urlData?.publicUrl || ''

    // 6. Mettre à jour candidatures.contrat_url
    if (contratUrl) {
      await supabase
        .from('candidatures')
        .update({ contrat_url: contratUrl })
        .eq('id', candidature_id)
    }

    // 7. Envoyer l'email avec le PDF en pièce jointe
    try {
      await envoyerEmailContrat({
        to: candidature.email,
        nomComplet: candidature.nom_complet,
        poste: candidature.postes?.titre || 'Enquêteur terrain HCP',
        contratUrl,
        contratPdfBuffer: pdfBuffer,
      })
    } catch (emailErr: any) {
      // L'email peut échouer (quota Resend) sans bloquer la réponse
      console.error('[contrats] Email échoué :', emailErr.message)
      return NextResponse.json({
        success: true,
        contrat_url: contratUrl,
        warning: `PDF généré mais email non envoyé : ${emailErr.message}`,
      })
    }

    return NextResponse.json({
      success: true,
      contrat_url: contratUrl,
      message: `Contrat généré et envoyé à ${candidature.email}`,
    })
  } catch (err: any) {
    console.error('[contrats] Erreur générale :', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
