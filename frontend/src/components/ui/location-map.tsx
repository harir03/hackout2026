import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface LocationMapProps {
  onLocationSelect: (name: string, lat: number, lng: number) => void
}

export function LocationMap({ onLocationSelect }: LocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    const map = L.map(mapRef.current, {
      center: [20.5937, 78.9629],
      zoom: 5,
      zoomControl: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)

    map.on('click', async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng

      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng])
      } else {
        markerRef.current = L.marker([lat, lng]).addTo(map)
      }

      try {
        const res = await fetch(
          `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}&limit=1&lang=en`
        )
        const data = await res.json()
        if (data.features && data.features.length > 0) {
          const props = data.features[0].properties || {}
          const parts = [props.name, props.city, props.state, props.country].filter(Boolean)
          const name = parts.join(', ')
          markerRef.current?.bindPopup(name).openPopup()
          onLocationSelect(name, lat, lng)
        }
      } catch {
        onLocationSelect(`${lat.toFixed(4)}, ${lng.toFixed(4)}`, lat, lng)
      }
    })

    mapInstanceRef.current = map

    return () => {
      map.remove()
      mapInstanceRef.current = null
      markerRef.current = null
    }
  }, [onLocationSelect])

  return (
    <div
      ref={mapRef}
      className='w-full h-full rounded-[12px]'
      style={{ minHeight: '250px' }}
    />
  )
}
