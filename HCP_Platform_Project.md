# Plateforme HCP — Documentation du Projet PFE

> **Projet** : Conception et Réalisation d'une Plateforme Intelligente de Gestion des Candidatures des Enquêteurs Intérimaires — Application au Haut-Commissariat au Plan (HCP)
> **Stack** : Next.js 14 · Supabase · Vercel · Gemini API · Groq · Cloudflare Workers
> **Type** : SaaS MVP · Projet de Fin d'Études (PFE)

---

## Table des matières

1. [Description du projet](#1-description-du-projet)
2. [Fonctionnalités prévues](#2-fonctionnalités-prévues)
3. [Stack technique](#3-stack-technique)
4. [Architecture du projet](#4-architecture-du-projet)
5. [Modèle de données (SQL)](#5-modèle-de-données-sql)
6. [Structure des fichiers](#6-structure-des-fichiers)
7. [Installation et setup](#7-installation-et-setup)
8. [Variables d'environnement](#8-variables-denvironnement)
9. [Code — Fichiers créés](#9-code--fichiers-créés)
10. [Rapport PFE — Avancement](#10-rapport-pfe--avancement)
11. [Roadmap par sprint](#11-roadmap-par-sprint)
12. [Erreurs connues et solutions](#12-erreurs-connues-et-solutions)

---

## 1. Description du projet

Le HCP (Haut-Commissariat au Plan) lance régulièrement des enquêtes statistiques nationales (recensements, enquêtes ménages, emploi…). Pour chaque opération, il recrute des enquêteurs intérimaires en nombre variable. Ce processus est aujourd'hui manuel (emails, Excel) et souffre de lenteur, de manque d'objectivité et d'absence de formation structurée.

Ce projet propose une **plateforme SaaS intelligente** qui automatise l'ensemble du cycle :

```
Candidature → Analyse IA → Entretien → Formation → Validation → Contrat → Terrain
```

---

## 2. Fonctionnalités prévues

### Module 1 — Candidature IA
- Dépôt de CV sans création de compte
- Analyse du CV par Gemini API (extraction, matching, scoring)
- **Blind screening** : anonymisation automatique du profil
- Score de matching CV/poste (0–100)
- Entretien interactif généré par IA :
  - Questions sur HCP, communication ménage, patience, outils CAPI
  - Réponses texte + réponses **orales** (Voice AI via Groq Whisper)
- Calcul de la note globale = `(score_cv × 0.4) + (note_entretien × 0.6)`
- Si note ≥ 50 → création de compte automatique + envoi credentials par email

### Module 2 — Formation IA
- Upload support PDF/DOCX par le responsable RH
- Génération automatique par Gemini : chapitres + résumés + quiz (≥5 questions/chapitre)
- Suivi de progression chapitre par chapitre
- Examen final couvrant tout le support + questions générales HCP
- Si note examen ≥ 70 → dossier transmis au RH pour validation
- Génération automatique du contrat PDF (selon template fourni)
- Envoi du contrat par email

### Module 3 — Suivi terrain
- Carte GPS temps réel des enquêteurs (Leaflet + Supabase Realtime)
- KPIs calculés automatiquement :
  - Taux de complétion des questionnaires
  - Taux de refus
  - Durée moyenne de passation
  - Taux d'erreurs de saisie
  - Signalements terrain
- Dashboard superviseur avec alertes automatiques
- Export CSV des données

### Fonctionnalités transverses
- Authentification + 4 rôles : `candidat | rh | superviseur | admin`
- Cron jobs (Cloudflare Workers) : relance candidats inactifs, rapports auto
- Emails transactionnels (Resend)
- Internationalisation **FR / العربية** avec support RTL
- Export CSV back-office
- Génération automatique de contrat PDF

---

## 3. Stack technique

| Couche | Technologie | Hébergement | Free tier |
|--------|------------|-------------|-----------|
| Frontend + API | Next.js 14 (App Router) | Vercel | ✅ Hobby plan |
| Base de données | PostgreSQL | Supabase | ✅ 500 MB |
| Auth + Storage | Supabase Auth + Storage | Supabase | ✅ inclus |
| LLM principal | Gemini 1.5 Flash | Google Cloud | ✅ limité |
| Transcription vocale + LLM rapide | Groq + Whisper | Groq Cloud | ✅ rate limited |
| Cron jobs / Webhooks | Cloudflare Workers | Cloudflare | ✅ 100k req/jour |
| Emails transactionnels | Resend | Resend | ✅ 3000/mois |
| Cartographie | Leaflet + OpenStreetMap | CDN | ✅ gratuit |

---

## 4. Architecture du projet

```
┌─────────────────────────────────────────────────────────┐
│                     NAVIGATEUR                          │
│              Next.js 14 (React / Tailwind)              │
└─────────────────┬───────────────────────────────────────┘
                  │ HTTP / HTTPS
┌─────────────────▼───────────────────────────────────────┐
│              API ROUTES (Vercel Serverless)              │
│   /api/candidatures  /api/formations  /api/entretiens   │
│   /api/positions     /api/contrats    /api/auth         │
└──────┬──────────────────────┬──────────────────────┬────┘
       │                      │                      │
┌──────▼──────┐    ┌──────────▼────────┐   ┌────────▼────┐
│  Supabase   │    │   Gemini API      │   │  Groq API   │
│ PostgreSQL  │    │ Analyse CV        │   │ Whisper STT │
│ Auth / RLS  │    │ Génération cours  │   │ LLM rapide  │
│ Storage     │    │ Questions quiz    │   └─────────────┘
│ Realtime    │    └───────────────────┘
└─────────────┘
       │
┌──────▼──────────────────────────────────────────────────┐
│           Cloudflare Workers (Cron + Webhooks)          │
│   Relance inactifs · Rapports · Nettoyage               │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Modèle de données (SQL)

Script complet à exécuter dans **Supabase → SQL Editor** :

```sql
-- Extension UUID
create extension if not exists "uuid-ossp";

-- Profils utilisateurs
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  role text not null check (role in ('candidat','rh','superviseur','admin')),
  nom varchar(100),
  prenom varchar(100),
  telephone varchar(20),
  actif boolean default true,
  created_at timestamp default now()
);

-- Enquêtes statistiques
create table public.enquetes (
  id uuid default uuid_generate_v4() primary key,
  titre varchar(200) not null,
  description text,
  date_debut date,
  date_fin date,
  statut text default 'planifiee' check (statut in ('planifiee','active','terminee')),
  created_at timestamp default now()
);

-- Postes à pourvoir
create table public.postes (
  id uuid default uuid_generate_v4() primary key,
  titre varchar(200) not null,
  description text not null,
  enquete_id uuid references public.enquetes,
  rh_id uuid references public.profiles,
  fichier_formation_url text,
  seuil_score_cv integer default 40,
  seuil_note_globale integer default 50,
  seuil_formation integer default 70,
  date_limite date not null,
  statut text default 'ouvert' check (statut in ('ouvert','cloture','archive')),
  created_at timestamp default now()
);

-- Candidatures
create table public.candidatures (
  id uuid default uuid_generate_v4() primary key,
  poste_id uuid references public.postes not null,
  user_id uuid references public.profiles,
  nom_complet varchar(200) not null,
  email varchar(255) not null,
  telephone varchar(20),
  ville varchar(100),
  niveau_etudes varchar(100),
  cv_url text not null,
  cv_data jsonb,
  score_cv integer,
  note_entretien decimal(5,2),
  note_globale decimal(5,2),
  statut text default 'en_attente'
    check (statut in ('en_attente','entretien','formation','valide','rejete')),
  rh_validation boolean default false,
  contrat_url text,
  created_at timestamp default now()
);

-- Formations générées par IA
create table public.formations (
  id uuid default uuid_generate_v4() primary key,
  poste_id uuid references public.postes,
  chapitres jsonb,
  examen_final jsonb,
  nb_chapitres integer default 0,
  created_at timestamp default now()
);

-- Progression des candidats en formation
create table public.progressions (
  id uuid default uuid_generate_v4() primary key,
  candidature_id uuid references public.candidatures,
  formation_id uuid references public.formations,
  chapitres_valides integer[] default '{}',
  scores_quiz jsonb default '{}',
  note_examen decimal(5,2),
  complete boolean default false,
  updated_at timestamp default now()
);

-- Entretiens IA
create table public.entretiens (
  id uuid default uuid_generate_v4() primary key,
  candidature_id uuid references public.candidatures,
  questions jsonb,
  reponses jsonb,
  scores jsonb,
  note_finale decimal(5,2),
  created_at timestamp default now()
);

-- Positions GPS terrain
create table public.positions_gps (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles,
  latitude decimal(10,8) not null,
  longitude decimal(11,8) not null,
  precision_metres integer,
  created_at timestamp default now()
);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.candidatures enable row level security;
alter table public.progressions enable row level security;

create policy "users_own_profile" on public.profiles
  for all using (auth.uid() = id);

create policy "candidat_own_candidatures" on public.candidatures
  for select using (auth.uid() = user_id);

create policy "rh_all_candidatures" on public.candidatures
  for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'rh'
    )
  );

-- Storage : bucket cvs
-- À créer dans Supabase → Storage → New bucket → nom: cvs → Public: ON

-- Policies Storage
create policy "allow_public_upload_cvs"
on storage.objects for insert
with check (bucket_id = 'cvs');

create policy "allow_public_read_cvs"
on storage.objects for select
using (bucket_id = 'cvs');
```

---

## 6. Structure des fichiers

```
hcp-platform/
├── app/
│   ├── page.tsx                          # Landing page
│   ├── layout.tsx                        # Layout racine
│   ├── (auth)/
│   │   ├── login/page.tsx                # Page connexion
│   │   └── register/page.tsx             # Page inscription
│   ├── (dashboard)/
│   │   ├── rh/                           # Back-office RH
│   │   ├── candidat/                     # Espace candidat
│   │   ├── superviseur/                  # Suivi terrain
│   │   └── admin/                        # Administration
│   ├── candidature/
│   │   ├── page.tsx                      # Formulaire candidature
│   │   └── resultat/page.tsx             # Page résultat analyse
│   └── api/
│       ├── candidatures/route.ts         # POST analyse CV + IA
│       ├── formations/route.ts           # POST génération formation
│       ├── entretiens/route.ts           # POST entretien IA
│       └── positions/route.ts            # POST/GET GPS
├── components/
│   ├── ui/                               # Composants réutilisables
│   ├── forms/                            # Formulaires
│   └── dashboard/                        # Widgets dashboard
├── lib/
│   ├── supabase.ts                       # Client Supabase (browser)
│   └── supabase-server.ts                # Client Supabase (server)
├── types/
│   └── index.ts                          # Types TypeScript
├── .env.local                            # Variables d'environnement
└── package.json
```

---

## 7. Installation et setup

### Prérequis
- Node.js LTS ([nodejs.org](https://nodejs.org))
- Compte GitHub
- Compte Supabase ([supabase.com](https://supabase.com))
- Compte Vercel ([vercel.com](https://vercel.com))
- Clé Gemini API ([aistudio.google.com](https://aistudio.google.com))
- Clé Groq API ([console.groq.com](https://console.groq.com))

### Étapes

```bash
# 1. Créer le projet
npx create-next-app@latest hcp-platform
cd hcp-platform

# 2. Installer les dépendances
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
npm install @google/generative-ai
npm install groq-sdk
npm install react-hook-form zod @hookform/resolvers
npm install lucide-react
npm install resend

# 3. Créer les dossiers
mkdir -p app/(auth)/login app/(auth)/register
mkdir -p app/(dashboard)/rh app/(dashboard)/candidat
mkdir -p app/(dashboard)/superviseur app/(dashboard)/admin
mkdir -p app/api/candidatures app/api/formations
mkdir -p app/api/entretiens app/api/positions
mkdir -p app/candidature/resultat
mkdir -p components/ui components/forms components/dashboard
mkdir -p lib types

# 4. Démarrer en local
npm run dev

# 5. Déployer
git init && git add . && git commit -m "initial setup"
git remote add origin https://github.com/VOTRE_USERNAME/hcp-platform.git
git push -u origin main
# Puis importer le repo sur vercel.com
```

---

## 8. Variables d'environnement

Fichier `.env.local` à créer à la racine du projet :

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://VOTRE_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_anon_key

# LLM
GEMINI_API_KEY=votre_cle_gemini
GROQ_API_KEY=votre_cle_groq

# Email
RESEND_API_KEY=votre_cle_resend
```

> ⚠️ Ne jamais committer `.env.local` sur GitHub. Il est déjà dans `.gitignore` par défaut avec Next.js.
> Ajouter les mêmes variables dans **Vercel → Project → Settings → Environment Variables**.

---

## 9. Code — Fichiers créés

### `lib/supabase.ts`
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### `lib/supabase-server.ts`
```typescript
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export const createServerSupabase = () =>
  createServerComponentClient({ cookies })
```

### `types/index.ts`
```typescript
export type Role = 'candidat' | 'rh' | 'superviseur' | 'admin'

export type Profile = {
  id: string
  role: Role
  nom: string
  prenom: string
  telephone?: string
  actif: boolean
  created_at: string
}

export type Poste = {
  id: string
  titre: string
  description: string
  enquete_id?: string
  rh_id: string
  fichier_formation_url?: string
  seuil_score_cv: number
  seuil_note_globale: number
  seuil_formation: number
  date_limite: string
  statut: 'ouvert' | 'cloture' | 'archive'
  created_at: string
}

export type Candidature = {
  id: string
  poste_id: string
  user_id?: string
  nom_complet: string
  email: string
  telephone?: string
  ville?: string
  niveau_etudes?: string
  cv_url: string
  cv_data?: any
  score_cv?: number
  note_entretien?: number
  note_globale?: number
  statut: 'en_attente' | 'entretien' | 'formation' | 'valide' | 'rejete'
  rh_validation: boolean
  contrat_url?: string
  created_at: string
}

export type Chapitre = {
  id: number
  titre: string
  contenu: string
  resume: string
  quiz: Question[]
}

export type Question = {
  id: number
  question: string
  options: string[]
  bonne_reponse: number
  explication: string
}
```

### `app/api/candidatures/route.ts`
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
    const body = await req.json()
    const { nom_complet, email, telephone, ville, niveau_etudes, poste_id, cv_url } = body

    // Télécharger et encoder le CV
    const cvResponse = await fetch(cv_url)
    const cvBuffer = await cvResponse.arrayBuffer()
    const cvBase64 = Buffer.from(cvBuffer).toString('base64')

    // Analyse Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    const result = await model.generateContent([
      `Analyse ce CV pour un poste d'enquêteur terrain HCP Maroc.
       Retourne UNIQUEMENT ce JSON :
       {
         "competences": [],
         "experience_annees": 0,
         "formation_principale": "",
         "langues": [],
         "points_forts": [],
         "score_matching": 65,
         "justification_score": ""
       }`,
      { inlineData: { mimeType: 'application/pdf', data: cvBase64 } }
    ])

    const rawText = result.response.text().trim()
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    let cvData: any = {}
    let scoreCv = 30
    if (jsonMatch) {
      cvData = JSON.parse(jsonMatch[0])
      scoreCv = Math.min(100, Math.max(0, cvData.score_matching || 30))
    }

    // Enregistrement en base
    const { data: candidature, error } = await supabase
      .from('candidatures')
      .insert({
        poste_id,
        nom_complet,
        email, telephone, ville, niveau_etudes,
        cv_url,
        cv_data: { ...cvData, nom_anonyme: `Candidat_${Date.now().toString().slice(-6)}` },
        score_cv: scoreCv,
        statut: scoreCv >= 40 ? 'entretien' : 'en_attente'
      })
      .select().single()

    if (error) throw new Error(error.message)

    return NextResponse.json({
      candidature_id: candidature.id,
      score_cv: scoreCv,
      statut: candidature.statut
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
```

---

## 10. Rapport PFE — Avancement

| Fichier Word généré | Contenu | Pages estimées | Statut |
|---------------------|---------|----------------|--------|
| `Rapport_PFE_HCP_Premieres_Pages.docx` | Page de garde, Remerciements, Résumé, Abstract, TDM, Abréviations, Introduction, Chapitre 1 | ~10 pages | ✅ Terminé |
| `Rapport_PFE_HCP_Chapitre2.docx` | État de l'art (ATS, IA recrutement, LMS, GPS, Stack) | ~10 pages | ✅ Terminé |
| `Rapport_PFE_HCP_Chapitre3.docx` | Conception (Architecture, UML, BDD, Wireframes, Sécurité) | ~14 pages | ✅ Terminé |
| Chapitre 4 | Réalisation (captures + code) | ~20 pages | 🔄 En cours |
| Chapitre 5 | Tests + Déploiement | ~6 pages | ⏳ À faire |
| Conclusion | Bilan + Perspectives | ~4 pages | ⏳ À faire |

**Total actuel : ~34 pages / 60 pages**

---

## 11. Roadmap par sprint

| Semaines | Rapport | Code |
|----------|---------|------|
| 1–2 | Intro + Chap 1 + Chap 2 ✅ | Setup Next.js + Supabase + Vercel ✅ |
| 3–4 | Conception Chap 3 ✅ | Module candidature (upload CV + IA) ✅ |
| 5–6 | Chap 4 partie 1 | Entretien IA + Voice + scoring |
| 7–8 | Chap 4 partie 2 | Module formation IA + quiz |
| 9–10 | Chap 4 partie 3 | GPS + KPIs + back-office RH |
| 11 | Chap 5 | Automatisations + contrat PDF + i18n |
| 12 | Conclusion + relecture | Corrections et polish |

---

## 12. Erreurs connues et solutions

### ❌ `'npx' n'est pas reconnu`
**Cause** : Node.js non installé.
**Solution** : Télécharger et installer Node.js LTS depuis [nodejs.org](https://nodejs.org), puis rouvrir le terminal.

---

### ❌ `Erreur upload CV : new row violates row-level security policy`
**Cause** : Le bucket Supabase Storage `cvs` n'a pas de politique d'accès public.
**Solution** : Exécuter dans Supabase → SQL Editor :
```sql
create policy "allow_public_upload_cvs"
on storage.objects for insert
with check (bucket_id = 'cvs');

create policy "allow_public_read_cvs"
on storage.objects for select
using (bucket_id = 'cvs');
```
Et vérifier que le bucket est bien en mode **Public** dans Storage → cvs → Edit bucket.

---

## Liens utiles

| Ressource | URL |
|-----------|-----|
| Supabase Dashboard | https://supabase.com/dashboard |
| Vercel Dashboard | https://vercel.com/dashboard |
| Gemini API Console | https://aistudio.google.com |
| Groq Console | https://console.groq.com |
| Resend Dashboard | https://resend.com |
| Cloudflare Workers | https://dash.cloudflare.com |
| Documentation Next.js | https://nextjs.org/docs |
| Documentation Supabase | https://supabase.com/docs |

---

*Document généré automatiquement — Projet PFE HCP Platform*
