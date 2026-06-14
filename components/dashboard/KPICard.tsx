type KPICardProps = {
  label: string
  value: number | string
  color?: 'slate' | 'blue' | 'amber' | 'violet' | 'emerald' | 'red'
}

const colorMap: Record<string, string> = {
  slate: 'bg-slate-400',
  blue: 'bg-blue-500',
  amber: 'bg-amber-500',
  violet: 'bg-violet-500',
  emerald: 'bg-emerald-500',
  red: 'bg-red-500',
}

export function KPICard({ label, value, color = 'slate' }: KPICardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className={`w-10 h-1.5 rounded-full mb-3 ${colorMap[color]}`} />
      <p className="text-sm text-slate-500 mb-1">{label}</p>
      <p className="text-3xl font-semibold text-slate-900">{value}</p>
    </div>
  )
}