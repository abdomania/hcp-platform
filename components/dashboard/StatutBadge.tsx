type Props = {
  statut: string
  rhValidation?: boolean | null
}

export function StatutBadge({ statut, rhValidation }: Props) {
  // Distinguer "validé par IA" (formation réussie) de "validé RH" (décision finale)
  if (statut === 'valide' && !rhValidation) {
    return (
      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-100 text-orange-700">
        Validé par IA
      </span>
    )
  }
  if (statut === 'valide' && rhValidation) {
    return (
      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
        Validé RH ✓
      </span>
    )
  }

  const config: Record<string, { label: string; color: string }> = {
    en_attente: { label: 'En attente',  color: 'bg-amber-100 text-amber-700' },
    entretien:  { label: 'Entretien',   color: 'bg-blue-100 text-blue-700' },
    formation:  { label: 'Formation',   color: 'bg-violet-100 text-violet-700' },
    rejete:     { label: 'Rejeté',      color: 'bg-red-100 text-red-700' },
  }

  const cfg = config[statut] || { label: statut, color: 'bg-slate-100 text-slate-700' }
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}
