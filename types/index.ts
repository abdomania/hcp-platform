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

export type Formation = {
  id: string
  poste_id: string
  chapitres: Chapitre[]
  examen_final: Question[]
  nb_chapitres: number
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

export type PositionGPS = {
  id: string
  user_id: string
  latitude: number
  longitude: number
  precision_metres?: number
  created_at: string
}