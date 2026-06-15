'use client'

import dynamic from 'next/dynamic'
import { MapPin } from 'lucide-react'

const TerrainMap = dynamic(() => import('@/components/dashboard/TerrainMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-100 rounded-xl flex items-center justify-center">
      <div className="text-slate-400 text-sm flex items-center gap-2">
        <MapPin size={18} className="animate-pulse" /> Chargement de la carte...
      </div>
    </div>
  ),
})

type Position = {
  id: string
  candidature_id: string
  latitude: number
  longitude: number
  created_at: string
  nom?: string
}

type Signalement = {
  id: string
  candidature_id: string
  latitude: number
  longitude: number
  type: string
  description?: string | null
  traite: boolean
  created_at: string
  nom?: string
}

export default function TerrainMapWrapper({ positions, signalements }: { positions: Position[]; signalements: Signalement[] }) {
  return <TerrainMap positions={positions} signalements={signalements} />
}
