# Plateforme HCP — Documentation du Projet PFE (Partie 2)

> Suite de `HCP_Platform_Project.md`. Ce fichier couvre l'avancement depuis le module Candidature IA jusqu'au module Formation IA fonctionnel.
> **Stack** : Next.js 14 · Supabase · Vercel · Gemini API (2.5-flash) · Groq (secours) · Cloudflare Workers

---

## Table des matières

1. [Récapitulatif de l'état du projet](#1-récapitulatif-de-létat-du-projet)
2. [Problèmes rencontrés et solutions](#2-problèmes-rencontrés-et-solutions)
3. [Stratégie modèles IA : Gemini + Groq en fallback](#3-stratégie-modèles-ia--gemini--groq-en-fallback)
4. [Module Entretien IA — fonctionnel](#4-module-entretien-ia--fonctionnel)
5. [Module Formation IA — fonctionnel](#5-module-formation-ia--fonctionnel)
6. [Modifications base de données](#6-modifications-base-de-données)
7. [Storage Supabase — buckets configurés](#7-storage-supabase--buckets-configurés)
8. [Prompt AI Studio (alternative explorée)](#8-prompt-ai-studio-alternative-explorée)
9. [Code des fichiers clés (version à jour)](#9-code-des-fichiers-clés-version-à-jour)
10. [État d'avancement global](#10-état-davancement-global)
11. [Prochaines étapes](#11-prochaines-étapes)

---

## 1. Récapitulatif de l'état du projet

| Module | Statut | Détails |
|--------|--------|---------|
| Setup Next.js + Supabase + Vercel | ✅ Fonctionnel | Déployé, URL publique active |
| Landing page | ✅ Fonctionnel | Page d'accueil + navigation |
| Authentification (login) | ✅ Fonctionnel | Supabase Auth + rôles |
| Module Candidature (upload CV + analyse IA) | ✅ Fonctionnel | Blind screening + scoring |
| Module Entretien IA (texte + oral) | ✅ Fonctionnel | Voice AI via Groq Whisper |
| Module Formation IA (génération chapitres + quiz) | ✅ Fonctionnel | Generé avec `gemini-2.5-flash` |
| Module Suivi terrain GPS | ⏳ À faire | Prochaine étape |
| Back-office RH complet | ⏳ Partiel | Page upload formation créée |
| Génération contrat PDF | ⏳ À faire | — |
| i18n FR/AR + RTL | ⏳ À faire | — |
| Automatisations (cron jobs) | ⏳ À faire | — |

---

## 2. Problèmes rencontrés et solutions

### ❌ Erreur 404 — `gemini-1.5-flash is not found`
**Cause** : modèle déprécié côté Google.
**Solution** : passage à `gemini-2.0-flash`, puis ajustements successifs selon disponibilité.

---

### ❌ Erreur 429 — Quota Gemini dépassé (`free_tier_requests limit: 0`)
**Cause** : quota gratuit épuisé / projet Google Cloud sans accès au tier gratuit pour ce modèle.
**Solution temporaire** : bascule complète sur **Groq** (`llama-3.3-70b-versatile`) avec extraction de texte PDF manuelle (parsing des streams PDF en JS, sans librairie externe).

---

### ❌ Erreur `invalid input syntax for type uuid: "poste-test-001"`
**Cause** : `poste_id` codé en dur dans le formulaire avec une valeur non-UUID.
**Solution** :
1. Création d'une enquête + d'un poste réels via SQL Editor.
2. Remplacement de `poste_id: 'poste-test-001'` par le vrai UUID retourné par Supabase.

```sql
INSERT INTO public.enquetes (titre, description, statut)
VALUES ('Enquête Nationale Emploi 2025', '...', 'active');

INSERT INTO public.postes (titre, description, enquete_id, date_limite, statut)
VALUES ('Enquêteur Terrain — Casablanca-Settat', '...', 'VOTRE_ENQUETE_ID', '2025-12-31', 'ouvert');
```

---

### ❌ `new row violates row-level security policy for table "candidatures"`
**Cause** : RLS activé sans policy d'insertion publique cohérente.
**Solution** (développement) : désactivation temporaire de RLS sur toutes les tables métier, à réactiver proprement en fin de projet :

```sql
ALTER TABLE public.candidatures DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.postes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquetes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.formations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.progressions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.entretiens DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions_gps DISABLE ROW LEVEL SECURITY;
```

---

### ❌ Erreur lors de la génération de formation (Gemini)
**Cause** : modèle Gemini utilisé non adapté à la lecture + génération de contenu long depuis un PDF.
**Solution retenue par l'utilisateur** : passage au modèle **`gemini-2.5-flash`** spécifiquement pour le module formation (lecture PDF + génération de cours interactif). ✅ **Résultat : génération réussie.**

---

## 3. Stratégie modèles IA : Gemini + Groq en fallback

Pour le module **Candidature** et **Entretien**, la stratégie retenue est :

```
1. Tentative Gemini (gemini-3-flash-preview / modèle disponible côté compte utilisateur)
   ↓ (si erreur 404 / 429 / quota)
2. Bascule automatique sur Groq (llama-3.3-70b-versatile)
   ↓ (si Groq échoue aussi)
3. Fallback final : score basé sur règles déclaratives (niveau d'études)
```

Pour le module **Formation**, le modèle retenu est **`gemini-2.5-flash`**, qui supporte correctement :
- la lecture de documents PDF multimodaux (inlineData)
- la génération de longs contenus structurés (chapitres + quiz JSON)
- sans erreur de quota côté compte utilisateur

> 💡 Note pour le rapport PFE : cette stratégie multi-modèles (Gemini en principal, Groq en secours, sélection du modèle selon la tâche) peut être présentée comme un choix d'architecture résiliente — bon point à valoriser dans le chapitre "Réalisation".

---

## 4. Module Entretien IA — fonctionnel

### Fonctionnement validé
- 7 questions mixtes (texte + oral) couvrant : HCP, communication, patience, informatique/CAPI, organisation terrain
- Enregistrement audio via `MediaRecorder` (navigateur)
- Transcription via **Groq Whisper** (`whisper-large-v3`)
- Évaluation des réponses via Gemini (avec fallback Groq)
- Calcul automatique : `note_globale = (score_cv × 0.4) + (note_entretien × 0.6)`
- Mise à jour du statut candidature : `formation` si `note_globale >= 50`, sinon `rejete`

### Fichiers concernés
- `app/entretien/page.tsx` — interface interactive
- `app/api/entretiens/route.ts` — API évaluation (Gemini + Groq fallback)

✅ **Testé avec succès par l'utilisateur** — entretien complet passé, candidature passée au statut `formation`.

---

## 5. Module Formation IA — fonctionnel

### Fonctionnement validé
- Le responsable RH uploade un PDF (support de cours / manuel d'enquête) lié à un poste
- Upload vers le bucket Supabase Storage `formations`
- Appel API `/api/formations` (POST) avec `gemini-2.5-flash` :
  - Lecture du PDF en `inlineData` (base64)
  - Génération de 3 à 6 chapitres avec : titre, contenu (400-600 mots), résumé, points clés, quiz de 5 questions QCM
  - Génération d'un examen final de 20 questions (15 sur les chapitres + 5 sur le HCP général)
- Stockage en base dans `formations.chapitres` (JSONB) et `formations.examen_final` (JSONB)
- Liaison `postes.formation_id → formations.id`

### Côté candidat
- Page `app/(dashboard)/candidat/formation/page.tsx`
- Navigation par chapitre avec sidebar de progression
- Quiz obligatoire (5 questions) après chaque chapitre, avec feedback immédiat
- Déblocage de l'examen final une fois tous les chapitres validés
- Examen final → calcul note → si `>= 70` alors `candidatures.statut = 'valide'`

### Fichiers concernés
- `app/api/formations/route.ts` — génération IA (POST) + récupération (GET) — **modèle utilisé : `gemini-2.5-flash`**
- `app/api/formations/progression/route.ts` — suivi progression (POST) + soumission examen (PUT)
- `app/(dashboard)/candidat/formation/page.tsx` — interface complète
- `app/(dashboard)/rh/postes/formation/page.tsx` — upload support PDF par le RH

✅ **Testé avec succès par l'utilisateur** — formation générée avec `gemini-2.5-flash`.

---

## 6. Modifications base de données

Colonne ajoutée manuellement par l'utilisateur (absente du script SQL initial) :

```sql
-- Ajout de la colonne manquante sur postes
ALTER TABLE public.postes
ADD COLUMN formation_id uuid REFERENCES public.formations(id);
```

> ⚠️ À reporter dans le script SQL principal du rapport (Chapitre 3 — Modèle de données) pour que le script soit complet et exécutable d'un seul coup à la prochaine installation.

---

## 7. Storage Supabase — buckets configurés

| Bucket | Public | Policies | Usage |
|--------|--------|----------|-------|
| `cvs` | ✅ ON | insert + select publiques | CV des candidats (PDF) |
| `formations` | ✅ ON (ajouté manuellement) | insert + select publiques | Supports de cours PDF uploadés par le RH |

```sql
-- Bucket formations
create policy "allow_public_upload_formations"
on storage.objects for insert
with check (bucket_id = 'formations');

create policy "allow_public_read_formations"
on storage.objects for select
using (bucket_id = 'formations');
```

---

## 8. Prompt AI Studio (alternative explorée)

Un prompt complet a été généré (`PROMPT_AI_STUDIO_HCP.md`) pour tester la génération du projet via **Google AI Studio (Gemini 2.5 Pro)**.

### Résultat du test
- AI Studio a généré le projet en **Vite + React** au lieu de **Next.js**.
- **Décision** : ne pas poursuivre avec cette version — Vite + React ne permet pas d'API Routes sécurisées côté serveur, ce qui exposerait les clés API (Gemini/Groq) côté client.
- **Le projet Next.js actuel reste la base officielle du PFE.**

Le fichier `PROMPT_AI_STUDIO_HCP.md` reste disponible comme référence de cahier des charges détaillé (utile pour la rédaction du Chapitre 3 du rapport — spécifications fonctionnelles).

---

## 9. Code des fichiers clés (version à jour)

### `app/api/candidatures/route.ts` (stratégie Gemini → Groq → fallback règles)
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'
import Groq from 'groq-sdk'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })

async function extractTextFromPDF(pdfUrl: string): Promise<string> {
  try {
    const response = await fetch(pdfUrl)
    const buffer = await response.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    const decoder = new TextDecoder('latin1')
    const raw = decoder.decode(bytes)

    const textMatches = raw.match(/\(([^)]{2,})\)/g) || []
    let extracted = textMatches
      .map(m => m.slice(1, -1))
      .filter(t => /[a-zA-ZÀ-ÿ]{2,}/.test(t))
      .join(' ')
      .replace(/\\n/g, '\n')
      .replace(/\s+/g, ' ')
      .trim()

    if (extracted.length < 50) {
      const streamMatches = raw.match(/stream([\s\S]*?)endstream/g) || []
      extracted = streamMatches
        .map(s => s.replace(/stream|endstream/g, ''))
        .join(' ')
        .replace(/[^\x20-\x7E\xC0-\xFF]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 3000)
    }
    return extracted.length > 30 ? extracted.slice(0, 3000) : ''
  } catch {
    return ''
  }
}

// Modèle Gemini utilisé pour candidature/entretien : à adapter selon disponibilité
// (gemini-3-flash-preview ou équivalent disponible sur le compte)
async function analyserAvecGemini(cvBase64: string, nom: string, ville: string, niveau: string) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })
  const prompt = `Tu es un expert RH au Maroc. Analyse ce CV pour un poste d'enquêteur terrain au HCP.
Informations déclarées : Nom: ${nom}, Ville: ${ville}, Niveau: ${niveau}
Retourne UNIQUEMENT ce JSON :
{"competences":[],"experience_annees":0,"formation_principale":"","langues":[],"points_forts":[],"score_matching":65,"justification_score":""}`

  const result = await model.generateContent([
    { text: prompt },
    { inlineData: { mimeType: 'application/pdf', data: cvBase64 } }
  ])
  const rawText = result.response.text().trim()
  const jsonMatch = rawText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('JSON invalide Gemini')
  const cvData = JSON.parse(jsonMatch[0])
  const scoreCv = Math.min(100, Math.max(0, Number(cvData.score_matching) || 35))
  return { cvData, scoreCv }
}

async function analyserAvecGroq(cvTexte: string, nom: string, ville: string, niveau: string) {
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: 'Tu es expert RH HCP Maroc. Retourne UNIQUEMENT un JSON valide.' },
      { role: 'user', content: `Analyse ce candidat. Nom: ${nom}, Ville: ${ville}, Niveau: ${niveau}.
CV: """${cvTexte || 'Non lisible'}"""
Note de base : Licence/Master=60-70, Bac+2=50-60, Bac=40-50.
Retourne : {"competences":[],"experience_annees":0,"formation_principale":"${niveau}","langues":["Français","Arabe"],"points_forts":[],"score_matching":60,"justification_score":""}` }
    ],
    temperature: 0.3,
    max_tokens: 500,
  })
  const rawText = completion.choices[0]?.message?.content?.trim() || ''
  const jsonMatch = rawText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('JSON invalide Groq')
  const cvData = JSON.parse(jsonMatch[0])
  const scoreCv = Math.min(100, Math.max(0, Number(cvData.score_matching) || 35))
  return { cvData, scoreCv }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { nom_complet, email, telephone, ville, niveau_etudes, poste_id, cv_url } = body

    const cvResponse = await fetch(cv_url)
    const cvBuffer = await cvResponse.arrayBuffer()
    const cvBase64 = Buffer.from(cvBuffer).toString('base64')
    const cvTexte = await extractTextFromPDF(cv_url)

    let cvData: any = {}
    let scoreCv = 35
    let modelUtilise = 'gemini'

    try {
      const result = await analyserAvecGemini(cvBase64, nom_complet, ville, niveau_etudes)
      cvData = result.cvData; scoreCv = result.scoreCv
    } catch {
      try {
        const result = await analyserAvecGroq(cvTexte, nom_complet, ville, niveau_etudes)
        cvData = result.cvData; scoreCv = result.scoreCv; modelUtilise = 'groq'
      } catch {
        const niveauxScores: Record<string, number> = {
          'Doctorat': 75, 'Master (Bac+5)': 70, 'Licence (Bac+3)': 60,
          'Bac+2 (DUT/BTS)': 50, 'Baccalauréat': 40, 'Autre': 35
        }
        scoreCv = niveauxScores[niveau_etudes] || 35
        cvData = { competences: ['Communication','Terrain'], formation_principale: niveau_etudes,
          langues: ['Français','Arabe'], score_matching: scoreCv, justification_score: 'Score basé sur niveau déclaré' }
        modelUtilise = 'fallback'
      }
    }

    const nomAnonyme = `Candidat_${Date.now().toString().slice(-6)}`

    const { data: candidature, error } = await supabase
      .from('candidatures')
      .insert({
        poste_id, nom_complet, email, telephone, ville, niveau_etudes, cv_url,
        cv_data: { ...cvData, nom_anonyme: nomAnonyme, model_utilise: modelUtilise },
        score_cv: scoreCv,
        statut: scoreCv >= 40 ? 'entretien' : 'en_attente'
      })
      .select().single()

    if (error) throw new Error(error.message)

    return NextResponse.json({
      candidature_id: candidature.id,
      score_cv: scoreCv,
      statut: candidature.statut,
      model_utilise: modelUtilise
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
```

---

### `app/api/formations/route.ts` (modèle `gemini-2.5-flash` ✅ validé)
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(req: NextRequest) {
  try {
    const { poste_id, fichier_url } = await req.json()

    const fileResponse = await fetch(fichier_url)
    const fileBuffer = await fileResponse.arrayBuffer()
    const fileBase64 = Buffer.from(fileBuffer).toString('base64')

    // ✅ Modèle validé pour lecture PDF + génération longue
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const structureResult = await model.generateContent([
      {
        text: `Tu es un expert pédagogique. Génère une formation structurée pour des enquêteurs terrain du HCP Maroc à partir de ce document.
Retourne UNIQUEMENT ce JSON :
{
  "titre_formation": "...",
  "objectifs": ["..."],
  "chapitres": [
    {
      "id": 1, "titre": "...", "contenu": "400-600 mots", "resume": "2-3 phrases",
      "points_cles": ["..."],
      "quiz": [{"id":1,"question":"...","options":["A","B","C","D"],"bonne_reponse":0,"explication":"..."}]
    }
  ]
}
Règles : 3 à 6 chapitres, exactement 5 questions de quiz par chapitre, français, exemples terrain concrets.`
      },
      { inlineData: { mimeType: 'application/pdf', data: fileBase64 } }
    ])

    const structureMatch = structureResult.response.text().trim().match(/\{[\s\S]*\}/)
    if (!structureMatch) throw new Error('Structure JSON invalide')
    const formation = JSON.parse(structureMatch[0])

    const examResult = await model.generateContent(
      `Génère un examen final pour une formation HCP couvrant : ${formation.chapitres.map((c: any) => c.titre).join(', ')}.
Retourne UNIQUEMENT : {"questions":[{"id":1,"question":"...","options":["A","B","C","D"],"bonne_reponse":0,"explication":"...","chapitre_source":1}]}
20 questions : 15 sur les chapitres, 5 sur le HCP en général.`
    )

    const examMatch = examResult.response.text().trim().match(/\{[\s\S]*\}/)
    if (!examMatch) throw new Error('Examen JSON invalide')
    const examen = JSON.parse(examMatch[0])

    const { data: formationCreee, error } = await supabase
      .from('formations')
      .insert({
        poste_id,
        chapitres: formation.chapitres,
        examen_final: examen.questions,
        nb_chapitres: formation.chapitres.length
      })
      .select().single()

    if (error) throw new Error(error.message)

    await supabase.from('postes').update({ formation_id: formationCreee.id }).eq('id', poste_id)

    return NextResponse.json({
      formation_id: formationCreee.id,
      nb_chapitres: formation.chapitres.length,
      titre: formation.titre_formation
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const candidature_id = searchParams.get('candidature_id')
  if (!candidature_id) return NextResponse.json({ error: 'candidature_id requis' }, { status: 400 })

  const { data: candidature } = await supabase
    .from('candidatures').select('poste_id').eq('id', candidature_id).single()
  if (!candidature) return NextResponse.json({ error: 'Candidature introuvable' }, { status: 404 })

  const { data: poste } = await supabase
    .from('postes').select('formation_id, titre').eq('id', candidature.poste_id).single()
  if (!poste?.formation_id) return NextResponse.json({ error: 'Aucune formation disponible' }, { status: 404 })

  const { data: formation } = await supabase
    .from('formations').select('*').eq('id', poste.formation_id).single()

  const { data: progression } = await supabase
    .from('progressions').select('*').eq('candidature_id', candidature_id).single()

  return NextResponse.json({ formation, progression, poste_titre: poste.titre })
}
```

---

## 10. État d'avancement global

### Rapport PFE (Word)
| Fichier | Contenu | Pages | Statut |
|---------|---------|-------|--------|
| `Rapport_PFE_HCP_Premieres_Pages.docx` | Garde, Remerciements, Résumé, Abstract, TDM, Abréviations, Intro, Chap 1 | ~10 | ✅ |
| `Rapport_PFE_HCP_Chapitre2.docx` | État de l'art | ~10 | ✅ |
| `Rapport_PFE_HCP_Chapitre3.docx` | Conception (architecture, UML, BDD, wireframes, sécurité) | ~14 | ✅ |
| Chapitre 4 | Réalisation (captures + code réel) | ~20 | ⏳ Prochaine étape (matière prête : candidature, entretien, formation fonctionnels) |
| Chapitre 5 | Tests + déploiement | ~6 | ⏳ |
| Conclusion | Bilan + perspectives | ~4 | ⏳ |

**Total rapport : ~34 / 60 pages**

### Code (Next.js)
- ✅ Setup + déploiement Vercel
- ✅ Landing page + Login
- ✅ Module Candidature (upload CV, blind screening, scoring Gemini/Groq)
- ✅ Module Entretien (texte + oral, Whisper, scoring)
- ✅ Module Formation (génération IA gemini-2.5-flash, quiz, examen final)
- ⏳ Module Suivi terrain GPS
- ⏳ Back-office RH (dashboard, liste candidatures, validation)
- ⏳ Génération contrat PDF
- ⏳ Emails transactionnels (Resend)
- ⏳ i18n FR/AR + RTL
- ⏳ Cron jobs (Cloudflare Workers)
- ⏳ Réactivation propre des policies RLS

---

## 11. Prochaines étapes

1. **Back-office RH** : dashboard avec KPIs (total candidatures, en attente, en entretien, en formation, validés), liste filtrable, page de détail candidature, validation manuelle.
2. **Génération de contrat PDF** : à partir d'un template, déclenchée quand `candidatures.statut = 'valide'` et validé par le RH.
3. **Emails transactionnels (Resend)** : envoi des credentials après entretien réussi, envoi du contrat après validation RH.
4. **Module Suivi terrain GPS** : carte Leaflet + Supabase Realtime + calcul des KPIs terrain.
5. **i18n FR/AR + RTL**.
6. **Cron jobs Cloudflare Workers** : relance candidats inactifs en formation.
7. **Réactivation des policies RLS** proprement, une fois tous les flux validés.
8. **Rédaction Chapitre 4 du rapport** : dès qu'un module est fonctionnel, capture d'écran + extrait de code + explication.

---

*Document généré automatiquement — Suite de la documentation du projet PFE HCP Platform*
