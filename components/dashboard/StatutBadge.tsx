const labels: Record<string, string> = {
  en_attente: 'En attente',
  entretien: 'Entretien',
  formation: 'Formation',
  valide: 'Validé',
  rejete: 'Rejeté',
}

const colors: Record<string, string> = {
  en_attente: 'bg-amber-100 text-amber-700',
  entretien: 'bg-blue-100 text-blue-700',
  formation: 'bg-violet-100 text-violet-700',
  valide: 'bg-emerald-100 text-emerald-700',
  rejete: 'bg-red-100 text-red-700',
}

export function StatutBadge({ statut }: { statut: string }) {
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${colors[statut] || 'bg-slate-100 text-slate-700'}`}>
      {labels[statut] || statut}
    </span>
  )
}