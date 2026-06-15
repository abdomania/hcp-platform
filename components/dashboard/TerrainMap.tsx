'use client'

import { useEffect, useRef } from 'react'

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
  latitude: number
  longitude: number
  type: string
  description?: string | null
  traite: boolean
  created_at: string
  nom?: string
}

type Props = {
  positions: Position[]
  signalements: Signalement[]
}

const TYPE_COLORS: Record<string, string> = {
  refus: '#ef4444',
  absent: '#f97316',
  adresse_incorrecte: '#8b5cf6',
  probleme_technique: '#3b82f6',
  autre: '#64748b',
}

const TYPE_LABELS: Record<string, string> = {
  refus: 'Refus',
  absent: 'Absent',
  adresse_incorrecte: 'Adresse incorrecte',
  probleme_technique: 'Problème technique',
  autre: 'Autre',
}

export default function TerrainMap({ positions, signalements }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)

  useEffect(() => {
    if (!mapRef.current) return

    import('leaflet').then(L => {
      // Si le container est déjà initialisé par Leaflet, le nettoyer
      if ((mapRef.current as any)._leaflet_id) {
        mapInstance.current?.remove()
        mapInstance.current = null
      }
      if (mapInstance.current) return

      // Fix marker icons (Next.js issue)
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      // Centre Maroc par défaut
      const map = L.map(mapRef.current!).setView([31.7917, -7.0926], 6)
      mapInstance.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map)

      // Icône enquêteur (bleu)
      const enqueteurIcon = L.divIcon({
        html: `<div style="width:32px;height:32px;background:#2563eb;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>
        </div>`,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -20],
      })

      // Markers enquêteurs
      positions.forEach(pos => {
        if (!pos.latitude || !pos.longitude) return
        const timeAgo = new Date(pos.created_at)
        const minutesAgo = Math.round((Date.now() - timeAgo.getTime()) / 60000)
        L.marker([pos.latitude, pos.longitude], { icon: enqueteurIcon })
          .bindPopup(`
            <div style="font-family:sans-serif;min-width:160px">
              <p style="font-weight:700;margin:0 0 4px">${pos.nom || 'Enquêteur'}</p>
              <p style="color:#64748b;font-size:12px;margin:0">Il y a ${minutesAgo < 1 ? '<1' : minutesAgo} min</p>
              <p style="color:#64748b;font-size:11px;margin:4px 0 0">${pos.latitude.toFixed(5)}, ${pos.longitude.toFixed(5)}</p>
            </div>
          `)
          .addTo(map)
      })

      // Markers signalements
      signalements.forEach(sig => {
        if (!sig.latitude || !sig.longitude) return
        const color = TYPE_COLORS[sig.type] || '#64748b'
        const icon = L.divIcon({
          html: `<div style="width:26px;height:26px;background:${color};border:2px solid white;border-radius:4px;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
          </div>`,
          className: '',
          iconSize: [26, 26],
          iconAnchor: [13, 13],
          popupAnchor: [0, -16],
        })
        L.marker([sig.latitude, sig.longitude], { icon })
          .bindPopup(`
            <div style="font-family:sans-serif;min-width:160px">
              <p style="font-weight:700;margin:0 0 4px;color:${color}">${TYPE_LABELS[sig.type] || sig.type}</p>
              <p style="color:#1e293b;font-size:12px;margin:0">${sig.nom || 'Enquêteur'}</p>
              ${sig.description ? `<p style="color:#64748b;font-size:11px;margin:4px 0 0">${sig.description}</p>` : ''}
              <span style="display:inline-block;margin-top:6px;padding:2px 8px;border-radius:999px;font-size:10px;background:${sig.traite ? '#dcfce7' : '#fef3c7'};color:${sig.traite ? '#16a34a' : '#92400e'}">${sig.traite ? 'Traité' : 'En attente'}</span>
            </div>
          `)
          .addTo(map)
      })

      // Ajuster la vue si des données existent
      const allPoints = [
        ...positions.filter(p => p.latitude && p.longitude).map(p => [p.latitude, p.longitude] as [number, number]),
        ...signalements.filter(s => s.latitude && s.longitude).map(s => [s.latitude, s.longitude] as [number, number]),
      ]
      if (allPoints.length > 0) {
        map.fitBounds(allPoints, { padding: [40, 40], maxZoom: 13 })
      }
    })

    return () => {
      mapInstance.current?.remove()
      mapInstance.current = null
    }
  }, [])

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div ref={mapRef} className="w-full h-full" />
      {/* Légende */}
      <div className="absolute bottom-4 left-4 bg-white rounded-xl shadow-lg border border-slate-200 p-3 z-[1000] text-xs space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-blue-600 border-2 border-white shadow-sm flex-shrink-0" />
          <span className="text-slate-600 font-medium">Enquêteur actif</span>
        </div>
        {Object.entries(TYPE_LABELS).slice(0, 3).map(([k, v]) => (
          <div key={k} className="flex items-center gap-2">
            <div className="w-4 h-4 rounded flex-shrink-0" style={{ background: TYPE_COLORS[k] }} />
            <span className="text-slate-500">{v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
