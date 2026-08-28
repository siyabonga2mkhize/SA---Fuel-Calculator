import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type FuelPrices = {
  petrol95Inland: number | null
  petrol95Coastal: number | null
  petrol93Inland: number | null
  dieselInland: number | null
  dieselCoastal: number | null
  month: string
  source: string
}

export type Place = {
  label: string
  lat: number
  lon: number
}

export type RouteResult = {
  distanceKm: number
  durationMinutes: number
  coordinates: [number, number][]
}

const fuelApiUrl = (import.meta.env.VITE_FUEL_API_URL || 'https://sa-fuel-api.railway.app').replace(/\/$/, '')
const orsKey = import.meta.env.VITE_ORS_API_KEY
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const supabase: SupabaseClient | null = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null

const cities: Record<string, Place> = {
  durban: { label: 'Durban, KwaZulu-Natal', lat: -29.8587, lon: 31.0218 },
  johannesburg: { label: 'Johannesburg, Gauteng', lat: -26.2041, lon: 28.0473 },
  pretoria: { label: 'Pretoria, Gauteng', lat: -25.7479, lon: 28.2293 },
  capetown: { label: 'Cape Town, Western Cape', lat: -33.9249, lon: 18.4241 },
  bloemfontein: { label: 'Bloemfontein, Free State', lat: -29.0852, lon: 26.1596 },
  pietermaritzburg: { label: 'Pietermaritzburg, KwaZulu-Natal', lat: -29.6006, lon: 30.3794 },
  mbombela: { label: 'Mbombela, Mpumalanga', lat: -25.4753, lon: 30.9694 },
  polokwane: { label: 'Polokwane, Limpopo', lat: -23.9045, lon: 29.4689 },
  portelizabeth: { label: 'Gqeberha, Eastern Cape', lat: -33.9608, lon: 25.6022 },
  eastlondon: { label: 'East London, Eastern Cape', lat: -33.0153, lon: 27.9116 },
}

function normalisePlaceKey(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z]/g, '')
}

export async function geocodePlace(query: string): Promise<Place> {
  if (orsKey) {
    const response = await fetch(
      `https://api.openrouteservice.org/geocode/search?api_key=${encodeURIComponent(orsKey)}&text=${encodeURIComponent(query)}&size=1&boundary.country=ZAF`,
    )
    if (!response.ok) throw new Error(`Geocoding failed (${response.status}).`)
    const json = await response.json()
    const feature = json.features?.[0]
    if (!feature) throw new Error(`Could not find “${query}” in South Africa.`)
    const [lon, lat] = feature.geometry.coordinates as [number, number]
    return { label: feature.properties?.label || query, lat, lon }
  }

  const fallback = cities[normalisePlaceKey(query)]
  if (!fallback) {
    throw new Error('Add VITE_ORS_API_KEY for free OpenRouteService geocoding, or use a supported demo city such as Durban or Johannesburg.')
  }
  return fallback
}

export async function getLatestFuelPrices(): Promise<FuelPrices> {
  const response = await fetch(`${fuelApiUrl}/v1/prices/latest`)
  if (!response.ok) throw new Error(`Fuel price API returned ${response.status}.`)
  const json = await response.json()
  const data = json.data
  return {
    petrol95Inland: data?.prices?.petrol?.p95Inland ?? null,
    petrol95Coastal: data?.prices?.petrol?.p95Coastal ?? null,
    petrol93Inland: data?.prices?.petrol?.p93Inland ?? null,
    dieselInland: data?.prices?.diesel?.d005Inland ?? null,
    dieselCoastal: data?.prices?.diesel?.d005Coastal ?? null,
    month: data?.monthLabel || data?.month || 'Latest',
    source: data?.source || 'SA Fuel Price API / DMRE data',
  }
}

function haversineKm(a: Place, b: Place) {
  const toRad = (degrees: number) => degrees * Math.PI / 180
  const earthRadiusKm = 6371
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(h))
}

export async function getRoute(origin: Place, destination: Place): Promise<RouteResult> {
  if (orsKey) {
    const response = await fetch('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
      method: 'POST',
      headers: {
        Authorization: orsKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        coordinates: [
          [origin.lon, origin.lat],
          [destination.lon, destination.lat],
        ],
      }),
    })
    if (!response.ok) throw new Error(`Routing failed (${response.status}).`)
    const json = await response.json()
    const feature = json.features?.[0]
    const summary = feature?.properties?.summary
    const rawCoordinates = feature?.geometry?.coordinates || []
    return {
      distanceKm: Number(summary?.distance || 0) / 1000,
      durationMinutes: Number(summary?.duration || 0) / 60,
      coordinates: rawCoordinates.map(([lon, lat]: [number, number]) => [lat, lon]),
    }
  }

  const distanceKm = haversineKm(origin, destination)
  return {
    distanceKm,
    durationMinutes: distanceKm / 80 * 60,
    coordinates: [[origin.lat, origin.lon], [destination.lat, destination.lon]],
  }
}
